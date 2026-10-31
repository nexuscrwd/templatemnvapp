import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  AlertTriangle,
  Check,
  CheckCircle2,
  X,
  RefreshCw,
  Bell,
  Map as MapIcon,
  ChevronRight,
  Home,
  Sparkles,
  ArrowLeft,
  Share2,
  ListOrdered,
  ExternalLink,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  ArrowUp,
} from 'lucide-react';
import {
  BookingAppointment,
  TransportMode,
  LiveRouteCheckpoint,
} from '../../types';
import {
  GOOGLE_MAPS_ROUTE_OPTIONS,
  getAdjustedRouteMetrics,
  formatCurrentClockTime,
  syncAppointmentAcrossStorageAndDb,
  useLiveRouteTracker,
} from '../../hooks/useLiveRouteTracker';
import {
  buildTransportDeepLinks,
  TransportMode as BookingTransportMode,
  TRANSPORT_MODE_META,
} from '../../utils/bookingSlots';
import {
  computeGoogleDetailedRoute,
  GoogleComputedRouteResult,
  snapAndReverseGeocodeGps,
} from '../../services/googleMapsService';
import { InteractiveGoogleRouteMap } from './InteractiveGoogleRouteMap';
import { useTheme } from '../../context/ThemeContext';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';

interface LiveRouteDepartureModalProps {
  isOpen: boolean;
  appointment: BookingAppointment;
  initialStep?: 'question' | 'in_app_map';
  isProfessionalDeliveryMode?: boolean;
  onClose: () => void;
  onUpdateAppointment?: (updated: BookingAppointment) => void;
  onCancelWithReason?: (protocolCode: string, reason: string) => void;
  onRequestReschedule?: (appointment: BookingAppointment) => void;
  onOpenLiveViewer?: (appointment: BookingAppointment, initialTab: 'timeline' | 'map') => void;
}

function formatCountdownHhMm(totalMinutes: number): string {
  const safeMin = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMin / 60);
  const mins = safeMin % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function renderManeuverIcon(maneuver: string, instruction: string) {
  const text = (instruction || '').toLowerCase();
  const m = (maneuver || '').toUpperCase();
  if (m.includes('LEFT') || text.includes('esquerda')) {
    return <CornerUpLeft className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (m.includes('RIGHT') || text.includes('direita')) {
    return <CornerUpRight className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (m.includes('UTURN') || text.includes('retorno')) {
    return <RotateCcw className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  return <ArrowUp className="w-4 h-4 text-emerald-500 shrink-0 animate-pulse" />;
}

function getShortManeuverText(maneuver: string, instruction: string): string {
  const text = (instruction || '').toLowerCase();
  const m = (maneuver || '').toUpperCase();
  if (m.includes('LEFT') || text.includes('esquerda')) {
    return 'DOBRE A ESQUERDA';
  }
  if (m.includes('RIGHT') || text.includes('direita')) {
    return 'DOBRE A DIREITA';
  }
  if (m.includes('UTURN') || text.includes('retorno')) {
    return 'FAÇA O RETORNO';
  }
  if (m.includes('STRAIGHT') || text.includes('frente') || text.includes('continua')) {
    return 'SIGA EM FRENTE';
  }
  return (instruction || 'SIGA EM FRENTE').toUpperCase();
}

function normalizeBookingTransportMode(mode?: TransportMode): BookingTransportMode {
  if (mode === 'walking') return 'walking';
  if (mode === 'bicycling') return 'bicycling';
  if (mode === 'motorcycle') return 'motorcycle';
  if (mode === 'transit') return 'transit';
  if (mode === 'rideshare') return 'rideshare';
  return 'car';
}

function resolveAppointmentDestFallbackCoords(appointment: BookingAppointment): {
  lat: number;
  lng: number;
} {
  const anyApt = appointment as any;
  const rawLat =
    anyApt.salonLat ??
    anyApt.salon_lat ??
    anyApt.destLat ??
    anyApt.destinationLat ??
    anyApt.latitude;
  const rawLng =
    anyApt.salonLng ??
    anyApt.salon_lng ??
    anyApt.destLng ??
    anyApt.destinationLng ??
    anyApt.longitude;

  if (
    typeof rawLat === 'number' &&
    typeof rawLng === 'number' &&
    Number.isFinite(rawLat) &&
    Number.isFinite(rawLng)
  ) {
    return { lat: rawLat, lng: rawLng };
  }

  const text = `${appointment.address || ''} ${appointment.salonName || ''}`.toLowerCase();
  if (
    text.includes('guarulhos') ||
    text.includes('helio smidt') ||
    text.includes('hélio smidt') ||
    text.includes('aeroporto')
  ) {
    return { lat: -23.4356, lng: -46.4731 };
  }
  if (text.includes('paulista')) {
    return { lat: -23.5614, lng: -46.6559 };
  }
  if (text.includes('morumbi') || text.includes('roque petroni')) {
    return { lat: -23.6226, lng: -46.6987 };
  }
  if (text.includes('ibirapuera')) {
    return { lat: -23.5874, lng: -46.6576 };
  }
  if (text.includes('congonhas')) {
    return { lat: -23.6261, lng: -46.6564 };
  }
  return { lat: -23.5592, lng: -46.6589 };
}

export const LiveRouteDepartureModal: React.FC<LiveRouteDepartureModalProps> = ({
  isOpen,
  appointment,
  initialStep,
  isProfessionalDeliveryMode = false,
  onClose,
  onUpdateAppointment,
  onCancelWithReason,
  onRequestReschedule,
}) => {
  const { isDark } = useTheme();
  const backdropMouseDownRef = useRef(false);

  const isAlreadySharing =
    appointment.tracking_status === 'live_sharing' ||
    appointment.tracking_status === 'arriving_5min';

  const [step, setStep] = useState<'question' | 'not_leaving' | 'cancel_reason' | 'in_app_map'>(() => {
    if (initialStep) return initialStep;
    if (isAlreadySharing || isProfessionalDeliveryMode) return 'in_app_map';
    return 'question';
  });

  const [activeViewTab, setActiveViewTab] = useState<'map' | 'timeline'>('map');
  const [hasReachedDestination, setHasReachedDestination] = useState<boolean>(
    appointment.tracking_status === 'arrived'
  );
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [activeManeuver, setActiveManeuver] = useState<{
    instruction: string;
    distanceText: string;
    maneuver: string;
  }>({
    instruction: 'Próxima Esquerda',
    distanceText: 'Em rota',
    maneuver: 'TURN-LEFT',
  });

  const transportMode: TransportMode = appointment.transport_mode || 'driving';
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string>('');

  const [liveRouteData, setLiveRouteData] = useState<GoogleComputedRouteResult | null>(null);
  const [deviceGpsOrigin, setDeviceGpsOrigin] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);

  const anyApt = appointment as any;
  const appointmentKey = appointment.id || appointment.protocolCode || 'apt';

  // Reconhece imediatamente a georreferência real do dispositivo ao iniciar a navegação ("Ir"),
  // sobrescrevendo qualquer endereço diferente que tenha sido informado no momento do agendamento
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined' || !navigator.geolocation) return;
    let active = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!active) return;
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        setDeviceGpsOrigin((prev) => ({
          lat: rawLat,
          lng: rawLng,
          address: prev?.address || 'Local Atual (GPS)',
        }));

        const snapped = await snapAndReverseGeocodeGps(rawLat, rawLng);
        if (!active) return;
        const finalLat = snapped?.lat ?? rawLat;
        const finalLng = snapped?.lng ?? rawLng;
        const finalAddress =
          snapped?.formattedAddress || snapped?.streetName || 'Local Atual (GPS)';

        setDeviceGpsOrigin({
          lat: finalLat,
          lng: finalLng,
          address: finalAddress,
        });

        syncAppointmentAcrossStorageAndDb(
          appointment,
          {
            client_lat: finalLat,
            client_lng: finalLng,
            ...(snapped?.streetName ? { current_street_name: snapped.streetName } : {}),
            ...(step === 'in_app_map' ? { tracking_status: 'live_sharing' } : {}),
          },
          onUpdateAppointment
        );
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000,
      }
    );

    return () => {
      active = false;
    };
  }, [isOpen, appointmentKey]);

  // Coordenadas efetivas: prioriza a georreferência real do dispositivo (deviceGpsOrigin) sobre o endereço antigo do agendamento
  const stableCoords = useMemo(() => {
    const oLat = Number(
      deviceGpsOrigin?.lat ?? anyApt.originLat ?? appointment.client_lat ?? -23.5505
    );
    const oLng = Number(
      deviceGpsOrigin?.lng ?? anyApt.originLng ?? appointment.client_lng ?? -46.6333
    );

    const routeDestPt =
      liveRouteData?.decodedPath && liveRouteData.decodedPath.length > 2
        ? liveRouteData.decodedPath[liveRouteData.decodedPath.length - 1]
        : null;

    const fallbackDest = resolveAppointmentDestFallbackCoords(appointment);
    const dLat = Number(routeDestPt?.lat ?? fallbackDest.lat);
    const dLng = Number(routeDestPt?.lng ?? fallbackDest.lng);
    return {
      originLat: Number.isFinite(oLat) ? oLat : -23.5505,
      originLng: Number.isFinite(oLng) ? oLng : -46.6333,
      destLat: Number.isFinite(dLat) ? dLat : fallbackDest.lat,
      destLng: Number.isFinite(dLng) ? dLng : fallbackDest.lng,
    };
  }, [appointment, appointmentKey, deviceGpsOrigin?.lat, deviceGpsOrigin?.lng, liveRouteData]);

  const { secondsUntilNextPing } = useLiveRouteTracker({
    appointment,
    onUpdateAppointment,
    autoTickEnabled: isOpen && step === 'in_app_map' && activeViewTab === 'timeline',
  });

  const selectedRoute = GOOGLE_MAPS_ROUTE_OPTIONS[0];
  const bookingTransportMode = normalizeBookingTransportMode(transportMode);

  const fallbackMetrics = useMemo(
    () => getAdjustedRouteMetrics(selectedRoute, transportMode),
    [selectedRoute, transportMode]
  );

  const metrics = useMemo(() => {
    if (liveRouteData) {
      return {
        distanceKm: liveRouteData.distanceKm,
        etaMinutes: liveRouteData.etaMinutes,
      };
    }
    return fallbackMetrics;
  }, [liveRouteData, fallbackMetrics]);

  const clientOriginAddress = useMemo(() => {
    if (deviceGpsOrigin?.address) {
      return deviceGpsOrigin.address;
    }
    return (
      anyApt.originFormattedAddress ||
      anyApt.origin_formatted_address ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('vagou_user_address') ||
          localStorage.getItem('vagou_user_cep') ||
          'Local Atual (GPS)'
        : 'Local Atual (GPS)')
    );
  }, [appointmentKey, deviceGpsOrigin?.address]);

  const salonDestAddress = useMemo(() => {
    return appointment.address || appointment.salonName || 'Estabelecimento';
  }, [appointment.address, appointment.salonName]);

  // Busca Rota Real seguindo a malha viária a partir da localização atual do dispositivo
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    computeGoogleDetailedRoute({
      originLat: stableCoords.originLat,
      originLng: stableCoords.originLng,
      originAddress: deviceGpsOrigin ? undefined : clientOriginAddress,
      destLat: stableCoords.destLat,
      destLng: stableCoords.destLng,
      destAddress: salonDestAddress,
      mode: bookingTransportMode,
    }).then((res) => {
      if (!active || !res) return;
      setLiveRouteData(res);
    });

    return () => {
      active = false;
    };
  }, [
    isOpen,
    bookingTransportMode,
    stableCoords.originLat,
    stableCoords.originLng,
    stableCoords.destLat,
    stableCoords.destLng,
    clientOriginAddress,
    salonDestAddress,
    Boolean(deviceGpsOrigin),
  ]);

  const transportLinks = useMemo(() => {
    const anyApt = appointment as any;
    return buildTransportDeepLinks({
      originAddress: clientOriginAddress,
      originLat: stableCoords.originLat,
      originLng: stableCoords.originLng,
      salonName: appointment.salonName,
      salonAddress: salonDestAddress,
      salonLat: anyApt.salonLat,
      salonLng: anyApt.salonLng,
      transportMode: bookingTransportMode,
    });
  }, [appointment, clientOriginAddress, salonDestAddress, bookingTransportMode, stableCoords.originLat, stableCoords.originLng]);

  if (!isOpen) return null;

  const prepBuffer = appointment.prep_buffer_minutes ?? 15;
  const totalPreAlertMinutes = metrics.etaMinutes + prepBuffer;

  const handleConfirmHurry = () => {
    hapticSuccess();
    syncAppointmentAcrossStorageAndDb(
      appointment,
      {
        tracking_status: 'hurry_confirmed',
        transport_mode: transportMode,
        eta_minutes: metrics.etaMinutes,
        distance_km: metrics.distanceKm,
      },
      onUpdateAppointment
    );
    onClose();
  };

  const handleStartInAppMapRoute = () => {
    hapticSuccess();
    const nowClock = formatCurrentClockTime();
    const initialCheckpoints: LiveRouteCheckpoint[] =
      liveRouteData?.checkpoints && liveRouteData.checkpoints.length > 0
        ? liveRouteData.checkpoints
        : selectedRoute.streets.map((s, idx) => ({
            street: s.street,
            distanceText: s.distanceText,
            status: idx === 0 ? 'current' : 'upcoming',
            timestamp: idx === 0 ? nowClock : undefined,
          }));

    const nextStatus = metrics.etaMinutes <= 5 ? 'arriving_5min' : 'live_sharing';

    syncAppointmentAcrossStorageAndDb(
      appointment,
      {
        tracking_status: nextStatus,
        transport_mode: transportMode,
        selected_route_summary: liveRouteData?.description || selectedRoute.summary,
        route_polyline: liveRouteData?.decodedPath || selectedRoute.polyline,
        current_street_name: initialCheckpoints[0]?.street || selectedRoute.streets[0].street,
        route_checkpoints: initialCheckpoints,
        eta_minutes: metrics.etaMinutes,
        distance_km: metrics.distanceKm,
        delay_minutes: 0,
        active_adversity: null,
        client_lat: stableCoords.originLat,
        client_lng: stableCoords.originLng,
      },
      onUpdateAppointment
    );

    setActiveViewTab('map');
    setStep('in_app_map');
  };

  const handleConfirmCancelWithReason = () => {
    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setCancelError('Informe o motivo do cancelamento para liberar a vaga.');
      return;
    }
    hapticMedium();
    syncAppointmentAcrossStorageAndDb(
      appointment,
      {
        status: 'CANCELADO',
        tracking_status: 'cancelled',
        cancellation_reason: trimmed,
      },
      onUpdateAppointment
    );
    if (onCancelWithReason) {
      onCancelWithReason(appointment.protocolCode, trimmed);
    }
    onClose();
  };

  const handleConfirmReschedule = () => {
    hapticMedium();
    syncAppointmentAcrossStorageAndDb(
      appointment,
      {
        status: 'ALTERADO',
        tracking_status: 'rescheduled',
      },
      onUpdateAppointment
    );
    if (onRequestReschedule) {
      onRequestReschedule(appointment);
    }
    onClose();
  };

  const handleMarkArrived = () => {
    hapticSuccess();
    const nowClock = formatCurrentClockTime();
    const completedCheckpoints: LiveRouteCheckpoint[] = (
      appointment.route_checkpoints || []
    ).map((c) => ({
      ...c,
      status: 'passed',
      timestamp: c.timestamp || nowClock,
    }));

    syncAppointmentAcrossStorageAndDb(
      appointment,
      {
        tracking_status: 'arrived',
        route_checkpoints: completedCheckpoints,
        current_street_name:
          appointment.service_location_type === 'home_delivery'
            ? 'No endereço do cliente (Check-in)'
            : 'Na recepção do salão (Check-in)',
        eta_minutes: 0,
        distance_km: 0,
        active_adversity: null,
      },
      onUpdateAppointment
    );
    onClose();
  };

  const checkpoints: LiveRouteCheckpoint[] =
    appointment.route_checkpoints && appointment.route_checkpoints.length > 0
      ? appointment.route_checkpoints
      : liveRouteData?.checkpoints && liveRouteData.checkpoints.length > 0
      ? liveRouteData.checkpoints
      : selectedRoute.streets.map((s, idx) => ({
          street: s.street,
          distanceText: s.distanceText,
          status: idx === 0 ? 'current' : 'upcoming',
          timestamp: idx === 0 ? formatCurrentClockTime(0) : undefined,
        }));

  const destinationLabel =
    appointment.service_location_type === 'home_delivery'
      ? appointment.address || 'Residência do Cliente'
      : appointment.salonName || 'Recepção do Salão';

  // SE ESTIVER NA TELA EXPANDIDA DE MAPA IN-APP + ITINERÁRIO
  if (step === 'in_app_map') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2 bg-black/80 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150"
        onMouseDown={(e) => {
          backdropMouseDownRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && backdropMouseDownRef.current) {
            onClose();
          }
          backdropMouseDownRef.current = false;
        }}
      >
        <div
          className={`w-full h-full sm:max-w-5xl sm:max-h-[96vh] sm:border sm:rounded-[4px] shadow-2xl flex flex-col overflow-hidden transition-colors ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Cabeçalho Principal */}
          <div
            className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setStep('question');
                }}
                className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-slate-800 text-slate-200 hover:text-white'
                    : 'bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Voltar"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-500" />
              </button>

              {/* Botão Compartilhar no lugar do título navegação */}
              <button
                type="button"
                onClick={() => {
                  hapticSuccess();
                  syncAppointmentAcrossStorageAndDb(
                    appointment,
                    { tracking_status: 'live_sharing' },
                    onUpdateAppointment
                  );
                  alert('Trajeto compartilhado com o salão em tempo real!');
                }}
                className="px-2.5 py-1 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Avisar o salão de destino e mostrar trajeto em tempo real"
              >
                <Share2 className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Compartilhar</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Google Maps Oficial */}
              <a
                href={transportLinks.googleMapsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => hapticLight()}
                className="hover:opacity-85 transition flex items-center justify-center"
                title="Abrir no Google Maps com origem e destino preenchidos"
              >
                <img src="/assets/aistudio/maps_7572ddee.png" alt="Google Maps" className="w-[30px] h-[30px] object-contain shrink-0" />
              </a>

              {/* Waze Oficial */}
              <a
                href={transportLinks.wazeAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => hapticLight()}
                className="hover:opacity-85 transition flex items-center justify-center"
                title="Abrir no Waze com origem e destino preenchidos"
              >
                <img src="/assets/aistudio/waze_c7621164.png" alt="Waze" className="w-[30px] h-[30px] object-contain shrink-0" />
              </a>

              {/* Seletor Map/Lista no cabeçalho principal ao lado dos ícones dos apps */}
              <div
                className={`flex items-center gap-1 p-0.5 rounded-[4px] ${
                  isDark ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setActiveViewTab('map');
                  }}
                  className={`p-1.5 rounded-[3px] transition cursor-pointer ${
                    activeViewTab === 'map'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isDark
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                  title="Mapa"
                >
                  <MapIcon className={`w-3.5 h-3.5 ${activeViewTab === 'map' ? 'text-white' : 'text-emerald-500'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setActiveViewTab('timeline');
                  }}
                  className={`p-1.5 rounded-[3px] transition cursor-pointer ${
                    activeViewTab === 'timeline'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isDark
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                  title="Itinerário"
                >
                  <ListOrdered className={`w-3.5 h-3.5 ${activeViewTab === 'timeline' ? 'text-white' : 'text-emerald-500'}`} />
                </button>
              </div>

              {/* Botão Fechar */}
              <button
                type="button"
                onClick={onClose}
                className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-slate-800 text-slate-300 hover:text-white'
                    : 'bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>


          {/* 3. Subcabeçalho com instruções de navegação à esquerda e cards de métricas à direita */}
          <div
            className={`px-[10px] py-[5px] border-b shrink-0 flex items-center justify-between gap-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Lado Esquerdo: Instruções de Navegação com fundo piscando em amarelo (Próxima Rua) */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-[6px] border border-amber-400/80 bg-amber-400/30 dark:bg-amber-500/30 backdrop-blur-xl flex items-center justify-center shadow-[1px_3px_5px_rgba(0,0,0,0.26)] shrink-0 animate-pulse">
                {renderManeuverIcon(activeManeuver.maneuver, activeManeuver.instruction)}
              </div>
              <div className="min-w-0 flex flex-col pr-0 pl-[8px] pt-0 rounded-[4px] bg-amber-400/20 dark:bg-amber-500/20 border border-amber-400/50 animate-pulse h-[45px] w-[175.188px] -mx-[10px] my-[5px] justify-center">
                <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider leading-none mb-0.5">Próxima Rua</span>
                <span className="text-[10px] font-bold font-['Verdana'] whitespace-normal break-words line-clamp-2 text-slate-900 dark:text-white leading-tight">
                  {getShortManeuverText(activeManeuver.maneuver, activeManeuver.instruction)}
                </span>
              </div>
            </div>

            {/* Lado Direito: Métricas (Textos acima dos números, ETA renomeado para Temp. Rest.) */}
            <div className="flex items-center gap-3 select-none shrink-0">
              <div className="flex flex-col items-end" title="Distância restante">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Distância</span>
                <span className="text-base font-black font-mono tabular-nums text-slate-900 dark:text-white leading-none">
                  {metrics.distanceKm.toFixed(1).replace('.', ',')} <span className="text-[10px] font-bold">km</span>
                </span>
              </div>

              <div className="flex flex-col items-end" title="Tempo Restante">
                <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-none mb-0.5">Temp. Rest.</span>
                <span className="text-base font-black font-mono tabular-nums text-emerald-500 leading-none">
                  {formatCountdownHhMm(metrics.etaMinutes)}
                </span>
              </div>

              <div className="flex flex-col items-end" title="Velocidade atual em tempo real">
                <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider leading-none mb-0.5">Velocidade</span>
                <span className="text-base font-black font-mono tabular-nums text-blue-500 dark:text-blue-400 leading-none">
                  {currentSpeedKmh} <span className="text-[10px] font-bold">km/h</span>
                </span>
              </div>
            </div>
          </div>

          {/* 4. Conteúdo Principal: Aba Mapa Limpo vs Aba Itinerário */}
          {activeViewTab === 'map' ? (
            <InteractiveGoogleRouteMap
              originLat={stableCoords.originLat}
              originLng={stableCoords.originLng}
              originLabel={clientOriginAddress}
              destLat={stableCoords.destLat}
              destLng={stableCoords.destLng}
              destLabel={appointment.salonName || salonDestAddress}
              userAvatarUrl={
                anyApt.clientAvatar ||
                anyApt.avatar_url ||
                (typeof window !== 'undefined'
                  ? localStorage.getItem('vagou_user_avatar') || ''
                  : '')
              }
              routeData={liveRouteData}
              initialDistanceKm={metrics.distanceKm}
              initialEtaMinutes={metrics.etaMinutes}
              fallbackEmbedUrl={transportLinks.googleMapsEmbedUrl}
              onSpeedUpdate={(speed) => setCurrentSpeedKmh(speed)}
              onManeuverUpdate={(m) => setActiveManeuver(m)}
              onLiveGpsUpdate={(lat, lng, snappedStreet) => {
                const currentEta = appointment.eta_minutes ?? metrics.etaMinutes;
                syncAppointmentAcrossStorageAndDb(
                  appointment,
                  {
                    client_lat: lat,
                    client_lng: lng,
                    ...(snappedStreet ? { current_street_name: snappedStreet } : {}),
                    tracking_status: currentEta <= 5 ? 'arriving_5min' : 'live_sharing',
                  },
                  onUpdateAppointment
                );
              }}
              onDestinationReachedChange={(reached) => {
                setHasReachedDestination(reached);
              }}
            />
          ) : (
            <div className="flex-1 w-full overflow-y-auto p-4 space-y-4 text-xs">
              {/* Sequência do Itinerário */}
              <div className="space-y-1 pt-1">
                {/* Ponto Inicial */}
                <div className="flex items-start gap-3 pb-3">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                    <div className="w-0.5 h-6 bg-emerald-500/50 mt-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-500">
                        Saída • {clientOriginAddress}
                      </span>
                      <span
                        className={`text-[10px] font-mono tabular-nums ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {checkpoints[0]?.timestamp || formatCurrentClockTime(-2)}
                      </span>
                    </div>
                    <p className={`text-[10.5px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Modalidade: {TRANSPORT_MODE_META[bookingTransportMode].label}
                    </p>
                  </div>
                </div>

                {/* Lista Sequencial de Ruas e Manobras Reais da Rota */}
                {checkpoints.map((cp, index) => {
                  const isPassed = cp.status === 'passed';
                  const isCurrent = cp.status === 'current';

                  return (
                    <div key={`${cp.street}-${index}`} className="flex items-start gap-3 pb-3">
                      <div className="flex flex-col items-center">
                        {isPassed ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-500/20 shrink-0">
                            <Navigation className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isDark ? 'bg-slate-600' : 'bg-slate-400'
                              }`}
                            />
                          </div>
                        )}
                        {index < checkpoints.length && (
                          <div
                            className={`w-0.5 h-8 mt-1 ${
                              isPassed
                                ? 'bg-emerald-500/60'
                                : isDark
                                ? 'bg-slate-800'
                                : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold leading-snug ${
                              isCurrent
                                ? isDark
                                  ? 'text-white'
                                  : 'text-slate-900'
                                : isPassed
                                ? isDark
                                  ? 'text-slate-300'
                                  : 'text-slate-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {cp.street}
                          </span>
                          <span
                            className={`text-[10px] font-mono tabular-nums shrink-0 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {cp.timestamp || cp.distanceText || ''}
                          </span>
                        </div>

                        {isCurrent && (
                          <div className="flex items-center gap-2 text-[10.5px] text-emerald-500 font-semibold">
                            <span>Em deslocamento • Atualizado há {10 - secondsUntilNextPing}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Ponto Final: Destino */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        appointment.tracking_status === 'arrived' || hasReachedDestination
                          ? 'bg-emerald-500 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {appointment.service_location_type === 'home_delivery' ? (
                        <Home className="w-3 h-3" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          appointment.tracking_status === 'arrived' || hasReachedDestination
                            ? 'text-emerald-500'
                            : isDark
                            ? 'text-slate-300'
                            : 'text-slate-800'
                        }`}
                      >
                        Chegada: {destinationLabel}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-emerald-500 font-bold">
                        Atendimento às {appointment.time || '10:00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Rodapé Fixo Abaixo do Mapa: Apenas o Botão "Cheguei" (aparece quando o usuário chega ao destino) */}
          {hasReachedDestination && (
            <div
              className={`sticky bottom-0 z-20 px-3.5 py-2.5 border-t shrink-0 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={handleMarkArrived}
                className="w-full py-2.5 px-4 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                <span className="text-white">Cheguei</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          onClose();
        }
        backdropMouseDownRef.current = false;
      }}
    >
      <div
        className={`w-full max-w-md border-t sm:border rounded-t-2xl sm:rounded-[6px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Compacto */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-[4px] bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <Navigation className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-extrabold uppercase tracking-wider font-['Poppins'] truncate">
                {isProfessionalDeliveryMode
                  ? 'Deslocamento Delivery Ao Vivo'
                  : 'Radar Estou a Caminho'}
              </h3>
              <p
                className={`text-[10px] font-mono truncate ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {appointment.protocolCode} • {appointment.serviceTitle || appointment.service} às{' '}
                {appointment.time || '14:30'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-[4px] cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Rolável */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* PASSO 1: PERGUNTA PRÉ-PARTIDA (ETA + 15 MIN) */}
          {step === 'question' && (
            <div className="space-y-4">
              <div
                className={`p-3.5 rounded-[4px] space-y-2 ${
                  isDark ? 'bg-slate-900' : 'bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-[3px] bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-white shrink-0" />
                    <span className="text-white font-mono tabular-nums">
                      Alerta Pré-Partida (ETA + {prepBuffer}m)
                    </span>
                  </span>
                  <span className="text-[11px] font-mono tabular-nums font-bold text-emerald-500 shrink-0">
                    ~{metrics.etaMinutes} min de rota
                  </span>
                </div>

                <h4 className="text-sm font-extrabold font-['Poppins'] leading-snug pt-1">
                  Faltam {totalPreAlertMinutes} min para o seu horário ({appointment.time || '14:30'}). Você já está de partida?
                </h4>

                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Destino: <strong>{appointment.salonName}</strong> (
                  <span className="font-mono tabular-nums">{metrics.distanceKm} km</span>)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setStep('not_leaving');
                  }}
                  className={`py-3 px-3 rounded-[4px] border font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-98 ${
                    isDark
                      ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  <span>Ainda Não</span>
                  <span
                    className={`text-[9.5px] font-normal ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Vou atrasar ou remarcar
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleStartInAppMapRoute}
                  className="py-3 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-98 shadow-sm"
                >
                  <span className="text-white flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-white" />
                    Sim, estou saindo
                  </span>
                  <span className="text-[9.5px] font-normal text-white">
                    Abrir Mapa e Itinerário
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* PASSO 1B: RESPONDEU "NÃO" -> VAI COMPARECER OU NÃO? */}
          {step === 'not_leaving' && (
            <div className="space-y-3.5">
              <div
                className={`p-3.5 rounded-[4px] space-y-1.5 ${
                  isDark ? 'bg-slate-900' : 'bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Atenção ao tempo de deslocamento</span>
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  O trajeto até <strong>{appointment.salonName}</strong> leva cerca de{' '}
                  <strong className="text-emerald-500 font-mono tabular-nums">
                    {metrics.etaMinutes} min
                  </strong>
                  . Você ainda vai comparecer hoje?
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmHurry}
                  className="w-full py-2.5 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer flex items-center justify-between active:scale-98"
                >
                  <span className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-white">Sim, vou comparecer (Saindo em instantes)</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  className={`w-full py-2.5 px-3 rounded-[4px] font-bold text-xs transition cursor-pointer flex items-center justify-between active:scale-98 ${
                    isDark
                      ? 'bg-slate-900 hover:bg-slate-800 text-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                    <span>Não consigo agora • Remanejar Horário</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-amber-500" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setStep('cancel_reason');
                  }}
                  className={`w-full py-2.5 px-3 rounded-[4px] font-bold text-xs transition cursor-pointer flex items-center justify-between active:scale-98 ${
                    isDark
                      ? 'bg-slate-900 hover:bg-slate-800 text-rose-400'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-500" />
                    <span>Não vou comparecer • Cancelar Vaga</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-rose-500" />
                </button>
              </div>
            </div>
          )}

          {/* PASSO 1C: CANCELAMENTO COM MOTIVO OBRIGATÓRIO */}
          {step === 'cancel_reason' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-rose-500 block">
                  Motivo do Cancelamento (Obrigatório) *
                </label>
                <p className={`text-[10.5px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Avise o estabelecimento para liberar imediatamente a cadeira no Radar Vagou.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'Imprevisto no trabalho',
                  'Trânsito pesado / Sem transporte',
                  'Problema de saúde',
                  'Reunião de última hora',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setCancelReason(preset);
                      setCancelError('');
                    }}
                    className={`px-2.5 py-1 rounded-[4px] text-[10.5px] font-semibold transition cursor-pointer ${
                      cancelReason === preset
                        ? 'bg-emerald-500 text-white font-bold'
                        : isDark
                        ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className={cancelReason === preset ? 'text-white' : ''}>{preset}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  setCancelError('');
                }}
                placeholder="Digite o motivo do cancelamento..."
                className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden focus:border-rose-500 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />

              {cancelError && (
                <p className="text-[11px] font-bold text-rose-500">{cancelError}</p>
              )}
            </div>
          )}
        </div>

        {/* Rodapé Fixo de Ação (Regra Inegociável sticky bottom-0 z-20) */}
        {step === 'cancel_reason' && (
          <div
            className={`p-3.5 border-t sticky bottom-0 z-20 flex items-center gap-2 ${
              isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setStep('not_leaving')}
              className={`py-2.5 px-3 rounded-[4px] text-xs font-bold cursor-pointer ${
                isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleConfirmCancelWithReason}
              className="flex-1 py-2.5 px-3 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4 text-white" />
              <span className="text-white">Confirmar Cancelamento</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface LiveTrackingDrawerModalProps {
  isOpen: boolean;
  appointment: BookingAppointment;
  initialTab?: 'timeline' | 'map';
  viewerRole?: 'salon' | 'client';
  onClose: () => void;
  onUpdateAppointment?: (updated: BookingAppointment) => void;
}

export const LiveTrackingDrawerModal: React.FC<LiveTrackingDrawerModalProps> = ({
  isOpen,
  appointment,
  initialTab = 'map',
  viewerRole = 'salon',
  onClose,
  onUpdateAppointment,
}) => {
  const { isDark } = useTheme();
  const backdropMouseDownRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'map'>(initialTab);
  const [hasReachedDestination, setHasReachedDestination] = useState<boolean>(
    appointment.tracking_status === 'arrived'
  );
  const transportMode: TransportMode = appointment.transport_mode || 'driving';
  const [liveRouteData, setLiveRouteData] = useState<GoogleComputedRouteResult | null>(null);
  const [deviceGpsOrigin, setDeviceGpsOrigin] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);

  const anyApt = appointment as any;
  const drawerAppointmentKey = appointment.id || appointment.protocolCode || 'drawer-apt';

  useEffect(() => {
    if (
      !isOpen ||
      viewerRole !== 'client' ||
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      return;
    }
    let active = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!active) return;
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        setDeviceGpsOrigin((prev) => ({
          lat: rawLat,
          lng: rawLng,
          address: prev?.address || 'Local Atual (GPS)',
        }));

        const snapped = await snapAndReverseGeocodeGps(rawLat, rawLng);
        if (!active) return;
        setDeviceGpsOrigin({
          lat: snapped?.lat ?? rawLat,
          lng: snapped?.lng ?? rawLng,
          address: snapped?.formattedAddress || snapped?.streetName || 'Local Atual (GPS)',
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000,
      }
    );

    return () => {
      active = false;
    };
  }, [isOpen, viewerRole, drawerAppointmentKey]);

  const stableDrawerCoords = useMemo(() => {
    const oLat = Number(
      deviceGpsOrigin?.lat ?? anyApt.originLat ?? appointment.client_lat ?? -23.5505
    );
    const oLng = Number(
      deviceGpsOrigin?.lng ?? anyApt.originLng ?? appointment.client_lng ?? -46.6333
    );

    const routeDestPt =
      liveRouteData?.decodedPath && liveRouteData.decodedPath.length > 2
        ? liveRouteData.decodedPath[liveRouteData.decodedPath.length - 1]
        : null;

    const fallbackDest = resolveAppointmentDestFallbackCoords(appointment);
    const dLat = Number(routeDestPt?.lat ?? fallbackDest.lat);
    const dLng = Number(routeDestPt?.lng ?? fallbackDest.lng);
    return {
      originLat: Number.isFinite(oLat) ? oLat : -23.5505,
      originLng: Number.isFinite(oLng) ? oLng : -46.6333,
      destLat: Number.isFinite(dLat) ? dLat : fallbackDest.lat,
      destLng: Number.isFinite(dLng) ? dLng : fallbackDest.lng,
    };
  }, [appointment, drawerAppointmentKey, deviceGpsOrigin?.lat, deviceGpsOrigin?.lng, liveRouteData]);

  const { secondsUntilNextPing } = useLiveRouteTracker({
    appointment,
    onUpdateAppointment,
    autoTickEnabled: isOpen && activeTab === 'timeline',
  });

  const bookingTransportMode = normalizeBookingTransportMode(transportMode);

  const clientOriginAddress = useMemo(() => {
    if (deviceGpsOrigin?.address) {
      return deviceGpsOrigin.address;
    }
    return (
      anyApt.originFormattedAddress ||
      anyApt.origin_formatted_address ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('vagou_user_address') ||
          localStorage.getItem('vagou_user_cep') ||
          'Local Atual (GPS)'
        : 'Local Atual (GPS)')
    );
  }, [drawerAppointmentKey, deviceGpsOrigin?.address]);

  const salonDestAddress = useMemo(() => {
    return appointment.address || appointment.salonName || 'Estabelecimento';
  }, [appointment.address, appointment.salonName]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    computeGoogleDetailedRoute({
      originLat: stableDrawerCoords.originLat,
      originLng: stableDrawerCoords.originLng,
      originAddress: deviceGpsOrigin ? undefined : clientOriginAddress,
      destLat: stableDrawerCoords.destLat,
      destLng: stableDrawerCoords.destLng,
      destAddress: salonDestAddress,
      mode: bookingTransportMode,
    }).then((res) => {
      if (active && res) {
        setLiveRouteData(res);
      }
    });

    return () => {
      active = false;
    };
  }, [
    isOpen,
    bookingTransportMode,
    stableDrawerCoords.originLat,
    stableDrawerCoords.originLng,
    stableDrawerCoords.destLat,
    stableDrawerCoords.destLng,
    clientOriginAddress,
    salonDestAddress,
    Boolean(deviceGpsOrigin),
  ]);

  const transportLinks = useMemo(() => {
    return buildTransportDeepLinks({
      originAddress: clientOriginAddress,
      originLat: stableDrawerCoords.originLat,
      originLng: stableDrawerCoords.originLng,
      salonName: appointment.salonName,
      salonAddress: salonDestAddress,
      salonLat: stableDrawerCoords.destLat,
      salonLng: stableDrawerCoords.destLng,
      transportMode: bookingTransportMode,
    });
  }, [appointment.salonName, clientOriginAddress, salonDestAddress, bookingTransportMode, stableDrawerCoords]);

  if (!isOpen) return null;

  const checkpoints: LiveRouteCheckpoint[] =
    appointment.route_checkpoints && appointment.route_checkpoints.length > 0
      ? appointment.route_checkpoints
      : liveRouteData?.checkpoints && liveRouteData.checkpoints.length > 0
      ? liveRouteData.checkpoints
      : GOOGLE_MAPS_ROUTE_OPTIONS[0].streets.map((s, idx) => ({
          street: s.street,
          distanceText: s.distanceText,
          status: idx === 0 ? 'passed' : idx === 1 ? 'current' : 'upcoming',
          timestamp: idx <= 1 ? formatCurrentClockTime(idx === 0 ? -4 : 0) : undefined,
        }));

  const isArriving5Min =
    appointment.tracking_status === 'arriving_5min' ||
    ((appointment.eta_minutes ?? 12) <= 5 && (appointment.eta_minutes ?? 12) > 0);

  const actorLabel =
    appointment.service_location_type === 'home_delivery'
      ? `Profissional ${appointment.professionalName || appointment.professional}`
      : appointment.customerName || appointment.clientName || 'Cliente';

  const destinationLabel =
    appointment.service_location_type === 'home_delivery'
      ? appointment.address || 'Residência do Cliente'
      : appointment.salonName || 'Recepção do Salão';

  const handleMarkArrived = () => {
    hapticSuccess();
    const nowClock = formatCurrentClockTime();
    const completedCheckpoints: LiveRouteCheckpoint[] = checkpoints.map((c) => ({
      ...c,
      status: 'passed',
      timestamp: c.timestamp || nowClock,
    }));

    syncAppointmentAcrossStorageAndDb(
      appointment,
      {
        tracking_status: 'arrived',
        route_checkpoints: completedCheckpoints,
        eta_minutes: 0,
        distance_km: 0,
        active_adversity: null,
      },
      onUpdateAppointment
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2 bg-black/80 backdrop-blur-xs overflow-hidden animate-in fade-in"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          onClose();
        }
        backdropMouseDownRef.current = false;
      }}
    >
      <div
        className={`w-full h-full sm:max-w-5xl sm:max-h-[96vh] sm:border sm:rounded-[4px] shadow-2xl flex flex-col overflow-hidden transition-colors ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Cabeçalho Principal (Sem botão Abrir Externo) */}
        <div
          className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-[4px] bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <Navigation className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-['Poppins'] truncate">
                {actorLabel}
              </h3>
              <p
                className={`text-[10px] truncate ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {appointment.salonName} • Atendimento às {appointment.time || '10:00'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center cursor-pointer shrink-0 ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:text-white'
                : 'bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Sub-cabeçalho com o Endereço de Destino (Somente isso) */}
        <div
          className={`px-3.5 py-2 border-b flex items-center gap-2 shrink-0 ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-200'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold truncate">{salonDestAddress}</span>
        </div>

        {/* Alerta Automático de Chegada Iminente (ETA <= 5 min) */}
        {isArriving5Min && appointment.tracking_status !== 'arrived' && (
          <div className="px-4 py-2 bg-emerald-500 text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-white shrink-0" />
              <span className="text-xs font-black text-white truncate">
                {viewerRole === 'salon'
                  ? `Chegando em ${appointment.eta_minutes ?? 4} min — Prepare a cadeira!`
                  : `Chegada prevista em ${appointment.eta_minutes ?? 4} min!`}
              </span>
            </div>
            <span className="text-[10px] font-mono tabular-nums font-black text-white shrink-0">
              {formatCurrentClockTime(appointment.eta_minutes ?? 4)}
            </span>
          </div>
        )}

        {/* 3. Abas de Modo de Visualização: "Mapa" e "Itinerário" */}
        <div
          className={`px-3.5 py-2 border-b shrink-0 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`grid grid-cols-2 gap-1.5 p-1 rounded-[4px] ${
              isDark ? 'bg-slate-900' : 'bg-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setActiveTab('map');
              }}
              className={`py-2 px-2.5 rounded-[3px] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'map'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <MapIcon
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeTab === 'map' ? 'text-white' : 'text-emerald-500'
                }`}
              />
              <span className={activeTab === 'map' ? 'text-white' : ''}>Mapa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                setActiveTab('timeline');
              }}
              className={`py-2 px-2.5 rounded-[3px] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'timeline'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Clock
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeTab === 'timeline' ? 'text-white' : 'text-emerald-500'
                }`}
              />
              <span className={activeTab === 'timeline' ? 'text-white' : ''}>Itinerário</span>
            </button>
          </div>
        </div>

        {/* 4. Conteúdo Principal: Aba Mapa Limpo vs Aba Itinerário */}
        {activeTab === 'map' ? (
          <InteractiveGoogleRouteMap
            originLat={stableDrawerCoords.originLat}
            originLng={stableDrawerCoords.originLng}
            originLabel={clientOriginAddress}
            destLat={stableDrawerCoords.destLat}
            destLng={stableDrawerCoords.destLng}
            destLabel={appointment.salonName || salonDestAddress}
            userAvatarUrl={
              anyApt.clientAvatar ||
              anyApt.avatar_url ||
              (typeof window !== 'undefined'
                ? localStorage.getItem('vagou_user_avatar') || ''
                : '')
            }
            routeData={liveRouteData}
            initialDistanceKm={liveRouteData?.distanceKm ?? appointment.distance_km ?? 3.2}
            initialEtaMinutes={liveRouteData?.etaMinutes ?? appointment.eta_minutes ?? 14}
            fallbackEmbedUrl={transportLinks.googleMapsEmbedUrl}
            onDestinationReachedChange={(reached) => setHasReachedDestination(reached)}
          />
        ) : (
          <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
            <div className="space-y-1 pt-1">
              {/* Ponto Inicial */}
              <div className="flex items-start gap-3 pb-3">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                  <div className="w-0.5 h-6 bg-emerald-500/50 mt-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-500">
                      Saída • {clientOriginAddress}
                    </span>
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {checkpoints[0]?.timestamp || formatCurrentClockTime(-6)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista Sequencial de Ruas e Manobras da Rota */}
              {checkpoints.map((cp, index) => {
                const isPassed = cp.status === 'passed';
                const isCurrent = cp.status === 'current';

                return (
                  <div key={`${cp.street}-${index}`} className="flex items-start gap-3 pb-3">
                    <div className="flex flex-col items-center">
                      {isPassed ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-500/20 shrink-0">
                          <Navigation className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isDark ? 'bg-slate-600' : 'bg-slate-400'
                            }`}
                          />
                        </div>
                      )}
                      {index < checkpoints.length && (
                        <div
                          className={`w-0.5 h-8 mt-1 ${
                            isPassed
                              ? 'bg-emerald-500/60'
                              : isDark
                              ? 'bg-slate-800'
                              : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold leading-snug ${
                            isCurrent
                              ? isDark
                                ? 'text-white'
                                : 'text-slate-900'
                              : isPassed
                              ? isDark
                                ? 'text-slate-300'
                                : 'text-slate-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {cp.street}
                        </span>
                        <span
                          className={`text-[10px] font-mono tabular-nums shrink-0 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {cp.timestamp || cp.distanceText || ''}
                        </span>
                      </div>

                      {isCurrent && (
                        <div className="flex items-center gap-2 text-[10.5px] text-emerald-500 font-semibold">
                          <span>Em deslocamento • Atualizado há {10 - secondsUntilNextPing}s</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Ponto Final: Destino */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      appointment.tracking_status === 'arrived' || hasReachedDestination
                        ? 'bg-emerald-500 text-white'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {appointment.service_location_type === 'home_delivery' ? (
                      <Home className="w-3 h-3" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        appointment.tracking_status === 'arrived' || hasReachedDestination
                          ? 'text-emerald-500'
                          : isDark
                          ? 'text-slate-300'
                          : 'text-slate-800'
                      }`}
                    >
                      Chegada: {destinationLabel}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-emerald-500 font-bold">
                      ETA {formatCurrentClockTime(appointment.eta_minutes ?? 12)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Rodapé Fixo Abaixo do Mapa: Apenas o Botão "Cheguei" (aparece quando chega ao destino) */}
        {hasReachedDestination && (
          <div
            className={`p-3.5 border-t sticky bottom-0 z-20 shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={handleMarkArrived}
              className="w-full py-2.5 px-4 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
              <span className="text-white">Cheguei</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
