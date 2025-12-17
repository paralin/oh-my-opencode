export const EXPENSIVE_OP_HOOK_NAME = "expensive-operation-confirmation"

export const AGENT_INVOCATION_TOOLS = new Set(["task", "background_task", "call_omo_agent"])

export function formatConfirmationMessage(
  agentName: string,
  model: string,
  costMultiplier: number
): string {
  const costStr = costMultiplier === 0 
    ? "FREE (0 premium requests)"
    : costMultiplier < 1
    ? `${costMultiplier}x premium request`
    : costMultiplier === 1
    ? "1 premium request"
    : `${costMultiplier}x premium requests`
  
  return `
⚠️ **Expensive Operation Confirmation Required**

You're about to invoke **${agentName}** (${model}) which costs **${costStr}**.

In premium request billing mode, each agent invocation consumes from your quota.

**To proceed**: Reply with "yes" or "confirm" to continue.
**To cancel**: Reply with "no" or "cancel" to skip this operation.
`
}
