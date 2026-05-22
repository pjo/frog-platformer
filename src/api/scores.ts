import type { LeaderEntry } from '../levels/types'

export interface ScorePayload {
  name: string
  email: string
  score: number
  flies: number
  time: number
}

export type PostScoreResult =
  | { status: 'pending' }
  | { status: 'updated'; scores: LeaderEntry[] }
  | { status: 'nameTaken' }
  | { status: 'error' }

export async function getScores(): Promise<LeaderEntry[] | null> {
  const res = await fetch('/api/scores')
  if (!res.ok) return null
  return res.json() as Promise<LeaderEntry[]>
}

export async function postScore(payload: ScorePayload): Promise<PostScoreResult> {
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.status === 403) return { status: 'nameTaken' }
    if (!res.ok) return { status: 'error' }
    return res.json() as Promise<PostScoreResult>
  } catch {
    return { status: 'error' }
  }
}
