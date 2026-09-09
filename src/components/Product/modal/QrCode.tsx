'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

type Props = {
  value: string;
  size?: number;
  displayValue?: boolean;
};

export default function QrCode({ value, size = 120, displayValue = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 0,
    }).catch((err) => console.error('Failed to render QR code:', err));
  }, [value, size]);

  return (
    <div style={{ display: 'inline-block', textAlign: 'center' }}>
      <canvas ref={canvasRef} aria-label={`QR code ${value}`} />
      {displayValue && <div style={{ fontSize: 11, marginTop: 2 }}>{value}</div>}
    </div>
  );
}
