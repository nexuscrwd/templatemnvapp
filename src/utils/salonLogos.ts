import { generateSalonLogoSvg, generateSalonIconSvg } from './defaultSalonAssets';

export function getSalonLogo(name?: string, variant: 'light' | 'dark' | 'icon' = 'dark'): string {
  const salonName = name || 'Estabelecimento';
  if (variant === 'icon') {
    return generateSalonIconSvg(salonName, false);
  }
  return generateSalonLogoSvg(salonName, variant === 'dark');
}
