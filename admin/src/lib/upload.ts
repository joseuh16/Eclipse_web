import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-').replace(/^-+|-+$/g, '') || 'archivo'
}

export type UploadFolder = 'banners' | 'products' | 'site'

export async function uploadImage(file: File, folder: UploadFolder): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido.')
  }
  const stamp = Date.now()
  const path = `${folder}/${stamp}-${safeName(file.name)}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}
