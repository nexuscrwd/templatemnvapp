import React from 'react';
import { Palette, Type, Check, Sparkles, Sliders } from 'lucide-react';
import { SalonAdminSettings } from '../../types';
import { hapticLight } from '../../utils/haptics';
import { getThemeColorPresets } from '../../utils/colorPresets';

interface UnifiedButtonEditorProps {
  title?: string;
  subtitle?: string;
  adminSettings: SalonAdminSettings;
  onUpdateSettings: (settings: Partial<SalonAdminSettings>) => void;
  isDark: boolean;
  prefixKey?: 'nav' | 'sectionHeader';
}

export const UnifiedButtonEditor: React.FC<UnifiedButtonEditorProps> = ({
  title = 'Editor de Botões',
  subtitle = 'Fundo, borda, fonte, sombra e blur em tempo real',
  adminSettings,
  onUpdateSettings,
  isDark,
  prefixKey = 'nav',
}) => {
  const BTN_BG_PRESETS = getThemeColorPresets(adminSettings.accentColor || '#10b981');
  const isNav = prefixKey === 'nav';
  const bgCol = isNav ? (adminSettings.navBtnBgColor || '') : (adminSettings.sectionHeaderBtnBgColor || '');
  const borderOpt = isNav ? (adminSettings.navBorder || 'bordered') : (adminSettings.sectionHeaderBtnBorder || 'bordered');
  const shadowOpt = isNav ? (adminSettings.navBtnShadow || 'none') : (adminSettings.sectionHeaderBtnShadow || 'none');
  const blurOpt = isNav ? (adminSettings.navBtnBlur || 'none') : (adminSettings.sectionHeaderBtnBlur || 'none');
  const fontOpt = isNav ? (adminSettings.navBtnFont || 'Poppins') : (adminSettings.sectionHeaderBtnFont || 'Poppins');

  const updateField = (key: string, value: any) => {
    if (isNav) {
      if (key === 'bgColor') onUpdateSettings({ navBtnBgColor: value });
      if (key === 'border') onUpdateSettings({ navBorder: value });
      if (key === 'shadow') onUpdateSettings({ navBtnShadow: value });
      if (key === 'blur') onUpdateSettings({ navBtnBlur: value });
      if (key === 'font') onUpdateSettings({ navBtnFont: value });
    } else {
      if (key === 'bgColor') onUpdateSettings({ sectionHeaderBtnBgColor: value });
      if (key === 'border') onUpdateSettings({ sectionHeaderBtnBorder: value });
      if (key === 'shadow') onUpdateSettings({ sectionHeaderBtnShadow: value });
      if (key === 'blur') onUpdateSettings({ sectionHeaderBtnBlur: value });
      if (key === 'font') onUpdateSettings({ sectionHeaderBtnFont: value });
    }
  };

  return (
    <div className={`p-3.5 rounded-[4px] border space-y-4 ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
            {title}
          </h3>
        </div>
        <span className="text-[10px] font-bold text-emerald-400">
          Ao Vivo no App
        </span>
      </div>

      {/* 1. Cor de Fundo dos Botões */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-emerald-400" />
            Cor de Fundo dos Botões
          </label>
          <span className="text-[10px] font-mono font-bold text-slate-400">
            {bgCol || 'Translúcido Padrão'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {BTN_BG_PRESETS.map((color) => {
            const isSel = bgCol.toLowerCase() === color.hex.toLowerCase();
            return (
              <button
                key={color.hex || 'transparent'}
                type="button"
                onClick={() => {
                  hapticLight();
                  updateField('bgColor', color.hex);
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
                    <Check className={`w-3.5 h-3.5 ${
                      color.hex === '#ffffff' || color.hex.toLowerCase().startsWith('#f') || color.hex.toLowerCase().startsWith('#e')
                        ? 'text-slate-900'
                        : 'text-white'
                    }`} />
                  )
                )}
              </button>
            );
          })}

          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="color"
              value={bgCol && bgCol !== 'transparent' ? bgCol : '#10b981'}
              onChange={(e) => {
                updateField('bgColor', e.target.value);
              }}
              className="w-7 h-7 rounded-[4px] border border-slate-700 cursor-pointer bg-transparent"
              title="Cor personalizada de fundo dos botões"
            />
          </div>
        </div>
      </div>

      {/* 2. Borda dos Botões */}
      <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
        <label className="text-xs font-bold">
          Borda dos Botões
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'bordered' as const, label: 'Com Borda', desc: 'Contorno visível nítido' },
            { id: 'none' as const, label: 'Sem Borda', desc: 'Superfície limpa contínua' },
          ].map((opt) => {
            const isSel = borderOpt === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  updateField('border', opt.id);
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

      {/* 3. Efeito de Sombra nos Botões */}
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
            const isSelected = shadowOpt === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  updateField('shadow', opt.id);
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

      {/* 4. Efeito de Blur nos Botões */}
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
            const isSelected = blurOpt === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  updateField('blur', opt.id);
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

      {/* 5. Tipografia dos Botões */}
      <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
        <label className="text-xs font-bold flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-emerald-400" />
          Família da Fonte dos Botões
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['Poppins', 'Inter', 'Plus Jakarta Sans', 'Oswald', 'Cormorant Garamond'].map((fontName) => {
            const isSelected = fontOpt === fontName;
            return (
              <button
                key={fontName}
                type="button"
                onClick={() => {
                  hapticLight();
                  updateField('font', fontName);
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
  );
};
