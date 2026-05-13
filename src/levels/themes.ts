export type ThemeRenderer = {
  drawParallax: (ctx: CanvasRenderingContext2D, cameraX: number, worldWidth: number, vw: number, vh: number) => void
  groundColor: string
  groundAccentA: string
  groundAccentB: string
}

function drawSwampParallax(ctx: CanvasRenderingContext2D, cameraX: number, worldWidth: number, vw: number, vh: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh)
  sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(0.5, '#bae6fd'); sky.addColorStop(1, '#dcfce7')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, vw, vh)

  ctx.save(); ctx.translate(1050, 120)
  ctx.fillStyle = 'rgba(253,224,71,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  for (let i = 0; i < 6; i++) {
    const mx = ((i * 260) - cameraX * 0.15 + worldWidth) % (vw + 260) - 130
    ctx.fillStyle = i % 2 === 0 ? '#94a3b8' : '#a8b4c5'
    ctx.beginPath(); ctx.moveTo(mx, 420); ctx.lineTo(mx + 125, 240); ctx.lineTo(mx + 250, 420); ctx.closePath(); ctx.fill()
  }

  for (let i = 0; i < 7; i++) {
    const tx = ((i * 210) - cameraX * 0.4 + worldWidth) % (vw + 210) - 80
    const ty = 500 + (i % 2) * 18
    ctx.fillStyle = '#7c5a3a'; ctx.fillRect(tx + 24, ty - 80, 16, 80)
    ctx.fillStyle = '#22c55e'
    ctx.beginPath(); ctx.arc(tx + 32, ty - 98, 36, 0, Math.PI * 2); ctx.arc(tx + 8, ty - 68, 28, 0, Math.PI * 2); ctx.arc(tx + 56, ty - 66, 28, 0, Math.PI * 2); ctx.fill()
  }
}

function drawCaveParallax(ctx: CanvasRenderingContext2D, cameraX: number, worldWidth: number, vw: number, vh: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh)
  sky.addColorStop(0, '#1e1b4b'); sky.addColorStop(0.5, '#312e81'); sky.addColorStop(1, '#1e3a5f')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, vw, vh)

  for (let i = 0; i < 14; i++) {
    const sx = ((i * 140) - cameraX * 0.1 + worldWidth) % (vw + 140) - 70
    ctx.fillStyle = '#312e81'
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 30, 0); ctx.lineTo(sx + 15, 80 + (i % 3) * 40); ctx.closePath(); ctx.fill()
  }

  for (let i = 0; i < 9; i++) {
    const cx2 = ((i * 190) - cameraX * 0.3 + worldWidth) % (vw + 190) - 80
    ctx.fillStyle = `hsla(${220 + i * 18}, 80%, 65%, 0.35)`
    ctx.beginPath(); ctx.arc(cx2, 490 + (i % 3) * 20, 20, 0, Math.PI * 2); ctx.fill()
  }
}

function drawSkyParallax(ctx: CanvasRenderingContext2D, cameraX: number, worldWidth: number, vw: number, vh: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh)
  sky.addColorStop(0, '#f0abfc'); sky.addColorStop(0.5, '#c4b5fd'); sky.addColorStop(1, '#bae6fd')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, vw, vh)

  ctx.save(); ctx.globalAlpha = 0.22
  for (let r = 0; r < 7; r++) {
    ctx.strokeStyle = `hsl(${r * 42},90%,60%)`; ctx.lineWidth = 14
    ctx.beginPath(); ctx.arc(vw / 2, 620, 340 + r * 16, Math.PI, 0); ctx.stroke()
  }
  ctx.restore()

  for (let i = 0; i < 9; i++) {
    const cx2 = ((i * 210) - cameraX * 0.12 + worldWidth) % (vw + 210) - 80
    const cy2 = 120 + (i % 3) * 80
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath(); ctx.arc(cx2, cy2, 60, 0, Math.PI * 2); ctx.arc(cx2 + 50, cy2 + 10, 45, 0, Math.PI * 2); ctx.arc(cx2 - 40, cy2 + 12, 40, 0, Math.PI * 2); ctx.fill()
  }
}

function drawLavaParallax(ctx: CanvasRenderingContext2D, cameraX: number, worldWidth: number, vw: number, vh: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh)
  sky.addColorStop(0, '#431407'); sky.addColorStop(0.5, '#7c2d12'); sky.addColorStop(1, '#9a3412')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, vw, vh)

  for (let i = 0; i < 5; i++) {
    const vx2 = ((i * 340) - cameraX * 0.1 + worldWidth) % (vw + 340) - 170
    ctx.fillStyle = '#78350f'
    ctx.beginPath(); ctx.moveTo(vx2, 560); ctx.lineTo(vx2 + 80, 320); ctx.lineTo(vx2 + 160, 560); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#dc2626'
    ctx.beginPath(); ctx.arc(vx2 + 80, 320, 22, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = `rgba(251,146,60,${0.5 + Math.sin(performance.now() * 0.003 + i) * 0.3})`
    ctx.beginPath(); ctx.arc(vx2 + 80, 340 + Math.sin(performance.now() * 0.004 + i) * 8, 10, 0, Math.PI * 2); ctx.fill()
  }

  for (let i = 0; i < 12; i++) {
    const ex = ((i * 180) - cameraX * 0.25 + worldWidth) % (vw + 180) - 60
    const ey = 200 + Math.sin(performance.now() * 0.005 + i * 1.3) * 120
    ctx.fillStyle = `rgba(251,146,60,${0.3 + Math.sin(performance.now() * 0.01 + i) * 0.2})`
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill()
  }
}

function drawFortressParallax(ctx: CanvasRenderingContext2D, cameraX: number, worldWidth: number, vw: number, vh: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh)
  sky.addColorStop(0, '#020617'); sky.addColorStop(0.5, '#0f172a'); sky.addColorStop(1, '#1e1b4b')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, vw, vh)

  for (let i = 0; i < 60; i++) {
    const sx2 = ((i * 193) - cameraX * 0.05 + worldWidth * 2) % vw
    const sy2 = (i * 137) % (vh * 0.65)
    const bright = 0.4 + Math.sin(performance.now() * 0.002 + i) * 0.3
    ctx.fillStyle = `rgba(255,255,255,${bright})`
    ctx.beginPath(); ctx.arc(sx2, sy2, 1.5 + i % 2, 0, Math.PI * 2); ctx.fill()
  }

  for (let i = 0; i < 5; i++) {
    const tx2 = ((i * 310) - cameraX * 0.08 + worldWidth) % (vw + 310) - 155
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(tx2 + 30, 340, 40, 220)
    ctx.fillRect(tx2, 380, 100, 180)
    for (let b = 0; b < 5; b++) ctx.fillRect(tx2 + b * 22, 340 - 16, 14, 20)
    ctx.fillStyle = `rgba(239,68,68,${0.5 + Math.sin(performance.now() * 0.003 + i) * 0.3})`
    ctx.fillRect(tx2 + 38, 420, 24, 30)
  }
}

export const THEMES: Record<string, ThemeRenderer> = {
  swamp:    { drawParallax: drawSwampParallax,    groundColor: '#65a30d', groundAccentA: '#84cc16', groundAccentB: '#4d7c0f' },
  cave:     { drawParallax: drawCaveParallax,     groundColor: '#3b0764', groundAccentA: '#4c1d95', groundAccentB: '#2e1065' },
  sky:      { drawParallax: drawSkyParallax,      groundColor: '#6366f1', groundAccentA: '#a5b4fc', groundAccentB: '#4338ca' },
  lava:     { drawParallax: drawLavaParallax,     groundColor: '#7c2d12', groundAccentA: '#dc2626', groundAccentB: '#92400e' },
  fortress: { drawParallax: drawFortressParallax, groundColor: '#1e1b4b', groundAccentA: '#312e81', groundAccentB: '#1e1b4b' },
}
