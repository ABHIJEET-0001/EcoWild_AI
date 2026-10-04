/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        ivory: '#FDFBF7',
        sand: '#F5F0E8',
        'forest-green': '#1A3C34',
        'moss-green': '#2D5A4E',
        charcoal: '#2C322B',
        'text-primary': '#1C1917',
        'text-secondary': '#57534E',
        'text-muted': '#A8A29E',
        'border-subtle': '#E7E5E4',
        'border-medium': '#D6D3D1',
        'amber-warning': '#F59E0B',
        'red-critical': '#E11D48',
      },
      boxShadow: {
        'soft': '0 1px 4px rgba(0,0,0,0.05)',
        'medium': '0 4px 12px rgba(0,0,0,0.07)',
        'premium': '0 8px 32px rgba(0,0,0,0.09)',
      },
      animation: {
        'detection-pulse': 'detection-pulse 2.2s ease-out infinite',
        'connection-flow': 'connection-flow 1.4s ease-in-out infinite',
        'slide-in-up': 'slide-in-up 0.45s cubic-bezier(0.4,0,0.2,1) forwards',
        'number-count': 'number-count 0.55s ease-out forwards',
        'border-glow': 'border-glow 1.8s ease-in-out infinite',
        'map-marker': 'map-marker-expand 1.6s ease-out infinite',
        'radar': 'radar-sweep 12s linear infinite',
        'blip': 'blip-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
