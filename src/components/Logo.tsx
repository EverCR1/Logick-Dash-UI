import { brand } from '@/config/brand'

/** Logo de la marca. Úsalo en cualquier parte del sistema en lugar de hardcodear la ruta. */
export function Logo({ size = 32, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src={brand.logo}
      width={size}
      height={size}
      alt={brand.name}
      className={className}
      style={{ objectFit: 'contain', display: 'block', ...style }}
    />
  )
}
