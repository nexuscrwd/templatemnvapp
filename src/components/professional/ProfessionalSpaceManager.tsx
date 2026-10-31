import React, { useState, useRef } from 'react';
import { 
  Store, Phone, MapPin, Clock, 
  KeyRound, Save, Check, Palette,
  Upload, Trash2, Smartphone, Image as ImageIcon,
  CheckCircle2, Sparkles, RefreshCw
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SalonAdminSettings, SalonProfessionalItem } from '../../types';
import { hapticSuccess, hapticLight } from '../../utils/haptics';
import { updateDynamicPwaAssets } from '../../utils/pwaAssets';
import { compressImageFile } from '../../utils/imageCompressor';
import { getThemeColorPresets } from '../../utils/colorPresets';

export interface ProfessionalSpaceManagerProps {
  adminSettings: SalonAdminSettings;
  onUpdateSettings: (settings: Partial<SalonAdminSettings>) => void;
  professionals: SalonProfessionalItem[];
  onUpdateProfessionals: (professionals: SalonProfessionalItem[]) => void;
}

export const ProfessionalSpaceManager: React.FC<ProfessionalSpaceManagerProps> = ({
  adminSettings,
  onUpdateSettings,
}) => {
  const { isDark, setAccentColor: setAccentColorContext } = useTheme();

  // Estados dos dados do espaço
  const [salonName, setSalonName] = useState(adminSettings.salonName || '');
  const [pwaName, setPwaName] = useState(adminSettings.pwaName || adminSettings.salonName || '');
  const [salonPhone, setSalonPhone] = useState(adminSettings.salonPhone || '');
  const [salonAddress, setSalonAddress] = useState(adminSettings.salonAddress || '');
  const [openingHours, setOpeningHours] = useState(adminSettings.openingHours || 'Seg a Sáb • 09:00 às 20:00');
  
  // Ativos visuais separados: Logo Retangular (Cabeçalho) vs Ícone Quadrado (PWA)
  const [salonLogo, setSalonLogo] = useState(adminSettings.salonLogo || '');
  const [salonLogoLight, setSalonLogoLight] = useState(adminSettings.salonLogoLight || '');
  const [salonLogoDark, setSalonLogoDark] = useState(adminSettings.salonLogoDark || '');
  const [salonIcon, setSalonIcon] = useState(adminSettings.salonIcon || '');
  const [accentColor, setAccentColor] = useState(adminSettings.accentColor || '#10b981');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Refs para inputs de arquivo ocultos
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Processamento de Upload do Logo Retangular com compressão
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 640, maxHeight: 180, quality: 0.88 });
        setSalonLogo(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao comprimir logo:', err);
      }
    }
  };

  // Processamento de Upload do Ícone Quadrado (PWA) com compressão
  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 256, maxHeight: 256, quality: 0.9, mimeType: 'image/png' });
        setSalonIcon(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao comprimir ícone:', err);
      }
    }
  };

  // Drag & Drop para o Logo Retangular
  const handleLogoDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 640, maxHeight: 180, quality: 0.88 });
        setSalonLogo(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao comprimir logo:', err);
      }
    }
  };

  // Drag & Drop para o Ícone do PWA
  const handleIconDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 256, maxHeight: 256, quality: 0.9, mimeType: 'image/png' });
        setSalonIcon(compressed);
        hapticSuccess();
      } catch (err) {
        console.error('Erro ao comprimir ícone:', err);
      }
    }
  };

  // Salvar configurações
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    hapticSuccess();

    const updatedSettings: Partial<SalonAdminSettings> = {
      salonName,
      pwaName: pwaName.trim() || salonName,
      salonPhone,
      salonAddress,
      openingHours,
      salonLogo,
      salonLogoLight,
      salonLogoDark,
      salonIcon,
      accentColor,
    };

    onUpdateSettings(updatedSettings);

    // Atualiza imediatamente os ativos do PWA no navegador
    updateDynamicPwaAssets(pwaName.trim() || salonName, salonIcon);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Presets rápidos de cores elegantes baseadas no tema
  const COLOR_PRESETS = getThemeColorPresets(accentColor);

  return (
    <div className={`w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Conteúdo Principal com Rolagem */}
      <form onSubmit={handleSaveSettings} className="p-3.5 space-y-4 pb-20">
        
        {/* Cabeçalho da Seção */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
              Identidade Visual & Espaço
            </h3>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded shadow-xs animate-in fade-in">
              <Check className="w-3 h-3 text-white" />
              Salvo com Sucesso
            </span>
          )}
        </div>

        {/* 1. SEÇÃO DO LOGO RETANGULAR DO CABEÇALHO */}
        <div className={`p-3 rounded-xl border flex flex-col gap-2.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Logo do Cabeçalho
              </span>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              Formato Retangular (Topo do App)
            </span>
          </div>

          <p className="text-[10.5px] text-slate-400 leading-snug">
            Este logo substitui o nome no topo do aplicativo para clientes e profissionais. 
            Recomendamos imagem horizontal com fundo transparente (PNG/SVG, proporção ~3:1 ou 4:1).
          </p>

          {/* Pré-visualização em Tempo Real do Topo do App */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
              <span>Prévia no Cabeçalho do App</span>
              <span className="text-emerald-400 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> Ao Vivo
              </span>
            </div>

            {/* Mockup Fiel da Barra Superior do App */}
            <div className={`h-12 sm:h-13 rounded-lg border px-3 flex items-center justify-between overflow-hidden shadow-inner ${
              isDark ? 'bg-[#151A1E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {/* Lado Esquerdo: O Logo Retangular ou Tipografia Fallback */}
              <div className="h-full flex items-center max-w-[160px] sm:max-w-[200px] overflow-hidden">
                {salonLogo ? (
                  <img 
                    src={salonLogo} 
                    alt="Logo Cabeçalho" 
                    className="max-h-7 sm:max-h-8 w-auto max-w-full object-contain object-left" 
                  />
                ) : (
                  <span className={`text-xs font-extrabold uppercase tracking-tight leading-tight truncate ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <span className="text-emerald-500">{salonName.split(' ')[0]}</span>{' '}
                    {salonName.split(' ').slice(1).join(' ')}
                  </span>
                )}
              </div>

              {/* Lado Direito: Simulação dos Controles do Cabeçalho */}
              <div className="flex items-center gap-1 opacity-70 scale-90 origin-right">
                <div className="flex items-center p-0.5 rounded border border-slate-700 bg-slate-800/80 text-[9px] font-black uppercase text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white">Ger.</span>
                  <span className="px-1.5 py-0.5">Púb.</span>
                </div>
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-[9px]">
                  🔔
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[9px] text-white font-bold">
                  ✂️
                </div>
              </div>
            </div>
          </div>

          {/* Área de Ação / Dropzone para o Logo Retangular */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleLogoDrop}
            className={`p-2.5 rounded-lg border border-dashed flex items-center justify-between gap-2 transition ${
              isDark ? 'border-slate-700 bg-slate-950/40 hover:border-emerald-500/60' : 'border-slate-300 bg-slate-50 hover:border-emerald-500'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold truncate">
                  {salonLogo ? 'Logo horizontal carregado' : 'Nenhum logo enviado'}
                </p>
                <p className="text-[9.5px] text-slate-400 truncate">
                  {salonLogo ? 'Clique para substituir ou use o botão de remover' : 'Arraste a imagem aqui ou selecione no aparelho'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {salonLogo && (
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setSalonLogo('');
                  }}
                  className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                  title="Remover logo e voltar ao texto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Upload className="w-3 h-3 text-white" />
                <span>{salonLogo ? 'Substituir' : 'Subir Logo'}</span>
              </button>
              <input 
                ref={logoInputRef}
                type="file" 
                accept="image/png,image/jpeg,image/svg+xml,image/webp" 
                className="hidden" 
                onChange={handleLogoFileChange} 
              />
            </div>
          </div>
        </div>

        {/* 2. SEÇÃO DO ÍCONE & NOME PWA (INSTALAÇÃO NO SMARTPHONE) */}
        <div className={`p-3 rounded-xl border flex flex-col gap-2.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Ícone & App PWA (Mobile)
              </span>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              Quadrado (1:1) • Tela Inicial
            </span>
          </div>

          <p className="text-[10.5px] text-slate-400 leading-snug">
            Ícone e nome que aparecerão no smartphone dos seus clientes quando eles instalarem 
            o aplicativo do seu estabelecimento na tela inicial.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Simulador da Tela Inicial do Celular */}
            <div className={`rounded-xl p-3 border flex flex-col items-center justify-center gap-1.5 relative overflow-hidden ${
              isDark 
                ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-slate-800' 
                : 'bg-gradient-to-b from-slate-100 to-slate-200 border-slate-300'
            }`}>
              {/* Barra de Status do Celular */}
              <div className="w-full flex items-center justify-between text-[8px] text-slate-500 font-mono px-1">
                <span>09:41</span>
                <span>5G 🔋</span>
              </div>

              {/* Ícone Squircle Estilo Mobile */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 border border-white/20 shadow-lg flex items-center justify-center overflow-hidden my-1 relative">
                {salonIcon ? (
                  <img 
                    src={salonIcon} 
                    alt="Ícone do PWA" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-600 text-white">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              {/* Nome do Aplicativo na Tela Inicial */}
              <div className="text-center w-full px-1">
                <span className={`text-[10.5px] font-bold truncate block tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {pwaName || salonName}
                </span>
                <span className="text-[8px] text-emerald-400 font-semibold uppercase tracking-wider block">
                  Instalado no Celular
                </span>
              </div>
            </div>

            {/* Controles de Upload do Ícone PWA e Nome do Aplicativo */}
            <div className="space-y-2.5">
              {/* Campo do Nome PWA */}
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
                    className="text-[9px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Sincronizar
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={18}
                  value={pwaName}
                  placeholder="Ex: Meu Salão"
                  onChange={(e) => setPwaName(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-semibold outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
                <p className="text-[9px] text-slate-500 mt-0.5">
                  Recomendado até 12 caracteres para não quebrar no celular.
                </p>
              </div>

              {/* Botões de Ação do Ícone PWA */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleIconDrop}
                className="flex items-center gap-2 pt-0.5"
              >
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Upload className="w-3 h-3 text-white" />
                  <span>{salonIcon ? 'Substituir Ícone' : 'Subir Ícone (1:1)'}</span>
                </button>
                
                {salonIcon && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setSalonIcon('');
                    }}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-slate-700 transition cursor-pointer"
                    title="Remover ícone do PWA"
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
            </div>
          </div>
        </div>

        {/* 3. COR DE DESTAQUE DO ESTABELECIMENTO */}
        <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Cor de Destaque
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {accentColor}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {/* Presets Rápidos */}
            <div className="flex items-center gap-1.5 flex-1">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setAccentColor(preset.hex);
                    setAccentColorContext(preset.hex);
                  }}
                  title={preset.label}
                  className={`w-7 h-7 rounded-full transition cursor-pointer border flex items-center justify-center ${
                    accentColor.toLowerCase() === preset.hex.toLowerCase()
                      ? 'border-white scale-110 shadow-md'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                >
                  {accentColor.toLowerCase() === preset.hex.toLowerCase() && (
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  )}
                </button>
              ))}
            </div>

            {/* Seletor Customizado Nativo */}
            <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-700">
              <label className="text-[9.5px] font-bold uppercase text-slate-400 cursor-pointer">
                Personalizar:
              </label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setAccentColor(newColor);
                  setAccentColorContext(newColor);
                }}
                className="w-7 h-7 rounded-md cursor-pointer bg-transparent border-0"
              />
            </div>
          </div>
        </div>

        {/* 4. DADOS CADASTRAIS DO ESTABELECIMENTO */}
        <div className={`p-3 rounded-xl border space-y-2.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Store className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Dados do Estabelecimento
            </span>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Nome do Salão / Barbearia
            </label>
            <input
              type="text"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium outline-hidden ${
                isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              WhatsApp / Contato
            </label>
            <input
              type="text"
              value={salonPhone}
              onChange={(e) => setSalonPhone(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium outline-hidden ${
                isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Endereço Completo
            </label>
            <input
              type="text"
              value={salonAddress}
              onChange={(e) => setSalonAddress(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium outline-hidden ${
                isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Horário de Funcionamento
            </label>
            <input
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium outline-hidden ${
                isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />
          </div>
        </div>
      </form>

      {/* 5. RODAPÉ FIXO DE AÇÃO (STICKY BOTTOM-0 Z-20) */}
      <div className={`sticky bottom-0 z-20 p-3 border-t backdrop-blur-md ${
        isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => handleSaveSettings()}
          className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-98"
        >
          <Save className="w-4 h-4 text-white stroke-[2.5]" />
          <span>Salvar Identidade & Dados</span>
        </button>
      </div>
    </div>
  );
};
