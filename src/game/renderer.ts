import { PLATE_WIDTH } from './cakeStyles';
import type {
  CakeStyle,
  CakeTier,
  CreamDrop,
  CreamOoze,
  FallingSlice,
  FloatingText,
  Particle,
  ScreenSplat,
} from './types';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: RGB, c2: RGB, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(lerp(c1.r, c2.r, clamped));
  const g = Math.round(lerp(c1.g, c2.g, clamped));
  const b = Math.round(lerp(c1.b, c2.b, clamped));
  return `rgb(${r}, ${g}, ${b})`;
}

const SKY_STOPS: { at: number; top: RGB; bottom: RGB }[] = [
  {
    // Daytime Washi Tearoom
    at: 0,
    top: { r: 243, g: 236, b: 223 },
    bottom: { r: 232, g: 221, b: 202 },
  },
  {
    // Golden Sunset Tea Balcony
    at: 0.35,
    top: { r: 236, g: 194, b: 158 },
    bottom: { r: 245, g: 223, b: 194 },
  },
  {
    // Kyoto Plum Twilight
    at: 0.68,
    top: { r: 74, g: 68, b: 96 },
    bottom: { r: 168, g: 122, b: 126 },
  },
  {
    // Starry Matcha Midnight
    at: 1.0,
    top: { r: 20, g: 34, b: 29 },
    bottom: { r: 44, g: 67, b: 56 },
  },
];

function sampleSkyColors(altitudeRatio: number): { top: string; bottom: string } {
  const t = Math.max(0, Math.min(1, altitudeRatio));
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const a = SKY_STOPS[i];
    const b = SKY_STOPS[i + 1];
    if (t >= a.at && t <= b.at) {
      const localT = (t - a.at) / (b.at - a.at);
      return {
        top: lerpColor(a.top, b.top, localT),
        bottom: lerpColor(a.bottom, b.bottom, localT),
      };
    }
  }
  const last = SKY_STOPS[SKY_STOPS.length - 1];
  return {
    top: `rgb(${last.top.r}, ${last.top.g}, ${last.top.b})`,
    bottom: `rgb(${last.bottom.r}, ${last.bottom.g}, ${last.bottom.b})`,
  };
}

export interface WorldTransform {
  width: number;
  height: number;
  centerX: number;
  baseScreenY: number;
  scale: number;
  cameraY: number;
}

export function worldToScreenX(worldX: number, tf: WorldTransform): number {
  return tf.centerX + worldX * tf.scale;
}

export function worldToScreenY(worldY: number, tf: WorldTransform): number {
  return tf.baseScreenY - (worldY - tf.cameraY) * tf.scale;
}

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  tf: WorldTransform,
  timeSec: number,
  floors: number
): void {
  const altitudeRatio = Math.min(1, tf.cameraY / 1150);
  const { top, bottom } = sampleSkyColors(altitudeRatio);

  const grad = ctx.createLinearGradient(0, 0, 0, tf.height);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, tf.width, tf.height);

  // Twinkling stars & crescent moon at high altitude
  if (altitudeRatio > 0.45) {
    const nightAlpha = Math.min(1, (altitudeRatio - 0.45) / 0.35);
    ctx.save();
    for (let i = 0; i < 36; i++) {
      const sx = ((i * 197.3) % 1) * tf.width;
      const sy = ((i * 83.7) % 0.72) * tf.height;
      const twinkle = 0.45 + 0.55 * Math.sin(timeSec * 2.1 + i * 1.7);
      ctx.fillStyle = `rgba(255, 248, 224, ${nightAlpha * twinkle * 0.75})`;
      const r = i % 5 === 0 ? 2.1 : 1.3;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crescent Moon in upper right calm zone
    const moonX = tf.width * 0.82;
    const moonY = tf.height * 0.19;
    ctx.globalAlpha = nightAlpha * 0.85;
    ctx.fillStyle = '#FDF4D6';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.arc(moonX + 8, moonY - 5, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Soft parallax paper clouds in mid-sky
  if (altitudeRatio > 0.1) {
    const cloudAlpha = Math.min(0.45, (altitudeRatio - 0.1) * 0.8) * (1 - Math.max(0, altitudeRatio - 0.75));
    if (cloudAlpha > 0.02) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 250, 240, ${cloudAlpha})`;
      for (let i = 0; i < 4; i++) {
        const cx = ((tf.width * (0.18 + i * 0.28) + timeSec * (6 + i * 2)) % (tf.width + 160)) - 80;
        const cy = tf.height * (0.24 + (i % 2) * 0.16) + (tf.cameraY * 0.08 * tf.scale) % 120;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 52, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 24, cy + 4, 28, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 26, cy + 5, 30, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Tearoom Shoji lattice & wooden pillars (fade gently as tower rises above roof)
  const roomAlpha = Math.max(0, 1 - tf.cameraY / 380);
  if (roomAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = roomAlpha;

    const parallaxOffset = tf.cameraY * 0.55 * tf.scale;
    const shojiTop = -parallaxOffset;
    const panelWidth = Math.min(110, tf.width * 0.22);

    // Subtle left & right shoji screens so the center playfield stays airy and readable
    const drawShojiSide = (xStart: number, w: number) => {
      ctx.fillStyle = 'rgba(255, 251, 242, 0.55)';
      ctx.fillRect(xStart, shojiTop, w, tf.height + parallaxOffset);

      ctx.strokeStyle = 'rgba(138, 107, 78, 0.25)';
      ctx.lineWidth = 2;
      const cols = 3;
      const rows = 9;
      for (let c = 0; c <= cols; c++) {
        const lx = xStart + (w / cols) * c;
        ctx.beginPath();
        ctx.moveTo(lx, shojiTop);
        ctx.lineTo(lx, tf.height);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const ly = shojiTop + ((tf.height * 0.85) / rows) * r;
        ctx.beginPath();
        ctx.moveTo(xStart, ly);
        ctx.lineTo(xStart + w, ly);
        ctx.stroke();
      }
    };

    drawShojiSide(0, panelWidth);
    drawShojiSide(tf.width - panelWidth, panelWidth);

    // Matcha Noren curtain valance near the top beam
    const norenH = 44 * Math.min(1.15, tf.scale);
    const norenCount = Math.max(3, Math.floor(tf.width / 150));
    const slitW = tf.width / norenCount;
    ctx.fillStyle = 'rgba(74, 114, 65, 0.22)';
    for (let i = 0; i < norenCount; i++) {
      const nx = i * slitW + 3;
      const nw = slitW - 6;
      ctx.fillRect(nx, Math.max(-norenH, -parallaxOffset * 0.7), nw, norenH);
    }

    ctx.restore();
  }

  // Warm swaying paper lanterns (提燈) flanking the far sides
  const lanternAlpha = Math.max(0.18, 1 - altitudeRatio * 0.5);
  ctx.save();
  ctx.globalAlpha = lanternAlpha;
  const sideInset = Math.max(38, tf.width * 0.08);
  const drawLantern = (lx: number, baseY: number, phase: number) => {
    const sway = Math.sin(timeSec * 1.4 + phase) * 4;
    const ly = baseY + ((tf.cameraY * 0.35 * tf.scale) % (tf.height + 160));
    const wrappedY = ((ly % (tf.height + 160)) + (tf.height + 160)) % (tf.height + 160) - 80;

    ctx.strokeStyle = 'rgba(92, 68, 48, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx, wrappedY - 45);
    ctx.lineTo(lx + sway, wrappedY - 16);
    ctx.stroke();

    ctx.save();
    ctx.translate(lx + sway, wrappedY);
    ctx.rotate(sway * 0.015);
    // Glow halo when dusk/night
    if (altitudeRatio > 0.25) {
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
      glow.addColorStop(0, 'rgba(255, 206, 117, 0.42)');
      glow.addColorStop(1, 'rgba(255, 206, 117, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#F7E7C6';
    ctx.strokeStyle = '#73533B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Wooden caps
    ctx.fillStyle = '#5B3F2B';
    ctx.fillRect(-7, -17, 14, 3);
    ctx.fillRect(-7, 14, 14, 3);
    ctx.restore();
  };

  if (tf.width >= 340) {
    drawLantern(sideInset, tf.height * 0.28, 0);
    drawLantern(tf.width - sideInset, tf.height * 0.44, 2.1);
  }
  ctx.restore();

  // Subtle floor elevation markers every 5 floors on the far edge
  ctx.save();
  const baseFloor = Math.max(5, Math.floor(floors / 5) * 5);
  for (let f = Math.max(5, baseFloor - 5); f <= baseFloor + 10; f += 5) {
    const markerWorldY = f * 38;
    const sy = worldToScreenY(markerWorldY, tf);
    if (sy > 50 && sy < tf.height - 40) {
      const textColor = altitudeRatio > 0.55 ? 'rgba(244, 239, 230, 0.35)' : 'rgba(74, 53, 37, 0.26)';
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(tf.centerX - 175 * tf.scale, sy);
      ctx.lineTo(tf.centerX - 110 * tf.scale, sy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = textColor;
      ctx.font = `600 ${Math.round(11 * Math.max(0.9, tf.scale * 0.92))}px "Zen Maru Gothic", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${f}F`, tf.centerX - 175 * tf.scale, sy - 5);
    }
  }
  ctx.restore();
}

export function drawCounterAndPlate(ctx: CanvasRenderingContext2D, tf: WorldTransform): void {
  const groundScreenY = worldToScreenY(0, tf);
  if (groundScreenY > tf.height + 80) return;

  const plateScreenW = PLATE_WIDTH * tf.scale;
  const plateTopH = 14 * tf.scale;
  const footW = 128 * tf.scale;
  const footH = 22 * tf.scale;
  const counterTopY = groundScreenY + plateTopH + footH;

  // Hinoki wooden counter surface below stand
  if (counterTopY < tf.height) {
    const woodGrad = ctx.createLinearGradient(0, counterTopY, 0, tf.height);
    woodGrad.addColorStop(0, '#D8B98E');
    woodGrad.addColorStop(0.12, '#C7A373');
    woodGrad.addColorStop(1, '#9A7548');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, counterTopY, tf.width, tf.height - counterTopY);

    // Subtle counter rim highlight
    ctx.fillStyle = '#EAD2AE';
    ctx.fillRect(0, counterTopY, tf.width, 4 * tf.scale);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(110, 74, 38, 0.14)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i++) {
      const gy = counterTopY + i * 24 * tf.scale;
      if (gy < tf.height) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(tf.width, gy);
        ctx.stroke();
      }
    }
  }

  // Stand shadow on counter
  ctx.fillStyle = 'rgba(58, 39, 22, 0.22)';
  ctx.beginPath();
  ctx.ellipse(tf.centerX, counterTopY + 3 * tf.scale, footW * 0.72, 6 * tf.scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pedestal stand foot
  ctx.fillStyle = '#6B4930';
  ctx.beginPath();
  ctx.moveTo(tf.centerX - footW * 0.34, groundScreenY + plateTopH);
  ctx.lineTo(tf.centerX + footW * 0.34, groundScreenY + plateTopH);
  ctx.lineTo(tf.centerX + footW * 0.5, counterTopY);
  ctx.lineTo(tf.centerX - footW * 0.5, counterTopY);
  ctx.closePath();
  ctx.fill();

  // Top serving tray (高足木盤)
  const plateX = tf.centerX - plateScreenW / 2;
  const trayGrad = ctx.createLinearGradient(plateX, groundScreenY, plateX, groundScreenY + plateTopH);
  trayGrad.addColorStop(0, '#9E734B');
  trayGrad.addColorStop(0.35, '#825B38');
  trayGrad.addColorStop(1, '#5D3E24');

  ctx.fillStyle = trayGrad;
  ctx.beginPath();
  ctx.roundRect(plateX, groundScreenY, plateScreenW, plateTopH, [4 * tf.scale, 4 * tf.scale, 8 * tf.scale, 8 * tf.scale]);
  ctx.fill();

  // Rim highlight & center aim notch
  ctx.fillStyle = '#B88D63';
  ctx.fillRect(plateX + 6 * tf.scale, groundScreenY, plateScreenW - 12 * tf.scale, 2.5 * tf.scale);

  // Subtle center target crest on tray
  ctx.fillStyle = '#D9B98A';
  ctx.beginPath();
  ctx.arc(tf.centerX, groundScreenY + plateTopH * 0.55, 3.2 * tf.scale, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCakeBody(
  ctx: CanvasRenderingContext2D,
  style: CakeStyle,
  screenCenterX: number,
  screenCenterY: number,
  screenWidth: number,
  screenHeight: number,
  scale: number,
  squash = 0,
  angle = 0,
  widenGlow = 0
): void {
  if (screenWidth <= 0.5 || screenHeight <= 0.5) return;

  ctx.save();
  ctx.translate(screenCenterX, screenCenterY);
  if (angle !== 0) {
    ctx.rotate(angle);
  }

  // Squash & stretch around bottom-center feel
  const sy = 1 - squash * 0.22;
  const sx = 1 + squash * 0.14;
  ctx.scale(sx, sy);

  const w = screenWidth;
  const h = screenHeight;
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(6 * scale, w * 0.22, h * 0.25);

  // Widen celebration aura
  if (widenGlow > 0.01) {
    ctx.save();
    ctx.shadowColor = 'rgba(217, 155, 38, 0.85)';
    ctx.shadowBlur = 18 * widenGlow * scale;
    ctx.fillStyle = 'rgba(255, 232, 160, 0.35)';
    ctx.beginPath();
    ctx.roundRect(x - 3 * scale, y - 3 * scale, w + 6 * scale, h + 6 * scale, radius + 2);
    ctx.fill();
    ctx.restore();
  }

  // Clip strictly to the cake slice's exact width so overhang cuts are razor-clean
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  // Sponge base multi-stop gradient (horizontal depth + vertical matcha richness)
  const spongeGrad = ctx.createLinearGradient(x, y, x, y + h);
  spongeGrad.addColorStop(0, style.glazeHighlight);
  spongeGrad.addColorStop(0.28, style.spongeColor);
  spongeGrad.addColorStop(0.76, style.spongeColor);
  spongeGrad.addColorStop(1, style.spongeShadow);
  ctx.fillStyle = spongeGrad;
  ctx.fillRect(x, y, w, h);

  // Side cylindrical shading gradient
  const sideGrad = ctx.createLinearGradient(x, y, x + w, y);
  sideGrad.addColorStop(0, 'rgba(38, 28, 16, 0.22)');
  sideGrad.addColorStop(0.16, 'rgba(255, 255, 255, 0.08)');
  sideGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.14)');
  sideGrad.addColorStop(0.84, 'rgba(255, 255, 255, 0.04)');
  sideGrad.addColorStop(1, 'rgba(38, 28, 16, 0.24)');
  ctx.fillStyle = sideGrad;
  ctx.fillRect(x, y, w, h);

  // Subtle sponge crumb speckles
  ctx.fillStyle = style.spongeSpeckle;
  ctx.globalAlpha = 0.22;
  const step = Math.max(10 * scale, 8);
  for (let px = x + 6 * scale; px < x + w - 4 * scale; px += step) {
    const offset = ((Math.round(px) * 17) % 11) * 0.08;
    ctx.beginPath();
    ctx.arc(px, y + h * (0.38 + offset * 0.35), 1.3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 4 * scale, y + h * (0.78 - offset * 0.25), 1.1 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Middle whipped cream / curd filling band with subtle gradient
  const bandY = y + h * 0.49;
  const bandH = h * 0.2;
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  bandGrad.addColorStop(0, style.fillingColor);
  bandGrad.addColorStop(1, style.spongeColor);
  ctx.fillStyle = style.fillingColor;
  ctx.fillRect(x, bandY, w, bandH * 0.85);
  ctx.fillStyle = bandGrad;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(x, bandY + bandH * 0.65, w, bandH * 0.35);
  ctx.globalAlpha = 1;

  // Extra mille-crepe horizontal layers for peach_blush
  if (style.topping === 'peach_blush') {
    ctx.fillStyle = 'rgba(255, 246, 240, 0.55)';
    ctx.fillRect(x, y + h * 0.32, w, 2 * scale);
    ctx.fillRect(x, y + h * 0.78, w, 2 * scale);
  }

  // Top frosting / glaze with lush gradient and gentle organic drips
  const glazeH = h * 0.28;
  const glazeGrad = ctx.createLinearGradient(0, y, 0, y + glazeH + 3 * scale);
  glazeGrad.addColorStop(0, style.glazeHighlight);
  glazeGrad.addColorStop(0.45, style.glazeColor);
  glazeGrad.addColorStop(1, style.spongeShadow);
  ctx.fillStyle = glazeGrad;
  ctx.fillRect(x, y, w, glazeH);

  // Wavy glaze drips along front edge
  const dripPeriod = 18 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y + glazeH - 1);
  for (let dx = x; dx <= x + w; dx += dripPeriod) {
    const dripDepth = ((Math.abs(Math.round(dx / scale)) % 3) + 1) * 2.3 * scale;
    ctx.quadraticCurveTo(dx + dripPeriod * 0.5, y + glazeH + dripDepth, Math.min(x + w, dx + dripPeriod), y + glazeH - 1);
  }
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();

  // Signature patisserie toppings inside clipped width
  drawCakeTopping(ctx, style, x, y, w, h, scale);

  // Crisp subtle bottom shadow lip so stacked layers separate clearly
  ctx.fillStyle = 'rgba(42, 28, 16, 0.18)';
  ctx.fillRect(x, y + h - 2.2 * scale, w, 2.2 * scale);

  ctx.restore();

  // Subtle crisp outline outside clip for tactile 2D illustration clarity
  ctx.save();
  ctx.translate(screenCenterX, screenCenterY);
  if (angle !== 0) ctx.rotate(angle);
  ctx.scale(sx, sy);
  ctx.strokeStyle = 'rgba(54, 36, 20, 0.24)';
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
}

function drawCakeTopping(
  ctx: CanvasRenderingContext2D,
  style: CakeStyle,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number
): void {
  const topY = y + 3.5 * scale;
  switch (style.topping) {
    case 'matcha_drizzle': {
      ctx.strokeStyle = style.accentColor;
      ctx.lineWidth = 1.6 * scale;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      const step = 14 * scale;
      ctx.moveTo(x + 4 * scale, topY + 2 * scale);
      for (let px = x + 4 * scale; px < x + w - 4 * scale; px += step) {
        ctx.lineTo(px + step * 0.5, topY - 1 * scale);
        ctx.lineTo(Math.min(x + w - 4 * scale, px + step), topY + 3.5 * scale);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'almond_cream': {
      ctx.fillStyle = style.accentColor;
      const spacing = 22 * scale;
      for (let px = x + 12 * scale; px < x + w - 8 * scale; px += spacing) {
        ctx.beginPath();
        ctx.ellipse(px, topY + 2 * scale, 4.2 * scale, 1.8 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'strawberry': {
      const spacing = 28 * scale;
      for (let px = x + 16 * scale; px < x + w - 10 * scale; px += spacing) {
        // Little strawberry slices nestled on glaze
        ctx.fillStyle = '#C92A3E';
        ctx.beginPath();
        ctx.arc(px, topY + 2.5 * scale, 4.2 * scale, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = style.accentColor;
        ctx.fillRect(px - 1.5 * scale, topY - 2.5 * scale, 3 * scale, 1.8 * scale);
      }
      break;
    }
    case 'chestnut_swirl': {
      ctx.strokeStyle = style.accentColor;
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      for (let px = x + 4 * scale; px <= x + w - 4 * scale; px += 6 * scale) {
        const wy = topY + 2 * scale + Math.sin(px * 0.25) * 2 * scale;
        if (px === x + 4 * scale) ctx.moveTo(px, wy);
        else ctx.lineTo(px, wy);
      }
      ctx.stroke();
      break;
    }
    case 'warabi_cube': {
      const spacing = 24 * scale;
      for (let px = x + 12 * scale; px < x + w - 10 * scale; px += spacing) {
        ctx.fillStyle = 'rgba(235, 200, 130, 0.85)';
        ctx.fillRect(px - 3.5 * scale, topY - 1 * scale, 7 * scale, 5 * scale);
      }
      break;
    }
    case 'peach_blush': {
      ctx.fillStyle = '#FFD9CE';
      const spacing = 24 * scale;
      for (let px = x + 14 * scale; px < x + w - 8 * scale; px += spacing) {
        ctx.beginPath();
        ctx.ellipse(px, topY + 2.2 * scale, 5 * scale, 2 * scale, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'black_sesame': {
      const spacing = 16 * scale;
      for (let px = x + 10 * scale; px < x + w - 6 * scale; px += spacing) {
        ctx.fillStyle = style.accentColor;
        ctx.beginPath();
        ctx.ellipse(px, topY + 2.4 * scale, 2.2 * scale, 1.1 * scale, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'gold_yuzu': {
      const spacing = 26 * scale;
      for (let px = x + 14 * scale; px < x + w - 8 * scale; px += spacing) {
        ctx.fillStyle = style.accentColor;
        ctx.beginPath();
        ctx.moveTo(px, topY - 1 * scale);
        ctx.lineTo(px + 4.5 * scale, topY + 2.5 * scale);
        ctx.lineTo(px - 2.5 * scale, topY + 4 * scale);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
  void h;
}

export function drawPendulum(
  ctx: CanvasRenderingContext2D,
  tf: WorldTransform,
  pivotX: number,
  pivotY: number,
  cakeX: number,
  cakeY: number,
  cakeW: number,
  cakeH: number,
  cakeAngle: number,
  style: CakeStyle,
  isSwinging: boolean
): void {
  const pScreenX = worldToScreenX(pivotX, tf);
  const pScreenY = worldToScreenY(pivotY, tf);
  const cScreenX = worldToScreenX(cakeX, tf);
  const cScreenY = worldToScreenY(cakeY, tf);

  if (isSwinging) {
    const topAttachX = cScreenX + Math.sin(cakeAngle) * (cakeH * 0.5 * tf.scale);
    const topAttachY = cScreenY - Math.cos(cakeAngle) * (cakeH * 0.5 * tf.scale);

    // Braided hemp rope
    ctx.save();
    ctx.strokeStyle = '#9C7E54';
    ctx.lineWidth = Math.max(2, 2.6 * tf.scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pScreenX, pScreenY);
    ctx.lineTo(topAttachX, topAttachY);
    ctx.stroke();

    // Subtle weave highlight
    ctx.strokeStyle = 'rgba(246, 232, 200, 0.5)';
    ctx.lineWidth = Math.max(1, 1 * tf.scale);
    ctx.setLineDash([4 * tf.scale, 5 * tf.scale]);
    ctx.beginPath();
    ctx.moveTo(pScreenX, pScreenY);
    ctx.lineTo(topAttachX, topAttachY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Top ceiling wood ring / pulley anchor
    if (pScreenY > -20) {
      ctx.fillStyle = '#5D3E24';
      ctx.beginPath();
      ctx.arc(pScreenX, Math.max(4, pScreenY), 6 * tf.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D9B98A';
      ctx.beginPath();
      ctx.arc(pScreenX, Math.max(4, pScreenY), 2.5 * tf.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bamboo pastry clasp gripping the cake top
    ctx.translate(topAttachX, topAttachY);
    ctx.rotate(cakeAngle);
    ctx.strokeStyle = '#5D3E24';
    ctx.lineWidth = Math.max(1.8, 2.2 * tf.scale);
    ctx.beginPath();
    ctx.moveTo(-7 * tf.scale, 5 * tf.scale);
    ctx.quadraticCurveTo(-5 * tf.scale, -5 * tf.scale, 0, -6 * tf.scale);
    ctx.quadraticCurveTo(5 * tf.scale, -5 * tf.scale, 7 * tf.scale, 5 * tf.scale);
    ctx.stroke();
    ctx.restore();
  }

  // Draw the active cake (either swinging or falling)
  drawCakeBody(
    ctx,
    style,
    cScreenX,
    cScreenY,
    cakeW * tf.scale,
    cakeH * tf.scale,
    tf.scale,
    0,
    cakeAngle,
    0
  );
}

export function drawStackedTiers(
  ctx: CanvasRenderingContext2D,
  tf: WorldTransform,
  tiers: CakeTier[]
): void {
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const centerY = tier.y + tier.height / 2;
    const sy = worldToScreenY(centerY, tf);
    // Cull offscreen tiers cleanly
    if (sy < -100 || sy > tf.height + 100) continue;

    const sx = worldToScreenX(tier.x, tf);
    drawCakeBody(
      ctx,
      tier.style,
      sx,
      sy,
      tier.width * tf.scale,
      tier.height * tf.scale,
      tf.scale,
      tier.squash,
      0,
      tier.widenGlow
    );
  }
}

export function drawFallingSlices(
  ctx: CanvasRenderingContext2D,
  tf: WorldTransform,
  slices: FallingSlice[]
): void {
  for (const slice of slices) {
    const sx = worldToScreenX(slice.x, tf);
    const sy = worldToScreenY(slice.y, tf);
    if (sy > tf.height + 140) continue;
    ctx.save();
    ctx.globalAlpha = slice.opacity;
    drawCakeBody(
      ctx,
      slice.style,
      sx,
      sy,
      slice.width * tf.scale,
      slice.height * tf.scale,
      tf.scale,
      0,
      slice.angle,
      0
    );
    ctx.restore();
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  tf: WorldTransform,
  particles: Particle[]
): void {
  for (const p of particles) {
    if (!p.active) continue;
    const sx = worldToScreenX(p.x, tf);
    const sy = worldToScreenY(p.y, tf);
    const alpha = Math.max(0, p.life / p.maxLife);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(sx, sy);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;

    const sz = p.size * tf.scale;
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, sz, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'petal') {
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 1.4, sz * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'flake') {
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz * 0.9, 0);
      ctx.lineTo(0, sz);
      ctx.lineTo(-sz * 0.9, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-sz * 0.7, -sz * 0.7, sz * 1.4, sz * 1.4);
    }
    ctx.restore();
  }
}

export function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  tf: WorldTransform,
  texts: FloatingText[]
): void {
  for (const ft of texts) {
    const sx = worldToScreenX(ft.x, tf);
    const sy = worldToScreenY(ft.y, tf);
    const progress = 1 - ft.life / ft.maxLife;
    const alpha = progress < 0.7 ? 1 : Math.max(0, (1 - progress) / 0.3);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';

    const mainSize = Math.round(17 * ft.scale * Math.max(0.85, tf.scale));
    ctx.font = `900 ${mainSize}px "Zen Maru Gothic", "Noto Sans TC", sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 250, 240, 0.92)';
    ctx.strokeText(ft.text, sx, sy);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, sx, sy);

    if (ft.subtext) {
      const subSize = Math.round(12 * Math.max(0.88, tf.scale));
      ctx.font = `700 ${subSize}px "Zen Maru Gothic", "Noto Sans TC", sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeText(ft.subtext, sx, sy + mainSize * 1.05);
      ctx.fillStyle = '#4A3525';
      ctx.fillText(ft.subtext, sx, sy + mainSize * 1.05);
    }
    ctx.restore();
  }
}

export function drawAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  tf: WorldTransform,
  activeX: number,
  activeY: number,
  activeWidth: number,
  targetX: number,
  targetWidth: number,
  targetTopY: number,
  cakeHeight: number,
  isPerfectAligned: boolean,
  isNightSky: boolean
): void {
  const activeBottomY = activeY - cakeHeight / 2;
  if (activeBottomY <= targetTopY) return;

  const topScreenY = worldToScreenY(activeBottomY, tf);
  const targetScreenY = worldToScreenY(targetTopY, tf);

  const targetLeftX = worldToScreenX(targetX - targetWidth / 2, tf);
  const targetRightX = worldToScreenX(targetX + targetWidth / 2, tf);
  const targetCenterX = worldToScreenX(targetX, tf);

  const activeLeftX = worldToScreenX(activeX - activeWidth / 2, tf);
  const activeRightX = worldToScreenX(activeX + activeWidth / 2, tf);
  const activeCenterX = worldToScreenX(activeX, tf);

  ctx.save();

  // 1. Target footprint highlight strip on top of the stack/plate
  const stripColor = isPerfectAligned
    ? 'rgba(234, 179, 8, 0.55)'
    : isNightSky
      ? 'rgba(244, 239, 230, 0.25)'
      : 'rgba(61, 107, 53, 0.28)';
  ctx.fillStyle = stripColor;
  ctx.fillRect(targetLeftX, targetScreenY - 2 * tf.scale, targetRightX - targetLeftX, 3 * tf.scale);

  // 2. Vertical edge alignment rails rising from target cake edges
  ctx.strokeStyle = isPerfectAligned
    ? 'rgba(234, 179, 8, 0.85)'
    : isNightSky
      ? 'rgba(244, 239, 230, 0.34)'
      : 'rgba(93, 62, 36, 0.26)';
  ctx.lineWidth = isPerfectAligned ? 1.8 * tf.scale : 1.2 * tf.scale;
  ctx.setLineDash([5 * tf.scale, 5 * tf.scale]);

  ctx.beginPath();
  ctx.moveTo(targetLeftX, targetScreenY);
  ctx.lineTo(targetLeftX, topScreenY);
  ctx.moveTo(targetRightX, targetScreenY);
  ctx.lineTo(targetRightX, topScreenY);
  ctx.stroke();

  // 3. Subtle center plumb guide from swinging cake center toward target surface
  ctx.strokeStyle = isPerfectAligned
    ? 'rgba(107, 163, 83, 0.9)'
    : isNightSky
      ? 'rgba(255, 250, 240, 0.22)'
      : 'rgba(61, 107, 53, 0.22)';
  ctx.lineWidth = isPerfectAligned ? 1.8 * tf.scale : 1.1 * tf.scale;
  ctx.setLineDash([3 * tf.scale, 5 * tf.scale]);
  ctx.beginPath();
  ctx.moveTo(activeCenterX, topScreenY);
  ctx.lineTo(activeCenterX, targetScreenY);
  ctx.stroke();

  // 4. Projected landing shadow bracket on target surface showing exact active cake span
  ctx.setLineDash([]);
  ctx.strokeStyle = isPerfectAligned
    ? 'rgba(234, 179, 8, 0.95)'
    : isNightSky
      ? 'rgba(250, 245, 235, 0.45)'
      : 'rgba(61, 107, 53, 0.42)';
  ctx.lineWidth = 2 * tf.scale;
  ctx.beginPath();
  ctx.moveTo(activeLeftX, targetScreenY - 5 * tf.scale);
  ctx.lineTo(activeLeftX, targetScreenY);
  ctx.lineTo(activeRightX, targetScreenY);
  ctx.lineTo(activeRightX, targetScreenY - 5 * tf.scale);
  ctx.stroke();

  // Small center alignment diamond when inside perfect snap zone
  if (isPerfectAligned) {
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.moveTo(targetCenterX, targetScreenY - 8 * tf.scale);
    ctx.lineTo(targetCenterX + 4.5 * tf.scale, targetScreenY - 3.5 * tf.scale);
    ctx.lineTo(targetCenterX, targetScreenY + 1 * tf.scale);
    ctx.lineTo(targetCenterX - 4.5 * tf.scale, targetScreenY - 3.5 * tf.scale);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function drawCreamSplashes(
  ctx: CanvasRenderingContext2D,
  tf: WorldTransform,
  oozes: CreamOoze[],
  drops: CreamDrop[]
): void {
  // 1. Seam cream ooze wave when a cake lands and squishes whipped cream outward
  for (const ooze of oozes) {
    const progress = 1 - ooze.life / ooze.maxLife;
    const alpha = progress < 0.5 ? 0.92 : Math.max(0, 0.92 * (1 - (progress - 0.5) / 0.5));
    const sx = worldToScreenX(ooze.x, tf);
    const sy = worldToScreenY(ooze.y, tf);
    const expandW = (ooze.width + 26 * Math.sin(Math.min(1, progress * 2.2) * (Math.PI / 2))) * tf.scale;
    const thickness = (6.5 * (1 - progress * 0.45)) * tf.scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ooze.creamColor;
    ctx.beginPath();
    ctx.roundRect(sx - expandW / 2, sy - thickness * 0.5, expandW, thickness, thickness * 0.5);
    ctx.fill();

    // Side bulbous cream lobes squeezing out left & right
    ctx.beginPath();
    ctx.arc(sx - expandW / 2, sy, thickness * 0.65, 0, Math.PI * 2);
    ctx.arc(sx + expandW / 2, sy, thickness * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Matcha/glaze accent streak
    ctx.fillStyle = ooze.glazeColor;
    ctx.globalAlpha = alpha * 0.55;
    ctx.beginPath();
    ctx.roundRect(sx - expandW * 0.42, sy - thickness * 0.25, expandW * 0.84, thickness * 0.38, thickness * 0.2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Flying viscous cream splatter droplets with velocity-stretched tails
  for (const d of drops) {
    const sx = worldToScreenX(d.x, tf);
    const sy = worldToScreenY(d.y, tf);
    const lifeRatio = Math.max(0, d.life / d.maxLife);
    const r = d.radius * tf.scale * (0.65 + 0.35 * lifeRatio);
    const angle = Math.atan2(-d.vy, d.vx);
    const speed = Math.hypot(d.vx, d.vy);
    const stretch = Math.min(2.6, 1 + speed / 260);

    ctx.save();
    ctx.globalAlpha = Math.min(1, lifeRatio * 1.4);
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // Cream droplet body
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * stretch, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glossy cream highlight
    ctx.fillStyle = d.highlightColor;
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.ellipse(r * 0.2, -r * 0.22, r * 0.45, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawScreenSplats(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  splats: ScreenSplat[]
): void {
  for (const sp of splats) {
    const progress = 1 - sp.life / sp.maxLife;
    const popScale = progress < 0.12 ? 0.4 + (progress / 0.12) * 0.65 : 1 + Math.min(0.08, progress * 0.08);
    const alpha = progress > 0.72 ? Math.max(0, (1 - progress) / 0.28) : 0.92;

    const cx = sp.nx * width;
    const cy = sp.ny * height + sp.dripOffset * 0.25;
    const r = sp.radius * popScale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = sp.color;

    // Organic multi-lobe whipped cream splatter silhouette
    ctx.beginPath();
    const lobes = 7;
    for (let i = 0; i <= lobes * 4; i++) {
      const a = (i / (lobes * 4)) * Math.PI * 2;
      const wobble =
        1 +
        0.28 * Math.sin(a * lobes + sp.seed) +
        0.16 * Math.cos(a * 3 - sp.seed * 1.7);
      const px = cx + Math.cos(a) * r * wobble;
      const py = cy + Math.sin(a) * r * wobble;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Gravity cream drip trail hanging below main splatter
    const dripLen = Math.min(r * 1.9, sp.dripOffset);
    if (dripLen > 4) {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.22, cy + r * 0.55);
      ctx.quadraticCurveTo(cx - r * 0.14, cy + r * 0.65 + dripLen, cx, cy + r * 0.68 + dripLen);
      ctx.quadraticCurveTo(cx + r * 0.14, cy + r * 0.65 + dripLen, cx + r * 0.22, cy + r * 0.55);
      ctx.closePath();
      ctx.fill();
    }

    // Satellite mini cream dots around splatter
    for (let k = 0; k < 4; k++) {
      const sa = sp.seed + k * 1.65;
      const dist = r * (1.35 + (k % 2) * 0.35);
      const sx = cx + Math.cos(sa) * dist;
      const sy = cy + Math.sin(sa) * dist;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(3, r * (0.14 - k * 0.02)), 0, Math.PI * 2);
      ctx.fill();
    }

    // Glossy cream shine arc
    ctx.fillStyle = sp.highlightColor;
    ctx.globalAlpha = alpha * 0.65;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.28, r * 0.32, r * 0.16, -0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

