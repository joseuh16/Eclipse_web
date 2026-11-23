// ---------------------------------------------------------------------------
// Utilidades de imagen del cliente.
// Comprime fotos (credencial/selfie) antes de adjuntarlas al pedido para no
// enviar archivos enormes a Realtime Database.
// ---------------------------------------------------------------------------

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('No pudimos leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('La imagen no es válida.'))
    image.src = src
  })
}

export async function compressImageFile(file: File, maxSize = 900, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona una imagen (JPG, PNG o WEBP).')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('La imagen es muy grande (máximo 12 MB).')
  }

  const dataUrl = await readAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return dataUrl

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}
