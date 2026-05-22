import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

interface Score {
  name: string;
  email: string;
  score: number;
  flies: number;
  time: number;
}

interface PendingScore {
  name: string;
  email: string;
  score: number;
  flies: number;
  time: number;
  expires: number;
}

const SCORES_KEY = 'frog:scores:v1';
const NAMES_KEY = 'frog:names:v1';
const PENDING_PREFIX = 'frog:pending:';
const MAX_STORED = 50;

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.query.token as string;
  if (!token) return res.status(400).send(errorPage('Missing verification token.'));

  const redis = getRedis();
  if (!redis) return res.status(503).send(errorPage('Storage not configured.'));

  try {
    const pending = await redis.get<PendingScore>(`${PENDING_PREFIX}${token}`);
    if (!pending)
      return res.status(400).send(errorPage('This link has expired or has already been used.'));
    if (Date.now() > pending.expires) {
      await redis.del(`${PENDING_PREFIX}${token}`);
      return res.status(400).send(errorPage('This link has expired. Play again to get a new one!'));
    }

    const scores = (await redis.get<Score[]>(SCORES_KEY)) ?? [];
    const idx = scores.findIndex((s) => s.name.toLowerCase() === pending.name.toLowerCase());
    const newEntry: Score = {
      name: pending.name,
      email: pending.email,
      score: pending.score,
      flies: pending.flies,
      time: pending.time,
    };

    if (idx >= 0) {
      if (
        pending.score > scores[idx].score ||
        (pending.score === scores[idx].score && pending.flies > scores[idx].flies)
      )
        scores[idx] = newEntry;
    } else {
      scores.push(newEntry);
    }
    scores.sort((a, b) => b.score - a.score || b.flies - a.flies || a.time - b.time);
    await redis.set(SCORES_KEY, scores.slice(0, MAX_STORED));

    const names = (await redis.get<Record<string, string>>(NAMES_KEY)) ?? {};
    names[pending.name.toLowerCase()] = pending.email;
    await redis.set(NAMES_KEY, names);

    await redis.del(`${PENDING_PREFIX}${token}`);

    const proto = req.headers['x-forwarded-proto'] ?? 'https';
    const host = req.headers['x-forwarded-host'] ?? req.headers['host'];
    const gameUrl = process.env.GAME_URL ?? `${proto}://${host}`;

    return res.status(200).send(successPage(pending.name, pending.score, gameUrl as string));
  } catch {
    return res.status(500).send(errorPage('Something went wrong. Please try again.'));
  }
}

function successPage(name: string, score: number, gameUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Score Published — Frog vs. Smurf Invaders</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#0f172a;color:#e5eefb;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .card{text-align:center;padding:40px 48px;background:rgba(15,23,42,0.92);border:1px solid rgba(148,163,184,0.2);border-radius:28px;box-shadow:0 32px 80px rgba(0,0,0,0.5);max-width:480px;width:100%}
  .frog{font-size:4rem;line-height:1;margin-bottom:12px}
  h1{color:#22c55e;font-size:2rem;margin:0 0 12px}
  p{color:#94a3b8;margin:0 0 12px;line-height:1.5}
  .score{font-size:2.5rem;font-weight:800;color:#f1f5f9;margin:16px 0 8px}
  .note{font-size:0.85rem;color:#64748b;margin-bottom:24px}
  a{display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;box-shadow:0 8px 24px rgba(34,197,94,0.3)}
  a:hover{opacity:0.9}
</style>
</head>
<body>
<div class="card">
  <div class="frog">🐸</div>
  <h1>Score Published!</h1>
  <p><strong>${name}</strong>, you're on the leaderboard:</p>
  <div class="score">${score.toLocaleString()} pts</div>
  <p class="note">Your name is now registered — future scores update automatically.</p>
  <a href="${gameUrl}">Play Again</a>
</div>
</body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verification Failed — Frog vs. Smurf Invaders</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#0f172a;color:#e5eefb;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .card{text-align:center;padding:40px 48px;background:rgba(15,23,42,0.92);border:1px solid rgba(148,163,184,0.2);border-radius:28px;box-shadow:0 32px 80px rgba(0,0,0,0.5);max-width:480px;width:100%}
  .frog{font-size:4rem;line-height:1;margin-bottom:12px}
  h1{color:#ef4444;font-size:2rem;margin:0 0 12px}
  p{color:#94a3b8;margin:0;line-height:1.5}
</style>
</head>
<body>
<div class="card">
  <div class="frog">🐸</div>
  <h1>Oops!</h1>
  <p>${message}</p>
</div>
</body>
</html>`;
}
