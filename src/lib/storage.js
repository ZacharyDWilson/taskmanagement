import { supabase } from './supabase.js'

const BUCKET = 'uploads'
const MAX_SIDE = 1080         // post photos
const THUMB_SIDE = 480        // the small copy the feed shows until you tap a photo
const BANNER_SIDE = 1200       // banner pictures are wide
const AVATAR_SIDE = 384       // profile pictures are only ever shown small
const CACHE = '31536000'      // files never change once uploaded, so browsers may keep them for a year

export const publicUrl = path =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null

// the small copy of a post photo (GIFs and older photos have none, so the feed falls back to the full file)
export const thumbPath = path => (path && /\.jpg$/.test(path) ? path.replace(/\.jpg$/, '.t.jpg') : null)
export const thumbUrl = path => publicUrl(thumbPath(path))

// Downscale to keep uploads small, then store as JPEG under the user's folder.
async function shrink(file, side = MAX_SIDE, quality = 0.78) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, side / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
}

export const MAX_GIF_BYTES = 5 * 1024 * 1024   // the uploads bucket itself stops at 5 MB

// `allowGif`: the person owns the animated-picture perk, so a GIF is stored as is (it would lose its
// movement if redrawn to a canvas). Without it a GIF becomes a still of its first frame, like any photo.
// `kind`: 'post' also stores a small copy for the feed; 'avatar' stores one small square-ish file.
export async function uploadImage(file, userId, { allowGif = false, kind = 'post' } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  if (allowGif && file.type === 'image/gif') {
    if (file.size > MAX_GIF_BYTES) throw new Error('That GIF is over 5 MB. Try a shorter or smaller one.')
    const gifPath = `${userId}/${stamp}.gif`
    const up = await supabase.storage.from(BUCKET).upload(gifPath, file, { contentType: 'image/gif', cacheControl: CACHE })
    if (up.error) throw up.error
    return gifPath
  }
  const blob = await shrink(file, kind === 'avatar' ? AVATAR_SIDE : kind === 'banner' ? BANNER_SIDE : MAX_SIDE, kind === 'avatar' ? 0.82 : 0.78)
  const path = `${userId}/${stamp}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: CACHE })
  if (error) throw error
  if (kind === 'post') {
    // the small copy is a bonus: if it fails the feed simply shows the full photo
    try {
      const small = await shrink(file, THUMB_SIDE, 0.7)
      await supabase.storage.from(BUCKET).upload(thumbPath(path), small, { contentType: 'image/jpeg', cacheControl: CACHE })
    } catch { /* ignore */ }
  }
  return path
}

// removes the file and its small copy
export async function removeImage(path) {
  if (!path) return
  const list = [path, thumbPath(path)].filter(Boolean)
  await supabase.storage.from(BUCKET).remove(list)
}
