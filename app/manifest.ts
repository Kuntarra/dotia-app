import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'dotia · Trazabilidad de personal',
    short_name: 'dotia',
    description: 'Trazabilidad de personal y logística de dotación en faena.',
    start_url: '/admin',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B7E60',
    theme_color: '#0B7E60',
    icons: [
      { src: '/logo-simbolo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/logo-simbolo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo-simbolo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
