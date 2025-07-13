
import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlowUp',
    short_name: 'FlowUp',
    description: 'Votre plateforme de développement tout-en-un. Gérez vos projets, votre code, et collaborez avec une assistance IA.',
    start_url: '/',
    display: 'standalone',
    background_color: '#151618',
    theme_color: '#2563EB',
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
