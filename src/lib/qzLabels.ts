'use client'

// @ts-ignore — qz-tray ships without types
import qz from 'qz-tray'
import type { LabelLayout } from '@/lib/labelLayout'

/**
 * Sends a label image to a label printer through QZ Tray, `copies` times.
 * The page size is set to the label size with zero margin, so the printer
 * feeds exactly one label per copy (no blank labels, no browser header).
 */
export async function printLabelViaQz(printerName: string, layout: LabelLayout, pngDataUrl: string, copies: number) {
  const n = Math.max(1, Math.min(1000, Math.floor(copies) || 1))
  const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, '')
  let connectedHere = false
  try {
    if (!qz.websocket.isActive()) { await qz.websocket.connect(); connectedHere = true }
    const printer = await qz.printers.find(printerName)
    const config = qz.configs.create(printer, {
      size: { width: layout.labelWidthMm, height: layout.labelHeightMm },
      units: 'mm',
      margins: 0,
      copies: n,
      colorType: 'blackwhite',
      scaleContent: true,
      rasterize: true,
      interpolation: 'nearest-neighbor',
    })
    await qz.print(config, [{ type: 'pixel', format: 'image', flavor: 'base64', data: base64 }])
  } catch (err: any) {
    const msg = String(err?.message || err || '')
    if (/establish connection|websocket/i.test(msg)) {
      throw new Error("Cannot reach QZ Tray — make sure it's installed and running on this computer.")
    }
    if (/printer/i.test(msg) && /not|found|undefined/i.test(msg)) {
      throw new Error(`Printer "${printerName}" not found on this computer — the name in Settings > Printer Settings must match the Windows printer name exactly.`)
    }
    throw new Error(msg || 'Print failed')
  } finally {
    if (connectedHere) { try { await qz.websocket.disconnect() } catch { /* ignore */ } }
  }
}
