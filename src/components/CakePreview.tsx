import { useEffect, useRef } from 'react';
import { drawCakeBody } from '../game/renderer';
import type { CakeStyle } from '../game/types';

interface CakePreviewProps {
  style: CakeStyle;
  locked?: boolean;
  width?: number;
  height?: number;
}

export function CakePreview({ style, locked = false, width = 120, height = 52 }: CakePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (locked) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.filter = 'grayscale(0.9)';
      drawCakeBody(ctx, style, width / 2, height / 2 + 2, width * 0.78, height * 0.62, 1, 0, 0, 0);
      ctx.restore();
    } else {
      drawCakeBody(ctx, style, width / 2, height / 2 + 2, width * 0.82, height * 0.64, 1, 0, 0, 0);
    }
  }, [style, locked, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="block shrink-0"
      aria-label={style.name}
    />
  );
}
