import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '../lib/utils'

interface ProductImageProps {
  src: string
  alt: string
  className?: string
  eager?: boolean
}

export function ProductImage({ src, alt, className, eager = false }: ProductImageProps) {
  const [failed, setFailed] = useState(!src)
  const hasFit = Boolean(className?.includes('object-'))

  if (failed) {
    return (
      <div
        className={cn(
          'grid h-full w-full place-items-center bg-gradient-to-br from-primary/30 via-[#141425] to-secondary/20',
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <div className="flex flex-col items-center gap-2 text-white/35">
          <ImageOff size={22} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em]">Eclipse</span>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn('h-full w-full', !hasFit && 'object-contain', className)}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
