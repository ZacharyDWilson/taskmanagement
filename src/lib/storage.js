import { supabase } from './supabase.js'

const BUCKET = 'uploads'
const MAX_SIDE = 1280

export const publicUrl = path =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null

// Downscale to keep uploads small, then store as JPEG under the user's folder.
async function shrink(file) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

export async function uploadImage(file, userId) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  const blob = await shrink(file)
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function removeImage(path) {
  if (path) await supabase.storage.from(BUCKET).remove([path])
}
