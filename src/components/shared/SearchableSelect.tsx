'use client'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SearchableOption = { value: string; label: string; sublabel?: string }

type Props = {
  options: SearchableOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * A dropdown that behaves like a native <select> (same value/onChange
 * contract, so it's a drop-in replacement) but lets you type to filter
 * the options and navigate the filtered list with the up/down arrow
 * keys, selecting with Enter — the way a real autocomplete works,
 * instead of a plain list you have to scroll through.
 *
 * The option list renders through a portal into document.body rather
 * than as a normal DOM child, positioned by measuring the trigger's
 * on-screen location. This is deliberate: this component gets used
 * inside cards that have `overflow: hidden` (for rounded corners), and
 * a normal absolutely-positioned child gets silently clipped by that —
 * every option past whatever fits inside the card's remaining height
 * just disappears, even though it's genuinely in the DOM. A portal
 * escapes that ancestor entirely.
 */
export default function SearchableSelect({
  options, value, onChange, placeholder = 'Select…', className = 'form-control', disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (rect) setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  const openDropdown = () => {
    if (disabled) return
    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width })
    setOpen(true)
    setQuery('')
    setHighlighted(Math.max(0, options.findIndex(o => o.value === value)))
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const pick = (opt: SearchableOption) => {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) pick(filtered[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {!open ? (
        <div
          className={className}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: disabled ? 0.6 : 1 }}
          onClick={openDropdown}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDropdown() } }}
        >
          <span style={{ color: selected ? 'inherit' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? selected.label : placeholder}
          </span>
          <i className="fa fa-caret-down" style={{ opacity: 0.5, marginLeft: 6 }} />
        </div>
      ) : (
        <input
          ref={inputRef}
          className={className}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlighted(0) }}
          onKeyDown={handleKeyDown}
          placeholder="Type to search…"
          autoFocus
        />
      )}

      {open && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'absolute', top: coords.top, left: coords.left, width: coords.width, zIndex: 20000,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
          maxHeight: 240, overflowY: 'auto', boxShadow: '0 8px 24px rgba(20,20,43,0.15)', marginTop: 2,
        }}>
          {filtered.length > 0 ? filtered.map((opt, i) => (
            <div
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); pick(opt) }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: i === highlighted ? '#eef0ff' : '#fff',
                color: '#1a1d29',
              }}
            >
              {opt.label}
              {opt.sublabel && <span style={{ color: '#8a90a3', fontSize: 11, marginLeft: 6 }}>{opt.sublabel}</span>}
            </div>
          )) : (
            <div style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 13 }}>No matches</div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
