'use client'

import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

/** Label printer settings — stored in tbl_printer_setting.layout_json for
 *  printers whose "Applies To" is Barcode Labels or QR Code Labels. */
export type LabelLayout = {
  labelWidthMm: number
  labelHeightMm: number
  showName: boolean
  showPrice: boolean
  showCode: boolean
  rotate: 0 | 180
}

export const DEFAULT_LABEL_LAYOUT: LabelLayout = {
  labelWidthMm: 50, labelHeightMm: 25,
  showName: true, showPrice: true, showCode: true, rotate: 0,
}

/** Common label-roll sizes (width × height in mm). */
export const LABEL_PRESETS: [number, number][] = [
  [25, 15], [30, 20], [32, 25], [35, 25], [38, 25], [40, 20], [40, 25], [40, 30],
  [50, 25], [50, 30], [50, 40], [57, 32], [60, 40], [70, 40], [75, 50],
  [100, 50], [100, 75], [100, 100], [100, 150],
]

export function readLabelLayout(json: string | null | undefined): LabelLayout {
  try {
    const p = JSON.parse(json || '{}') || {}
    const w = Number(p.labelWidthMm), h = Number(p.labelHeightMm)
    return {
      labelWidthMm: w >= 10 && w <= 200 ? w : DEFAULT_LABEL_LAYOUT.labelWidthMm,
      labelHeightMm: h >= 10 && h <= 300 ? h : DEFAULT_LABEL_LAYOUT.labelHeightMm,
      showName: typeof p.showName === 'boolean' ? p.showName : DEFAULT_LABEL_LAYOUT.showName,
      showPrice: typeof p.showPrice === 'boolean' ? p.showPrice : DEFAULT_LABEL_LAYOUT.showPrice,
      showCode: typeof p.showCode === 'boolean' ? p.showCode : DEFAULT_LABEL_LAYOUT.showCode,
      rotate: p.rotate === 180 ? 180 : 0,
    }
  } catch {
    return { ...DEFAULT_LABEL_LAYOUT }
  }
}

export type LabelContent = {
  kind: 'barcode' | 'qr'
  value: string          // what the code encodes (product code or SKU)
  name?: string
  price?: number | null
  currency?: string
}

const DOTS_PER_MM = 8 // 203 dpi — the resolution of almost every label printer

/** Ellipsis-truncate `text` into at most `maxLines` lines of `maxWidth` px. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width <= maxWidth || !cur) { cur = next } else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    lines.length = maxLines
    let last = lines[maxLines - 1]
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1)
    lines[maxLines - 1] = last + '…'
  }
  return lines.map(l => {
    let s = l
    while (s.length > 1 && ctx.measureText(s).width > maxWidth) s = s.slice(0, -1)
    return s
  })
}

/**
 * Draws one label at printer resolution and returns it as a PNG data URL.
 * Exactly the label size, so the printer prints one label per image.
 */
export async function renderLabel(content: LabelContent, layout: LabelLayout): Promise<string> {
  const W = Math.round(layout.labelWidthMm * DOTS_PER_MM)
  const H = Math.round(layout.labelHeightMm * DOTS_PER_MM)
  const pad = Math.round(1.5 * DOTS_PER_MM)
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#000'; ctx.textBaseline = 'top'

  const fontPx = Math.max(14, Math.min(36, Math.round(H * 0.11)))
  const priceText = layout.showPrice && content.price != null && Number.isFinite(content.price)
    ? `${content.currency || 'Rs'} ${Number(content.price).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
    : ''
  const nameText = layout.showName && content.name ? content.name : ''

  if (content.kind === 'qr') {
    const side = W >= H * 1.4 // wide label → QR on the left, text on the right
    const qrSize = side ? H - pad * 2 : Math.min(W - pad * 2, H - pad * 2 - (nameText ? fontPx * 2 : 0) - (priceText ? fontPx + 4 : 0) - (layout.showCode ? fontPx : 0))
    const qrCanvas = document.createElement('canvas')
    // margin: 2 modules of white around the code — scanners need a quiet zone.
    await QRCode.toCanvas(qrCanvas, content.value, { width: Math.max(40, qrSize), margin: 2 })
    if (side) {
      ctx.drawImage(qrCanvas, pad, (H - qrCanvas.height) / 2)
      const x = pad * 2 + qrCanvas.width, tw = W - x - pad
      const lines: { text: string; px: number; bold: boolean }[] = []
      if (nameText) { ctx.font = `bold ${fontPx}px Arial`; wrap(ctx, nameText, tw, 3).forEach(l => lines.push({ text: l, px: fontPx, bold: true })) }
      if (layout.showCode) lines.push({ text: content.value, px: fontPx, bold: false })
      if (priceText) lines.push({ text: priceText, px: Math.round(fontPx * 1.3), bold: true })
      const total = lines.reduce((s, l) => s + l.px * 1.2, 0)
      let y = Math.max(pad, (H - total) / 2)
      ctx.textAlign = 'left'
      for (const l of lines) { ctx.font = `${l.bold ? 'bold ' : ''}${l.px}px Arial`; ctx.fillText(l.text, x, y, tw); y += l.px * 1.2 }
    } else {
      let y = pad
      ctx.textAlign = 'center'
      if (nameText) { ctx.font = `bold ${fontPx}px Arial`; for (const l of wrap(ctx, nameText, W - pad * 2, 2)) { ctx.fillText(l, W / 2, y); y += fontPx * 1.15 } }
      ctx.drawImage(qrCanvas, (W - qrCanvas.width) / 2, y); y += qrCanvas.height + 2
      if (layout.showCode) { ctx.font = `${fontPx}px Arial`; ctx.fillText(content.value, W / 2, y); y += fontPx * 1.1 }
      if (priceText) { ctx.font = `bold ${fontPx}px Arial`; ctx.fillText(priceText, W / 2, y) }
    }
  } else {
    // Barcode: name on top, bars in the middle (+ code text), price at the bottom.
    let top = pad, bottom = H - pad
    ctx.textAlign = 'center'
    if (nameText) {
      ctx.font = `bold ${fontPx}px Arial`
      const lines = wrap(ctx, nameText, W - pad * 2, H >= 30 * DOTS_PER_MM ? 2 : 1)
      for (const l of lines) { ctx.fillText(l, W / 2, top); top += Math.round(fontPx * 1.15) }
      top += 2
    }
    if (priceText) {
      const pf = Math.round(fontPx * 1.15)
      ctx.font = `bold ${pf}px Arial`
      bottom -= pf
      ctx.fillText(priceText, W / 2, bottom)
      bottom -= 6
    }
    const codeFont = fontPx
    const textH = layout.showCode ? codeFont + 2 : 0
    const barH = Math.max(20, bottom - top - textH)
    // Widest whole-dot bar size that still fits — whole dots keep bars sharp and scannable.
    const probe = document.createElement('canvas')
    JsBarcode(probe, content.value, { format: 'CODE128', width: 1, height: 10, displayValue: false, margin: 0 })
    const unit = Math.max(1, Math.floor((W - pad * 2) / probe.width))
    const bc = document.createElement('canvas')
    JsBarcode(bc, content.value, {
      format: 'CODE128', width: unit, height: barH, margin: 0,
      displayValue: layout.showCode, fontSize: codeFont, font: 'Arial', fontOptions: 'bold', textMargin: 1,
    })
    const scale = Math.min(1, (W - pad * 2) / bc.width, (bottom - top) / bc.height)
    const dw = Math.floor(bc.width * scale), dh = Math.floor(bc.height * scale)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(bc, Math.round((W - dw) / 2), Math.round(top + (bottom - top - dh) / 2), dw, dh)
  }

  if (layout.rotate === 180) {
    const r = document.createElement('canvas'); r.width = W; r.height = H
    const rc = r.getContext('2d')!
    rc.translate(W, H); rc.rotate(Math.PI); rc.drawImage(canvas, 0, 0)
    return r.toDataURL('image/png')
  }
  return canvas.toDataURL('image/png')
}
