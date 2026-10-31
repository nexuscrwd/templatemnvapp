import { useState, useEffect, useCallback } from 'react';
import {
  BookingAppointment,
  LiveRouteCheckpoint,
  LiveAdversityReport,
  TransportMode,
  LiveTrackingStatus,
} from '../types';
import { updateAppointmentLiveTrackingInDb } from '../lib/supabase';

export interface GoogleMapsRouteOption {
  id: 'route_1' | 'route_2';
  badge: string;
  title: string;
  summary: string;
  baseEtaMinutes: number;
  distanceKm: number;
  polyline: string;
  streets: Array<{ street: string; distanceText: string }>;
}

export const GOOGLE_MAPS_ROUTE_OPTIONS: GoogleMapsRouteOption[] = [
  {
    id: 'route_1',
    badge: 'Mais rápida • Trânsito livre',
    title: 'Rota 1 (Recomendada)',
    summary: 'Rota 1 • Via Av. Paulista, Av. Rebouças e Rua Oscar Freire',
    baseEtaMinutes: 14,
    distanceKm: 3.2,
    polyline: 'p~iF~ps|U_ulLnnqC_mqNvxq`@',
    streets: [
      { street: 'Av. Paulista', distanceText: '1.2 km' },
      { street: 'Rua da Consolação', distanceText: '650 m' },
      { street: 'Av. Rebouças', distanceText: '850 m' },
      { street: 'Rua Oscar Freire', distanceText: '500 m' },
    ],
  },
  {
    id: 'route_2',
    badge: 'Alternativa • Sem semáforos pesados',
    title: 'Rota 2 (Alternativa)',
    summary: 'Rota 2 • Via Av. Brasil, Alameda Santos e Rua Augusta',
    baseEtaMinutes: 18,
    distanceKm: 4.1,
    polyline: 'q~iF~ps|U_ulLnnqC_mqNvxq`@alt',
    streets: [
      { street: 'Alameda Santos', distanceText: '1.1 km' },
      { street: 'Av. Brigadeiro Luís Antônio', distanceText: '900 m' },
      { street: 'Av. Brasil', distanceText: '1.4 km' },
      { street: 'Rua Augusta', distanceText: '700 m' },
    ],
  },
];

export function getAdjustedRouteMetrics(
  route: GoogleMapsRouteOption,
  mode: TransportMode
): { etaMinutes: number; distanceKm: number } {
  const factorMap: Record<TransportMode, number> = {
    motorcycle: 0.75,
    car: 1.0,
    driving: 1.0,
    rideshare: 1.05,
    bicycling: 1.15,
    transit: 1.45,
    walking: 2.6,
  };
  const factor = factorMap[mode] || 1.0;
  return {
    etaMinutes: Math.max(3, Math.round(route.baseEtaMinutes * factor)),
    distanceKm: route.distanceKm,
  };
}

export function formatCurrentClockTime(plusMinutes = 0): string {
  const d = new Date(Date.now() + plusMinutes * 60000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function syncAppointmentAcrossStorageAndDb(
  appointment: BookingAppointment,
  patch: Partial<BookingAppointment>,
  onUpdateAppointment?: (updated: BookingAppointment) => void
): BookingAppointment {
  const nowIso = new Date().toISOString();
  const updatedApt: BookingAppointment = {
    ...appointment,
    ...patch,
    last_location_update: patch.last_location_update || nowIso,
  };

  // 1. Atualiza localStorage do Cliente (vagou_user_appointments)
  try {
    const rawUser = localStorage.getItem('vagou_user_appointments');
    if (rawUser) {
      const parsed: BookingAppointment[] = JSON.parse(rawUser);
      const exists = parsed.some(
        (a) => a.protocolCode === updatedApt.protocolCode || (a.id && a.id === updatedApt.id)
      );
      const nextList = exists
        ? parsed.map((a) =>
            a.protocolCode === updatedApt.protocolCode || (a.id && a.id === updatedApt.id)
              ? { ...a, ...updatedApt }
              : a
          )
        : [updatedApt, ...parsed];
      localStorage.setItem('vagou_user_appointments', JSON.stringify(nextList));
    }
  } catch {}

  // 2. Atualiza localStorage do Profissional/Salão (vagou_professional_appointments)
  try {
    const rawPro = localStorage.getItem('vagou_professional_appointments');
    if (rawPro) {
      const parsedPro: BookingAppointment[] = JSON.parse(rawPro);
      const existsPro = parsedPro.some(
        (a) => a.protocolCode === updatedApt.protocolCode || (a.id && a.id === updatedApt.id)
      );
      const nextProList = existsPro
        ? parsedPro.map((a) =>
            a.protocolCode === updatedApt.protocolCode || (a.id && a.id === updatedApt.id)
              ? { ...a, ...updatedApt }
              : a
          )
        : [updatedApt, ...parsedPro];
      localStorage.setItem('vagou_professional_appointments', JSON.stringify(nextProList));
    }
  } catch {}

  // 3. Dispara evento global na janela para que Agenda do Salão e Visão do Cliente atualizem instantaneamente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vagou:appointments-updated', {
        detail: { appointment: updatedApt },
      })
    );
  }

  // 4. Sincroniza com Supabase em background
  const idOrProto = updatedApt.id || updatedApt.protocolCode;
  if (idOrProto) {
    updateAppointmentLiveTrackingInDb(idOrProto, patch).catch(() => {});
  }

  if (onUpdateAppointment) {
    onUpdateAppointment(updatedApt);
  }

  return updatedApt;
}

interface UseLiveRouteTrackerProps {
  appointment: BookingAppointment | null;
  onUpdateAppointment?: (updated: BookingAppointment) => void;
  autoTickEnabled?: boolean;
}

export function useLiveRouteTracker({
  appointment,
  onUpdateAppointment,
  autoTickEnabled = true,
}: UseLiveRouteTrackerProps) {
  const [secondsUntilNextPing, setSecondsUntilNextPing] = useState<number>(10);

  const isLiveActive =
    appointment?.tracking_status === 'live_sharing' ||
    appointment?.tracking_status === 'arriving_5min';

  // Avança 1 ciclo de telemetria (a cada 10s ou via toque manual de teste)
  const advanceRouteStep = useCallback(() => {
    if (!appointment) return;
    const checkpoints: LiveRouteCheckpoint[] =
      appointment.route_checkpoints && appointment.route_checkpoints.length > 0
        ? [...appointment.route_checkpoints]
        : GOOGLE_MAPS_ROUTE_OPTIONS[0].streets.map((s, idx) => ({
            street: s.street,
            distanceText: s.distanceText,
            status: idx === 0 ? 'current' : 'upcoming',
            timestamp: idx === 0 ? formatCurrentClockTime() : undefined,
          }));

    const currentIndex = checkpoints.findIndex((c) => c.status === 'current');
    const nowClock = formatCurrentClockTime();
    const currentEta = appointment.eta_minutes ?? 12;
    const currentDist = appointment.distance_km ?? 2.4;

    // Se já está na última rua e o ETA é baixo, conclui a chegada (desliga GPS por LGPD)
    if (currentIndex === checkpoints.length - 1 && currentEta <= 3) {
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
      setSecondsUntilNextPing(10);
      return;
    }

    // Move para a próxima rua ou reduz ETA/distância
    const nextIdx =
      currentIndex >= 0 && currentIndex < checkpoints.length - 1
        ? currentIndex + 1
        : Math.max(0, currentIndex);

    const nextCheckpoints: LiveRouteCheckpoint[] = checkpoints.map((c, idx) => {
      if (idx < nextIdx) {
        return { ...c, status: 'passed', timestamp: c.timestamp || nowClock };
      }
      if (idx === nextIdx) {
        return { ...c, status: 'current', timestamp: nowClock };
      }
      return { ...c, status: 'upcoming' };
    });

    const nextStreet = nextCheckpoints[nextIdx]?.street || appointment.current_street_name || 'Av. Rebouças';
    const nextEta = Math.max(2, currentEta - 3);
    const nextDist = Number(Math.max(0.2, currentDist - 0.65).toFixed(2));
    const nextStatus: LiveTrackingStatus = nextEta <= 5 ? 'arriving_5min' : 'live_sharing';

    // Coordenadas com deslocamento progressivo realista (ou geolocalização real se disponível)
    const baseLat = appointment.client_lat ?? -23.5614;
    const baseLng = appointment.client_lng ?? -46.6558;

    syncAppointmentAcrossStorageAndDb(
      appointment,
      {
        tracking_status: nextStatus,
        current_street_name: nextStreet,
        route_checkpoints: nextCheckpoints,
        eta_minutes: nextEta,
        distance_km: nextDist,
        client_lat: Number((baseLat + 0.0012).toFixed(6)),
        client_lng: Number((baseLng - 0.0011).toFixed(6)),
      },
      onUpdateAppointment
    );

    setSecondsUntilNextPing(10);
  }, [appointment, onUpdateAppointment]);

  // Reportar adversidade de trânsito em 1 toque (+X min)
  const reportAdversity = useCallback(
    (type: 'traffic' | 'roadwork' | 'parking', label: string, addedMinutes: number) => {
      if (!appointment) return;
      const nowClock = formatCurrentClockTime();
      const currentStreet =
        appointment.current_street_name ||
        appointment.route_checkpoints?.find((c) => c.status === 'current')?.street ||
        'Av. Rebouças';

      const adversityObj: LiveAdversityReport = {
        type,
        label,
        street: currentStreet,
        addedMinutes,
        reportedAt: nowClock,
      };

      const updatedCheckpoints: LiveRouteCheckpoint[] = (
        appointment.route_checkpoints && appointment.route_checkpoints.length > 0
          ? appointment.route_checkpoints
          : GOOGLE_MAPS_ROUTE_OPTIONS[0].streets.map((s, idx) => ({
              street: s.street,
              distanceText: s.distanceText,
              status: (idx === 0 ? 'current' : 'upcoming') as 'passed' | 'current' | 'upcoming',
              timestamp: idx === 0 ? nowClock : undefined,
            }))
      ).map((cp) => {
        if (cp.status === 'current' || cp.street === currentStreet) {
          return {
            ...cp,
            adversity: {
              type,
              label,
              addedMinutes,
            },
          };
        }
        return cp;
      });

      const prevDelay = appointment.delay_minutes || 0;
      const prevEta = appointment.eta_minutes ?? 12;
      const newEta = prevEta + addedMinutes;

      syncAppointmentAcrossStorageAndDb(
        appointment,
        {
          active_adversity: adversityObj,
          delay_minutes: prevDelay + addedMinutes,
          eta_minutes: newEta,
          tracking_status: newEta <= 5 ? 'arriving_5min' : 'live_sharing',
          route_checkpoints: updatedCheckpoints,
          current_street_name: currentStreet,
        },
        onUpdateAppointment
      );
    },
    [appointment, onUpdateAppointment]
  );

  // Ciclo de 10 segundos (contagem regressiva visual de 10s a 1s + ping GPS/telemetria)
  useEffect(() => {
    if (!isLiveActive || !autoTickEnabled) {
      setSecondsUntilNextPing(10);
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsUntilNextPing((prev) => {
        if (prev <= 1) {
          // Tenta capturar coordenada real do navegador sem bloquear a execução
          if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              () => {
                advanceRouteStep();
              },
              () => {
                advanceRouteStep();
              },
              { timeout: 2500, maximumAge: 8000 }
            );
          } else {
            advanceRouteStep();
          }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isLiveActive, autoTickEnabled, advanceRouteStep]);

  return {
    secondsUntilNextPing,
    isLiveActive,
    advanceRouteStep,
    reportAdversity,
  };
}
