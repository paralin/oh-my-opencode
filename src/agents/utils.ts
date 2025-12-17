import type { AgentConfig } from "@opencode-ai/sdk"
import type { BuiltinAgentName, AgentOverrideConfig, AgentOverrides } from "./types"
import type { BillingConfig } from "../config"
import { omoAgent } from "./omo"
import { oracleAgent } from "./oracle"
import { librarianAgent } from "./librarian"
import { exploreAgent } from "./explore"
import { frontendUiUxEngineerAgent } from "./frontend-ui-ux-engineer"
import { documentWriterAgent } from "./document-writer"
import { multimodalLookerAgent } from "./multimodal-looker"
import { deepMerge, generateAgentCostTable, DEFAULT_BILLING_CONFIG } from "../shared"

const allBuiltinAgents: Record<BuiltinAgentName, AgentConfig> = {
  OmO: omoAgent,
  oracle: oracleAgent,
  librarian: librarianAgent,
  explore: exploreAgent,
  "frontend-ui-ux-engineer": frontendUiUxEngineerAgent,
  "document-writer": documentWriterAgent,
  "multimodal-looker": multimodalLookerAgent,
}

export function createEnvContext(directory: string): string {
  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const locale = Intl.DateTimeFormat().resolvedOptions().locale

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  const platform = process.platform as "darwin" | "linux" | "win32" | string

  return `
Here is some useful information about the environment you are running in:
<env>
  Working directory: ${directory}
  Platform: ${platform}
  Today's date: ${dateStr} (NOT 2024, NEVEREVER 2024)
  Current time: ${timeStr}
  Timezone: ${timezone}
  Locale: ${locale}
</env>`
}

function mergeAgentConfig(
  base: AgentConfig,
  override: AgentOverrideConfig
): AgentConfig {
  return deepMerge(base, override as Partial<AgentConfig>)
}

function generateCostContext(
  agents: Record<string, AgentConfig>,
  billingConfig: BillingConfig
): string {
  const agentModels = Object.entries(agents)
    .filter(([_, config]) => config.model)
    .map(([name, config]) => ({ name, model: config.model! }))

  const costTable = generateAgentCostTable(agentModels, billingConfig)
  const billingMode = billingConfig.mode ?? "session"

  return `
<Agent_Costs>
## Agent Cost Reference

Current billing mode: **${billingMode}**

${costTable}

### Cost-Aware Decision Making

- 🟢 **FREE agents** (explore): Use liberally, fire in parallel without hesitation
- 🟡 **CHEAP agents**: Low cost, use freely for quick tasks
- 🟠 **STANDARD agents** (librarian, oracle, frontend, document-writer): Use when needed, but don't over-invoke
- 🔴 **EXPENSIVE agents** (OmO): Reserved for complex orchestration

**Guidelines**:
- Prefer FREE/CHEAP agents for exploration and simple tasks
- Use STANDARD agents when their specialty is genuinely needed
- In premium_request billing mode, be more conservative with agent invocations
- In session billing mode, agent calls within the session have no additional cost
</Agent_Costs>`
}

export function createBuiltinAgents(
  disabledAgents: BuiltinAgentName[] = [],
  agentOverrides: AgentOverrides = {},
  directory?: string,
  billingConfig?: BillingConfig
): Record<string, AgentConfig> {
  const result: Record<string, AgentConfig> = {}
  const effectiveBillingConfig = billingConfig ?? DEFAULT_BILLING_CONFIG

  for (const [name, config] of Object.entries(allBuiltinAgents)) {
    const agentName = name as BuiltinAgentName

    if (disabledAgents.includes(agentName)) {
      continue
    }

    let finalConfig = config
    const override = agentOverrides[agentName]

    if (override) {
      finalConfig = mergeAgentConfig(finalConfig, override)
    }

    result[name] = finalConfig
  }

  if (result.OmO && directory) {
    const envContext = createEnvContext(directory)
    const costContext = generateCostContext(result, effectiveBillingConfig)
    result.OmO = {
      ...result.OmO,
      prompt: (result.OmO.prompt ?? "") + envContext + costContext,
    }
  }

  if (result.librarian && directory && result.librarian.prompt) {
    const envContext = createEnvContext(directory)
    result.librarian = {
      ...result.librarian,
      prompt: result.librarian.prompt + envContext,
    }
  }

  return result
}
