'use server'
import { join } from 'path'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, formatFileSize } from '@/lib/uploadLimits'

export type EntityType = 'tailor_order' | 'damage_product' | 'return' | 'warehouse_stock'

export type UploadPhotosResult = { success: true; count: number } | { success: false; error: string }

export async function UploadEntityPhotos(entity_type: EntityType, entity_id: number, files: File[], uploaded_by: string): Promise<UploadPhotosResult> {
  if (files.length === 0) return { success: true, count: 0 }

  // All of a record's photos arrive in one request, so the limit applies to
  // their combined size. This RETURNS an error rather than throwing,
  // because Next.js hides the message of anything thrown from a Server
  // Action in production — the user would only ever see a generic failure.
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
  if (totalBytes > MAX_UPLOAD_BYTES) {
    return {
      success: false,
      error: `These photos total ${formatFileSize(totalBytes)}, which is over the ${MAX_UPLOAD_MB} MB limit for one upload. Please remove some and try again.`,
    }
  }

  const uploadsDir = join(process.cwd(), 'uploads')
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  const created = []
  for (const file of files) {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`
    await writeFile(join(uploadsDir, fileName), buffer)
    created.push({ entity_type, entity_id, file_name: fileName, uploaded_by })
  }

  await prisma.tbl_entity_photo.createMany({ data: created })
  return { success: true, count: created.length }
}

export async function FetchEntityPhotos(entity_type: EntityType, entity_id: number) {
  const photos = await prisma.tbl_entity_photo.findMany({
    where: { entity_type, entity_id },
    orderBy: { uploaded_at: 'desc' },
  })
  return photos.map((p) => ({ ...p, uploaded_at: p.uploaded_at.toISOString() }))
}

export async function DeleteEntityPhoto(photo_id: number) {
  const photo = await prisma.tbl_entity_photo.findUnique({ where: { photo_id } })
  if (!photo) throw new Error('Photo not found')

  try {
    await unlink(join(process.cwd(), 'uploads', photo.file_name))
  } catch {
    // File already gone from disk — still remove the DB record below
  }

  await prisma.tbl_entity_photo.delete({ where: { photo_id } })
  return { success: true }
}
