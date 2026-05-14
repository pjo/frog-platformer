import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

interface Score {
  name: string
  email: string
  score: number
  flies: number
  time: number
}

interface PendingScore {
  name: string
  email: string
  score: number
  flies: number
  time: number
  expires: number
}

const SCORES_KEY = 'frog:scores:v1'
const NAMES_KEY = 'frog:names:v1'
const PENDING_PREFIX = 'frog:pending:'
const MAX_STORED = 50
const TOKEN_TTL_S = 48 * 60 * 60

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

function publicScores(scores: Score[]) {
  return scores.slice(0, 10).map(s => ({ name: s.name, score: s.score, flies: s.flies, time: s.time }))
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
      const scores = (await redis.get<Score[]>(SCORES_KEY)) ?? []
      return res.json(publicScores(scores))
    } catch {
      return res.status(500).json({ error: 'Failed to fetch scores' })
    }
  }

  if (req.method === 'POST') {
    const { name, email, score, flies, time } = (req.body ?? {}) as Partial<Score>
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.includes('@') || !email.includes('.') ||
      typeof score !== 'number' || score < 0 || score > 999_999 ||
      typeof flies !== 'number' || flies < 0 || flies > 54 ||
      typeof time !== 'number' || time < 0
    ) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    const cleanName = name.trim().slice(0, 20)
    const cleanEmail = email.trim().toLowerCase()

    try {
      const names = (await redis.get<Record<string, string>>(NAMES_KEY)) ?? {}
      const ownerEmail = names[cleanName.toLowerCase()]

      if (ownerEmail && ownerEmail !== cleanEmail) {
        return res.status(403).json({ error: 'Name taken', message: 'This name is registered to a different email address.' })
      }

      if (ownerEmail === cleanEmail) {
        // Verified owner — update score directly if better
        const scores = (await redis.get<Score[]>(SCORES_KEY)) ?? []
        const idx = scores.findIndex(s => s.name.toLowerCase() === cleanName.toLowerCase())
        const newEntry: Score = { name: cleanName, email: cleanEmail, score, flies, time }
        if (idx >= 0) {
          if (score > scores[idx].score || (score === scores[idx].score && flies > scores[idx].flies))
            scores[idx] = newEntry
        } else {
          scores.push(newEntry)
        }
        scores.sort((a, b) => b.score - a.score || b.flies - a.flies || a.time - b.time)
        const trimmed = scores.slice(0, MAX_STORED)
        await redis.set(SCORES_KEY, trimmed)
        return res.json({ status: 'updated', scores: publicScores(trimmed) })
      }

      // New name — create pending token and send verification email
      const token = randomUUID()
      const pending: PendingScore = {
        name: cleanName, email: cleanEmail, score, flies, time,
        expires: Date.now() + TOKEN_TTL_S * 1000,
      }
      await redis.set(`${PENDING_PREFIX}${token}`, pending, { ex: TOKEN_TTL_S })

      const proto = req.headers['x-forwarded-proto'] ?? 'https'
      const host = req.headers['x-forwarded-host'] ?? req.headers['host']
      const gameUrl = process.env.GAME_URL ?? `${proto}://${host}`
      const verifyUrl = `${gameUrl}/api/verify?token=${token}`

      const resendKey = process.env.RESEND_API_KEY ?? process.env.RESEND_KEY
      if (resendKey) {
        try {
          const resend = new Resend(resendKey)
          const from = process.env.RESEND_FROM_EMAIL ?? 'Frog Game <noreply@resend.dev>'
          await resend.emails.send({
            from,
            to: cleanEmail,
            subject: `Your score: ${score.toLocaleString()} pts — click to publish`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e5eefb;border-radius:16px">
                <div style="font-size:3rem;line-height:1;margin-bottom:8px">🐸</div>
                <h2 style="color:#22c55e;margin:0 0 16px">Frog vs. Smurf Invaders</h2>
                <p>Nice run, <strong>${cleanName}</strong>!</p>
                <p style="font-size:1.5rem;font-weight:700;color:#f1f5f9">Score: ${score.toLocaleString()} &nbsp;·&nbsp; Flies: ${flies}</p>
                <p style="color:#94a3b8">Click below to publish your score and claim your name on the leaderboard:</p>
                <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;margin:8px 0 20px">
                  ✓ Publish My Score
                </a>
                <p style="color:#475569;font-size:0.82rem">Link expires in 48 hours. If you didn't play this game, ignore this email.</p>
              </div>
            `,
          })
        } catch { /* email failure is non-fatal */ }
      }

      return res.json({ status: 'pending', message: 'Check your email to publish your score!' })
    } catch {
      return res.status(500).json({ error: 'Failed to save score' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
