'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRGeneratorProps {
  value: string;
  size?: number;
}

export function QRGenerator({ value, size = 120 }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [value, size]);

  return <canvas ref={canvasRef} />;
}
