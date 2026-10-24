'use client'

export default function DraftBanner({
  savedAt, label, onResume, onDiscard,
}: { savedAt: number; label: string; onResume: () => void; onDiscard: () => void }) {
  return (
    <div
      style={{
        background: '#fff8e1', border: '1px solid #f5c542', color: '#5d4a00',
        padding: '8px 12px', margin: '6px 10px', borderRadius: 4, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}
    >
      <span style={{ flex: 1 }}>
        Unsaved {label} draft found from {new Date(savedAt).toLocaleString()}.
      </span>
      <button type="button" className="btn btn-xs btn-success" onClick={onResume}>Resume draft</button>
      <button type="button" className="btn btn-xs btn-default" onClick={onDiscard}>Discard</button>
    </div>
  )
}
