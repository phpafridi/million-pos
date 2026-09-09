'use client';

import { useEffect, useRef } from 'react';

import JsBarcode from 'jsbarcode';

type Props = {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF' | 'CODE39' | 'MSI' | 'Pharmacode' | 'Codabar';
  width?: number;
  height?: number;
  displayValue?: boolean;
};

export default function Barcode({
  value,
  format = 'CODE128',
  width = 2,
  height = 80,
  displayValue = true,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, value, {
      format,
      width,
      height,
      displayValue,
      margin: 0,
      fontOptions: 'bold',
    });
  }, [value, format, width, height, displayValue]);

  return <svg ref={svgRef} role="img" aria-label={`Barcode ${value}`} />;
}
