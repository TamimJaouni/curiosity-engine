export default function manifest() {
  return {
    name: 'Intellectual OS',
    short_name: 'Intellectual OS',
    description: 'Discover, understand, connect, and remember ideas that matter.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0d10',
    theme_color: '#0b0d10',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
  };
}
