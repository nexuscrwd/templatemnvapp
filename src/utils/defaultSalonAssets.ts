/**
 * Ativos Oficiais Padrão (White-label & Dinâmico)
 * SVGs vetoriais limpos e neutros para estabelecimentos parceiros.
 */

export function generateSalonLogoSvg(salonName: string = 'Estabelecimento', isDark: boolean = true): string {
  const cleanName = salonName.trim() || 'Estabelecimento';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const accentColor = '#10B981';
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 70" width="360" height="70" fill="none">
  <g transform="translate(10, 15)">
    <rect width="40" height="40" rx="10" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="2"/>
    <path d="M14 26 L26 14 M14 14 L26 26" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <text x="62" y="42" fill="${textColor}" font-family="'Poppins', system-ui, sans-serif" font-size="20" font-weight="900" letter-spacing="1.2">${cleanName.toUpperCase()}</text>
</svg>
`)}`;
}

export function generateSalonIconSvg(salonName: string = 'Vagou', isDark: boolean = false): string {
  const initial = (salonName.trim() || 'V').slice(0, 2).toUpperCase();
  const bg = isDark ? '#151A1E' : '#E2E8F0';
  const textFill = isDark ? '#10B981' : '#0F172A';
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="${bg}"/>
  <text x="256" y="320" text-anchor="middle" fill="${textFill}" font-family="'Poppins', sans-serif" font-size="180" font-weight="900">${initial}</text>
</svg>
`)}`;
}

// Fallbacks genéricos limpos (sem referências a marcas fixas ou salões de demonstração)
export const DEFAULT_ROTA99_LOGO_DARK = '';
export const DEFAULT_ROTA99_LOGO_LIGHT = '';
export const DEFAULT_ROTA99_ICON = '';

/**
 * Avatar Clipart de Rosto Limpo (Vetor 100% SVG)
 */
export const DEFAULT_FACE_CLIPART_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="64" fill="#0F172A"/>
  <path d="M64 20C48.5 20 36 32.5 36 48C36 63.5 48.5 76 64 76C79.5 76 92 63.5 92 48C92 32.5 79.5 20 64 20Z" fill="#10B981"/>
  <path d="M22 116C22 93 40.8 74 64 74C87.2 74 106 93 106 116V122H22V116Z" fill="#10B981"/>
  <path d="M64 24C50.7 24 40 34.7 40 48C40 61.3 50.7 72 64 72C77.3 72 88 61.3 88 48C88 34.7 77.3 24 64 24Z" fill="#1E293B"/>
  <path d="M26 116C26 96.2 43 80 64 80C85 80 102 96.2 102 116V122H26V116Z" fill="#1E293B"/>
  <path d="M64 32C55.2 32 48 39.2 48 48C48 56.8 55.2 64 64 64C72.8 64 80 56.8 80 48C80 39.2 72.8 32 64 32Z" fill="#F8FAFC"/>
  <path d="M34 116C34 100.5 47.5 88 64 88C80.5 88 94 100.5 94 116V122H34V116Z" fill="#F8FAFC"/>
  <circle cx="58" cy="46" r="2.5" fill="#0F172A"/>
  <circle cx="70" cy="46" r="2.5" fill="#0F172A"/>
  <path d="M60 54C62 56 66 56 68 54" stroke="#0F172A" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>
`)}`;
