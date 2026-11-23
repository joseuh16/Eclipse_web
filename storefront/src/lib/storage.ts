import { getDownloadURL, ref, uploadString } from 'firebase/storage'
import { storage } from './firebase'

/**
 * Sube una foto de verificación +18 a Storage y devuelve su URL pública.
 * Si Storage no está habilitado o las reglas lo impiden, el checkout usa la
 * versión comprimida (dataURL) como respaldo dentro del pedido.
 */
export async function uploadAdultVerification(
  dataUrl: string,
  kind: 'document' | 'selfie',
): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const storageRef = ref(storage, `verifications/${id}/${kind}.jpg`)
  await uploadString(storageRef, dataUrl, 'data_url', { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef)
}

/**
 * Sube la credencial de estudiante a la carpeta privada del uid autenticado.
 * Si Storage falla, se devuelve el dataURL comprimido para no perder la foto.
 */
export async function uploadStudentCredential(dataUrl: string, uid: string): Promise<string> {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const storageRef = ref(storage, `student-verifications/${uid}/${id}-credential.jpg`)
    await uploadString(storageRef, dataUrl, 'data_url', { contentType: 'image/jpeg' })
    return await getDownloadURL(storageRef)
  } catch {
    return dataUrl
  }
}
