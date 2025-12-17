import type { ModelCosts, BillingConfig, BillingUnit } from "../config"

export const DEFAULT_MODEL_COSTS: ModelCosts = {
  "github-copilot/grok-code-fast-1": { unit: "session", cost_multiplier: 0 },
  "github-copilot/gpt-5-mini": { unit: "session", cost_multiplier: 0 },
  "github-copilot/o4-mini": { unit: "session", cost_multiplier: 0 },

  "github-copilot/claude-haiku-4.5": { unit: "session", cost_multiplier: 0.33 },
  "github-copilot/gpt-5.1-codex-mini": { unit: "session", cost_multiplier: 0.33 },

  "github-copilot/claude-sonnet-4": { unit: "session", cost_multiplier: 1 },
  "github-copilot/claude-sonnet-4.5": { unit: "session", cost_multiplier: 1 },
  "github-copilot/gpt-5": { unit: "session", cost_multiplier: 1 },
  "github-copilot/gpt-5.1": { unit: "session", cost_multiplier: 1 },
  "github-copilot/gpt-5.1-codex": { unit: "session", cost_multiplier: 1 },
  "github-copilot/gpt-5.2": { unit: "session", cost_multiplier: 1 },
  "github-copilot/gemini-2.5-pro": { unit: "session", cost_multiplier: 1 },
  "github-copilot/gemini-3-pro-preview": { unit: "session", cost_multiplier: 1 },
  "github-copilot/claude-opus-4": { unit: "session", cost_multiplier: 1 },
  "github-copilot/claude-opus-41": { unit: "session", cost_multiplier: 1 },
  "github-copilot/o3": { unit: "session", cost_multiplier: 1 },
  "github-copilot/o3-mini": { unit: "session", cost_multiplier: 1 },

  "github-copilot/claude-opus-4.5": { unit: "session", cost_multiplier: 3 },
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  mode: "session",
  model_costs: DEFAULT_MODEL_COSTS,
  confirm_expensive_threshold: 2,
}

export type CostTier = "free" | "cheap" | "standard" | "expensive"

export function getCostTier(costMultiplier: number): CostTier {
  if (costMultiplier === 0) return "free"
  if (costMultiplier < 1) return "cheap"
  if (costMultiplier <= 1) return "standard"
  return "expensive"
}

export function getModelCost(model: string, config: BillingConfig): number {
  const costs = { ...DEFAULT_MODEL_COSTS, ...config.model_costs }
  return costs[model]?.cost_multiplier ?? 1
}

export function getModelBillingUnit(model: string, config: BillingConfig): BillingUnit {
  const costs = { ...DEFAULT_MODEL_COSTS, ...config.model_costs }
  return costs[model]?.unit ?? config.mode ?? "session"
}

export function shouldConfirmExpensiveOperation(
  model: string,
  billingMode: BillingUnit,
  config: BillingConfig
): boolean {
  if (billingMode === "session") return false

  const cost = getModelCost(model, config)
  const threshold = config.confirm_expensive_threshold ?? 2
  return cost >= threshold
}

export function formatCost(costMultiplier: number): string {
  if (costMultiplier === 0) return "FREE"
  if (costMultiplier < 1) return `${costMultiplier}x`
  if (costMultiplier === 1) return "1x"
  return `${costMultiplier}x`
}

export interface AgentModelInfo {
  name: string
  model: string
}

export function generateAgentCostTable(
  agents: AgentModelInfo[],
  config: BillingConfig
): string {
  const lines = ["| Agent | Model | Cost | Tier |", "|-------|-------|------|------|"]

  for (const { name, model } of agents) {
    const cost = getModelCost(model, config)
    const tier = getCostTier(cost)
    const tierEmoji = tier === "free" ? "🟢" : tier === "cheap" ? "🟡" : tier === "standard" ? "🟠" : "🔴"
    const modelShort = model.includes("/") ? model.split("/")[1] : model
    lines.push(`| ${name} | ${modelShort} | ${formatCost(cost)} | ${tierEmoji} ${tier} |`)
  }

  return lines.join("\n")
}
