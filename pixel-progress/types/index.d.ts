export type Flow = {
  title: string
  total: number
  done: number
  note: string
  isFinished: boolean
  startedAt: number
}

export type AgentStatus = 'running' | 'done' | 'failed'

export type AgentRun = {
  id: string
  agentId?: string
  type: string
  description: string
  model: string
  status: AgentStatus
  startedAt: number
  endedAt?: number
  contextTokens: number
  tokens: number
  stepDone?: number
  stepTotal?: number
  stepNote?: string
  /** The latest things the agent did, newest first, e.g. "Reading notes.md". */
  recent?: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'pixel-progress': {
      flow: Shaped<Flow | null>
      agents: Shaped<AgentRun[]>
      now: number
      /** The band's look: 'cat' (default), 'office' or 'rocket'. Saved in $.store too. */
      theme: string
    }
  }
}
