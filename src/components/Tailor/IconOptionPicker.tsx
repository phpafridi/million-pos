'use client'
import React from 'react'

type Props = {
  options: { value: string; label: string; Icon: React.ComponentType }[]
  value: string
  onChange: (value: string) => void
}

export default function IconOptionPicker({ options, value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              width: 74, padding: '8px 4px 6px', cursor: 'pointer',
              background: selected ? '#eef0ff' : '#fff',
              border: selected ? '2px solid #6366f1' : '1px solid #e5e7eb',
              borderRadius: 10,
              transition: 'all .12s',
            }}
          >
            <div style={{ width: 40, height: 40 }}>
              <opt.Icon />
            </div>
            <span style={{
              fontSize: 10, textAlign: 'center', lineHeight: 1.2,
              color: selected ? '#4338ca' : '#6b7280', fontWeight: selected ? 700 : 500,
            }}>
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
