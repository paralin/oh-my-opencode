import type { PluginInput } from "@opencode-ai/plugin"
import type { BillingConfig } from "../../config"
import type { ExpensiveOpState, PendingConfirmation } from "./types"
import { AGENT_INVOCATION_TOOLS, formatConfirmationMessage } from "./constants"
import { 
  getModelCost, 
  shouldConfirmExpensiveOperation, 
  DEFAULT_BILLING_CONFIG 
} from "../../shared"
import { log } from "../../shared"

interface ToolExecuteBeforeInput {
  tool: string
  sessionID: string
  callID: string
}

interface ToolExecuteBeforeOutput {
  args: Record<string, unknown>
  abort?: boolean
  message?: string
}

interface EventInput {
  event: {
    type: string
    properties?: unknown
  }
}

export interface ExpensiveOpHookOptions {
  billingConfig?: BillingConfig
  getAgentModel: (agentName: string) => string | undefined
}

export function createExpensiveOperationConfirmationHook(
  _ctx: PluginInput,
  options: ExpensiveOpHookOptions
) {
  const { billingConfig, getAgentModel } = options
  const config = billingConfig ?? DEFAULT_BILLING_CONFIG
  const billingMode = config.mode ?? "session"
  const sessionStates = new Map<string, ExpensiveOpState>()

  function getOrCreateState(sessionID: string): ExpensiveOpState {
    if (!sessionStates.has(sessionID)) {
      sessionStates.set(sessionID, {
        sessionID,
        pendingConfirmations: new Map(),
      })
    }
    return sessionStates.get(sessionID)!
  }

  function clearState(sessionID: string): void {
    sessionStates.delete(sessionID)
  }

  const toolExecuteBefore = async (
    input: ToolExecuteBeforeInput,
    output: ToolExecuteBeforeOutput
  ) => {
    const { tool, sessionID, callID } = input
    const toolLower = tool.toLowerCase()

    if (!AGENT_INVOCATION_TOOLS.has(toolLower)) {
      return
    }

    const args = output.args
    const agentName = (args.subagent_type ?? args.agent ?? "unknown") as string
    
    const agentModel = getAgentModel(agentName)
    if (!agentModel) {
      return
    }

    if (!shouldConfirmExpensiveOperation(agentModel, billingMode, config)) {
      return
    }

    const costMultiplier = getModelCost(agentModel, config)
    const state = getOrCreateState(sessionID)

    const pending: PendingConfirmation = {
      callID,
      agentName,
      model: agentModel,
      costMultiplier,
      timestamp: Date.now(),
    }
    state.pendingConfirmations.set(callID, pending)

    output.abort = true
    output.message = formatConfirmationMessage(agentName, agentModel, costMultiplier)

    log("Expensive operation confirmation requested", {
      sessionID,
      callID,
      agentName,
      model: agentModel,
      costMultiplier,
    })
  }

  const eventHandler = async ({ event }: EventInput) => {
    const props = event.properties as Record<string, unknown> | undefined

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined
      if (sessionInfo?.id) {
        clearState(sessionInfo.id)
      }
    }
  }

  return {
    "tool.execute.before": toolExecuteBefore,
    event: eventHandler,
  }
}
