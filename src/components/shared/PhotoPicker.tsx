'use client'
import React, { useRef, useState } from 'react'

export default function PhotoPicker({ files, onChange, label = 'Photos' }: {
  files: File[]
  onChange: (files: File[]) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    const combined = [...files, ...selected]
    onChange(combined)
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))])
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeAt = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx))
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label>{label}</label>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleSelect}
          className="form-control"
        />
      </div>
      {previews.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {previews.map((src, idx) => (
            <div key={idx} style={{ position: 'relative', width: 72, height: 72 }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, border: '1px solid #d1d5db' }} />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#d9403a', color: '#fff', border: 'none', fontSize: 12, lineHeight: '20px', cursor: 'pointer' }}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
