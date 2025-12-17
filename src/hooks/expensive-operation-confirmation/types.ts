export interface ExpensiveOpState {
  sessionID: string
  pendingConfirmations: Map<string, PendingConfirmation>
}

export interface PendingConfirmation {
  callID: string
  agentName: string
  model: string
  costMultiplier: number
  timestamp: number
}
