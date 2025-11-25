/**
 * OptimizedImage - Wrapper component for next/image
 * 
 * AI_DECISION: Create wrapper component for consistent image usage
 * Justificación: Provides consistent image optimization and easier migration path
 * Impacto: Automatic optimization, lazy loading, and responsive images
 * 
 * IMPORTANTE: Todas las imágenes en la aplicación deben usar este componente
 * en lugar de <img> tags o Image directamente para garantizar optimización automática.
 * 
 * Verificación: No se encontraron usos de <img> tags en el código (✅)
 * 
 * Usage:
 * ```tsx
 * <OptimizedImage
 *   src="/images/logo.png"
 *   alt="Company Logo"
 *   width={200}
 *   height={100}
 *   priority={false} // Set to true for above-the-fold images
 * />
 * ```
 * 
 * Best Practices:
 * - Use priority={true} for above-the-fold images (LCP candidates)
 * - Always specify width and height to prevent layout shift
 * - Use blur placeholder for better UX during loading
 * - Prefer WebP/AVIF formats (handled automatically by Next.js)
 */

'use client';

import Image from 'next/image';
import type { ImageProps } from 'next/image';
import { imageQuality } from '@/lib/image-config';

export interface OptimizedImageProps extends Omit<ImageProps, 'quality' | 'priority' | 'placeholder'> {
  /**
   * Image source (required)
   */
  src: ImageProps['src'];
  /**
   * Image alt text (required)
   */
  alt: string;
  /**
   * Image quality (1-100). Defaults to 75.
   * Higher values = better quality but larger file size.
   */
  quality?: number;
  /**
   * Whether this image should be prioritized for loading.
   * Set to true for above-the-fold images (LCP candidates).
   */
  priority?: boolean;
  /**
   * Placeholder type. 'blur' requires blurDataURL prop.
   */
  placeholder?: 'blur' | 'empty';
}

/**
 * OptimizedImage component
 * 
 * Wraps next/image with sensible defaults and consistent configuration.
 * Automatically handles:
 * - Image optimization (WebP/AVIF conversion)
 * - Lazy loading (unless priority=true)
 * - Responsive images
 * - Proper sizing
 */
export function OptimizedImage({
  quality = imageQuality.default,
  priority = false,
  placeholder = 'empty',
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      {...props}
      quality={quality}
      priority={priority}
      placeholder={placeholder}
      // Ensure proper sizing to prevent layout shift
      style={{
        ...props.style,
        maxWidth: '100%',
        height: 'auto',
      }}
    />
  );
}

