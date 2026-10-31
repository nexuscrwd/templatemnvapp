import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  X,
  Compass,
  Car,
  Bike,
  Footprints,
  Sparkles,
  Loader2,
  CheckCircle2,
  Home,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { hapticLight, hapticSuccess, hapticMedium } from '../../utils/haptics';
import { BookingAppointment, TransportMode } from '../../types';
import { snapAndReverseGeocodeGps } from '../../services/googleMapsService';

interface RouteSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRoute: (appointment: BookingAppointment) => void;
  defaultOriginAddress?: string;
  defaultDestAddress?: string;
}

export const RouteSimulatorModal: React.FC<RouteSimulatorModalProps> = ({
  isOpen,
  onClose,
  onStartRoute,
  defaultOriginAddress,
  defaultDestAddress,
}) => {
  const { isDark } = useTheme();

  const [originAddress, setOriginAddress] = useState<string>(defaultOriginAddress || '');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [destAddress, setDestAddress] = useState<string>(
    defaultDestAddress || 'Aeroporto de Guarulhos - Rod. Hélio Smidt'
  );
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [transportMode, setTransportMode] = useState<TransportMode>('car');
  const [isLocatingOrigin, setIsLocatingOrigin] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Obtém o GPS real do dispositivo imediatamente ao abrir, exibindo a bolinha girando sem texto de carregando
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsLocatingOrigin(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (!active) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setOriginCoords({ lat, lng });

          const snapped = await snapAndReverseGeocodeGps(lat, lng);
          if (!active) return;
          if (snapped?.formattedAddress || snapped?.streetName) {
            setOriginAddress(snapped.formattedAddress || snapped.streetName);
          } else {
            setOriginAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
          setIsLocatingOrigin(false);
        },
        () => {
          if (!active) return;
          setIsLocatingOrigin(false);
          if (!originAddress) {
            const saved =
              localStorage.getItem('vagou_user_address') ||
              localStorage.getItem('vagou_user_cep') ||
              'Av. Paulista, 1000 - São Paulo, SP';
            setOriginAddress(saved);
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    hapticLight();
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMessage('Geolocalização não disponível no navegador.');
      return;
    }

    setIsLocatingOrigin(true);
    setOriginAddress('');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        hapticSuccess();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOriginCoords({ lat, lng });

        const snapped = await snapAndReverseGeocodeGps(lat, lng);
        if (snapped?.formattedAddress || snapped?.streetName) {
          setOriginAddress(snapped.formattedAddress || snapped.streetName);
        } else {
          setOriginAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setIsLocatingOrigin(false);
      },
      (err) => {
        setIsLocatingOrigin(false);
        setErrorMessage(
          err.code === 1
            ? 'Permissão de localização negada. Ative o GPS nas configurações do celular.'
            : 'Não foi possível capturar o GPS atual.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );
  };

  const handleUseHomeAddress = () => {
    hapticLight();
    setErrorMessage('');
    const savedHome =
      localStorage.getItem('vagou_user_address') ||
      localStorage.getItem('vagou_user_cep') ||
      localStorage.getItem('vagou_client_test_address') ||
      '08235-770';
    setOriginCoords(null);
    setOriginAddress(savedHome);
  };

  const geocodeAddress = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch('/api/geo/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: query }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data?.lat === 'number' && typeof data?.lng === 'number') {
        return { lat: data.lat, lng: data.lng };
      }
    } catch {}
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanOrigin = originAddress.trim();
    const cleanDest = destAddress.trim();

    if (!cleanOrigin) {
      setErrorMessage('Informe o endereço de partida.');
      return;
    }
    if (!cleanDest) {
      setErrorMessage('Informe o endereço de destino.');
      return;
    }

    hapticMedium();
    setIsSubmitting(true);

    try {
      // 1. Resolve Coordenadas de Origem se ainda não obtidas via GPS
      let resolvedOrigin = originCoords;
      if (!resolvedOrigin) {
        resolvedOrigin = await geocodeAddress(cleanOrigin);
      }
      if (!resolvedOrigin) {
        resolvedOrigin = { lat: -23.5505, lng: -46.6333 };
      }

      // 2. Resolve Coordenadas de Destino
      let resolvedDest = destCoords;
      if (!resolvedDest) {
        resolvedDest = await geocodeAddress(cleanDest);
      }
      if (!resolvedDest) {
        if (
          cleanDest.toLowerCase().includes('guarulhos') ||
          cleanDest.toLowerCase().includes('aeroporto')
        ) {
          resolvedDest = { lat: -23.4356, lng: -46.4731 };
        } else if (cleanDest.toLowerCase().includes('paulista')) {
          resolvedDest = { lat: -23.5614, lng: -46.6559 };
        } else {
          resolvedDest = { lat: -23.5621, lng: -46.4795 };
        }
      }

      const destTitle = cleanDest.split(',')[0].split('-')[0].trim() || 'Destino de Teste';

      // 3. Cria agendamento de teste para disparar a tela de navegação
      const testAppointment: BookingAppointment = {
        id: `trajeto-${Date.now()}`,
        protocolCode: `#TRAJETO-${Math.floor(1000 + Math.random() * 9000)}`,
        salonName: destTitle,
        service: 'Navegação GPS Provisória (Teste)',
        serviceTitle: 'Navegação GPS Provisória (Teste)',
        dateTime: 'Ao Vivo (Teste de Trajeto)',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        totalPrice: 0,
        status: 'CONFIRMADO',
        tracking_status: 'live_sharing',
        transport_mode: transportMode,
        address: cleanDest,
        client_lat: resolvedOrigin.lat,
        client_lng: resolvedOrigin.lng,
        ...({
          originLat: resolvedOrigin.lat,
          originLng: resolvedOrigin.lng,
          originFormattedAddress: cleanOrigin,
          salonLat: resolvedDest.lat,
          salonLng: resolvedDest.lng,
          destinationLat: resolvedDest.lat,
          destinationLng: resolvedDest.lng,
        } as any),
      };

      setIsSubmitting(false);
      hapticSuccess();
      onStartRoute(testAppointment);
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Erro ao iniciar trajeto. Tente novamente.');
    }
  };

  const presetDestinations = [
    { label: 'Aeroporto de Guarulhos', address: 'Rod. Hélio Smidt, Aeroporto, Guarulhos - SP' },
    { label: 'Av. Paulista, 1578', address: 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP' },
    { label: 'Shopping Morumbi', address: 'Av. Roque Petroni Júnior, 1089 - São Paulo - SP' },
    { label: 'Parque Ibirapuera', address: 'Av. Pedro Álvares Cabral - Moema, São Paulo - SP' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-[6px] border shadow-2xl flex flex-col overflow-hidden max-h-[92vh] transition ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[4px] bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold font-['Poppins'] truncate leading-tight">
                  Trajeto (Simulador GPS)
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Teste Provisório
                </span>
              </div>
              <p
                className={`text-[10.5px] truncate ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Defina partida e destino para testar a navegação estilo Uber
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
              isDark
                ? 'bg-slate-800 text-slate-400 hover:text-white'
                : 'bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário Rolável */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Mensagem de Erro */}
          {errorMessage && (
            <div className="p-2.5 rounded-[4px] bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CAMPO 1: DE ONDE VOCÊ VAI SAIR? */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>De onde você vai sair?</span>
              </label>

              <div className="flex items-center gap-1.5">
                {/* Botão "Local Atual" */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocatingOrigin}
                  className="px-2.5 py-1 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10.5px] flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  title="Detectar endereço via GPS do celular"
                >
                  {isLocatingOrigin ? (
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                  ) : (
                    <Compass className="w-3 h-3 text-white" />
                  )}
                  <span className="text-white">Local Atual</span>
                </button>

                {/* Botão "De Casa" */}
                <button
                  type="button"
                  onClick={handleUseHomeAddress}
                  className={`px-2.5 py-1 rounded-[4px] border font-bold text-[10.5px] flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                      : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-emerald-500/50'
                  }`}
                  title="Usar endereço de casa salvo"
                >
                  <Home className="w-3 h-3 text-emerald-500" />
                  <span>De Casa</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={originAddress}
                onChange={(e) => {
                  setOriginAddress(e.target.value);
                  setOriginCoords(null);
                }}
                placeholder={isLocatingOrigin ? '' : 'Digite o endereço ou CEP de partida'}
                className={`w-full px-3 py-2.5 pr-9 rounded-[4px] border text-xs outline-hidden transition ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                }`}
              />
              {isLocatingOrigin && (
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                </div>
              )}
            </div>

            {originCoords && !isLocatingOrigin && (
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>
                  GPS Ativo: {originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)}
                </span>
              </p>
            )}
          </div>

          {/* CAMPO 2: ENDEREÇO DE DESTINO */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Para onde você vai?</span>
            </label>

            <input
              type="text"
              value={destAddress}
              onChange={(e) => {
                setDestAddress(e.target.value);
                setDestCoords(null);
              }}
              placeholder="Ex: Rod. Hélio Smidt, Aeroporto de Guarulhos"
              className={`w-full px-3 py-2.5 rounded-[4px] border text-xs outline-hidden transition ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />

            {/* Presets de Teste Rápido */}
            <div className="space-y-1 pt-1">
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sugestões rápidas de teste:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetDestinations.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setDestAddress(preset.address);
                      setDestCoords(null);
                    }}
                    className={`px-2 py-1 rounded-[3px] text-[10px] font-semibold border transition cursor-pointer ${
                      destAddress === preset.address
                        ? 'bg-emerald-500 text-white border-emerald-400 font-bold'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className={destAddress === preset.address ? 'text-white' : ''}>
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CAMPO 3: MODALIDADE */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider block">
              Modalidade de Deslocamento
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: 'car' as TransportMode, label: 'Carro', icon: Car },
                { key: 'motorcycle' as TransportMode, label: 'Moto', icon: Navigation },
                { key: 'bicycling' as TransportMode, label: 'Bike', icon: Bike },
                { key: 'walking' as TransportMode, label: 'A pé', icon: Footprints },
              ].map((m) => {
                const IconComponent = m.icon;
                const isSel = transportMode === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setTransportMode(m.key);
                    }}
                    className={`p-2 rounded-[4px] border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      isSel
                        ? 'bg-emerald-500 border-emerald-400 text-white font-bold shadow-xs'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 ${isSel ? 'text-white' : 'text-emerald-400'}`}
                    />
                    <span className={`text-[10px] ${isSel ? 'text-white' : ''}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dica do Simulador */}
          <div
            className={`p-3 rounded-[4px] border text-[11px] leading-relaxed flex items-start gap-2.5 ${
              isDark
                ? 'bg-slate-900/50 border-slate-800 text-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-400">Como funciona o teste:</strong> Ao clicar em{' '}
              <strong>"Ir"</strong>, o app carrega o trajeto viário real, centraliza a câmera na sua
              posição e acompanha seus deslocamentos em tempo real como no Uber.
            </div>
          </div>

          {/* RODAPÉ FIXO: BOTÃO IR */}
          <div
            className={`pt-3 border-t sticky bottom-0 z-10 ${
              isDark ? 'bg-slate-950/95' : 'bg-white/95'
            }`}
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span className="text-white">Calculando Trajeto...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-white fill-white" />
                  <span className="text-white">Ir (Iniciar Navegação)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
