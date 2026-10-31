import React, { useState, useRef } from 'react';
import { 
  Palette, Upload, Trash2, Smartphone, Image as ImageIcon,
  Check, Sparkles, ArrowLeft, Sun, Moon, RefreshCw, Save, Type, Copy, LayoutGrid
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SalonAdminSettings } from '../../types';
import { hapticSuccess, hapticLight } from '../../utils/haptics';
import { updateDynamicPwaAssets } from '../../utils/pwaAssets';
import { compressImageFile } from '../../utils/imageCompressor';
import { getSectionHeaderStyleData } from '../../utils/sectionHeaderStyle';
import { getThemeColorPresets } from '../../utils/colorPresets';

export interface VisualIdentityCardViewProps {
  adminSettings: SalonAdminSettings;
  onUpdateSettings: (settings: Partial<SalonAdminSettings>) => Promise<any> | void;
  onBack: () => void;
}

export const VisualIdentityCardView: React.FC<VisualIdentityCardViewProps> = ({
  adminSettings,
  onUpdateSettings,
  onBack,
}) => {
  const { isDark, setAccentColor: setAccentColorContext } = useTheme();

  const [salonName] = useState(adminSettings.salonName || '');
  const [pwaName, setPwaName] = useState(adminSettings.pwaName || adminSettings.salonName || '');
  const [slogan, setSlogan] = useState(adminSettings.slogan || '');
  const [brandFont, setBrandFont] = useState<string>(adminSettings.brandFont || 'Poppins');
  const [navStyle, setNavStyle] = useState<'minimal' | 'solid' | 'boxed'>(adminSettings.navStyle || 'minimal');
  const [welcomeStyle, setWelcomeStyle] = useState<'atmospheric' | 'glass'>(adminSettings.welcomeStyle || 'atmospheric');
  const [salonLogoLight, setSalonLogoLight] = useState(adminSettings.salonLogoLight || adminSettings.salonLogo || '');
  const [salonLogoDark, setSalonLogoDark] = useState(adminSettings.salonLogoDark || adminSettings.salonLogo || '');
  const [salonIcon, setSalonIcon] = useState(adminSettings.salonIcon || '');
  const [accentColor, setAccentColor] = useState(adminSettings.accentColor || '#10b981');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string>('');

  const logoLightInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const COLOR_PRESETS = getThemeColorPresets(accentColor);

  const BRAND_FONT_PRESETS = [
    {
      id: 'Poppins',
      label: 'Poppins',
      subtitle: 'Moderna & Geométrica',
      family: "'Poppins', sans-serif",
    },
    {
      id: 'Cormorant Garamond',
      label: 'Cormorant Garamond',
      subtitle: 'Elegante & Editorial',
      family: "'Cormorant Garamond', Georgia, serif",
    },
    {
      id: 'Oswald',
      label: 'Oswald',
      subtitle: 'Clássica & Forte',
      family: "'Oswald', sans-serif",
    },
    {
      id: 'Plus Jakarta Sans',
      label: 'Plus Jakarta Sans',
      subtitle: 'Minimalista & Clean',
      family: "'Plus Jakarta Sans', sans-serif",
    },
  ];

  const activeBrandFontFamily =
    BRAND_FONT_PRESETS.find((f) => f.id === brandFont)?.family || "'Poppins', sans-serif";

  // Upload Logo Tema Claro (com compressão automática para caber no localStorage e PWA)
  const handleLogoLightFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 640, maxHeight: 180, quality: 0.88 });
        setSalonLogoLight(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao processar logo claro:', err);
      }
    }
  };

  // Upload Logo Tema Escuro (com compressão automática)
  const handleLogoDarkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 640, maxHeight: 180, quality: 0.88 });
        setSalonLogoDark(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao processar logo escuro:', err);
      }
    }
  };

  // Upload Ícone Mobile (1:1 com compressão quadrada para PWA)
  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 256, maxHeight: 256, quality: 0.9, mimeType: 'image/png' });
        setSalonIcon(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao processar ícone mobile:', err);
      }
    }
  };

  const handleLogoLightDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 640, maxHeight: 180, quality: 0.88 });
        setSalonLogoLight(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao processar logo claro:', err);
      }
    }
  };

  const handleLogoDarkDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 640, maxHeight: 180, quality: 0.88 });
        setSalonLogoDark(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao processar logo escuro:', err);
      }
    }
  };

  const handleIconDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 256, maxHeight: 256, quality: 0.9, mimeType: 'image/png' });
        setSalonIcon(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao processar ícone mobile:', err);
      }
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    hapticSuccess();
    setIsSaving(true);
    setSaveFeedback('Sincronizando com o Supabase...');

    const finalLogo = isDark ? (salonLogoDark || salonLogoLight) : (salonLogoLight || salonLogoDark);

    try {
      if (salonLogoLight) localStorage.setItem('vagou_salon_logo_light', salonLogoLight);
      if (salonLogoDark) localStorage.setItem('vagou_salon_logo_dark', salonLogoDark);
      if (salonIcon) localStorage.setItem('vagou_salon_icon', salonIcon);
      localStorage.setItem('vagou_accent_color', accentColor);
    } catch (storageErr) {
      console.warn('Erro ao salvar chaves auxiliares de identidade:', storageErr);
    }

    setAccentColorContext(accentColor);
    updateDynamicPwaAssets(pwaName.trim() || salonName, salonIcon || finalLogo);

    const result = await onUpdateSettings({
      salonLogo: finalLogo,
      salonLogoLight,
      salonLogoDark,
      salonIcon,
      accentColor,
      pwaName: pwaName.trim() || salonName,
      slogan: slogan.trim(),
      brandFont,
      navStyle,
      welcomeStyle,
    });

    setIsSaving(false);
    if (result && result.success === false) {
      setSaveFeedback(`Erro Supabase: ${result.error || 'Falha ao gravar'}`);
      setSavedSuccess(false);
    } else {
      setSaveFeedback('Salvo com sucesso na nuvem Supabase!');
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setSaveFeedback('');
      }, 3500);
    }
  };

  const handleInstantSaveLogo = async () => {
    hapticSuccess();
    setIsSaving(true);
    setSaveFeedback('Salvando logo no banco de dados...');

    const finalLogo = isDark ? (salonLogoDark || salonLogoLight) : (salonLogoLight || salonLogoDark);

    try {
      if (salonLogoLight) localStorage.setItem('vagou_salon_logo_light', salonLogoLight);
      if (salonLogoDark) localStorage.setItem('vagou_salon_logo_dark', salonLogoDark);
      if (salonIcon) localStorage.setItem('vagou_salon_icon', salonIcon);
    } catch {}

    updateDynamicPwaAssets(pwaName.trim() || salonName, salonIcon || finalLogo);

    const result = await onUpdateSettings({
      salonLogo: finalLogo,
      salonLogoLight,
      salonLogoDark,
      salonIcon,
    });

    setIsSaving(false);
    if (result && result.success === false) {
      setSaveFeedback(`Erro ao salvar logo: ${result.error || 'Falha'}`);
      setSavedSuccess(false);
    } else {
      setSaveFeedback('Logo salvo no banco de dados com sucesso!');
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setSaveFeedback('');
      }, 3500);
    }
  };

  const autoSyncSettings = (updates: Partial<SalonAdminSettings>) => {
    try {
      onUpdateSettings(updates);
    } catch {
      // ignore
    }
  };

  const sectionHeaderStyleData = React.useMemo(() => {
    return getSectionHeaderStyleData(adminSettings, isDark);
  }, [adminSettings, isDark]);

  return (
    <div className={`w-full h-full flex flex-col justify-between overflow-y-auto ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Topo com botão voltar */}
      <div 
        className={sectionHeaderStyleData.containerClass}
        style={sectionHeaderStyleData.containerStyle}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onBack();
            }}
            className={`p-1.5 rounded transition cursor-pointer active:scale-95 ${
              isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Voltar ao Gerenciamento"
          >
            <ArrowLeft className="w-4 h-4" style={sectionHeaderStyleData.iconStyle} />
          </button>
          <div className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 shrink-0" style={sectionHeaderStyleData.iconStyle} />
            <h2 className="text-xs sm:text-sm font-bold font-['Poppins']" style={sectionHeaderStyleData.titleStyle}>
              Identidade Visual
            </h2>
          </div>
        </div>

        {isSaving ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded shadow-xs animate-pulse">
            <RefreshCw className="w-3 h-3 text-white animate-spin" />
            Salvando no Supabase...
          </span>
        ) : savedSuccess ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded shadow-xs animate-in fade-in">
            <Check className="w-3 h-3 text-white" />
            Salvo no Supabase
          </span>
        ) : saveFeedback ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded shadow-xs">
            {saveFeedback}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSave} className="p-3.5 space-y-4 pb-24">
        
        {/* 1. COR DE DESTAQUE */}
        <div className={`p-3.5 rounded border space-y-3 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                Cor de Destaque
              </h3>
            </div>
            <span className="text-xs font-mono font-bold" style={{ color: accentColor }}>
              {accentColor}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => {
                  hapticLight();
                  setAccentColor(preset.hex);
                  setAccentColorContext(preset.hex);
                  onUpdateSettings({ accentColor: preset.hex });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                  accentColor.toLowerCase() === preset.hex.toLowerCase()
                    ? 'border-white bg-slate-800 text-white shadow-xs scale-105'
                    : isDark
                    ? 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300'
                }`}
                style={accentColor.toLowerCase() === preset.hex.toLowerCase() ? { borderColor: preset.hex } : undefined}
              >
                <span 
                  className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-xs" 
                  style={{ backgroundColor: preset.hex }} 
                />
                <span>{preset.label}</span>
                {accentColor.toLowerCase() === preset.hex.toLowerCase() && (
                  <Check className="w-3 h-3 ml-0.5 text-white" />
                )}
              </button>
            ))}

            {/* Seletor Customizado & Input Hexadecimal */}
            <div className="flex items-center gap-1 pl-1">
              <input
                type="color"
                value={accentColor.length === 7 && /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#10b981'}
                onChange={(e) => {
                  const val = e.target.value;
                  setAccentColor(val);
                  setAccentColorContext(val);
                  onUpdateSettings({ accentColor: val });
                }}
                className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                title="Escolha uma cor personalizada"
              />
              <span className="text-[10px] text-slate-400 font-mono">Custom</span>
            </div>
          </div>

          {/* Campo de Entrada de Cor Hexadecimal (#HEX) */}
          <div className={`p-2.5 rounded border flex items-center justify-between gap-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="w-7 h-7 rounded border border-white/20 shrink-0 shadow-xs transition-colors"
                style={{ backgroundColor: /^#[0-9a-fA-F]{3,6}$/.test(accentColor) ? accentColor : '#10b981' }}
              />
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-slate-400 select-none">Hexa:</span>
                <input
                  type="text"
                  value={accentColor}
                  maxLength={7}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    if (val && !val.startsWith('#')) {
                      val = '#' + val;
                    }
                    setAccentColor(val);
                    if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
                      setAccentColorContext(val);
                      onUpdateSettings({ accentColor: val });
                    }
                  }}
                  placeholder="#10B981"
                  className={`w-28 px-2 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              Digite a cor (ex: #10B981)
            </span>
          </div>
        </div>

        {/* 2. LOGOS DO CABEÇALHO (TEMA CLARO E TEMA ESCURO) */}
        <div className={`p-3.5 rounded border space-y-3.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                Logos do Cabeçalho
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              2 Versões (Claro & Escuro)
            </span>
          </div>



          <div className="flex items-center justify-between pt-1 pb-1">
            <span className={`text-[10px] font-semibold truncate ${savedSuccess ? 'text-emerald-400' : 'text-slate-400'}`}>
              {saveFeedback || 'Logo PNG ou SVG'}
            </span>
            <button
              type="button"
              onClick={handleInstantSaveLogo}
              disabled={isSaving}
              className="py-1.5 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              <span className="text-white">{isSaving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* 2.1 Logo para Tema Claro */}
            <div className={`p-3 rounded border flex flex-col justify-between gap-2.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/90 border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/40">
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Logo Tema Claro
                  </span>
                </div>
                <span className="text-[8.5px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Fundo Claro
                </span>
              </div>

              {/* Prévia Fundo Claro */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Prévia no Topo Claro</span>
                  <span className="flex items-center gap-0.5 font-bold" style={{ color: accentColor }}>
                    <Sparkles className="w-2 h-2" style={{ color: accentColor }} /> Ao Vivo
                  </span>
                </div>

                <div className="h-10 rounded border border-slate-200 bg-white px-3 flex items-center justify-between overflow-hidden shadow-2xs">
                  <div className="h-full flex items-center max-w-[160px] overflow-hidden">
                    {salonLogoLight ? (
                      <img 
                        src={salonLogoLight} 
                        alt="Logo Tema Claro" 
                        className="max-h-6.5 w-auto object-contain object-left" 
                      />
                    ) : (
                      <span className="text-xs font-black uppercase tracking-tight truncate text-slate-900">
                        <span style={{ color: accentColor }}>{salonName.split(' ')[0]}</span>{' '}
                        {salonName.split(' ').slice(1).join(' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-60 text-[9px] text-slate-500 font-bold">
                    <span>Cliente</span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                  </div>
                </div>
              </div>

              {/* Dropzone / Upload Claro */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleLogoLightDrop}
                className={`p-2.5 rounded border border-dashed flex items-center justify-between gap-2 transition ${
                  isDark ? 'border-slate-700 bg-slate-900/40 hover:border-amber-500' : 'border-slate-300 bg-white hover:border-amber-500'
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {salonLogoLight ? 'Logo claro ativo' : 'Nenhum logo enviado'}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate">
                    {salonLogoLight ? 'Toque para substituir' : 'Traços e escrita escura'}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => logoLightInputRef.current?.click()}
                    className="py-1 px-2.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[9.5px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Upload className="w-3 h-3 text-white" />
                    <span>{salonLogoLight ? 'Substituir' : 'Enviar'}</span>
                  </button>

                  {salonLogoLight && (
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSalonLogoLight('');
                      }}
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition cursor-pointer"
                      title="Remover logo do tema claro"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <input 
                  ref={logoLightInputRef}
                  type="file" 
                  accept="image/png,image/jpeg,image/svg+xml,image/webp" 
                  className="hidden" 
                  onChange={handleLogoLightFileChange} 
                />
              </div>
            </div>

            {/* 2.2 Logo para Tema Escuro */}
            <div className={`p-3 rounded border flex flex-col justify-between gap-2.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/90 border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/40">
                <div className="flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Logo Tema Escuro
                  </span>
                </div>
                <span className="text-[8.5px] px-1.5 py-0.5 rounded font-bold bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30">
                  Fundo Escuro
                </span>
              </div>

              {/* Prévia Fundo Escuro */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Prévia no Topo Escuro</span>
                  <span className="flex items-center gap-0.5 font-bold" style={{ color: accentColor }}>
                    <Sparkles className="w-2 h-2" style={{ color: accentColor }} /> Ao Vivo
                  </span>
                </div>

                <div className="h-10 rounded border border-slate-800 bg-[#151A1E] px-3 flex items-center justify-between overflow-hidden shadow-2xs">
                  <div className="h-full flex items-center max-w-[160px] overflow-hidden">
                    {salonLogoDark ? (
                      <img 
                        src={salonLogoDark} 
                        alt="Logo Tema Escuro" 
                        className="max-h-6.5 w-auto object-contain object-left" 
                      />
                    ) : (
                      <span className="text-xs font-black uppercase tracking-tight truncate text-white">
                        <span style={{ color: accentColor }}>{salonName.split(' ')[0]}</span>{' '}
                        {salonName.split(' ').slice(1).join(' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-60 text-[9px] text-slate-400 font-bold">
                    <span>Cliente</span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                  </div>
                </div>
              </div>

              {/* Dropzone / Upload Escuro */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleLogoDarkDrop}
                className={`p-2.5 rounded border border-dashed flex items-center justify-between gap-2 transition ${
                  isDark ? 'border-slate-700 bg-slate-900/40 hover:border-blue-500' : 'border-slate-300 bg-white hover:border-blue-500'
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {salonLogoDark ? 'Logo escuro ativo' : 'Nenhum logo enviado'}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate">
                    {salonLogoDark ? 'Toque para substituir' : 'Traços e escrita clara/branca'}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => logoDarkInputRef.current?.click()}
                    className="py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[9.5px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Upload className="w-3 h-3 text-white" />
                    <span>{salonLogoDark ? 'Substituir' : 'Enviar'}</span>
                  </button>

                  {salonLogoDark && (
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSalonLogoDark('');
                      }}
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition cursor-pointer"
                      title="Remover logo do tema escuro"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <input 
                  ref={logoDarkInputRef}
                  type="file" 
                  accept="image/png,image/jpeg,image/svg+xml,image/webp" 
                  className="hidden" 
                  onChange={handleLogoDarkFileChange} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. LOGO ÍCONE DO APP (MOBILE / PWA) */}
        <div className={`p-3.5 rounded border space-y-3 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                Ícone do App (Mobile)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Quadrado (1:1)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Mockup do Celular */}
            <div className={`p-3 rounded border flex flex-col items-center justify-center gap-1.5 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/20 shadow-md flex items-center justify-center overflow-hidden">
                {salonIcon ? (
                  <img 
                    src={salonIcon} 
                    alt="Ícone do App" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-bold text-base"
                    style={{ backgroundColor: accentColor, fontFamily: activeBrandFontFamily }}
                  >
                    {(pwaName || salonName || 'VG').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className={`text-[11px] font-bold block truncate max-w-[140px] ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {pwaName || salonName}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                  Tela Inicial
                </span>
              </div>
            </div>

            {/* Upload, Espelhamento Rápido e Nome */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nome do App no Celular
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setPwaName(salonName);
                    }}
                    className="text-[9px] hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                    style={{ color: accentColor }}
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Sincronizar
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={18}
                  value={pwaName}
                  onChange={(e) => setPwaName(e.target.value)}
                  placeholder="Ex: Meu Salão"
                  className={`w-full px-3 py-1.5 rounded border text-xs font-semibold outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleIconDrop}
                className="flex flex-col gap-1.5 pt-1"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    className="flex-1 py-1.5 px-3 rounded text-white text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Upload className="w-3 h-3 text-white" />
                    <span>{salonIcon ? 'Substituir Ícone' : 'Enviar Ícone (1:1)'}</span>
                  </button>

                  {salonIcon && (
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSalonIcon('');
                      }}
                      className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition cursor-pointer"
                      title="Remover ícone do app"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <input 
                    ref={iconInputRef}
                    type="file" 
                    accept="image/png,image/jpeg,image/svg+xml,image/webp" 
                    className="hidden" 
                    onChange={handleIconFileChange} 
                  />
                </div>

                {(salonLogoDark || salonLogoLight) && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticSuccess();
                      const sourceLogo = salonLogoDark || salonLogoLight;
                      setSalonIcon(sourceLogo);
                    }}
                    className={`w-full py-1.5 px-2.5 rounded border text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/60 hover:text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-emerald-500/60'
                    }`}
                  >
                    <Copy className="w-3 h-3" style={{ color: accentColor }} />
                    <span>Usar mesmo do logotipo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. SLOGAN CURTO & ESTILO DE FONTE DA MARCA (Boletim bol-017) */}
        <div className={`p-3.5 rounded border space-y-3.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                Tipografia & Slogan da Marca
              </h3>
            </div>
            <span className="text-[10px] font-bold" style={{ color: accentColor }}>
              {brandFont}
            </span>
          </div>

          {/* Campo Slogan Curto */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Slogan Curto da Marca
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {slogan.length}/60
              </span>
            </div>
            <input
              type="text"
              maxLength={60}
              value={slogan}
              onChange={(e) => {
                const val = e.target.value;
                setSlogan(val);
                autoSyncSettings({ slogan: val });
              }}
              placeholder="Ex: Especialistas em cortes clássicos e visagismo"
              className={`w-full px-3 py-2 rounded border text-xs font-medium outline-hidden transition ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Seletor Rápido dos 4 Estilos de Fonte de Marca */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Fonte de Destaque do Nome (Cabeçalho & Vitrine)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BRAND_FONT_PRESETS.map((font) => {
                const isSelected = brandFont === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setBrandFont(font.id);
                      autoSyncSettings({ brandFont: font.id });
                    }}
                    className={`p-2.5 rounded border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? isDark
                          ? 'bg-slate-950 border-white text-white shadow-xs'
                          : 'bg-slate-100 border-slate-900 text-slate-900 shadow-xs'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                    style={isSelected ? { borderColor: accentColor } : undefined}
                  >
                    <div className="min-w-0">
                      <span
                        className="text-sm font-bold block truncate leading-tight"
                        style={{ fontFamily: font.family }}
                      >
                        {salonName || font.label}
                      </span>
                      <span className="text-[9.5px] text-slate-400 block truncate mt-0.5 font-['Poppins']">
                        {font.label} • {font.subtitle}
                      </span>
                    </div>
                    {isSelected && (
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. ESTILO DA BARRA DE NAVEGAÇÃO & FAIXA DE BOAS-VINDAS */}
        <div className={`p-3.5 rounded border space-y-3.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                Estilo de Navegação & Boas-Vindas
              </h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-500">
              {navStyle === 'minimal' ? 'Minimalista' : navStyle === 'solid' ? 'Destaque Sólido' : 'Clássico'}
            </span>
          </div>

          {/* Seletor de Estilo do BottomNav */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Barra de Navegação Inferior (Rodapé)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'minimal' as const, label: 'Minimalista', desc: 'Linha luminosa' },
                { id: 'solid' as const, label: 'Sólido', desc: 'Botão preenchido' },
                { id: 'boxed' as const, label: 'Emoldurado', desc: 'Ícone em caixa' },
              ].map((opt) => {
                const isSelected = navStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setNavStyle(opt.id);
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
                        {opt.label}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                    </div>
                    <span className={`text-[9px] truncate ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Estilo da Faixa de Boas-Vindas */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Faixa de Boas-Vindas (Topo da Vitrine)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'atmospheric' as const, label: 'Degradê do Tema', desc: 'Fusão suave com a cor da marca' },
                { id: 'glass' as const, label: 'Cristal / Translúcido', desc: 'Superfície limpa de alto contraste' },
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
                        {opt.label}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                    </div>
                    <span className={`text-[9px] truncate ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>

      {/* RODAPÉ FIXO DE AÇÃO */}
      <div className={`p-3 border-t shrink-0 sticky bottom-0 z-20 flex items-center justify-between gap-3 ${
        isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-lg'
      }`}>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onBack();
          }}
          className={`px-4 py-2.5 rounded border text-xs font-bold transition cursor-pointer ${
            isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-900' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSave()}
          className="flex-1 py-2.5 px-4 rounded text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98 disabled:opacity-75"
          style={{ backgroundColor: accentColor }}
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 text-white animate-spin" />
              <span>Sincronizando no Supabase...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-white" />
              <span>Salvar Identidade Visual</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
