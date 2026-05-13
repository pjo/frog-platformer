export const SPRITE = {
  fw: 64, fh: 64,
  rows: { frogIdle: 0, frogRun: 1, frogJump: 2, frogHurt: 3, frogVictory: 4, smurfWalk: 5, smurfAlert: 6, flySpin: 7 }
}

export function buildSpriteSheet(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = '/sprites.png'
  })
}

export function blit(ctx: CanvasRenderingContext2D, sheet: CanvasImageSource, row: number, frame: number, dx: number, dy: number, dw: number, dh: number, flipX = false) {
  const sx = (frame % 6) * SPRITE.fw
  const sy = row * SPRITE.fh
  ctx.save()
  ctx.translate(dx + dw/2, dy + dh/2)
  ctx.scale(flipX ? -1 : 1, 1)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sheet, sx, sy, SPRITE.fw, SPRITE.fh, -dw/2, -dh/2, dw, dh)
  ctx.restore()
}

export function aframe(speed = 8, count = 6) {
  return Math.floor(performance.now() / (1000 / speed)) % count
}
