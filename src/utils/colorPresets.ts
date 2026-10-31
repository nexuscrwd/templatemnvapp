export interface ColorPresetItem {
  label: string;
  name: string;
  hex: string;
}

export const getThemeColorPresets = (themeColor: string = '#20C933'): ColorPresetItem[] => {
  const primary = themeColor && themeColor.startsWith('#') ? themeColor : '#20C933';
  const lightTone = getDerivedLightTone(primary);
  const darkTone = getDerivedDarkTone(primary);

  return [
    { label: 'Sem cor', name: 'Transparente (Sem Cor)', hex: 'transparent' },
    { label: 'Cor Principal', name: 'Cor Principal do Tema', hex: primary },
    { label: 'Secundária Clara', name: 'Cor Secundária Clara', hex: lightTone },
    { label: 'Branco', name: 'Cor Branca (Terciária)', hex: '#ffffff' },
    { label: 'Preto / Escuro', name: 'Cor Preta / Escura (Quaternária)', hex: '#000000' },
    { label: 'Tom Escuro', name: 'Tom Secundário Escuro', hex: darkTone },
  ];
};

function getDerivedLightTone(hex: string): string {
  if (!hex || hex === 'transparent' || !hex.startsWith('#')) return '#e6f7ea';
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  // Blends 80% white + 20% primary color for a clean light pastel tint
  r = Math.round(r * 0.20 + 255 * 0.80);
  g = Math.round(g * 0.20 + 255 * 0.80);
  b = Math.round(b * 0.20 + 255 * 0.80);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getDerivedDarkTone(hex: string): string {
  if (!hex || hex === 'transparent' || !hex.startsWith('#')) return '#08501f';
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.max(0, Math.round(r * 0.45));
  g = Math.max(0, Math.round(g * 0.45));
  b = Math.max(0, Math.round(b * 0.45));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
