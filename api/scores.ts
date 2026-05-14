import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

interface Score {
  name: string
  score: number
  flies: number
  time: number
}

const KEY = 'frog:scores:v1'
const MAX_STORED = 50

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    return new Redis({ url, token })
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()

  const redis = getRedis()
  if (!redis) return res.status(503).json({ error: 'Storage not configured' })

  if (req.method === 'GET') {
    try {
      const scores = (await redis.get<Score[]>(KEY)) ?? []
      return res.json(scores.slice(0, 10))
    } catch {
      return res.status(500).json({ error: 'Failed to fetch scores' })
    }
  }

  if (req.method === 'POST') {
    const { name, score, flies, time } = (req.body ?? {}) as Partial<Score>
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof score !== 'number' || score < 0 || score > 999_999 ||
      typeof flies !== 'number' || flies < 0 || flies > 54 ||
      typeof time !== 'number' || time < 0
    ) {
      return res.status(400).json({ error: 'Invalid payload' })
    }
    try {
      const scores = (await redis.get<Score[]>(KEY)) ?? []
      scores.push({ name: name.trim().slice(0, 20), score, flies, time })
      scores.sort((a, b) => b.score - a.score || b.flies - a.flies || a.time - b.time)
      const trimmed = scores.slice(0, MAX_STORED)
      await redis.set(KEY, trimmed)
      return res.json(trimmed.slice(0, 10))
    } catch {
      return res.status(500).json({ error: 'Failed to save score' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
