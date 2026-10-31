import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles } from 'lucide-react';

export interface ServicePublicAdPreviewProps {
  title: string;
  category: string;
  price: number | string;
  duration?: string;
  displayMode?: 'static' | 'slideshow' | 'video';
  image?: string;
  photos?: string[];
  videoUrl?: string;
  className?: string;
  hasCustomMedia?: boolean;
}

/**
 * Componente de Pré-visualização em Alta Fidelidade do Anúncio
 * Reproduz com 100% de precisão o card de serviço exibido na seção pública do app e no Portal VagouApp.
 * Suporta modo preview quando ainda não possui mídia personalizada cadastrada.
 */
export const ServicePublicAdPreview: React.FC<ServicePublicAdPreviewProps> = ({
  title,
  category,
  price,
  duration,
  displayMode = 'static',
  image,
  photos = [],
  videoUrl,
  className = '',
  hasCustomMedia,
}) => {
  const isMediaPresent = hasCustomMedia !== undefined 
    ? hasCustomMedia 
    : Boolean((photos && photos.length > 0) || image || videoUrl);

  const effectivePhotos = useMemo(() => {
    if (photos && photos.length > 0) return photos;
    if (image) return [image];
    return [];
  }, [photos, image]);

  const [slideIdx, setSlideIdx] = useState(0);

  // Ciclo rotativo de slides (2.6s por foto) com crossfade
  useEffect(() => {
    if (displayMode !== 'slideshow' || effectivePhotos.length <= 1) {
      setSlideIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % effectivePhotos.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [displayMode, effectivePhotos.length]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-950 border border-slate-800 shadow-xl select-none ${className}`}
    >
      {/* 1. Mídia de Fundo do Anúncio */}
      {isMediaPresent && displayMode === 'video' && videoUrl ? (
        <video
          key={videoUrl}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : isMediaPresent && displayMode === 'slideshow' && effectivePhotos.length > 1 ? (
        <div className="w-full h-full relative overflow-hidden bg-slate-950">
          {effectivePhotos.map((photo, i) => (
            <img
              key={i}
              src={photo}
              alt={`${title || 'Serviço'} - Foto ${i + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                i === slideIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              referrerPolicy="no-referrer"
            />
          ))}

          {/* Micro-pontos indicadores do Slide na base */}
          <div className="absolute bottom-11 right-2.5 z-10 flex items-center gap-1 pointer-events-none">
            {effectivePhotos.map((_, i) => (
              <span
                key={i}
                className={`transition-all duration-300 rounded-full ${
                  i === slideIdx
                    ? 'w-2.5 h-1 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                    : 'w-1 h-1 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      ) : isMediaPresent && effectivePhotos.length > 0 ? (
        <img
          src={effectivePhotos[0]}
          alt={title || 'Serviço'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        /* Fallback elegante sem mídia: gradiente escuro e ícone temático */
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Sem Mídia Cadastrada
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">
            Adicione fotos ou vídeo no gerenciador
          </span>
        </div>
      )}

      {/* 2. Gradiente Cinematográfico Escuro para Contraste Superior */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-black/30 pointer-events-none" />

      {/* 3. Topo do Card: Badge de Categoria */}
      <div className="absolute top-2 left-2 right-2 z-10 pointer-events-none flex items-center justify-between gap-1">
        {/* Badge Categoria com Ponto Esmeralda */}
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase tracking-wider shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="truncate max-w-[90px]">{category || 'Geral'}</span>
        </span>
      </div>

      {/* 4. Base do Card: Título, Preço e Duração */}
      <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 z-10 flex flex-col justify-end pointer-events-none">
        <h3 className="text-xs sm:text-[13px] font-bold text-white tracking-tight leading-tight line-clamp-1 font-['Poppins'] drop-shadow-sm">
          {title || 'Título do Procedimento'}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-emerald-400 font-black text-xs sm:text-sm tracking-tight drop-shadow-xs">
            R$ {typeof price === 'number' ? price.toFixed(0) : price || '0'}
          </span>
          {duration && (
            <span className="text-[10px] text-slate-300/80 font-medium">
              • {duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
