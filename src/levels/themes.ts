export type ThemeRenderer = {
  drawParallax: (
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    worldWidth: number,
    vw: number,
    vh: number,
  ) => void;
  groundColor: string;
  groundAccentA: string;
  groundAccentB: string;
};

function drawSwampParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#7dd3fc');
  sky.addColorStop(0.5, '#bae6fd');
  sky.addColorStop(1, '#dcfce7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(1050, 120);
  ctx.fillStyle = 'rgba(253,224,71,0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < 6; i++) {
    const mx = ((i * 260 - cameraX * 0.15 + worldWidth) % (vw + 260)) - 130;
    ctx.fillStyle = i % 2 === 0 ? '#94a3b8' : '#a8b4c5';
    ctx.beginPath();
    ctx.moveTo(mx, 420);
    ctx.lineTo(mx + 125, 240);
    ctx.lineTo(mx + 250, 420);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 7; i++) {
    const tx = ((i * 210 - cameraX * 0.4 + worldWidth) % (vw + 210)) - 80;
    const ty = 500 + (i % 2) * 18;
    const trunkH = 74 + (i % 4) * 14;
    const cx = tx + 32 + ((i % 3) - 1) * 6;
    // Trunk — slightly wider at base
    ctx.fillStyle = '#7c5a3a';
    ctx.fillRect(cx - 7, ty - trunkH, 14, trunkH);
    ctx.fillRect(cx - 9, ty - 22, 18, 22);
    // Dark canopy underside
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(cx, ty - trunkH - 4, 32 + (i % 3) * 4, 0, Math.PI * 2);
    ctx.arc(cx - 26, ty - trunkH + 18, 22 + (i % 2) * 4, 0, Math.PI * 2);
    ctx.arc(cx + 28, ty - trunkH + 14, 24 + (i % 3) * 3, 0, Math.PI * 2);
    ctx.arc(cx - 10, ty - trunkH + 28, 20, 0, Math.PI * 2);
    ctx.fill();
    // Mid canopy
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cx + 4, ty - trunkH - 2, 26 + (i % 3) * 3, 0, Math.PI * 2);
    ctx.arc(cx - 20, ty - trunkH + 12, 18 + (i % 2) * 5, 0, Math.PI * 2);
    ctx.arc(cx + 22, ty - trunkH + 10, 20 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.fill();
    // Top highlight
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(cx + 2, ty - trunkH - 6, 14 + (i % 2) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCaveParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#1e1b4b');
  sky.addColorStop(0.5, '#312e81');
  sky.addColorStop(1, '#1e3a5f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  for (let i = 0; i < 14; i++) {
    const sx = ((i * 140 - cameraX * 0.1 + worldWidth) % (vw + 140)) - 70;
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + 30, 0);
    ctx.lineTo(sx + 15, 80 + (i % 3) * 40);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 9; i++) {
    const cx2 = ((i * 190 - cameraX * 0.3 + worldWidth) % (vw + 190)) - 80;
    ctx.fillStyle = `hsla(${220 + i * 18}, 80%, 65%, 0.35)`;
    ctx.beginPath();
    ctx.arc(cx2, 490 + (i % 3) * 20, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSkyParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#f0abfc');
  sky.addColorStop(0.5, '#c4b5fd');
  sky.addColorStop(1, '#bae6fd');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let r = 0; r < 7; r++) {
    ctx.strokeStyle = `hsl(${r * 42},90%,60%)`;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(vw / 2, 620, 340 + r * 16, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < 9; i++) {
    const cx2 = ((i * 210 - cameraX * 0.12 + worldWidth) % (vw + 210)) - 80;
    const cy2 = 120 + (i % 3) * 80;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(cx2, cy2, 60, 0, Math.PI * 2);
    ctx.arc(cx2 + 50, cy2 + 10, 45, 0, Math.PI * 2);
    ctx.arc(cx2 - 40, cy2 + 12, 40, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLavaParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#431407');
  sky.addColorStop(0.5, '#7c2d12');
  sky.addColorStop(1, '#9a3412');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  for (let i = 0; i < 5; i++) {
    const vx2 = ((i * 340 - cameraX * 0.1 + worldWidth) % (vw + 340)) - 170;
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(vx2, 560);
    ctx.lineTo(vx2 + 80, 320);
    ctx.lineTo(vx2 + 160, 560);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(vx2 + 80, 320, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(251,146,60,${0.5 + Math.sin(performance.now() * 0.003 + i) * 0.3})`;
    ctx.beginPath();
    ctx.arc(vx2 + 80, 340 + Math.sin(performance.now() * 0.004 + i) * 8, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 12; i++) {
    const ex = ((i * 180 - cameraX * 0.25 + worldWidth) % (vw + 180)) - 60;
    const ey = 200 + Math.sin(performance.now() * 0.005 + i * 1.3) * 120;
    ctx.fillStyle = `rgba(251,146,60,${0.3 + Math.sin(performance.now() * 0.01 + i) * 0.2})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFortressParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#020617');
  sky.addColorStop(0.5, '#0f172a');
  sky.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  for (let i = 0; i < 60; i++) {
    const sx2 = (i * 193 - cameraX * 0.05 + worldWidth * 2) % vw;
    const sy2 = (i * 137) % (vh * 0.65);
    const bright = 0.4 + Math.sin(performance.now() * 0.002 + i) * 0.3;
    ctx.fillStyle = `rgba(255,255,255,${bright})`;
    ctx.beginPath();
    ctx.arc(sx2, sy2, 1.5 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 5; i++) {
    const tx2 = ((i * 310 - cameraX * 0.08 + worldWidth) % (vw + 310)) - 155;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(tx2 + 30, 340, 40, 220);
    ctx.fillRect(tx2, 380, 100, 180);
    for (let b = 0; b < 5; b++) ctx.fillRect(tx2 + b * 22, 340 - 16, 14, 20);
    ctx.fillStyle = `rgba(239,68,68,${0.5 + Math.sin(performance.now() * 0.003 + i) * 0.3})`;
    ctx.fillRect(tx2 + 38, 420, 24, 30);
  }
}

function drawIceParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#bae6fd');
  sky.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  // Static snow dots
  for (let i = 0; i < 40; i++) {
    const sx = (i * 193 - cameraX * 0.05 + worldWidth * 2) % vw;
    const sy = (i * 137) % (vh * 0.7);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Snow-capped mountains
  for (let i = 0; i < 7; i++) {
    const mx = ((i * 240 - cameraX * 0.12 + worldWidth) % (vw + 240)) - 120;
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(mx, 480);
    ctx.lineTo(mx + 120, 260);
    ctx.lineTo(mx + 240, 480);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(mx + 120, 260);
    ctx.lineTo(mx + 95, 320);
    ctx.lineTo(mx + 145, 320);
    ctx.closePath();
    ctx.fill();
  }

  // Falling snowflakes
  for (let i = 0; i < 30; i++) {
    const fx = (i * 177 + cameraX * 0.3) % vw;
    const fy = (i * 177 + performance.now() * 0.025) % vh;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(fx, fy, 2 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDesertParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#fbbf24');
  sky.addColorStop(1, '#fb923c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  // Sun with glow
  ctx.save();
  ctx.fillStyle = 'rgba(254,240,138,0.3)';
  ctx.beginPath();
  ctx.arc(1100, 100, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(253,224,71,0.5)';
  ctx.beginPath();
  ctx.arc(1100, 100, 65, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(1100, 100, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sand dunes
  for (let i = 0; i < 5; i++) {
    const dx = ((i * 320 - cameraX * 0.08 + worldWidth) % (vw + 320)) - 160;
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(dx, 560);
    ctx.bezierCurveTo(dx + 80, 420, dx + 240, 420, dx + 320, 560);
    ctx.closePath();
    ctx.fill();
  }

  // Cacti
  for (let i = 0; i < 6; i++) {
    const cx2 = ((i * 280 - cameraX * 0.22 + worldWidth) % (vw + 280)) - 80;
    ctx.fillStyle = '#15803d';
    ctx.fillRect(cx2 + 18, 430, 14, 130);
    ctx.fillRect(cx2, 475, 18, 12);
    ctx.fillRect(cx2 + 32, 460, 18, 12);
    ctx.fillRect(cx2, 465, 12, 30);
    ctx.fillRect(cx2 + 32, 450, 12, 30);
  }
}

function drawJungleParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#14532d');
  sky.addColorStop(1, '#15803d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  // Tree canopy clusters
  for (let i = 0; i < 8; i++) {
    const tx = ((i * 210 - cameraX * 0.1 + worldWidth) % (vw + 210)) - 80;
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(tx + 40, 180, 70, 0, Math.PI * 2);
    ctx.arc(tx + 80, 160, 60, 0, Math.PI * 2);
    ctx.arc(tx + 15, 200, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(tx + 50, 175, 55, 0, Math.PI * 2);
    ctx.arc(tx + 85, 155, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hanging vines
  for (let i = 0; i < 9; i++) {
    const vx2 = ((i * 190 - cameraX * 0.15 + worldWidth) % (vw + 190)) - 60;
    const vLen = 180 + (i % 3) * 60;
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(vx2, 0);
    ctx.quadraticCurveTo(vx2 + 20, vLen / 2, vx2, vLen);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(vx2, vLen, 10, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(vx2 + 4, vLen - 30, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fireflies
  for (let i = 0; i < 12; i++) {
    const fx = ((i * 173 - cameraX * 0.2 + worldWidth) % (vw + 173)) - 40;
    const fy = 300 + Math.sin(performance.now() * 0.001 + i * 0.9) * 80;
    const alpha = 0.4 + Math.sin(performance.now() * 0.003 + i * 1.7) * 0.35;
    ctx.fillStyle = `rgba(250,240,100,${alpha})`;
    ctx.beginPath();
    ctx.arc(fx, fy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawUnderwaterParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, '#0c4a6e');
  sky.addColorStop(1, '#0284c7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  // Light rays from top
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const rx = ((i * 260 - cameraX * 0.06 + worldWidth) % (vw + 260)) - 130;
    ctx.fillStyle = `rgba(125,211,252,${0.06 + (i % 2) * 0.04})`;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + 60, 0);
    ctx.lineTo(rx + 120, vh);
    ctx.lineTo(rx - 40, vh);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Seaweed / coral wavy lines
  for (let i = 0; i < 10; i++) {
    const sx = ((i * 170 - cameraX * 0.18 + worldWidth) % (vw + 170)) - 60;
    ctx.strokeStyle = i % 2 === 0 ? '#15803d' : '#0ea5e9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, 560);
    for (let s = 0; s < 5; s++) {
      const xOff = Math.sin(performance.now() * 0.002 + i + s) * 10;
      ctx.lineTo(sx + xOff, 560 - s * 24);
    }
    ctx.stroke();
  }

  // Bubbles
  for (let i = 0; i < 16; i++) {
    const bx = ((i * 179 - cameraX * 0.1 + worldWidth) % (vw + 179)) - 40;
    const by = vh - ((performance.now() * 0.04 + i * 177) % (vh * 1.2));
    ctx.strokeStyle = 'rgba(186,230,253,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, 4 + (i % 4), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawVoidParallax(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  worldWidth: number,
  vw: number,
  vh: number,
) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, vw, vh);

  // Neon energy particles
  for (let i = 0; i < 50; i++) {
    const px = (i * 193 - cameraX * 0.07 + worldWidth * 2) % vw;
    const py = (i * 137) % vh;
    const hue = (i * 37 + performance.now() * 0.05) % 360;
    const alpha = 0.3 + Math.sin(performance.now() * 0.002 + i) * 0.2;
    ctx.fillStyle = `hsla(${hue},100%,70%,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing rings
  for (let i = 0; i < 5; i++) {
    const rx = ((i * 310 - cameraX * 0.08 + worldWidth) % (vw + 310)) - 155;
    const ry = 200 + (i % 3) * 100;
    const radius = 40 + Math.sin(performance.now() * 0.002 + i * 1.3) * 15;
    const alpha = 0.3 + Math.sin(performance.now() * 0.003 + i) * 0.2;
    ctx.strokeStyle = `hsla(${270 + i * 30},100%,70%,${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Void tendrils (jagged lightning-bolt lines)
  for (let i = 0; i < 7; i++) {
    const tx = ((i * 230 - cameraX * 0.12 + worldWidth) % (vw + 230)) - 80;
    ctx.strokeStyle = `hsla(${280 + i * 20},100%,65%,0.4)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    for (let s = 1; s <= 8; s++) {
      const xOff = Math.sin(performance.now() * 0.003 + i * 2 + s) * 18;
      ctx.lineTo(tx + xOff, s * (vh / 8));
    }
    ctx.stroke();
  }
}

export const THEMES: Record<string, ThemeRenderer> = {
  swamp: {
    drawParallax: drawSwampParallax,
    groundColor: '#65a30d',
    groundAccentA: '#84cc16',
    groundAccentB: '#4d7c0f',
  },
  cave: {
    drawParallax: drawCaveParallax,
    groundColor: '#3b0764',
    groundAccentA: '#4c1d95',
    groundAccentB: '#2e1065',
  },
  sky: {
    drawParallax: drawSkyParallax,
    groundColor: '#6366f1',
    groundAccentA: '#a5b4fc',
    groundAccentB: '#4338ca',
  },
  lava: {
    drawParallax: drawLavaParallax,
    groundColor: '#7c2d12',
    groundAccentA: '#dc2626',
    groundAccentB: '#92400e',
  },
  fortress: {
    drawParallax: drawFortressParallax,
    groundColor: '#1e1b4b',
    groundAccentA: '#312e81',
    groundAccentB: '#1e1b4b',
  },
  ice: {
    drawParallax: drawIceParallax,
    groundColor: '#93c5fd',
    groundAccentA: '#bfdbfe',
    groundAccentB: '#60a5fa',
  },
  desert: {
    drawParallax: drawDesertParallax,
    groundColor: '#b45309',
    groundAccentA: '#d97706',
    groundAccentB: '#92400e',
  },
  jungle: {
    drawParallax: drawJungleParallax,
    groundColor: '#15803d',
    groundAccentA: '#22c55e',
    groundAccentB: '#166534',
  },
  underwater: {
    drawParallax: drawUnderwaterParallax,
    groundColor: '#0369a1',
    groundAccentA: '#0ea5e9',
    groundAccentB: '#075985',
  },
  void: {
    drawParallax: drawVoidParallax,
    groundColor: '#4c1d95',
    groundAccentA: '#7c3aed',
    groundAccentB: '#2e1065',
  },
};
