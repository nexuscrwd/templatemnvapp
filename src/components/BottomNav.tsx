import React from 'react';
import { Home, Calendar, LayoutDashboard, Scissors, Users, Store, Wrench, Wallet } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { UserPersona } from '../types';

export interface SalonNavContext {
  activeTab: 'home' | 'servicos' | 'vagas' | 'espaco' | 'equipe' | 'financeiro' | 'caixa' | 'personalizar' | 'utilidades' | 'dados' | 'visual';
  onSelectTab: (tab: 'home' | 'servicos' | 'vagas' | 'espaco' | 'equipe' | 'financeiro' | 'caixa' | 'personalizar' | 'utilidades' | 'dados' | 'visual') => void;
  ServicesIcon?: React.ComponentType<{ className?: string }>;
  SpaceIcon?: React.ComponentType<{ className?: string }>;
  spaceTabLabel?: string;
  vagasTabLabel?: string;
  isProfessionalMode?: boolean;
  currentPersona?: UserPersona;
  isProAdmin?: boolean;
  isOwnerOrManager?: boolean;
  isProfessionalStaff?: boolean;
  navStyle?: 'minimal' | 'solid' | 'boxed';
  navShape?: 'square' | 'circle';
  navBorder?: 'bordered' | 'none';
  navIconBorder?: 'bordered' | 'none';
  navBgStyle?: 'solid' | 'glass' | 'transparent';
  navBgColor?: string;
  navBtnBgColor?: string;
  navBtnActiveBgColor?: string;
  navActiveColor?: string;
  navTextColor?: string;
  navBtnShadow?: 'none' | 'subtle' | 'medium' | 'glow';
  navBtnBlur?: 'none' | 'sm' | 'md' | 'lg';
  navBtnFont?: string;
}

interface BottomNavProps {
  salonContext?: SalonNavContext | null;
  activeTab?: 'home' | 'servicos' | 'vagas' | 'espaco' | 'equipe' | 'financeiro' | 'caixa' | 'personalizar' | 'utilidades' | 'dados' | 'visual';
  onSelectTab?: (tab: 'home' | 'servicos' | 'vagas' | 'espaco' | 'equipe' | 'financeiro' | 'caixa' | 'personalizar' | 'utilidades' | 'dados' | 'visual') => void;
  ServicesIcon?: React.ComponentType<{ className?: string }>;
  SpaceIcon?: React.ComponentType<{ className?: string }>;
  spaceTabLabel?: string;
  vagasTabLabel?: string;
  isProfessionalMode?: boolean;
  currentPersona?: UserPersona;
  isProAdmin?: boolean;
  isOwnerOrManager?: boolean;
  isProfessionalStaff?: boolean;
  navStyle?: 'minimal' | 'solid' | 'boxed';
  navShape?: 'square' | 'circle';
  navBorder?: 'bordered' | 'none';
  navIconBorder?: 'bordered' | 'none';
  navBgStyle?: 'solid' | 'glass' | 'transparent';
  navBgColor?: string;
  navBtnBgColor?: string;
  navBtnActiveBgColor?: string;
  navActiveColor?: string;
  navTextColor?: string;
  navBtnShadow?: 'none' | 'subtle' | 'medium' | 'glow';
  navBtnBlur?: 'none' | 'sm' | 'md' | 'lg';
  navBtnFont?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  salonContext,
  activeTab: propActiveTab,
  onSelectTab: propOnSelectTab,
  ServicesIcon: propServicesIcon,
  SpaceIcon: propSpaceIcon,
  spaceTabLabel: propSpaceTabLabel,
  vagasTabLabel: propVagasTabLabel,
  isProfessionalMode: propIsProfessionalMode,
  currentPersona: propPersona,
  isOwnerOrManager: propIsOwnerOrManager,
  isProfessionalStaff: propIsProfessionalStaff,
  navStyle: propNavStyle,
  navShape: propNavShape,
  navBorder: propNavBorder,
  navIconBorder: propNavIconBorder,
  navBgStyle: propNavBgStyle,
  navBgColor: propNavBgColor,
  navBtnBgColor: propNavBtnBgColor,
  navBtnActiveBgColor: propNavBtnActiveBgColor,
  navActiveColor: propNavActiveColor,
  navTextColor: propNavTextColor,
  navBtnShadow: propNavBtnShadow,
  navBtnBlur: propNavBtnBlur,
  navBtnFont: propNavBtnFont,
}) => {
  const { isDark } = useTheme();

  const activeTab = propActiveTab || salonContext?.activeTab || 'home';
  const onSelectTab = propOnSelectTab || salonContext?.onSelectTab;
  const currentPersona = propPersona || salonContext?.currentPersona || (propIsProfessionalMode ? 'pro' : 'cliente');
  const isOwnerOrManager = propIsOwnerOrManager ?? salonContext?.isOwnerOrManager ?? (currentPersona !== 'cliente');
  const isProfessionalStaff = propIsProfessionalStaff ?? salonContext?.isProfessionalStaff ?? false;
  const vagasTabLabel = propVagasTabLabel || salonContext?.vagasTabLabel || (isOwnerOrManager || isProfessionalStaff ? 'Agenda' : 'Agendar');
  const spaceTabLabel = propSpaceTabLabel || salonContext?.spaceTabLabel || 'Espaço';
  const ServicesIconComponent = propServicesIcon || salonContext?.ServicesIcon || Scissors;
  const SpaceIconComponent = propSpaceIcon || salonContext?.SpaceIcon || Store;
  const navStyle = propNavStyle || salonContext?.navStyle || 'minimal';
  const navShape = propNavShape || salonContext?.navShape || 'square';
  const navBorder = propNavBorder || salonContext?.navBorder || 'bordered';
  const navIconBorder = propNavIconBorder || salonContext?.navIconBorder || 'none';
  const navBgStyle = propNavBgStyle || salonContext?.navBgStyle || 'glass';
  const navBgColor = propNavBgColor || salonContext?.navBgColor;
  const navBtnBgColor = propNavBtnBgColor || salonContext?.navBtnBgColor;
  const navBtnActiveBgColor = propNavBtnActiveBgColor || salonContext?.navBtnActiveBgColor;
  const navActiveColor = propNavActiveColor || salonContext?.navActiveColor || '#10b981';
  const navTextColor = propNavTextColor || salonContext?.navTextColor;
  const navBtnShadow = propNavBtnShadow || salonContext?.navBtnShadow || 'none';
  const navBtnBlur = propNavBtnBlur || salonContext?.navBtnBlur || 'none';
  const navBtnFont = propNavBtnFont || salonContext?.navBtnFont || 'Poppins';

  const btnShadowCss = React.useMemo(() => {
    if (navBtnShadow === 'subtle') return '0 2px 8px -2px rgba(0,0,0,0.3)';
    if (navBtnShadow === 'medium') return '0 4px 16px -2px rgba(0,0,0,0.5)';
    if (navBtnShadow === 'glow') return `0 0 14px ${navActiveColor || '#10b981'}80`;
    return 'none';
  }, [navBtnShadow, navActiveColor]);

  const btnBlurCss = React.useMemo(() => {
    if (navBtnBlur === 'sm') return 'blur(4px)';
    if (navBtnBlur === 'md') return 'blur(8px)';
    if (navBtnBlur === 'lg') return 'blur(16px)';
    return 'none';
  }, [navBtnBlur]);

  // Estilização dinâmica do contêiner da barra conforme navBgStyle e navBgColor
  const navContainerStyle = React.useMemo(() => {
    if (navBgStyle === 'transparent') {
      return { 
        backgroundColor: 'transparent', 
        borderColor: 'transparent',
        boxShadow: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      };
    }
    if (navBgColor) {
      if (navBgStyle === 'glass') {
        const hex = navBgColor.startsWith('#') ? navBgColor : '#0f172a';
        return {
          backgroundColor: `color-mix(in srgb, ${hex} 45%, transparent)`,
          borderColor: `color-mix(in srgb, ${hex} 25%, transparent)`,
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        };
      }
      return {
        backgroundColor: navBgColor,
        borderColor: `color-mix(in srgb, ${navBgColor} 45%, #334155)`,
      };
    }
    if (navBgStyle === 'glass') {
      return {
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      };
    }
    return undefined;
  }, [navBgStyle, navBgColor]);

  const navContainerClasses = React.useMemo(() => {
    if (navBgStyle === 'transparent') {
      return 'bg-transparent border-t-0 shadow-none backdrop-blur-none';
    }
    if (navBgStyle === 'solid') {
      return `backdrop-blur-none border-t ${
        navBgColor
          ? ''
          : isDark
            ? 'bg-slate-950 border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.45)]'
            : 'bg-white border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] text-slate-800'
      }`;
    }
    // Default: 'glass' (alpha-vidro jateado translúcido real)
    return `backdrop-blur-md backdrop-saturate-150 border-t ${
      navBgColor
        ? ''
        : isDark
          ? 'bg-slate-900/50 border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]'
          : 'bg-white/60 border-slate-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] text-slate-800'
    }`;
  }, [navBgStyle, navBgColor, isDark]);

  if (!onSelectTab) {
    return null;
  }

  let establishmentTabs: Array<{
    id: 'home' | 'servicos' | 'vagas' | 'espaco' | 'equipe' | 'financeiro' | 'caixa' | 'personalizar' | 'utilidades' | 'dados' | 'visual' | 'preferencias' | 'layout';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [];

  if (isOwnerOrManager) {
    establishmentTabs = [
      { id: 'home', label: 'Painel', icon: LayoutDashboard },
      { id: 'caixa', label: 'Caixa', icon: Wallet },
      { id: 'vagas', label: vagasTabLabel, icon: Calendar },
      { id: 'utilidades', label: 'Utilidades', icon: Wrench },
    ];
  } else if (isProfessionalStaff) {
    establishmentTabs = [
      { id: 'home', label: 'Painel', icon: LayoutDashboard },
      { id: 'vagas', label: vagasTabLabel, icon: Calendar },
    ];
  } else {
    establishmentTabs = [
      { id: 'home', label: 'Início', icon: Home },
      { id: 'servicos', label: 'Serviços', icon: ServicesIconComponent },
      { id: 'vagas', label: vagasTabLabel || 'Agenda', icon: Calendar },
      { id: 'espaco', label: spaceTabLabel, icon: SpaceIconComponent },
    ];
  }

  return (
    <nav 
      id="vagou-bottom-nav"
      style={navContainerStyle}
      className={`shrink-0 w-full h-[80px] px-3 sm:px-6 gap-2 sm:gap-3 flex items-center justify-center z-30 transition-colors pb-[env(safe-area-inset-bottom,0px)] select-none ${navContainerClasses}`}
    >
      {establishmentTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        const effectiveActiveBg = (navBtnActiveBgColor && navBtnActiveBgColor !== 'transparent')
          ? navBtnActiveBgColor
          : navActiveColor;

        // Se a cor ativa do texto/ícone for idêntica ao fundo ativo do botão (ex.: ambos #ffffff), aplica contraste automático para não sumir
        const resolvedActiveFg = (() => {
          const bgLower = (effectiveActiveBg || '').trim().toLowerCase();
          const fgLower = (navActiveColor || '').trim().toLowerCase();
          if (bgLower && fgLower && bgLower === fgLower) {
            return bgLower === '#ffffff' || bgLower === '#f8fafc' || bgLower === '#f1f5f9'
              ? '#0f172a'
              : '#ffffff';
          }
          return navActiveColor || '#ffffff';
        })();

        const resolvedInactiveFg = navTextColor && navTextColor !== 'transparent' ? navTextColor : undefined;

        if (navStyle === 'solid') {
          return (
            <button
              key={tab.id}
              id={`nav-salon-${tab.id}`}
              onClick={() => {
                hapticLight();
                onSelectTab(tab.id);
              }}
              style={{
                backgroundColor: isActive
                  ? effectiveActiveBg
                  : navBtnBgColor || undefined,
                boxShadow: btnShadowCss !== 'none' ? btnShadowCss : undefined,
                backdropFilter: btnBlurCss !== 'none' ? btnBlurCss : undefined,
                WebkitBackdropFilter: btnBlurCss !== 'none' ? btnBlurCss : undefined,
                fontFamily: navBtnFont,
                color: isActive ? resolvedActiveFg : resolvedInactiveFg,
              }}
              className={`flex flex-col items-center justify-center gap-1 h-[50px] px-1.5 sm:px-3.5 transition-all active:scale-95 cursor-pointer flex-1 min-w-0 max-w-[96px] ${
                navShape === 'circle' ? 'rounded-full' : 'rounded-[4px]'
              } ${
                navBorder === 'bordered'
                  ? isActive
                    ? 'border border-white/35 shadow-sm'
                    : isDark
                      ? 'border border-slate-800/80'
                      : 'border border-slate-200'
                  : 'border-0'
              } ${
                isActive
                  ? 'shadow-sm'
                  : resolvedInactiveFg
                    ? 'hover:opacity-90'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon 
                className="w-5 h-5 stroke-[2.2] shrink-0"
                style={{
                  color: isActive ? resolvedActiveFg : resolvedInactiveFg,
                }}
              />
              <span 
                style={{
                  fontFamily: navBtnFont,
                  color: isActive ? resolvedActiveFg : resolvedInactiveFg,
                }}
                className={`text-[10px] tracking-wide font-bold truncate max-w-full leading-none ${
                  isActive
                    ? ''
                    : resolvedInactiveFg
                      ? ''
                      : isDark
                        ? 'text-slate-400'
                        : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        }

        if (navStyle === 'boxed') {
          return (
            <button
              key={tab.id}
              id={`nav-salon-${tab.id}`}
              onClick={() => {
                hapticLight();
                onSelectTab(tab.id);
              }}
              style={{
                backgroundColor: !isActive && navBtnBgColor ? navBtnBgColor : isActive && navBtnActiveBgColor ? navBtnActiveBgColor : undefined,
                fontFamily: navBtnFont,
                color: isActive ? resolvedActiveFg : resolvedInactiveFg,
              }}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 sm:px-3 transition active:scale-95 cursor-pointer group flex-1 min-w-0 max-w-[100px] ${
                navShape === 'circle' ? 'rounded-2xl' : 'rounded-[4px]'
              } ${
                navBorder === 'bordered'
                  ? isActive
                    ? 'border border-white/35 shadow-xs'
                    : isDark
                      ? 'border border-slate-800/80'
                      : 'border border-slate-200'
                  : 'border-0'
              }`}
            >
              <div 
                style={
                  isActive
                    ? { 
                        borderColor: navIconBorder === 'bordered' ? navActiveColor : 'transparent', 
                        backgroundColor: effectiveActiveBg,
                        boxShadow: btnShadowCss !== 'none' ? btnShadowCss : undefined,
                        backdropFilter: btnBlurCss !== 'none' ? btnBlurCss : undefined,
                        WebkitBackdropFilter: btnBlurCss !== 'none' ? btnBlurCss : undefined,
                      }
                    : {
                        backgroundColor: navBtnBgColor || undefined,
                        borderColor: navIconBorder === 'bordered' ? (resolvedInactiveFg ? `${resolvedInactiveFg}40` : undefined) : 'transparent',
                        boxShadow: btnShadowCss !== 'none' ? btnShadowCss : undefined,
                        backdropFilter: btnBlurCss !== 'none' ? btnBlurCss : undefined,
                        WebkitBackdropFilter: btnBlurCss !== 'none' ? btnBlurCss : undefined,
                      }
                }
                className={`w-[34px] h-[34px] flex items-center justify-center transition-all ${
                  navShape === 'circle' ? 'rounded-full' : 'rounded-[4px]'
                } ${
                  navIconBorder === 'bordered' ? 'border' : 'border-0'
                } ${
                  isActive
                    ? 'scale-105 shadow-xs'
                    : resolvedInactiveFg
                      ? navIconBorder === 'bordered' ? 'border-white/25 bg-slate-950/30' : 'bg-slate-950/30 border-transparent'
                      : isDark
                        ? `text-slate-400 hover:text-slate-200 bg-slate-950/70 ${navIconBorder === 'bordered' ? 'border-slate-800 hover:border-emerald-500/40' : 'border-transparent'}`
                        : `text-slate-500 hover:text-slate-800 bg-slate-50 ${navIconBorder === 'bordered' ? 'border-slate-200 hover:border-emerald-500/40' : 'border-transparent'}`
                }`}
              >
                <Icon 
                  className="w-4.5 h-4.5 stroke-[2.2] shrink-0"
                  style={{
                    color: isActive ? resolvedActiveFg : resolvedInactiveFg,
                  }}
                />
              </div>
              <span 
                style={{
                  fontFamily: navBtnFont,
                  color: isActive ? (navActiveColor || resolvedActiveFg) : resolvedInactiveFg,
                }}
                className={`text-[10px] tracking-wide font-bold truncate max-w-full transition-colors ${
                  isActive || resolvedInactiveFg
                    ? ''
                    : isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        }

        // Padrão 'minimal' (Clean Line — Zero Box-in-Box + Indicador Luminoso no Topo)
        const minimalActiveFg = (() => {
          if (navBtnActiveBgColor && navBtnActiveBgColor !== 'transparent') {
            return resolvedActiveFg;
          }
          return navActiveColor || (isDark ? '#ffffff' : '#10b981');
        })();

        return (
          <button
            key={tab.id}
            id={`nav-salon-${tab.id}`}
            onClick={() => {
              hapticLight();
              onSelectTab(tab.id);
            }}
            style={{
              backgroundColor: isActive && navBtnActiveBgColor
                ? navBtnActiveBgColor
                : !isActive && navBtnBgColor
                ? navBtnBgColor
                : undefined,
              boxShadow: btnShadowCss !== 'none' ? btnShadowCss : undefined,
              backdropFilter: btnBlurCss !== 'none' ? btnBlurCss : undefined,
              WebkitBackdropFilter: btnBlurCss !== 'none' ? btnBlurCss : undefined,
              fontFamily: navBtnFont,
              color: isActive ? minimalActiveFg : resolvedInactiveFg,
            }}
            className={`relative h-[52px] flex flex-col items-center justify-center gap-1 px-1.5 sm:px-3.5 transition-all active:scale-95 cursor-pointer group flex-1 min-w-0 max-w-[100px] ${
              navShape === 'circle' ? 'rounded-full' : 'rounded-[4px]'
            } ${
              navBorder === 'bordered'
                ? isActive
                  ? navShape === 'circle' ? 'rounded-full border border-white/35' : 'rounded-[4px] border border-white/35'
                  : 'border border-white/25'
                : ''
            }`}
          >
            {/* Indicador Luminoso Superior na Cor do Tema */}
            <span
              style={isActive ? { backgroundColor: navActiveColor } : undefined}
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-[4px] transition-all duration-200 ${
                isActive
                  ? 'w-8 opacity-100'
                  : 'w-0 bg-transparent opacity-0'
              }`}
            />

            <Icon
              style={{
                color: isActive ? minimalActiveFg : resolvedInactiveFg,
              }}
              className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                isActive
                  ? 'stroke-[2.4] -translate-y-0.5'
                  : resolvedInactiveFg
                    ? 'stroke-[2]'
                    : isDark
                      ? 'text-slate-400 group-hover:text-slate-200 stroke-[2]'
                      : 'text-slate-500 group-hover:text-slate-800 stroke-[2]'
              }`}
            />

            <span
              style={{
                fontFamily: navBtnFont,
                color: isActive ? minimalActiveFg : resolvedInactiveFg,
              }}
              className={`text-[10px] tracking-wide font-bold truncate max-w-full leading-none transition-colors ${
                isActive
                  ? 'font-extrabold'
                  : resolvedInactiveFg
                    ? ''
                    : isDark
                      ? 'text-slate-400 group-hover:text-slate-300'
                      : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
