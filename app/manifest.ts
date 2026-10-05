import type { MetadataRoute } from 'next';

/** Served at /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Night Seder',
    short_name: 'Night Seder',
    description: 'Attendance for night seder and the daf yomi shiur.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f2f2f7',
    theme_color: '#5856d6',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Android crops maskable icons to a circle or squircle, so this one keeps
      // the emblem well inside the safe area rather than losing the rays.
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
