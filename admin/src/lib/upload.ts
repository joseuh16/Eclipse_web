import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-').replace(/^-+|-+$/g, '') || 'archivo'
}

export type UploadFolder = 'banners' | 'products' | 'site' | 'media'

export async function uploadImage(file: File, folder: UploadFolder): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido.')
  }
  return uploadFile(file, folder)
}

/** Sube la canción del dueño a Storage para usarla en la tienda (Eclipse +). */
export async function uploadAudio(file: File): Promise<string> {
  if (!file.type.startsWith('audio/')) {
    throw new Error('Selecciona un archivo de audio válido (mp3, m4a, ogg, wav).')
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('La canción debe pesar menos de 20 MB.')
  }
  return uploadFile(file, 'media')
}

async function uploadFile(file: File, folder: UploadFolder): Promise<string> {
  const stamp = Date.now()
  const path = `${folder}/${stamp}-${safeName(file.name)}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}
