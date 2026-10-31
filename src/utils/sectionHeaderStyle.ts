import { SalonAdminSettings } from '../types';

export function getSectionHeaderStyleData(adminSettings: Partial<SalonAdminSettings>, isDark: boolean) {
  const bgCol = adminSettings.sectionHeaderBgColor;
  const txtCol = adminSettings.sectionHeaderTextColor;
  const iconCol = adminSettings.sectionHeaderIconColor || '#10b981';
  const bgStyle = adminSettings.sectionHeaderBgStyle || 'glass';
  const border = adminSettings.sectionHeaderBorder || 'bordered';

  // Opções de Estilização de Botões / Crachás da Barra de Títulos
  const btnBgCol = adminSettings.sectionHeaderBtnBgColor;
  const btnFont = adminSettings.sectionHeaderBtnFont || 'Poppins';
  const btnShadow = adminSettings.sectionHeaderBtnShadow || 'none';
  const btnBlur = adminSettings.sectionHeaderBtnBlur || 'none';
  const btnBorder = adminSettings.sectionHeaderBtnBorder || 'bordered';

  // Cálculo de Sombra
  let shadowCss = 'none';
  if (btnShadow === 'subtle') shadowCss = '0 2px 8px -2px rgba(0,0,0,0.3)';
  else if (btnShadow === 'medium') shadowCss = '0 4px 16px -2px rgba(0,0,0,0.5)';
  else if (btnShadow === 'glow') shadowCss = `0 0 14px ${iconCol}80`;

  // Cálculo de Blur (Desfoque)
  let blurCss = 'none';
  if (btnBlur === 'sm') blurCss = 'blur(4px)';
  else if (btnBlur === 'md') blurCss = 'blur(8px)';
  else if (btnBlur === 'lg') blurCss = 'blur(16px)';

  const borderClass = border === 'none' ? 'border-b-0' : (isDark ? 'border-b border-slate-800' : 'border-b border-slate-200');
  let bgClass = '';
  if (!bgCol) {
    if (bgStyle === 'solid') {
      bgClass = isDark ? 'bg-slate-900' : 'bg-slate-100';
    } else if (bgStyle === 'transparent') {
      bgClass = 'bg-transparent';
    } else {
      bgClass = isDark ? 'bg-slate-900/95 backdrop-blur-md' : 'bg-slate-100/95 backdrop-blur-md shadow-xs';
    }
  }

  return {
    containerClass: `w-full shrink-0 px-3.5 py-2.5 min-h-[44px] flex items-center justify-between transition-all sticky top-0 z-30 ${borderClass} ${bgClass}`,
    containerStyle: bgCol ? { backgroundColor: bgCol } : undefined,
    titleStyle: txtCol ? { color: txtCol, fontFamily: btnFont } : { fontFamily: btnFont },
    iconStyle: { color: iconCol },
    badgeStyle: {
      color: txtCol || iconCol,
      backgroundColor: btnBgCol || `${iconCol}1a`,
      borderColor: btnBorder === 'none' ? 'transparent' : `${iconCol}33`,
      fontFamily: btnFont,
      boxShadow: shadowCss,
      backdropFilter: blurCss,
      WebkitBackdropFilter: blurCss,
    },
    btnStyle: {
      fontFamily: btnFont,
      boxShadow: shadowCss,
      backdropFilter: blurCss,
      WebkitBackdropFilter: blurCss,
    },
  };
}
