import React, { useState } from 'react';
import { 
  ArrowLeft, LayoutGrid, Check, Smartphone, 
  Layers, Sun, Moon, Type, Palette, Sliders,
  Home, Scissors, Calendar, MapPin, Eye, EyeOff,
  Circle, Square, ChevronRight, Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SalonAdminSettings } from '../../types';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
import { getSectionHeaderStyleData } from '../../utils/sectionHeaderStyle';
import { UnifiedButtonEditor } from './UnifiedButtonEditor';
import { getThemeColorPresets } from '../../utils/colorPresets';

export interface LayoutCardViewProps {
  adminSettings: SalonAdminSettings;
  onUpdateSettings: (settings: Partial<SalonAdminSettings>) => Promise<any> | void;
  onBack: () => void;
}

type LayoutSectionKey = 'theme' | 'header' | 'section_header' | 'hero' | 'bottom_nav' | 'welcome';

export const LayoutCardView: React.FC<LayoutCardViewProps> = ({
  adminSettings,
  onUpdateSettings,
  onBack,
}) => {
  const { isDark, setTheme } = useTheme();

  const COLOR_PRESETS = getThemeColorPresets(adminSettings.accentColor || '#10b981');
  const BG_COLOR_PRESETS = getThemeColorPresets(adminSettings.accentColor || '#10b981');
  const TEXT_COLOR_PRESETS = getThemeColorPresets(adminSettings.accentColor || '#10b981');
  const BTN_BG_PRESETS = getThemeColorPresets(adminSettings.accentColor || '#10b981');

  // Seção ativa independente: null = tela de cards de opções; key = seção específica aberta
  const [activeSection, setActiveSection] = useState<LayoutSectionKey | null>(null);

  // 1. Tema Permanente (Dark / Light)
  const [defaultTheme, setDefaultTheme] = useState<'dark' | 'light'>(
    adminSettings.defaultTheme || (isDark ? 'dark' : 'light')
  );

  // 2. Slogan do cabeçalho
  const [showSlogan, setShowSlogan] = useState<boolean>(
    adminSettings.showSlogan !== false
  );

  // 3. Logo texto provisório e cor da fonte
  const [logoTextFallback, setLogoTextFallback] = useState<string>(
    adminSettings.logoTextFallback ?? ''
  );
  const [logoTextColor, setLogoTextColor] = useState<string>(
    adminSettings.logoTextColor || '#10b981'
  );

  // 3.5. Personalização da Barra de Títulos das Seções (Subcabeçalhos)
  const [sectionHeaderBgColor, setSectionHeaderBgColor] = useState<string>(
    adminSettings.sectionHeaderBgColor || ''
  );
  const [sectionHeaderTextColor, setSectionHeaderTextColor] = useState<string>(
    adminSettings.sectionHeaderTextColor || ''
  );
  const [sectionHeaderIconColor, setSectionHeaderIconColor] = useState<string>(
    adminSettings.sectionHeaderIconColor || '#10b981'
  );
  const [sectionHeaderBgStyle, setSectionHeaderBgStyle] = useState<'solid' | 'glass' | 'transparent'>(
    adminSettings.sectionHeaderBgStyle || 'glass'
  );
  const [sectionHeaderBorder, setSectionHeaderBorder] = useState<'bordered' | 'none'>(
    adminSettings.sectionHeaderBorder || 'bordered'
  );

  // 4. Slide da página principal
  const [showHeroSlides, setShowHeroSlides] = useState<boolean>(
    adminSettings.showHeroSlides !== false
  );

  // 5. Barra de navegação inferior (Rodapé)
  const [navStyle, setNavStyle] = useState<'minimal' | 'solid' | 'boxed'>(
    adminSettings.navStyle || 'minimal'
  );
  const [navShape, setNavShape] = useState<'square' | 'circle'>(
    adminSettings.navShape || 'square'
  );
  const [navBorder, setNavBorder] = useState<'bordered' | 'none'>(
    adminSettings.navBorder || 'bordered'
  );
  const [navIconBorder, setNavIconBorder] = useState<'bordered' | 'none'>(
    adminSettings.navIconBorder || 'none'
  );
  const [navBgStyle, setNavBgStyle] = useState<'solid' | 'glass' | 'transparent'>(
    adminSettings.navBgStyle || 'glass'
  );
  const [navBgColor, setNavBgColor] = useState<string>(
    adminSettings.navBgColor || (isDark ? '#020617' : '#ffffff')
  );
  const [navBtnBgColor, setNavBtnBgColor] = useState<string>(
    adminSettings.navBtnBgColor || ''
  );
  const [navBtnActiveBgColor, setNavBtnActiveBgColor] = useState<string>(
    adminSettings.navBtnActiveBgColor || ''
  );
  const [navActiveColor, setNavActiveColor] = useState<string>(
    adminSettings.navActiveColor || '#10b981'
  );
  const [navTextColor, setNavTextColor] = useState<string>(
    adminSettings.navTextColor || (isDark ? '#94a3b8' : '#64748b')
  );

  // 6. Faixa de boas-vindas
  const [welcomeStyle, setWelcomeStyle] = useState<'atmospheric' | 'glass'>(
    adminSettings.welcomeStyle || 'atmospheric'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const autoSyncSettings = (updates: Partial<SalonAdminSettings>) => {
    try {
      onUpdateSettings(updates);
    } catch {
      // ignore
    }
  };

  const handleToggleTheme = (theme: 'dark' | 'light') => {
    hapticLight();
    setDefaultTheme(theme);
    setTheme(theme);
    autoSyncSettings({ defaultTheme: theme });
    try {
      localStorage.setItem('vagou_user_theme_preference', theme);
    } catch {}
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    hapticSuccess();

    try {
      await onUpdateSettings({
        defaultTheme,
        showSlogan,
        logoTextFallback: logoTextFallback.trim(),
        logoTextColor,
        sectionHeaderBgColor,
        sectionHeaderTextColor,
        sectionHeaderIconColor,
        sectionHeaderBgStyle,
        sectionHeaderBorder,
        showHeroSlides,
        navStyle,
        navShape,
        navBorder,
        navIconBorder,
        navBgStyle,
        navBgColor,
        navBtnBgColor,
        navBtnActiveBgColor,
        navActiveColor,
        navTextColor,
        welcomeStyle,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2400);
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  // Título e Ícone da barra de navegação superior conforme a tela ativa
  const getHeaderInfo = () => {
    switch (activeSection) {
      case 'theme':
        return { title: 'Tema do Layout', icon: Sliders };
      case 'header':
        return { title: 'Cabeçalho & Identificação', icon: Type };
      case 'section_header':
        return { title: 'Barra de Títulos das Seções', icon: Sliders };
      case 'hero':
        return { title: 'Slide da Página Inicial', icon: Layers };
      case 'bottom_nav':
        return { title: 'Barra de Navegação Inferior', icon: Smartphone };
      case 'welcome':
        return { title: 'Faixa de Boas-Vindas', icon: Sparkles };
      default:
        return { title: 'Layout & Navegação', icon: LayoutGrid };
    }
  };

  const headerInfo = getHeaderInfo();
  const HeaderIcon = headerInfo.icon;

  const sectionHeaderStyleData = React.useMemo(() => {
    return getSectionHeaderStyleData({
      ...adminSettings,
      sectionHeaderBgColor,
      sectionHeaderTextColor,
      sectionHeaderIconColor,
      sectionHeaderBgStyle,
      sectionHeaderBorder,
    }, isDark);
  }, [adminSettings, sectionHeaderBgColor, sectionHeaderTextColor, sectionHeaderIconColor, sectionHeaderBgStyle, sectionHeaderBorder, isDark]);

  return (
    <div className={`w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Barra de Topo Fixa com Ação de Voltar Inteligente */}
      <div 
        className={sectionHeaderStyleData.containerClass}
        style={sectionHeaderStyleData.containerStyle}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              if (activeSection !== null) {
                setActiveSection(null);
              } else {
                onBack();
              }
            }}
            className={`p-1.5 rounded-[4px] transition cursor-pointer active:scale-95 ${
              isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title={activeSection ? "Voltar para opções de layout" : "Voltar para Preferências"}
            aria-label={activeSection ? "Voltar para opções de layout" : "Voltar para Preferências"}
          >
            <ArrowLeft className="w-4 h-4" style={sectionHeaderStyleData.iconStyle} />
          </button>
          <div className="flex items-center gap-1.5">
            <HeaderIcon className="w-4 h-4 shrink-0" style={sectionHeaderStyleData.iconStyle} />
            <h2 className="text-xs sm:text-sm font-bold font-['Poppins']" style={sectionHeaderStyleData.titleStyle}>
              {headerInfo.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-[4px] shadow-xs animate-in fade-in">
              <Check className="w-3 h-3 text-white" />
              Salvo
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold font-['Poppins'] transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5 text-white" />
            <span className="text-white">Salvar</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: Modo Hub (Cards de Opções) ou Modo Seção Independente */}
      <div className="p-3.5 flex-1 pb-24">
        {activeSection === null ? (
          /* ========================================================
             VISÃO 1: HUB DE CARDS DE OPÇÕES DE LAYOUT & NAVEGAÇÃO
             ======================================================== */
          <div className="space-y-3">
            <div className="pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-['Poppins']">
                Selecione uma categoria de personalização:
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* CARD 1: TEMA DO LAYOUT */}
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveSection('theme');
                }}
                className={`w-full p-3.5 rounded-[4px] border text-left transition active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 ${
                  isDark 
                    ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold font-['Poppins'] truncate">
                        Tema do Layout
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        {defaultTheme === 'dark' ? 'Escuro' : 'Claro'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Aparência permanente (claro ou escuro) da vitrine do seu negócio
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* CARD 2: CABEÇALHO & IDENTIFICAÇÃO */}
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveSection('header');
                }}
                className={`w-full p-3.5 rounded-[4px] border text-left transition active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 ${
                  isDark 
                    ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Type className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold font-['Poppins'] truncate">
                        Cabeçalho & Identificação
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        {showSlogan ? 'Slogan Ativo' : 'Slogan Oculto'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Slogan comercial, texto provisório e cor da fonte na falta de logo
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* CARD 3: BARRA DE TÍTULOS DAS SEÇÕES */}
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveSection('section_header');
                }}
                className={`w-full p-3.5 rounded-[4px] border text-left transition active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 ${
                  isDark 
                    ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold font-['Poppins'] truncate">
                        Barra de Títulos das Seções
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        {sectionHeaderBgStyle === 'solid' ? 'Sólido' : sectionHeaderBgStyle === 'transparent' ? 'Transparente' : 'Vidro'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Cor de fundo, cor dos títulos, cor dos ícones e estilo das barras de seção
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* CARD 3: SLIDE DA PÁGINA INICIAL */}
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveSection('hero');
                }}
                className={`w-full p-3.5 rounded-[4px] border text-left transition active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 ${
                  isDark 
                    ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold font-['Poppins'] truncate">
                        Slide da Página Inicial
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        {showHeroSlides ? 'Slide Ativo' : 'Painel Direto'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Carrossel de banners publicitários ou apresentação direta da vitrine
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* CARD 4: BARRA DE NAVEGAÇÃO INFERIOR */}
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveSection('bottom_nav');
                }}
                className={`w-full p-3.5 rounded-[4px] border text-left transition active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 ${
                  isDark 
                    ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold font-['Poppins'] truncate">
                        Barra de Navegação Inferior
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        {navBgStyle === 'solid' ? 'Sólido' : navBgStyle === 'glass' ? 'Vidro Jateado' : 'Alpha 100%'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Fundo, cor de destaque, cor dos textos/ícones e botão boleado com/sem borda
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* CARD 5: FAIXA DE BOAS-VINDAS */}
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveSection('welcome');
                }}
                className={`w-full p-3.5 rounded-[4px] border text-left transition active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 ${
                  isDark 
                    ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold font-['Poppins'] truncate">
                        Faixa de Boas-Vindas
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        {welcomeStyle === 'atmospheric' ? 'Degradê' : 'Cristal'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Estilo da faixa de apresentação no topo da página principal
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             VISÃO 2: SEÇÕES INDEPENDENTES DEDICADAS
             ======================================================== */
          <div className="space-y-4">
            {/* SUB-SEÇÃO 1: TEMA DO LAYOUT */}
            {activeSection === 'theme' && (
              <div className={`p-3.5 rounded-[4px] border space-y-3.5 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                      Tema do Layout Permanente
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {defaultTheme === 'dark' ? 'Tema Escuro' : 'Tema Claro'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Define a aparência inicial e permanente da vitrine do seu negócio para todos os clientes.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTheme('dark')}
                    className={`p-3 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                      defaultTheme === 'dark'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                        : isDark
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Moon className={`w-4 h-4 ${defaultTheme === 'dark' ? 'text-white' : 'text-slate-400'}`} />
                      <div>
                        <span className={`text-xs font-bold block ${defaultTheme === 'dark' ? 'text-white' : ''}`}>
                          Escuro
                        </span>
                        <span className={`text-[9px] ${defaultTheme === 'dark' ? 'text-white/80' : 'text-slate-400'}`}>
                          Dark Slate
                        </span>
                      </div>
                    </div>
                    {defaultTheme === 'dark' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleTheme('light')}
                    className={`p-3 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                      defaultTheme === 'light'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                        : isDark
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sun className={`w-4 h-4 ${defaultTheme === 'light' ? 'text-white' : 'text-amber-500'}`} />
                      <div>
                        <span className={`text-xs font-bold block ${defaultTheme === 'light' ? 'text-white' : ''}`}>
                          Claro
                        </span>
                        <span className={`text-[9px] ${defaultTheme === 'light' ? 'text-white/80' : 'text-slate-400'}`}>
                          Clean White
                        </span>
                      </div>
                    </div>
                    {defaultTheme === 'light' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                </div>
              </div>
            )}

            {/* SUB-SEÇÃO 2: CABEÇALHO & IDENTIFICAÇÃO */}
            {activeSection === 'header' && (
              <div className={`p-3.5 rounded-[4px] border space-y-3.5 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                      Cabeçalho & Identificação
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {showSlogan ? 'Slogan Ativo' : 'Slogan Oculto'}
                  </span>
                </div>

                {/* Toggle Slogan */}
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-[4px] border border-slate-800/60 bg-slate-950/30">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block">
                      Exibir Slogan no Cabeçalho
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Mostra ou oculta a frase de assinatura abaixo do nome do salão
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      const next = !showSlogan;
                      setShowSlogan(next);
                      autoSyncSettings({ showSlogan: next });
                    }}
                    className={`h-7 px-3 rounded-[4px] text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      showSlogan
                        ? 'bg-emerald-500 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {showSlogan ? (
                      <>
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-white">Exibir</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Ocultar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Input de Texto Provisório na Falta de Logo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold">
                      Texto Provisório (Na ausência de logotipo)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Substitui a imagem se não houver arquivo
                    </span>
                  </div>

                  <input
                    type="text"
                    value={logoTextFallback}
                    onChange={(e) => {
                      setLogoTextFallback(e.target.value);
                      autoSyncSettings({ logoTextFallback: e.target.value.trim() });
                    }}
                    placeholder={adminSettings.salonName || 'Nome do Estabelecimento'}
                    maxLength={40}
                    className={`w-full px-3 py-2 text-xs rounded-[4px] border transition focus:outline-hidden ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                {/* Seletor de Cor da Fonte Provisória */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      Cor da Fonte do Texto Provisório
                    </label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: logoTextColor }}>
                      {logoTextColor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setLogoTextColor(color.hex);
                          autoSyncSettings({ logoTextColor: color.hex });
                        }}
                        className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                          logoTextColor.toLowerCase() === color.hex.toLowerCase()
                            ? 'border-white scale-110 shadow-xs'
                            : 'border-slate-700/60 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {logoTextColor.toLowerCase() === color.hex.toLowerCase() && (
                          <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' ? 'text-slate-900' : 'text-white'}`} />
                        )}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={logoTextColor}
                        onChange={(e) => {
                          setLogoTextColor(e.target.value);
                          autoSyncSettings({ logoTextColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                        title="Seletor de cor personalizada"
                      />
                    </div>
                  </div>
                </div>


              </div>
            )}

            {/* SUB-SEÇÃO 2.5: BARRA DE TÍTULOS DAS SEÇÕES */}
            {activeSection === 'section_header' && (
              <div className={`p-3.5 rounded-[4px] border space-y-4 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                      Barra de Títulos das Seções
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {sectionHeaderBgStyle === 'solid' ? 'Sólido' : sectionHeaderBgStyle === 'glass' ? 'Vidro Jateado' : 'Alpha 100%'} • Fixa Sticky
                  </span>
                </div>

                {/* 2.5.1 Fundo da Barra: Sólido, Alpha-Vidro Jateado, Alpha 100% */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold">
                      Efeito do Fundo
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Opacidade e textura
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'solid' as const, label: 'Sólido', desc: 'Opaco com preenchimento total' },
                      { id: 'glass' as const, label: 'Alpha-Vidro Jateado', desc: 'Translúcido com desfoque' },
                      { id: 'transparent' as const, label: 'Alpha 100%', desc: 'Totalmente transparente' },
                    ].map((bgOpt) => {
                      const isSelected = sectionHeaderBgStyle === bgOpt.id;
                      return (
                        <button
                          key={bgOpt.id}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setSectionHeaderBgStyle(bgOpt.id);
                            autoSyncSettings({ sectionHeaderBgStyle: bgOpt.id });
                          }}
                          className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : ''}`}>
                              {bgOpt.label}
                            </span>
                            {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          </div>
                          <span className={`text-[9px] leading-tight ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                            {bgOpt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2.5.2 Cor do Fundo da Barra */}
                {sectionHeaderBgStyle !== 'transparent' && (
                  <div className="space-y-2 pt-1 border-t border-slate-800/40">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-emerald-400" />
                        Cor do Fundo da Barra
                      </label>
                      <span className="text-[10px] font-mono font-bold" style={{ color: sectionHeaderBgColor || (isDark ? '#0f172a' : '#f8fafc') }}>
                        {sectionHeaderBgColor || 'Padrão'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {BG_COLOR_PRESETS.map((color) => {
                        const isSel = (sectionHeaderBgColor || '').toLowerCase() === color.hex.toLowerCase();
                        return (
                          <button
                            key={color.hex || 'default'}
                            type="button"
                            onClick={() => {
                              hapticLight();
                              setSectionHeaderBgColor(color.hex);
                              autoSyncSettings({ sectionHeaderBgColor: color.hex });
                            }}
                            className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                              isSel
                                ? 'border-emerald-400 scale-110 shadow-xs'
                                : 'border-slate-700/60 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          >
                            {isSel && (
                              <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' || color.hex === '#f8fafc' ? 'text-slate-900' : 'text-white'}`} />
                            )}
                          </button>
                        );
                      })}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="color"
                          value={sectionHeaderBgColor || (isDark ? '#0f172a' : '#ffffff')}
                          onChange={(e) => {
                            setSectionHeaderBgColor(e.target.value);
                            autoSyncSettings({ sectionHeaderBgColor: e.target.value });
                          }}
                          className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                          title="Cor personalizada de fundo"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2.5.3 Cor do Texto do Título */}
                <div className="space-y-2 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-400" />
                      Cor do Texto do Título da Seção
                    </label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: sectionHeaderTextColor || (isDark ? '#ffffff' : '#0f172a') }}>
                      {sectionHeaderTextColor || 'Padrão'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {TEXT_COLOR_PRESETS.map((color) => {
                      const isSel = (sectionHeaderTextColor || '').toLowerCase() === color.hex.toLowerCase();
                      return (
                        <button
                          key={color.hex || 'default'}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setSectionHeaderTextColor(color.hex);
                            autoSyncSettings({ sectionHeaderTextColor: color.hex });
                          }}
                          className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                            isSel
                              ? 'border-emerald-400 scale-110 shadow-xs'
                              : 'border-slate-700/60 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSel && (
                            <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' || color.hex === '#cbd5e1' ? 'text-slate-900' : 'text-white'}`} />
                          )}
                        </button>
                      );
                    })}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={sectionHeaderTextColor || (isDark ? '#ffffff' : '#0f172a')}
                        onChange={(e) => {
                          setSectionHeaderTextColor(e.target.value);
                          autoSyncSettings({ sectionHeaderTextColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                        title="Cor personalizada do texto"
                      />
                    </div>
                  </div>
                </div>

                {/* 2.5.4 Cor do Ícone de Destaque */}
                <div className="space-y-2 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Cor do Ícone de Destaque
                    </label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: sectionHeaderIconColor }}>
                      {sectionHeaderIconColor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((color) => {
                      const isSel = (sectionHeaderIconColor || '').toLowerCase() === color.hex.toLowerCase();
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setSectionHeaderIconColor(color.hex);
                            autoSyncSettings({ sectionHeaderIconColor: color.hex });
                          }}
                          className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                            isSel
                              ? 'border-white scale-110 shadow-xs'
                              : 'border-slate-700/60 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSel && (
                            <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' ? 'text-slate-900' : 'text-white'}`} />
                          )}
                        </button>
                      );
                    })}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={sectionHeaderIconColor}
                        onChange={(e) => {
                          setSectionHeaderIconColor(e.target.value);
                          autoSyncSettings({ sectionHeaderIconColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                        title="Cor personalizada de destaque"
                      />
                    </div>
                  </div>
                </div>

                {/* 2.5.5 Borda Inferior / Contorno de Borda */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold block">
                    Borda Inferior da Barra
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSectionHeaderBorder('bordered');
                        autoSyncSettings({ sectionHeaderBorder: 'bordered' });
                      }}
                      className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        sectionHeaderBorder === 'bordered'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block ${sectionHeaderBorder === 'bordered' ? 'text-white' : ''}`}>
                          Com Borda
                        </span>
                        <span className={`text-[9px] ${sectionHeaderBorder === 'bordered' ? 'text-white/80' : 'text-slate-400'}`}>
                          Borda inferior delimitadora
                        </span>
                      </div>
                      {sectionHeaderBorder === 'bordered' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSectionHeaderBorder('none');
                        autoSyncSettings({ sectionHeaderBorder: 'none' });
                      }}
                      className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        sectionHeaderBorder === 'none'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block ${sectionHeaderBorder === 'none' ? 'text-white' : ''}`}>
                          Sem Borda
                        </span>
                        <span className={`text-[9px] ${sectionHeaderBorder === 'none' ? 'text-white/80' : 'text-slate-400'}`}>
                          Superfície sem divisor de borda
                        </span>
                      </div>
                      {sectionHeaderBorder === 'none' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* 2.5.6 Cor de Fundo dos Botões da Barra de Título */}
                <div className="space-y-2 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      Cor de Fundo dos Botões da Barra
                    </label>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {adminSettings.sectionHeaderBtnBgColor || 'Translúcido Padrão'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {BTN_BG_PRESETS.map((color) => {
                      const isSel = (adminSettings.sectionHeaderBtnBgColor || '').toLowerCase() === color.hex.toLowerCase();
                      return (
                        <button
                          key={color.hex || 'transparent'}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            autoSyncSettings({ sectionHeaderBtnBgColor: color.hex });
                          }}
                          className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                            isSel
                              ? 'border-emerald-400 scale-110 shadow-xs'
                              : 'border-slate-700/60 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.hex === 'transparent' ? 'transparent' : color.hex }}
                          title={color.name}
                        >
                          {color.hex === 'transparent' ? (
                            <div className="w-full h-full rounded-[3px] border border-rose-500/90 bg-rose-500/10 flex items-center justify-center relative overflow-hidden">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[140%] h-[1.5px] bg-rose-500 -rotate-45" />
                              </div>
                              <span className="text-[7px] font-black text-rose-500 z-10 uppercase">OFF</span>
                            </div>
                          ) : (
                            isSel && (
                              <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' || color.hex.toLowerCase().startsWith('#f') || color.hex.toLowerCase().startsWith('#e') ? 'text-slate-900' : 'text-white'}`} />
                            )
                          )}
                        </button>
                      );
                    })}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={adminSettings.sectionHeaderBtnBgColor && adminSettings.sectionHeaderBtnBgColor !== 'transparent' ? adminSettings.sectionHeaderBtnBgColor : '#10b981'}
                        onChange={(e) => {
                          autoSyncSettings({ sectionHeaderBtnBgColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                        title="Cor personalizada de fundo dos botões"
                      />
                    </div>
                  </div>
                </div>

                {/* 2.5.7 Borda dos Botões da Barra de Título */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold">
                    Borda dos Botões da Barra
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'bordered' as const, label: 'Com Borda', desc: 'Contorno visível' },
                      { id: 'none' as const, label: 'Sem Borda', desc: 'Superfície limpa' },
                    ].map((opt) => {
                      const isSel = (adminSettings.sectionHeaderBtnBorder || 'bordered') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            autoSyncSettings({ sectionHeaderBtnBorder: opt.id });
                          }}
                          className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                            isSel
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <div>
                            <span className={`text-xs font-bold block ${isSel ? 'text-white' : ''}`}>
                              {opt.label}
                            </span>
                            <span className={`text-[9px] ${isSel ? 'text-white/80' : 'text-slate-400'}`}>
                              {opt.desc}
                            </span>
                          </div>
                          {isSel && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2.5.8 Efeito de Sombra nos Botões da Barra */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold">
                    Efeito de Sombra nos Botões da Barra
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'none' as const, label: 'Sem Sombra', desc: 'Plano' },
                      { id: 'subtle' as const, label: 'Sutil', desc: 'Leve relevo' },
                      { id: 'medium' as const, label: 'Moderada', desc: 'Sombra nítida' },
                      { id: 'glow' as const, label: 'Neon Glow', desc: 'Brilho colorido' },
                    ].map((opt) => {
                      const isSelected = (adminSettings.sectionHeaderBtnShadow || 'none') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            autoSyncSettings({ sectionHeaderBtnShadow: opt.id });
                          }}
                          className={`p-2 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : ''}`}>
                            {opt.label}
                          </span>
                          <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2.5.9 Efeito de Blur nos Botões da Barra */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold">
                    Efeito de Blur (Desfoque) nos Botões
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'none' as const, label: 'Nenhum', desc: 'Opaco' },
                      { id: 'sm' as const, label: 'Blur Leve', desc: '4px' },
                      { id: 'md' as const, label: 'Blur Médio', desc: '8px' },
                      { id: 'lg' as const, label: 'Blur Forte', desc: '16px' },
                    ].map((opt) => {
                      const isSelected = (adminSettings.sectionHeaderBtnBlur || 'none') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            autoSyncSettings({ sectionHeaderBtnBlur: opt.id });
                          }}
                          className={`p-2 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : ''}`}>
                            {opt.label}
                          </span>
                          <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2.5.10 Tipografia dos Botões da Barra */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-emerald-400" />
                    Família da Fonte dos Botões da Barra
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Poppins', 'Inter', 'Plus Jakarta Sans', 'Oswald', 'Cormorant Garamond'].map((fontName) => {
                      const isSelected = (adminSettings.sectionHeaderBtnFont || 'Poppins') === fontName;
                      return (
                        <button
                          key={fontName}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            autoSyncSettings({ sectionHeaderBtnFont: fontName });
                          }}
                          style={{ fontFamily: fontName }}
                          className={`p-2 rounded-[4px] border text-center transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs font-bold'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <span className="text-xs">{fontName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SEÇÃO 3: SLIDE DA PÁGINA INICIAL */}
            {activeSection === 'hero' && (
              <div className={`p-3.5 rounded-[4px] border space-y-3.5 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                      Slide da Página Inicial
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {showHeroSlides ? 'Slide Ativo' : 'Painel Direto'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 p-2.5 rounded-[4px] border border-slate-800/60 bg-slate-950/30">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block">
                      Carrossel de Slides Fotográficos
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Oculte caso ainda não tenha banners prontos ou prefira apresentação direta
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      const next = !showHeroSlides;
                      setShowHeroSlides(next);
                      autoSyncSettings({ showHeroSlides: next });
                    }}
                    className={`h-7 px-3 rounded-[4px] text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      showHeroSlides
                        ? 'bg-emerald-500 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {showHeroSlides ? (
                      <>
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-white">Exibir</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Ocultar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Prévia do Modo de Exibição da Página Inicial */}
                <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prévia do Modo Escolhido
                  </span>

                  <div className={`p-3 rounded-[4px] border ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    {showHeroSlides ? (
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 rounded-[4px] bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative">
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                          <span className="text-[9px] font-bold text-emerald-400 z-10">Slide</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-emerald-400">
                            Carrossel Publicitário Ativo
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Transição suave com banners de serviços, agendamento e fotos
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 rounded-[4px] bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-white">Vitrine</span>
                          <span className="text-[8px] text-slate-400">Direta</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-white">
                            Painel Direto (Sem Banners)
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Apresentação direta com dados do negócio e atalhos de agendamento
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SEÇÃO 4: BARRA DE NAVEGAÇÃO INFERIOR */}
            {activeSection === 'bottom_nav' && (
              <div className={`p-3.5 rounded-[4px] border space-y-4 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                      Barra de Navegação Inferior (Rodapé)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {navBgStyle === 'solid' ? 'Sólido' : navBgStyle === 'glass' ? 'Vidro Jateado' : 'Alpha 100%'} • {navShape === 'circle' ? 'Circular' : 'Quadrado'}
                  </span>
                </div>

                {/* 4.1 Fundo da Barra: Sólido, Alpha-Vidro Jateado, Alpha 100% */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold">
                      Efeito do Fundo
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Opacidade e textura
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'solid' as const, label: 'Sólido', desc: 'Opaco com preenchimento total' },
                      { id: 'glass' as const, label: 'Alpha-Vidro Jateado', desc: 'Translúcido com desfoque' },
                      { id: 'transparent' as const, label: 'Alpha 100%', desc: 'Totalmente transparente' },
                    ].map((bgOpt) => {
                      const isSelected = navBgStyle === bgOpt.id;
                      return (
                        <button
                          key={bgOpt.id}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setNavBgStyle(bgOpt.id);
                            autoSyncSettings({ navBgStyle: bgOpt.id });
                          }}
                          className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : ''}`}>
                              {bgOpt.label}
                            </span>
                            {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          </div>
                          <span className={`text-[9px] leading-tight ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                            {bgOpt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4.2 Cor do Fundo da Barra */}
                {navBgStyle !== 'transparent' && (
                  <div className="space-y-2 pt-1 border-t border-slate-800/40">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-emerald-400" />
                        Cor do Fundo da Barra
                      </label>
                      <span className="text-[10px] font-mono font-bold" style={{ color: navBgColor }}>
                        {navBgColor}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {BG_COLOR_PRESETS.map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setNavBgColor(color.hex);
                            autoSyncSettings({ navBgColor: color.hex });
                          }}
                          className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                            navBgColor.toLowerCase() === color.hex.toLowerCase()
                              ? 'border-emerald-400 scale-110 shadow-xs'
                              : 'border-slate-700/60 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {navBgColor.toLowerCase() === color.hex.toLowerCase() && (
                            <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' || color.hex === '#f8fafc' ? 'text-slate-900' : 'text-white'}`} />
                          )}
                        </button>
                      ))}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="color"
                          value={navBgColor}
                          onChange={(e) => {
                            setNavBgColor(e.target.value);
                            autoSyncSettings({ navBgColor: e.target.value });
                          }}
                          className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                          title="Cor personalizada de fundo"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4.2.1 Cor de Fundo dos Botões (Inativos / Base) */}
                <div className="space-y-2 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      Cor de Fundo dos Botões (Inativos / Base)
                    </label>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {navBtnBgColor || 'Transparente'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {BTN_BG_PRESETS.map((color) => (
                      <button
                        key={color.hex || 'transparent'}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setNavBtnBgColor(color.hex);
                          autoSyncSettings({ navBtnBgColor: color.hex });
                        }}
                        className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                          (navBtnBgColor || 'transparent').toLowerCase() === color.hex.toLowerCase()
                            ? 'border-emerald-400 scale-110 shadow-xs'
                            : 'border-slate-700/60 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex === 'transparent' ? 'transparent' : color.hex }}
                        title={color.name}
                      >
                        {color.hex === 'transparent' ? (
                          <div className="w-full h-full rounded-[3px] border border-rose-500/90 bg-rose-500/10 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-[140%] h-[1.5px] bg-rose-500 -rotate-45" />
                            </div>
                            <span className="text-[7px] font-black text-rose-500 z-10 uppercase">OFF</span>
                          </div>
                        ) : (
                          (navBtnBgColor || '').toLowerCase() === color.hex.toLowerCase() && (
                            <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' || color.hex.toLowerCase().startsWith('#f') || color.hex.toLowerCase().startsWith('#e') ? 'text-slate-900' : 'text-white'}`} />
                          )
                        )}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={navBtnBgColor && navBtnBgColor !== 'transparent' ? navBtnBgColor : '#0f172a'}
                        onChange={(e) => {
                          setNavBtnBgColor(e.target.value);
                          autoSyncSettings({ navBtnBgColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                        title="Cor personalizada de fundo dos botões"
                      />
                    </div>
                  </div>
                </div>

                {/* 4.2.2 Cor de Fundo do Botão Selecionado (Item Ativo) */}
                <div className="space-y-2 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      Cor de Fundo do Botão Ativo
                    </label>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {navBtnActiveBgColor || 'Mesma do Destaque'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {BTN_BG_PRESETS.map((color) => (
                      <button
                        key={color.hex || 'transparent'}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setNavBtnActiveBgColor(color.hex);
                          autoSyncSettings({ navBtnActiveBgColor: color.hex });
                        }}
                        className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                          (navBtnActiveBgColor || 'transparent').toLowerCase() === color.hex.toLowerCase()
                            ? 'border-emerald-400 scale-110 shadow-xs'
                            : 'border-slate-700/60 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex === 'transparent' ? 'transparent' : color.hex }}
                        title={color.name}
                      >
                        {color.hex === 'transparent' ? (
                          <div className="w-full h-full rounded-[3px] border border-rose-500/90 bg-rose-500/10 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-[140%] h-[1.5px] bg-rose-500 -rotate-45" />
                            </div>
                            <span className="text-[7px] font-black text-rose-500 z-10 uppercase">OFF</span>
                          </div>
                        ) : (
                          (navBtnActiveBgColor || '').toLowerCase() === color.hex.toLowerCase() && (
                            <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' || color.hex.toLowerCase().startsWith('#f') || color.hex.toLowerCase().startsWith('#e') ? 'text-slate-900' : 'text-white'}`} />
                          )
                        )}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={navBtnActiveBgColor && navBtnActiveBgColor !== 'transparent' ? navBtnActiveBgColor : '#10b981'}
                        onChange={(e) => {
                          setNavBtnActiveBgColor(e.target.value);
                          autoSyncSettings({ navBtnActiveBgColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                        title="Cor personalizada de fundo do botão ativo"
                      />
                    </div>
                  </div>
                </div>

                {/* 4.3 Cor de Destaque (Item Ativo) */}
                <div className="space-y-2 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      Cor de Destaque (Item Ativo)
                    </label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: navActiveColor }}>
                      {navActiveColor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setNavActiveColor(color.hex);
                          autoSyncSettings({ navActiveColor: color.hex });
                        }}
                        className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                          navActiveColor.toLowerCase() === color.hex.toLowerCase()
                            ? 'border-white scale-110 shadow-xs'
                            : 'border-slate-700/60 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {navActiveColor.toLowerCase() === color.hex.toLowerCase() && (
                          <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' ? 'text-slate-900' : 'text-white'}`} />
                        )}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={navActiveColor}
                        onChange={(e) => {
                          setNavActiveColor(e.target.value);
                          autoSyncSettings({ navActiveColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                        title="Cor personalizada de destaque"
                      />
                    </div>
                  </div>
                </div>

                {/* 4.4 Cor do Texto & Ícones (Padrão / Inativos) */}
                <div className="space-y-2 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      Cor do Texto e Ícones (Padrão)
                    </label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: navTextColor }}>
                      {navTextColor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {TEXT_COLOR_PRESETS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setNavTextColor(color.hex);
                          autoSyncSettings({ navTextColor: color.hex });
                        }}
                        className={`w-7 h-7 rounded-[4px] border transition cursor-pointer relative flex items-center justify-center ${
                          navTextColor.toLowerCase() === color.hex.toLowerCase()
                            ? 'border-emerald-400 scale-110 shadow-xs'
                            : 'border-slate-700/60 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {navTextColor.toLowerCase() === color.hex.toLowerCase() && (
                          <Check className={`w-3.5 h-3.5 ${color.hex === '#ffffff' || color.hex === '#cbd5e1' ? 'text-slate-900' : 'text-white'}`} />
                        )}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={navTextColor}
                        onChange={(e) => {
                          setNavTextColor(e.target.value);
                          autoSyncSettings({ navTextColor: e.target.value });
                        }}
                        className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
                        title="Cor personalizada do texto e ícones"
                      />
                    </div>
                  </div>
                </div>

                {/* 4.5 Formato dos Botões: Quadrado vs Boleado Circular */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold">
                    Formato dos Botões
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setNavShape('square');
                        autoSyncSettings({ navShape: 'square' });
                      }}
                      className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        navShape === 'square'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Square className={`w-4 h-4 ${navShape === 'square' ? 'text-white' : 'text-slate-400'}`} />
                        <div>
                          <span className={`text-xs font-bold block ${navShape === 'square' ? 'text-white' : ''}`}>
                            Quadrado
                          </span>
                          <span className={`text-[9px] ${navShape === 'square' ? 'text-white/80' : 'text-slate-400'}`}>
                            Raio 4px
                          </span>
                        </div>
                      </div>
                      {navShape === 'square' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setNavShape('circle');
                        autoSyncSettings({ navShape: 'circle' });
                      }}
                      className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        navShape === 'circle'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Circle className={`w-4 h-4 ${navShape === 'circle' ? 'text-white' : 'text-slate-400'}`} />
                        <div>
                          <span className={`text-xs font-bold block ${navShape === 'circle' ? 'text-white' : ''}`}>
                            Boleado Circular
                          </span>
                          <span className={`text-[9px] ${navShape === 'circle' ? 'text-white/80' : 'text-slate-400'}`}>
                            Arredondado Total
                          </span>
                        </div>
                      </div>
                      {navShape === 'circle' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* 4.6 Botão Boleado Borda / Sem Borda */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold">
                    Borda do Botão
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setNavBorder('bordered');
                        autoSyncSettings({ navBorder: 'bordered' });
                      }}
                      className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        navBorder === 'bordered'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block ${navBorder === 'bordered' ? 'text-white' : ''}`}>
                          Com Borda
                        </span>
                        <span className={`text-[9px] ${navBorder === 'bordered' ? 'text-white/80' : 'text-slate-400'}`}>
                          Contorno visível nítido
                        </span>
                      </div>
                      {navBorder === 'bordered' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setNavBorder('none');
                        autoSyncSettings({ navBorder: 'none' });
                      }}
                      className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        navBorder === 'none'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block ${navBorder === 'none' ? 'text-white' : ''}`}>
                          Sem Borda
                        </span>
                        <span className={`text-[9px] ${navBorder === 'none' ? 'text-white/80' : 'text-slate-400'}`}>
                          Layout liso e contínuo
                        </span>
                      </div>
                      {navBorder === 'none' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* 4.7 Borda do Ícone (Box Interno) */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold">
                    Borda do Ícone (Box Interno)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setNavIconBorder('bordered');
                        autoSyncSettings({ navIconBorder: 'bordered' });
                      }}
                      className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        navIconBorder === 'bordered'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block ${navIconBorder === 'bordered' ? 'text-white' : ''}`}>
                          Com Borda
                        </span>
                        <span className={`text-[9px] ${navIconBorder === 'bordered' ? 'text-white/80' : 'text-slate-400'}`}>
                          Contorno no ícone interno
                        </span>
                      </div>
                      {navIconBorder === 'bordered' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setNavIconBorder('none');
                        autoSyncSettings({ navIconBorder: 'none' });
                      }}
                      className={`p-2.5 rounded-[4px] border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        navIconBorder === 'none'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block ${navIconBorder === 'none' ? 'text-white' : ''}`}>
                          Sem Borda
                        </span>
                        <span className={`text-[9px] ${navIconBorder === 'none' ? 'text-white/80' : 'text-slate-400'}`}>
                          Sem contorno no ícone
                        </span>
                      </div>
                      {navIconBorder === 'none' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* 4.8 Efeito de Sombra nos Botões */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold">
                    Efeito de Sombra nos Botões
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'none' as const, label: 'Sem Sombra', desc: 'Plano' },
                      { id: 'subtle' as const, label: 'Sutil', desc: 'Leve relevo' },
                      { id: 'medium' as const, label: 'Moderada', desc: 'Sombra nítida' },
                      { id: 'glow' as const, label: 'Neon Glow', desc: 'Brilho colorido' },
                    ].map((opt) => {
                      const isSelected = (adminSettings.navBtnShadow || 'none') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            autoSyncSettings({ navBtnShadow: opt.id });
                          }}
                          className={`p-2 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : ''}`}>
                            {opt.label}
                          </span>
                          <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4.9 Efeito de Blur (Desfoque) nos Botões */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold">
                    Efeito de Blur (Desfoque Glass)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'none' as const, label: 'Nenhum', desc: 'Opaco' },
                      { id: 'sm' as const, label: 'Blur Leve', desc: '4px' },
                      { id: 'md' as const, label: 'Blur Médio', desc: '8px' },
                      { id: 'lg' as const, label: 'Blur Forte', desc: '16px' },
                    ].map((opt) => {
                      const isSelected = (adminSettings.navBtnBlur || 'none') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            autoSyncSettings({ navBtnBlur: opt.id });
                          }}
                          className={`p-2 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : ''}`}>
                            {opt.label}
                          </span>
                          <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4.10 Tipografia dos Botões */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <label className="text-xs font-bold flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-emerald-400" />
                    Família da Fonte dos Botões
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Poppins', 'Inter', 'Plus Jakarta Sans', 'Oswald', 'Cormorant Garamond'].map((fontName) => {
                      const isSelected = (adminSettings.navBtnFont || 'Poppins') === fontName;
                      return (
                        <button
                          key={fontName}
                          type="button"
                          onClick={() => {
                            hapticLight();
                            autoSyncSettings({ navBtnFont: fontName });
                          }}
                          style={{ fontFamily: fontName }}
                          className={`p-2 rounded-[4px] border text-center transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs font-bold'
                              : isDark
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          <span className="text-xs">{fontName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* SUB-SEÇÃO 5: FAIXA DE BOAS-VINDAS */}
            {activeSection === 'welcome' && (
              <div className={`p-3.5 rounded-[4px] border space-y-3.5 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                      Faixa de Boas-Vindas (Topo da Vitrine)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {welcomeStyle === 'atmospheric' ? 'Degradê do Tema' : 'Cristal / Translúcido'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { 
                      id: 'atmospheric' as const, 
                      label: 'Degradê do Tema', 
                      desc: 'Fusão atmosférica com a cor de destaque, proporcionando imersão visual' 
                    },
                    { 
                      id: 'glass' as const, 
                      label: 'Cristal / Translúcido', 
                      desc: 'Superfície de alto contraste com acabamento elegante e limpo' 
                    },
                  ].map((opt) => {
                    const isSelected = welcomeStyle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setWelcomeStyle(opt.id);
                        }}
                        className={`p-3 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                            : isDark
                              ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : ''}`}>
                            {opt.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </div>
                        <span className={`text-[10px] leading-tight ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Prévia da Faixa de Boas-Vindas */}
                <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prévia da Faixa
                  </span>

                  <div className={`p-3 rounded-[4px] border relative overflow-hidden flex items-center justify-between ${
                    welcomeStyle === 'atmospheric'
                      ? isDark
                        ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/30 text-white'
                        : 'bg-gradient-to-r from-emerald-100 via-white to-slate-50 border-emerald-300 text-slate-900'
                      : isDark
                        ? 'bg-slate-900/90 backdrop-blur-md border-slate-800 text-white'
                        : 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-900 shadow-xs'
                  }`}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block font-['Poppins']">
                        Boas-vindas
                      </span>
                      <span className="text-xs font-bold">
                        {adminSettings.salonName || 'Meu Estabelecimento'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500 text-white">
                      Aberto Agora
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
