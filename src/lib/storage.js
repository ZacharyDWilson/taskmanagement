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

export const MAX_GIF_BYTES = 3 * 1024 * 1024

// `allowGif`: the person owns the animated-picture perk, so a GIF is stored as is (it would lose its
// movement if redrawn to a canvas). Without it a GIF becomes a still of its first frame, like any photo.
export async function uploadImage(file, userId, { allowGif = false } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (allowGif && file.type === 'image/gif') {
    if (file.size > MAX_GIF_BYTES) throw new Error('That GIF is over 3 MB. Try a shorter or smaller one.')
    const gifPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.gif`
    const up = await supabase.storage.from(BUCKET).upload(gifPath, file, { contentType: 'image/gif' })
    if (up.error) throw up.error
    return gifPath
  }
  const blob = await shrink(file)
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function removeImage(path) {
  if (path) await supabase.storage.from(BUCKET).remove([path])
}
