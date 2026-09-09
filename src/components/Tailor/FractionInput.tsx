'use client'
import React, { useState, useEffect } from 'react'
import { formatAsFraction } from '@/lib/formatMeasurement'

type Props = {
  value: string // decimal string, e.g. "23.5" — what's actually stored/sent to the server
  onChange: (decimalValue: string) => void
  className?: string
  placeholder?: string
}

// Converts typed text like "23 1/2", "23-1/2", "23.5", or "23½" into a
// plain decimal string. Returns '' if the text doesn't parse as a number.
function parseToDecimal(text: string): string {
  const t = text.trim()
  if (!t) return ''

  // Common fraction glyphs tailors actually type/paste
  const glyphMap: Record<string, string> = { '½': '.5', '¼': '.25', '¾': '.75', '⅓': '.333', '⅔': '.667' }
  for (const [glyph, dec] of Object.entries(glyphMap)) {
    if (t.endsWith(glyph)) {
      const whole = t.slice(0, -glyph.length).trim()
      const n = whole === '' ? 0 : Number(whole)
      if (!isNaN(n)) return (n + Number(dec)).toString()
    }
  }

  // "23 1/2" or "23-1/2" style: whole number + space/dash + fraction
  const mixed = t.match(/^(-?\d+(?:\.\d+)?)[\s-]+(\d+)\/(\d+)$/)
  if (mixed) {
    const whole = Number(mixed[1])
    const num = Number(mixed[2])
    const den = Number(mixed[3])
    if (den !== 0) return (whole + num / den).toString()
  }

  // Plain fraction with no whole part: "1/2"
  const plainFraction = t.match(/^(-?\d+)\/(\d+)$/)
  if (plainFraction) {
    const num = Number(plainFraction[1])
    const den = Number(plainFraction[2])
    if (den !== 0) return (num / den).toString()
  }

  // Plain decimal/integer
  if (/^-?\d+(\.\d+)?$/.test(t)) return t

  return '' // unparseable — leave as invalid, don't guess
}

export default function FractionInput({ value, onChange, className = 'form-control', placeholder }: Props) {
  const [text, setText] = useState(formatAsFraction(value))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setText(formatAsFraction(value))
  }, [value])

  const commit = (raw: string) => {
    if (raw.trim() === '') {
      setInvalid(false)
      onChange('')
      return
    }
    const decimal = parseToDecimal(raw)
    if (decimal === '') {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onChange(decimal)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      style={invalid ? { borderColor: '#d9403a' } : undefined}
      value={text}
      placeholder={placeholder || 'e.g. 23 1/2'}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      title="Enter a plain number, a fraction like 23 1/2, or 23.5"
    />
  )
}
