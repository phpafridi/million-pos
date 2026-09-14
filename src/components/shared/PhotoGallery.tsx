'use client'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { DeleteEntityPhoto } from '@/lib/entityPhotos'
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog'

type Photo = { photo_id: number; file_name: string; caption?: string | null; uploaded_by: string; uploaded_at: string }

export default function PhotoGallery({ photos, canDelete, onDeleted }: {
  photos: Photo[]
  canDelete?: boolean
  onDeleted?: (photoId: number) => void
}) {
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Photo | null>(null)

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await DeleteEntityPhoto(pendingDelete.photo_id)
      toast.success('Photo removed')
      onDeleted?.(pendingDelete.photo_id)
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove photo')
    } finally {
      setPendingDelete(null)
    }
  }

  if (photos.length === 0) {
    return <p className="text-muted" style={{ fontSize: 13 }}>No photos uploaded yet.</p>
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((p) => (
          <div
            key={p.photo_id}
            style={{ position: 'relative', width: 90, height: 90, cursor: 'pointer' }}
            onClick={() => setLightbox(p)}
          >
            <img
              src={`/api/uploads/${encodeURIComponent(p.file_name)}`}
              alt={p.caption || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, border: '1px solid #d1d5db' }}
            />
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); setPendingDelete(p) }}
                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#d9403a', color: '#fff', border: 'none', fontSize: 12, lineHeight: '20px', cursor: 'pointer' }}
              >×</button>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={`/api/uploads/${encodeURIComponent(lightbox.file_name)}`}
            alt={lightbox.caption || ''}
            style={{ maxWidth: '90%', maxHeight: '80%', objectFit: 'contain', borderRadius: 8 }}
          />
          <div style={{ color: '#fff', marginTop: 12, fontSize: 13, textAlign: 'center' }}>
            {lightbox.caption && <div>{lightbox.caption}</div>}
            <div style={{ opacity: 0.7 }}>Uploaded by {lightbox.uploaded_by} — {new Date(lightbox.uploaded_at).toLocaleString()}</div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
        title="Remove Photo"
        description="Are you sure you want to remove this photo? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  )
}
