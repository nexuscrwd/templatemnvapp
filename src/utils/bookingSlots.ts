import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SalonProfessionalItem } from '../types';

export interface BookingSlotItem {
  time: string;
  available: boolean;
  period: 'manha' | 'tarde' | 'noite';
  reason?: 'busy' | 'past' | 'travel_buffer';
}

export interface BookingDraftItem {
  id: string;
  salonId?: string;
  salonName: string;
  salonAddress: string;
  services: Array<{
    id: string;
    title: string;
    price: number;
    duration: string;
    category: string;
  }>;
  combinedServiceTitle: string;
  totalPrice: number;
  professional: string;
  professionalAvatar?: string;
  dateIso: string;
  dateFormatted: string;
  timeSlot: string;
  isDependentBooking: boolean;
  dependentId?: string;
  dependentName?: string;
  clientPhone?: string;
  clientAddressQuery?: string;
  distanceKm?: number;
  etaMinutes?: number;
  prepBufferMinutes: number;
  savedAt: string;
}

export const BOOKING_DRAFT_STORAGE_KEY = 'vagou_booking_draft_v1';

export function getSavedBookingDraft(): BookingDraftItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.combinedServiceTitle && parsed.dateIso && parsed.timeSlot) {
      return parsed as BookingDraftItem;
    }
  } catch {}
  return null;
}

export function saveBookingDraft(draft: BookingDraftItem | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!draft) {
      localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
    } else {
      localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
    window.dispatchEvent(new CustomEvent('vagou:booking-draft-updated', { detail: draft }));
  } catch {}
}

export interface BusySlotRecord {
  start_time: string;
  end_time: string;
  professional_id?: string;
  professional_name?: string;
  status?: string;
  notes?: string;
  service_title?: string;
}

/**
 * Busca horários ocupados no banco de dados (combinando RPC get_busy_slots + leitura direta de public.appointments)
 */
export async function fetchBusySlotsDirectly(
  salonId: string,
  dateStr: string
): Promise<BusySlotRecord[]> {
  if (!dateStr) return [];
  const results: BusySlotRecord[] = [];

  // 1. Consulta no Supabase (RPC + Tabela public.appointments)
  if (isSupabaseConfigured && supabase && salonId) {
    try {
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('get_busy_slots', {
        p_salon_id: salonId,
        p_date_str: dateStr,
      });
      if (!rpcErr && Array.isArray(rpcData)) {
        rpcData.forEach((row: any) => {
          if (row?.start_time) {
            results.push({
              start_time: String(row.start_time).slice(0, 5),
              end_time: String(row.end_time || row.start_time).slice(0, 5),
              professional_id: row.professional_id,
              professional_name: row.professional_name,
            });
          }
        });
      }
    } catch {}

    try {
      const { data: aptRows } = await (supabase.from('appointments') as any)
        .select('start_time, end_time, professional_id, status, notes, service_title, professionals(name)')
        .eq('salon_id', salonId)
        .eq('date_str', dateStr)
        .neq('status', 'CANCELADO')
        .neq('status', 'cancelado');

      if (Array.isArray(aptRows)) {
        aptRows.forEach((row: any) => {
          if (row?.start_time) {
            const st = String(row.start_time).slice(0, 5);
            const proName = row.professionals?.name || row.professional_name || undefined;
            if (
              !results.some(
                (r) =>
                  r.start_time === st &&
                  (r.professional_id === row.professional_id || r.professional_name === proName)
              )
            ) {
              results.push({
                start_time: st,
                end_time: String(row.end_time || row.start_time).slice(0, 5),
                professional_id: row.professional_id,
                professional_name: proName,
                status: row.status,
                notes: row.notes,
                service_title: row.service_title,
              });
            }
          }
        });
      }
    } catch {
      try {
        const { data: fallbackRows } = await (supabase.from('appointments') as any)
          .select('start_time, end_time, professional_id, status, notes, service_title')
          .eq('salon_id', salonId)
          .eq('date_str', dateStr)
          .neq('status', 'CANCELADO')
          .neq('status', 'cancelado');
        if (Array.isArray(fallbackRows)) {
          fallbackRows.forEach((row: any) => {
            if (row?.start_time) {
              const st = String(row.start_time).slice(0, 5);
              results.push({
                start_time: st,
                end_time: String(row.end_time || row.start_time).slice(0, 5),
                professional_id: row.professional_id,
                status: row.status,
                notes: row.notes,
                service_title: row.service_title,
              });
            }
          });
        }
      } catch {}
    }
  }

  // 2. Complementa com agendamentos confirmados localmente na sessão para resposta imediata
  if (typeof window !== 'undefined') {
    try {
      const localApts = JSON.parse(localStorage.getItem('vagou_user_appointments') || '[]');
      if (Array.isArray(localApts)) {
        const [, m, d] = dateStr.split('-');
        const shortFormatted = `${d}/${m}`;
        localApts.forEach((apt: any) => {
          const isCancelled = String(apt?.status || '').toUpperCase() === 'CANCELADO';
          if (isCancelled) return;
          const matchesDate =
            apt?.dateIso === dateStr ||
            apt?.dayGroup === shortFormatted ||
            (typeof apt?.dateTime === 'string' && apt.dateTime.includes(shortFormatted));
          if (matchesDate && apt?.time) {
            const st = String(apt.time).slice(0, 5);
            const proName = apt.professional || apt.professionalName;
            if (!results.some((r) => r.start_time === st && (!proName || r.professional_name === proName))) {
              results.push({
                start_time: st,
                end_time: st,
                professional_name: proName,
                status: apt.status,
                notes: apt.blockReason || apt.notes,
                service_title: apt.serviceTitle || apt.service,
              });
            }
          }
        });
      }
    } catch {}
  }

  return results;
}

const WEEKDAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;

export function getWeekdayKeyFromIsoDate(dateStr?: string): string {
  if (!dateStr) return 'seg';
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    const dt = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    return WEEKDAY_KEYS[dt.getDay()] || 'seg';
  }
  return 'seg';
}

/**
 *Verifica se um profissional específico possui escala ativa e não está de folga/ausente na data selecionada
 */
function isProfessionalAvailableOnDay(
  prof: any,
  dayKey: string,
  dateStr: string,
  professionalSchedulesMap?: Record<string, any[]>,
  dayAppointments?: BusySlotRecord[]
): boolean {
  if (!prof) return false;

  // 1. Flag explícita de ativo/inativo (férias, desligado ou ausente no cadastro)
  if (prof.isActive === false || prof.is_active === false) {
    return false;
  }

  // 2. Verificar status explícito de ausência/folga no objeto de escala
  const scheduleObj = prof.workSchedule || prof.work_schedule || prof.schedule_config || null;
  if (scheduleObj && typeof scheduleObj === 'object') {
    const statusStr = String(scheduleObj.status || '').toLowerCase();
    if (statusStr === 'folga' || statusStr === 'ausente' || statusStr === 'absent' || statusStr === 'ferias') {
      return false;
    }

    // Lista de datas de ausência / folga pontual (YYYY-MM-DD)
    const daysOffList: string[] = Array.isArray(scheduleObj.daysOff)
      ? scheduleObj.daysOff
      : Array.isArray(scheduleObj.absences)
      ? scheduleObj.absences
      : Array.isArray(scheduleObj.folgas)
      ? scheduleObj.folgas
      : [];
    if (dateStr && daysOffList.includes(dateStr)) {
      return false;
    }

    // Escala semanal de dias de trabalho (ex: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'])
    if (Array.isArray(scheduleObj.days) && scheduleObj.days.length > 0) {
      const normalizedDays = scheduleObj.days.map((d: string) =>
        String(d || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .slice(0, 3)
      );
      if (!normalizedDays.includes(dayKey)) {
        return false;
      }
    }
  }

  // 3. Verificar grade individualizada em salons.operating_hours.professionalSchedules
  if (professionalSchedulesMap && typeof professionalSchedulesMap === 'object') {
    const profScheduleDays =
      (prof.id && professionalSchedulesMap[prof.id]) ||
      (prof.name && professionalSchedulesMap[prof.name]);
    if (Array.isArray(profScheduleDays) && profScheduleDays.length > 0) {
      const dayEntry = profScheduleDays.find((d: any) => d?.dayKey === dayKey);
      if (dayEntry && dayEntry.isOpen === false) {
        return false;
      }
    }
  }

  // 4. Verificar bloqueio de dia inteiro / folga / ausência lançada na agenda (public.appointments) na data escolhida
  if (Array.isArray(dayAppointments) && dayAppointments.length > 0) {
    const profNameNorm = String(prof.name || '').trim().toLowerCase();
    const profIdNorm = String(prof.id || '').trim();

    const profApts = dayAppointments.filter((apt) => {
      const matchId = profIdNorm && apt.professional_id && String(apt.professional_id).trim() === profIdNorm;
      const matchName =
        profNameNorm &&
        apt.professional_name &&
        String(apt.professional_name).trim().toLowerCase() === profNameNorm;
      return Boolean(matchId || matchName);
    });

    const hasFullDayAbsenceRecord = profApts.some((apt) => {
      const st = String(apt.status || '').toUpperCase();
      const notesAndTitle = `${apt.service_title || ''} ${apt.notes || ''}`.toLowerCase();
      if (st === 'FOLGA' || st === 'AUSENTE' || st === 'FERIAS') return true;
      if (
        st.includes('BLOQUE') &&
        (notesAndTitle.includes('folga') ||
          notesAndTitle.includes('ausente') ||
          notesAndTitle.includes('férias') ||
          notesAndTitle.includes('ferias') ||
          notesAndTitle.includes('dia inteiro') ||
          notesAndTitle.includes('dia todo'))
      ) {
        return true;
      }
      return false;
    });

    if (hasFullDayAbsenceRecord) {
      return false;
    }

    // Se todos os slots comerciais (>= 22 horários) daquele profissional estão ocupados/bloqueados no dia
    const uniqueBlockedTimes = new Set(profApts.map((a) => a.start_time));
    if (uniqueBlockedTimes.size >= 22) {
      return false;
    }
  }

  return true;
}

/**
 * Consulta em tempo real o banco de dados (Supabase: public.professionals, public.salons e public.appointments)
 * e a escala local da equipe para retornar SOMENTE os profissionais efetivamente disponíveis no dia selecionado.
 */
export async function fetchAvailableProfessionalsForDate(
  salonId: string,
  dateStr: string,
  baseProfessionals: SalonProfessionalItem[],
  preloadedBusySlots?: BusySlotRecord[]
): Promise<SalonProfessionalItem[]> {
  const dayKey = getWeekdayKeyFromIsoDate(dateStr);

  // Hidrata escalas locais salvas no TeamManager (se houver)
  let localTeamMembers: any[] = [];
  if (typeof window !== 'undefined') {
    try {
      const rawTeam =
        localStorage.getItem('vagou_salon_team_members') ||
        localStorage.getItem('vagou_team_members') ||
        localStorage.getItem('vagou_custom_professionals');
      if (rawTeam) {
        const parsed = JSON.parse(rawTeam);
        if (Array.isArray(parsed)) localTeamMembers = parsed;
      }
    } catch {}
  }

  let dbPros: any[] = [];
  let dbTeamMeta: any[] = [];
  let professionalSchedulesMap: Record<string, any[]> | undefined;

  if (isSupabaseConfigured && supabase && salonId) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonId);
      let resolvedSalonUuid = isUuid ? salonId : '';

      const { data: salonRow } = await (supabase.from('salons') as any)
        .select('id, branding, operating_hours')
        .match(isUuid ? { id: salonId } : { slug: salonId })
        .maybeSingle();

      if (salonRow?.id) {
        resolvedSalonUuid = salonRow.id;
      }
      if (Array.isArray(salonRow?.branding?.teamMembers)) {
        dbTeamMeta = salonRow.branding.teamMembers;
      }
      const opHours =
        salonRow?.operating_hours ||
        salonRow?.branding?.operatingSchedule ||
        salonRow?.branding?.operatingHoursJson;
      if (opHours?.professionalSchedules && typeof opHours.professionalSchedules === 'object') {
        professionalSchedulesMap = opHours.professionalSchedules;
      }

      if (resolvedSalonUuid) {
        const { data: pRows } = await (supabase.from('professionals') as any)
          .select('*')
          .eq('salon_id', resolvedSalonUuid)
          .order('created_at', { ascending: true });
        if (Array.isArray(pRows) && pRows.length > 0) {
          dbPros = pRows;
        }
      }
    } catch {}
  }

  const busySlotsForDay =
    preloadedBusySlots !== undefined
      ? preloadedBusySlots
      : salonId && dateStr
      ? await fetchBusySlotsDirectly(salonId, dateStr)
      : [];

  // Consolidar lista base (priorizando dados frescos do banco quando disponíveis)
  const sourceList: SalonProfessionalItem[] =
    dbPros.length > 0
      ? dbPros.map((p: any) => {
          const metaMatch =
            dbTeamMeta.find((m: any) => (m.id && m.id === p.id) || (m.name && m.name === p.name)) ||
            localTeamMembers.find((m: any) => (m.id && m.id === p.id) || (m.name && m.name === p.name)) ||
            baseProfessionals.find((m) => (m.id && m.id === p.id) || (m.name && m.name === p.name));

          return {
            id: p.id,
            name: p.name || metaMatch?.name || 'Profissional',
            role:
              p.role === 'admin'
                ? 'Dono / Gerente'
                : p.role === 'receptionist'
                ? 'Recepcionista'
                : p.role || metaMatch?.role || 'Profissional',
            systemRole: p.role === 'admin' || metaMatch?.systemRole === 'admin' ? 'admin' : 'member',
            avatar: p.avatar_url || metaMatch?.avatar || metaMatch?.avatarUrl || '',
            avatarUrl: p.avatar_url || metaMatch?.avatarUrl || metaMatch?.avatar || '',
            rating: metaMatch?.rating || 5.0,
            specialties: Array.isArray(p.specialties) ? p.specialties : metaMatch?.specialties || ['Geral'],
            workSchedule:
              p.work_schedule ||
              p.schedule_config ||
              metaMatch?.workSchedule ||
              metaMatch?.schedule_config ||
              undefined,
            isActive: p.is_active !== false && metaMatch?.isActive !== false && metaMatch?.is_active !== false,
          };
        })
      : baseProfessionals.map((bp) => {
          const metaMatch =
            dbTeamMeta.find((m: any) => (m.id && m.id === bp.id) || (m.name && m.name === bp.name)) ||
            localTeamMembers.find((m: any) => (m.id && m.id === bp.id) || (m.name && m.name === bp.name));
          return {
            ...bp,
            workSchedule:
              bp.workSchedule ||
              metaMatch?.workSchedule ||
              metaMatch?.work_schedule ||
              metaMatch?.schedule_config ||
              undefined,
            isActive: bp.isActive !== false && metaMatch?.isActive !== false && metaMatch?.is_active !== false,
          };
        });

  // Filtrar recepcionistas caso haja outros profissionais de atendimento na equipe
  const nonReceptionistList = sourceList.filter((p) => {
    const r = String(p.role || '').toLowerCase();
    return !r.includes('recep');
  });
  const candidatePros = nonReceptionistList.length > 0 ? nonReceptionistList : sourceList;

  // Filtrar quem está ativo e disponível na data selecionada (sem folga/ausência)
  const availableOnDate = candidatePros.filter((prof) =>
    isProfessionalAvailableOnDay(prof, dayKey, dateStr, professionalSchedulesMap, busySlotsForDay)
  );

  return availableOnDate;
}

/**
 * Cache em memória para geocodificação instantânea de CEPs e endereços já consultados
 */
const locationGeoCache = new Map<
  string,
  { lat: number; lng: number; formattedAddress: string; cep?: string }
>();

export type TransportMode = 'walking' | 'bicycling' | 'motorcycle' | 'car' | 'transit' | 'rideshare';

export const TRANSPORT_MODE_META: Record<
  TransportMode,
  { label: string; shortLabel: string; safetyBufferMinutes: number; description: string }
> = {
  walking: {
    label: 'A pé',
    shortLabel: 'A pé',
    safetyBufferMinutes: 3,
    description: 'Caminhada via Google Maps + 3 min de margem',
  },
  bicycling: {
    label: 'Bicicleta',
    shortLabel: 'Bicicleta',
    safetyBufferMinutes: 4,
    description: 'Ciclovias e vias urbanas via Google Maps + 4 min de margem',
  },
  motorcycle: {
    label: 'Moto',
    shortLabel: 'Moto',
    safetyBufferMinutes: 4,
    description: 'Rota rápida (corredor) + 4 min de margem de segurança',
  },
  car: {
    label: 'Carro',
    shortLabel: 'Carro',
    safetyBufferMinutes: 6,
    description: 'Trânsito urbano + 6 min de folga para semáforos/estacionar',
  },
  transit: {
    label: 'Transporte Público',
    shortLabel: 'Transp. Público',
    safetyBufferMinutes: 12,
    description: 'Ônibus/Metrô + caminhada e tempo de espera/baldeação',
  },
  rideshare: {
    label: 'Aplicativo',
    shortLabel: 'Aplicativo',
    safetyBufferMinutes: 10,
    description: 'Tempo de chamada do motorista (Uber / 99) + trajeto urbano',
  },
};

/**
 * Aplica calibragem de tráfego real (padrão Google Maps em horário comercial) + margem de folga
 * para garantir que o app NUNCA subestime o tempo real da rota.
 */
export function computeCalibratedEtaForMode(
  distanceKm: number,
  osrmRawMinutes: number | null,
  mode: TransportMode = 'car'
): number {
  const safeDist = Math.max(0.2, distanceKm);

  if (mode === 'walking') {
    // Caminhada urbana (~4.8 km/h)
    const walkMinutes = (safeDist / 4.8) * 60;
    const baseWalk = osrmRawMinutes ? Math.max(walkMinutes, osrmRawMinutes) : walkMinutes;
    return Math.max(4, Math.ceil(baseWalk + TRANSPORT_MODE_META.walking.safetyBufferMinutes));
  }

  if (mode === 'bicycling') {
    // Bicicleta urbana (~14.5 km/h)
    const bikeMinutes = (safeDist / 14.5) * 60;
    const baseBike = osrmRawMinutes ? Math.max(bikeMinutes, osrmRawMinutes * 1.05) : bikeMinutes;
    return Math.max(5, Math.ceil(baseBike + TRANSPORT_MODE_META.bicycling.safetyBufferMinutes));
  }

  if (mode === 'motorcycle') {
    const urbanMotoMinutes = (safeDist / (safeDist <= 15 ? 24.5 : 32.0)) * 60;
    const baseMoto = osrmRawMinutes ? Math.max(urbanMotoMinutes, osrmRawMinutes * 1.12) : urbanMotoMinutes;
    return Math.max(5, Math.ceil(baseMoto + TRANSPORT_MODE_META.motorcycle.safetyBufferMinutes));
  }

  if (mode === 'transit') {
    const urbanTransitMinutes = (safeDist / (safeDist <= 12 ? 12.5 : 15.5)) * 60;
    const baseTransit = osrmRawMinutes ? Math.max(urbanTransitMinutes, osrmRawMinutes * 1.85) : urbanTransitMinutes;
    return Math.max(12, Math.ceil(baseTransit + TRANSPORT_MODE_META.transit.safetyBufferMinutes));
  }

  // Base de Carro (trânsito urbano severo/moderado estilo Google Maps: ~16.8 km/h até 15km, ~22 km/h acima)
  const urbanCarMinutes = (safeDist / (safeDist <= 15 ? 16.8 : 22.0)) * 60;
  const baseCar = osrmRawMinutes ? Math.max(urbanCarMinutes, osrmRawMinutes * 1.42) : urbanCarMinutes;

  if (mode === 'rideshare') {
    return Math.max(8, Math.ceil(baseCar + TRANSPORT_MODE_META.rideshare.safetyBufferMinutes));
  }

  return Math.max(6, Math.ceil(baseCar + TRANSPORT_MODE_META.car.safetyBufferMinutes));
}

/**
 * Fórmula de Haversine + fator de tortuosidade urbana realista (1.42x em malha viária urbana)
 * Com calibragem Google Maps + margem de segurança por modal de transporte.
 */
export function calculateHaversineDistanceAndEta(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  mode: TransportMode = 'car'
): { distanceKm: number; etaMinutes: number } {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistanceKm = R * c;

  if (straightDistanceKm < 0.08) {
    return { distanceKm: 0.2, etaMinutes: mode === 'transit' ? 8 : 5 };
  }

  // Fator de tortuosidade viária urbana (1.42x da linha reta reflete curvas e retornos reais de rua)
  const roadDistanceKm = Math.max(0.3, Number((straightDistanceKm * 1.42).toFixed(1)));
  const etaMinutes = computeCalibratedEtaForMode(roadDistanceKm, null, mode);

  return { distanceKm: roadDistanceKm, etaMinutes };
}

/**
 * Calcula a distância real de condução por ruas (OSRM API) e o tempo estimado urbano (padrão Google Maps + margem de folga)
 */
export async function calculateDrivingRouteDistanceAndEta(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  mode: TransportMode = 'car'
): Promise<{ distanceKm: number; etaMinutes: number; routeSummary?: string }> {
  // 1. Tenta primeiro Google Routes API v2 via proxy do servidor (/api/maps/compute-route)
  try {
    const travelMode =
      mode === 'walking'
        ? 'WALK'
        : mode === 'bicycling'
        ? 'BICYCLE'
        : mode === 'motorcycle'
        ? 'TWO_WHEELER'
        : mode === 'transit'
        ? 'TRANSIT'
        : 'DRIVE';

    const gmpRes = await fetch('/api/maps/compute-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originLat: lat1,
        originLng: lng1,
        destLat: lat2,
        destLng: lng2,
        travelMode,
      }),
    });

    if (gmpRes.ok) {
      const gmpData = await gmpRes.json();
      const gmpRoute = gmpData?.routes?.[0];
      if (gmpRoute) {
        const distMeters = Number(gmpRoute.distanceMeters || 0);
        const durSec = Number(String(gmpRoute.duration || '0s').replace('s', '')) || 0;
        if (distMeters > 0 && durSec > 0) {
          const distanceKm = Math.max(0.2, Number((distMeters / 1000).toFixed(1)));
          const gmpRawMinutes = Math.max(2, Math.ceil(durSec / 60));
          const safetyBuffer = TRANSPORT_MODE_META[mode]?.safetyBufferMinutes ?? 4;
          const etaMinutes = Math.max(4, gmpRawMinutes + safetyBuffer);
          const routeSummary = gmpRoute.description ? `via ${gmpRoute.description}` : undefined;
          return { distanceKm, etaMinutes, routeSummary };
        }
      }
    }
  } catch {}

  // 2. Fallback para OSRM se offline ou sem chave
  try {
    const osrmProfile = mode === 'walking' ? 'foot' : mode === 'bicycling' ? 'bike' : 'driving';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${lng1},${lat1};${lng2},${lat2}?overview=false`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data?.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.max(0.2, Number((route.distance / 1000).toFixed(1)));
        const osrmRawMinutes = Math.round(route.duration / 60);
        const etaMinutes = computeCalibratedEtaForMode(distanceKm, osrmRawMinutes, mode);
        const legSummary = route.legs?.[0]?.summary ? `via ${route.legs[0].summary}` : undefined;
        return { distanceKm, etaMinutes, routeSummary: legSummary };
      }
    }
  } catch {}

  return calculateHaversineDistanceAndEta(lat1, lng1, lat2, lng2, mode);
}

/**
 * Geocodifica qualquer CEP brasileiro (8 dígitos) ou endereço textual usando 3 provedores reais em cascata:
 * 1. AwesomeAPI CEP (coordenadas diretas do CEP)
 * 2. BrasilAPI CEP v2 (coordenadas oficiais IBGE/Correios)
 * 3. ViaCEP + Google Places API (New v1) / Nominatim OpenStreetMap
 */
export async function geocodeBrazilLocation(
  query: string
): Promise<{ lat: number; lng: number; formattedAddress: string; cep?: string } | null> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  const onlyDigits = cleanQuery.replace(/\D/g, '');
  const cacheKey = onlyDigits.length === 8 ? `cep_v2:${onlyDigits}` : `addr_v2:${cleanQuery.toLowerCase()}`;
  const cached = locationGeoCache.get(cacheKey);
  if (cached) return cached;

  let street = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let formattedAddress = cleanQuery;

  const abbreviateAddressPrefixes = (text: string): string => {
    if (!text) return '';
    return text
      .trim()
      .replace(/\bAvenida\b/gi, 'Av.')
      .replace(/\bPraça\b/gi, 'Pça.')
      .replace(/\bAlameda\b/gi, 'Al.')
      .replace(/\bTravessa\b/gi, 'Trav.')
      .replace(/\bRua\b/gi, 'R.')
      .replace(/\bEstrada\b/gi, 'Estr.')
      .replace(/\bRodovia\b/gi, 'Rod.')
      .replace(/\bLargo\b/gi, 'Lg.')
      .replace(/\bViela\b/gi, 'Vl.')
      .replace(/\bBeco\b/gi, 'Bc.')
      .replace(/\bConjunto\b/gi, 'Conj.')
      .replace(/\bCondomínio\b/gi, 'Cond.')
      .replace(/\bParque\b/gi, 'Pq.')
      .replace(/\bJardim\b/gi, 'Jd.')
      .replace(/\bVila\b/gi, 'Vl.')
      .replace(/\bDoutora?\b/gi, 'Dr.')
      .replace(/\bProfessora?\b/gi, 'Prof.')
      .replace(/\bEngenheiro\b/gi, 'Eng.')
      .replace(/\bCapitão\b/gi, 'Cap.')
      .replace(/\bCoronel\b/gi, 'Cel.')
      .replace(/\bGeneral\b/gi, 'Gen.')
      .replace(/\bMarechal\b/gi, 'Mal.')
      .replace(/\bPresidente\b/gi, 'Pres.')
      .replace(/\bGovernador\b/gi, 'Gov.')
      .replace(/\bSenador\b/gi, 'Sen.')
      .replace(/\bDeputado\b/gi, 'Dep.');
  };

  const formatCepAddressString = (st: string, nb: string, ct: string, uf: string, fallback: string) => {
    const abbrSt = abbreviateAddressPrefixes(st);
    const abbrNb = abbreviateAddressPrefixes(nb);
    const parts = [abbrSt, abbrNb, ct.trim(), uf.trim()].filter(Boolean);
    return parts.length > 0 ? parts.join('-') : fallback;
  };

  // Fluxo A: É um CEP de 8 dígitos (ex.: 08235-770 ou 08285-010)
  if (onlyDigits.length === 8) {
    // 1. Tenta AwesomeAPI CEP (retorna lat e lng exatos do CEP instantaneamente)
    try {
      const awesomeRes = await fetch(`https://cep.awesomeapi.com.br/json/${onlyDigits}`);
      if (awesomeRes.ok) {
        const awData = await awesomeRes.json();
        if (awData && !awData.status) {
          street = awData.address || street;
          neighborhood = awData.district || neighborhood;
          city = awData.city || city;
          state = awData.state || state;
          formattedAddress = formatCepAddressString(street, neighborhood, city, state, onlyDigits);
          const lat = parseFloat(awData.lat);
          const lng = parseFloat(awData.lng);
          if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
            const resolved = { lat, lng, formattedAddress, cep: onlyDigits };
            locationGeoCache.set(cacheKey, resolved);
            return resolved;
          }
        }
      }
    } catch {}

    // 2. Tenta BrasilAPI CEP v2 (retorna location.coordinates.latitude / longitude)
    try {
      const brRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${onlyDigits}`);
      if (brRes.ok) {
        const brData = await brRes.json();
        street = brData.street || street;
        neighborhood = brData.neighborhood || neighborhood;
        city = brData.city || city;
        state = brData.state || state;
        formattedAddress = formatCepAddressString(street, neighborhood, city, state, onlyDigits);
        const lat = parseFloat(brData?.location?.coordinates?.latitude);
        const lng = parseFloat(brData?.location?.coordinates?.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
          const resolved = { lat, lng, formattedAddress, cep: onlyDigits };
          locationGeoCache.set(cacheKey, resolved);
          return resolved;
        }
      }
    } catch {}

    // 3. Tenta ViaCEP para enriquecer logradouro/bairro caso ainda não tenhamos
    if (!street || !neighborhood || !city) {
      try {
        const viaRes = await fetch(`https://viacep.com.br/ws/${onlyDigits}/json/`);
        if (viaRes.ok) {
          const viaData = await viaRes.json();
          if (!viaData.erro) {
            street = viaData.logradouro || street;
            neighborhood = viaData.bairro || neighborhood;
            city = viaData.localidade || city;
            state = viaData.uf || state;
            formattedAddress = formatCepAddressString(street, neighborhood, city, state, onlyDigits);
          }
        }
      } catch {}
    }

    // 4. Consulta Nominatim com queries estruturadas (logradouro+cidade, depois CEP, depois bairro+cidade)
    const candidateQueries = [
      street && city ? `${street}, ${city} - ${state}, Brasil` : '',
      `${onlyDigits.slice(0, 5)}-${onlyDigits.slice(5)}, Brasil`,
      neighborhood && city ? `${neighborhood}, ${city} - ${state}, Brasil` : '',
      city ? `${city} - ${state}, Brasil` : '',
    ].filter(Boolean);

    for (const q of candidateQueries) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData) && nomData.length > 0) {
            const lat = parseFloat(nomData[0].lat);
            const lng = parseFloat(nomData[0].lon);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
              const resolved = { lat, lng, formattedAddress, cep: onlyDigits };
              locationGeoCache.set(cacheKey, resolved);
              return resolved;
            }
          }
        }
      } catch {}
    }

    if (city || street || neighborhood) {
      const resolved = { lat: -23.5505, lng: -46.6333, formattedAddress, cep: onlyDigits };
      locationGeoCache.set(cacheKey, resolved);
      return resolved;
    }
  }

  // Fluxo B: Endereço textual livre (ex.: "Shopping Internacional Guarulhos" ou "Av. Itaquera, São Paulo")
  // 1. Tenta primeiro Google Places API (New v1) via proxy do servidor
  try {
    const placesRes = await fetch('/api/maps/places-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: cleanQuery }),
    });
    if (placesRes.ok) {
      const placesData = await placesRes.json();
      const firstPlace = placesData?.places?.[0];
      if (firstPlace && typeof firstPlace.lat === 'number' && typeof firstPlace.lng === 'number') {
        const resolved = {
          lat: firstPlace.lat,
          lng: firstPlace.lng,
          formattedAddress: firstPlace.formattedAddress || firstPlace.title || cleanQuery,
        };
        locationGeoCache.set(cacheKey, resolved);
        return resolved;
      }
    }
  } catch {}

  // 2. Fallback para Nominatim
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(cleanQuery)}`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const lat = parseFloat(nomData[0].lat);
        const lng = parseFloat(nomData[0].lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          const shortName = nomData[0].display_name
            ? nomData[0].display_name.split(',').slice(0, 3).join(',').trim()
            : cleanQuery;
          const resolved = { lat, lng, formattedAddress: shortName };
          locationGeoCache.set(cacheKey, resolved);
          return resolved;
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Geocodifica o endereço/CEP do cliente e do estabelecimento em tempo real e calcula a rota real com calibragem por modal e margem de folga
 */
export async function resolveAddressDistanceToSalon(
  addressOrCepQuery: string,
  salonCoords: { lat: number; lng: number } = { lat: -23.5621, lng: -46.4795 },
  salonDestinationQuery?: string,
  transportMode: TransportMode = 'car'
): Promise<{
  formattedAddress: string;
  salonFormattedAddress?: string;
  lat: number;
  lng: number;
  salonLat: number;
  salonLng: number;
  distanceKm: number;
  etaMinutes: number;
  routeSummary?: string;
}> {
  // 1. Resolver coordenadas reais do Salão se houver CEP/endereço do salão
  let targetSalonLat = salonCoords.lat;
  let targetSalonLng = salonCoords.lng;
  let salonFormattedAddress: string | undefined;

  if (salonDestinationQuery && salonDestinationQuery.trim().length >= 5) {
    const salonGeo = await geocodeBrazilLocation(salonDestinationQuery);
    if (salonGeo) {
      targetSalonLat = salonGeo.lat;
      targetSalonLng = salonGeo.lng;
      salonFormattedAddress = salonGeo.formattedAddress;
    }
  }

  // 2. Resolver coordenadas reais da Origem do Cliente (CEP ou Endereço)
  const originGeo = await geocodeBrazilLocation(addressOrCepQuery);

  if (originGeo) {
    const route = await calculateDrivingRouteDistanceAndEta(
      originGeo.lat,
      originGeo.lng,
      targetSalonLat,
      targetSalonLng,
      transportMode
    );

    return {
      formattedAddress: originGeo.formattedAddress,
      salonFormattedAddress,
      lat: originGeo.lat,
      lng: originGeo.lng,
      salonLat: targetSalonLat,
      salonLng: targetSalonLng,
      distanceKm: route.distanceKm,
      etaMinutes: route.etaMinutes,
      routeSummary: route.routeSummary,
    };
  }

  // 3. Fallback determinístico apenas se o usuário digitar texto sem correspondência geográfica
  const cleanQuery = addressOrCepQuery.trim();
  const seed = cleanQuery.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const simulatedDistanceKm = Number((3.5 + (seed % 85) / 10).toFixed(1));
  const simulatedEtaMinutes = computeCalibratedEtaForMode(simulatedDistanceKm, null, transportMode);

  return {
    formattedAddress: cleanQuery,
    salonFormattedAddress,
    lat: targetSalonLat - 0.03,
    lng: targetSalonLng - 0.03,
    salonLat: targetSalonLat,
    salonLng: targetSalonLng,
    distanceKm: simulatedDistanceKm,
    etaMinutes: simulatedEtaMinutes,
  };
}

/**
 * Calcula o Horário Máximo de Saída (ex: "13H20") com base no horário agendado (ex: "14:00") e no tempo de trajeto (etaMinutes)
 */
export function formatMaxDepartureTime(timeSlot: string, etaMinutes: number): string {
  const [sh, sm] = String(timeSlot || '').split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm)) return '--H--';
  const totalAppointmentMinutes = sh * 60 + sm;
  const safeEta = Math.max(0, etaMinutes);
  if (safeEta > 12 * 60) {
    const daysBefore = Math.floor(safeEta / 1440);
    const remMinutes = safeEta % 1440;
    const depMin = ((totalAppointmentMinutes - remMinutes) % 1440 + 1440) % 1440;
    const h = Math.floor(depMin / 60);
    const m = depMin % 60;
    return daysBefore > 0
      ? `${String(h).padStart(2, '0')}H${String(m).padStart(2, '0')} (-${daysBefore}d)`
      : `${String(h).padStart(2, '0')}H${String(m).padStart(2, '0')}`;
  }
  const departureMinutes = ((totalAppointmentMinutes - safeEta) % 1440 + 1440) % 1440;
  const h = Math.floor(departureMinutes / 60);
  const m = departureMinutes % 60;
  return `${String(h).padStart(2, '0')}H${String(m).padStart(2, '0')}`;
}

/**
 * Gera Deep Links Universais (Google Maps com modo exato e baldeações, Waze, Uber e 99) já com origem e destino preenchidos
 */
export function buildTransportDeepLinks(params: {
  originAddress?: string;
  originLat?: number;
  originLng?: number;
  salonName?: string;
  salonAddress?: string;
  salonLat?: number;
  salonLng?: number;
  transportMode?: TransportMode;
}) {
  const originCoordStr =
    typeof params.originLat === 'number' && typeof params.originLng === 'number'
      ? `${params.originLat},${params.originLng}`
      : '';
  const salonCoordStr =
    typeof params.salonLat === 'number' && typeof params.salonLng === 'number'
      ? `${params.salonLat},${params.salonLng}`
      : '';

  const originQuery = (params.originAddress || originCoordStr || '').trim();
  const destLabel = [params.salonName, params.salonAddress].filter(Boolean).join(' - ').trim() || salonCoordStr;
  const destAddressOnly = (params.salonAddress || params.salonName || salonCoordStr || 'Estabelecimento').trim();

  const googleTravelMode =
    params.transportMode === 'walking'
      ? 'walking'
      : params.transportMode === 'bicycling'
      ? 'bicycling'
      : params.transportMode === 'transit'
      ? 'transit'
      : params.transportMode === 'motorcycle'
      ? 'two-wheeler'
      : 'driving';

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    originQuery || originCoordStr
  )}&destination=${encodeURIComponent(destAddressOnly || salonCoordStr)}&travelmode=${googleTravelMode}`;

  const googleMapsTransitUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    originQuery || originCoordStr
  )}&destination=${encodeURIComponent(destAddressOnly || salonCoordStr)}&travelmode=transit`;

  // URL de incorporação direta (iframe embed) do Google Maps com rota e modalidade selecionada
  // 0 = carro/moto, 1 = bicicleta, 2 = a pé, 3 = transporte público
  const embedModeCode =
    params.transportMode === 'bicycling'
      ? 1
      : params.transportMode === 'walking'
      ? 2
      : params.transportMode === 'transit'
      ? 3
      : 0;

  const hasOriginCoords =
    typeof params.originLat === 'number' &&
    typeof params.originLng === 'number' &&
    !Number.isNaN(params.originLat) &&
    !Number.isNaN(params.originLng);
  const hasSalonCoords =
    typeof params.salonLat === 'number' &&
    typeof params.salonLng === 'number' &&
    !Number.isNaN(params.salonLat) &&
    !Number.isNaN(params.salonLng);

  const originPbBlock = hasOriginCoords
    ? `!4m3!3m2!1d${params.originLat}!2d${params.originLng}`
    : `!4m1!2s${encodeURIComponent(originQuery || 'São Paulo, SP')}`;
  const originPbCount = hasOriginCoords ? 4 : 2;

  const destPbBlock = hasSalonCoords
    ? `!4m3!3m2!1d${params.salonLat}!2d${params.salonLng}`
    : `!4m1!2s${encodeURIComponent(destAddressOnly || 'São Paulo, SP')}`;
  const destPbCount = hasSalonCoords ? 4 : 2;

  const innerPbCount = 1 + originPbCount + destPbCount;
  const outerPbCount = 1 + innerPbCount;
  const googleMapsEmbedUrl = `https://www.google.com/maps/embed?origin=mfe&pb=!1m${outerPbCount}!4m${innerPbCount}!3e${embedModeCode}${originPbBlock}${destPbBlock}!3m1!1spt-BR!5m1!1spt-BR`;

  const wazeUrl = salonCoordStr
    ? `https://waze.com/ul?ll=${salonCoordStr}&q=${encodeURIComponent(destAddressOnly)}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(destAddressOnly)}&navigate=yes`;

  // Deep Link Oficial Universal Uber (pré-preenche origem e endereço/coordenadas exatas do salão)
  const uberParams = new URLSearchParams({
    action: 'setPickup',
    'dropoff[formatted_address]': destLabel,
    'dropoff[nickname]': params.salonName || 'Salão',
  });
  if (typeof params.salonLat === 'number' && typeof params.salonLng === 'number') {
    uberParams.set('dropoff[latitude]', String(params.salonLat));
    uberParams.set('dropoff[longitude]', String(params.salonLng));
  }
  if (typeof params.originLat === 'number' && typeof params.originLng === 'number') {
    uberParams.set('pickup[latitude]', String(params.originLat));
    uberParams.set('pickup[longitude]', String(params.originLng));
    if (params.originAddress) {
      uberParams.set('pickup[formatted_address]', params.originAddress);
    }
  } else {
    uberParams.set('pickup', 'my_location');
  }
  const uberUrl = `https://m.uber.com/ul/?${uberParams.toString()}`;

  // Deep Link 99 App com coordenadas e endereço do destino
  const app99Params = new URLSearchParams({
    dropoff_title: destLabel,
  });
  if (typeof params.salonLat === 'number' && typeof params.salonLng === 'number') {
    app99Params.set('dropoff_latitude', String(params.salonLat));
    app99Params.set('dropoff_longitude', String(params.salonLng));
  }
  if (typeof params.originLat === 'number' && typeof params.originLng === 'number') {
    app99Params.set('pickup_latitude', String(params.originLat));
    app99Params.set('pickup_longitude', String(params.originLng));
    if (params.originAddress) {
      app99Params.set('pickup_title', params.originAddress);
    }
  }
  const app99Url = `https://99app.com/?${app99Params.toString()}`;

  // Intent nativo do sistema (Android/iOS) para abrir aplicativos instalados no dispositivo do cliente
  const nativeGeoIntentUrl = salonCoordStr
    ? `geo:${salonCoordStr}?q=${encodeURIComponent(destLabel || destAddressOnly)}`
    : `geo:0,0?q=${encodeURIComponent(destLabel || destAddressOnly)}`;

  return {
    googleMapsUrl,
    googleMapsTransitUrl,
    googleMapsEmbedUrl,
    wazeUrl,
    uberUrl,
    app99Url,
    nativeGeoIntentUrl,
    destAddressOnly,
  };
}

/**
 * Gera link universal do Google Calendar para salvar o agendamento na agenda do celular/conta Google
 */
export function buildGoogleCalendarEventUrl(params: {
  serviceTitle: string;
  salonName: string;
  salonAddress?: string;
  professionalName?: string;
  dateIso: string;
  timeSlot: string;
  durationStr?: string;
}): string {
  const [y, m, d] = String(params.dateIso || '').split('-').map(Number);
  const [hh, mm] = String(params.timeSlot || '09:00').split(':').map(Number);
  const durMatch = String(params.durationStr || '45 min').match(/(\d+)/);
  const durationMinutes = durMatch ? Math.max(15, parseInt(durMatch[1], 10)) : 45;

  const startDate = new Date(y || 2026, (m || 1) - 1, d || 1, hh || 9, mm || 0, 0);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const toCalIso = (dt: Date) => {
    const yy = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    return `${yy}${mo}${dd}T${h}${mi}00`;
  };

  const title = `${params.serviceTitle} - ${params.salonName}`;
  const details = [
    `Serviço: ${params.serviceTitle}`,
    params.professionalName ? `Profissional: ${params.professionalName}` : '',
    `Estabelecimento: ${params.salonName}`,
  ]
    .filter(Boolean)
    .join('\n');

  const calParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toCalIso(startDate)}/${toCalIso(endDate)}`,
    details,
    location: params.salonAddress || params.salonName,
  });

  return `https://calendar.google.com/calendar/render?${calParams.toString()}`;
}

export interface SlotGenerationOptions {
  travelMinutes?: number;
  prepMinutes?: number;
  busySlots?: Array<{ start_time: string; end_time?: string; professional_id?: string; professional_name?: string }>;
  availableProfessionals?: SalonProfessionalItem[];
  nowOverride?: Date;
}

/**
 * Gera os horários do dia classificados por período (manhã, tarde, noite),
 * aplicando bloqueio de banco de dados (busySlots), escala dos profissionais disponíveis no dia e a regra preditiva:
 * Disponível apenas se Horário >= Hora Atual + Tempo de Deslocamento + 15 min (preparação)
 */
export function getAvailableSlotsForDate(
  dateStr?: string,
  selectedProNameOrId?: string,
  options?: SlotGenerationOptions
): BookingSlotItem[] {
  const baseSlots: Array<{ time: string; period: 'manha' | 'tarde' | 'noite' }> = [
    { time: '08:00', period: 'manha' },
    { time: '08:30', period: 'manha' },
    { time: '09:00', period: 'manha' },
    { time: '09:30', period: 'manha' },
    { time: '10:00', period: 'manha' },
    { time: '10:30', period: 'manha' },
    { time: '11:00', period: 'manha' },
    { time: '11:30', period: 'manha' },
    { time: '12:00', period: 'tarde' },
    { time: '12:30', period: 'tarde' },
    { time: '13:00', period: 'tarde' },
    { time: '13:30', period: 'tarde' },
    { time: '14:00', period: 'tarde' },
    { time: '14:30', period: 'tarde' },
    { time: '15:00', period: 'tarde' },
    { time: '15:30', period: 'tarde' },
    { time: '16:00', period: 'tarde' },
    { time: '16:30', period: 'tarde' },
    { time: '17:00', period: 'tarde' },
    { time: '17:30', period: 'tarde' },
    { time: '18:00', period: 'noite' },
    { time: '18:30', period: 'noite' },
    { time: '19:00', period: 'noite' },
    { time: '19:30', period: 'noite' },
    { time: '20:00', period: 'noite' },
    { time: '20:30', period: 'noite' },
  ];

  const now = options?.nowOverride || new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = Boolean(dateStr && dateStr === todayIso);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const travelMinutes = Math.max(0, options?.travelMinutes ?? 15);
  const prepMinutes = Math.max(0, options?.prepMinutes ?? 15);
  const minAllowedMinutesForToday = nowMinutes + travelMinutes + prepMinutes;

  const rawBusyList = options?.busySlots || [];
  const availablePros = options?.availableProfessionals;

  // Se a lista de profissionais disponíveis no dia foi explicitamente resolvida como vazia, bloqueia os slots
  if (Array.isArray(availablePros) && availablePros.length === 0) {
    return baseSlots.map((slot) => ({
      ...slot,
      available: false,
      reason: 'busy',
    }));
  }

  const targetPro =
    selectedProNameOrId && selectedProNameOrId !== 'any' && Array.isArray(availablePros)
      ? availablePros.find(
          (p) =>
            p.id === selectedProNameOrId ||
            p.name.trim().toLowerCase() === selectedProNameOrId.trim().toLowerCase()
        )
      : Array.isArray(availablePros) && availablePros.length === 1
      ? availablePros[0]
      : undefined;

  const isSlotBusyForPro = (slotTime: string, slotMin: number, pro?: SalonProfessionalItem): boolean => {
    if (pro?.workSchedule?.startTime && pro?.workSchedule?.endTime) {
      const [sh, sm] = pro.workSchedule.startTime.split(':').map(Number);
      const [eh, em] = pro.workSchedule.endTime.split(':').map(Number);
      if (!Number.isNaN(sh) && !Number.isNaN(eh)) {
        const startMin = sh * 60 + (sm || 0);
        const endMin = eh * 60 + (em || 0);
        if (slotMin < startMin || slotMin >= endMin) {
          return true;
        }
      }
    }

    const proId = pro?.id ? String(pro.id).trim() : '';
    const proName = pro?.name ? pro.name.trim().toLowerCase() : '';

    return rawBusyList.some((b) => {
      if (String(b.start_time).slice(0, 5) !== slotTime) return false;
      // Bloqueio global (sem profissional específico atrelado)
      if (!b.professional_id && !b.professional_name) return true;
      if (!pro) {
        if (selectedProNameOrId && selectedProNameOrId !== 'any') {
          const selNorm = selectedProNameOrId.trim().toLowerCase();
          return (
            b.professional_id === selectedProNameOrId ||
            (b.professional_name && b.professional_name.trim().toLowerCase() === selNorm) ||
            false
          );
        }
        return true;
      }
      if (proId && b.professional_id && String(b.professional_id).trim() === proId) return true;
      if (proName && b.professional_name && b.professional_name.trim().toLowerCase() === proName) return true;
      return false;
    });
  };

  return baseSlots.map((slot) => {
    const [h, m] = slot.time.split(':').map(Number);
    const slotMinutes = h * 60 + m;

    // 1. Verifica ocupação no banco de dados e turno de atendimento do(s) profissional(is) disponível(is)
    let isBusy = false;
    if (targetPro) {
      isBusy = isSlotBusyForPro(slot.time, slotMinutes, targetPro);
    } else if (Array.isArray(availablePros) && availablePros.length > 1 && (!selectedProNameOrId || selectedProNameOrId === 'any')) {
      // No modo "Qualquer", o horário só fica indisponível se TODOS os profissionais disponíveis no dia estiverem ocupados naquele horário
      isBusy = availablePros.every((pro) => isSlotBusyForPro(slot.time, slotMinutes, pro));
    } else {
      isBusy = isSlotBusyForPro(slot.time, slotMinutes, undefined);
    }

    if (isBusy) {
      return {
        ...slot,
        available: false,
        reason: 'busy',
      };
    }

    // 2. Se for para Hoje, bloqueia horas passadas e slots inferiores a (Hora Atual + Deslocamento + 15 min preparo)
    if (isToday) {
      if (slotMinutes <= nowMinutes) {
        return {
          ...slot,
          available: false,
          reason: 'past',
        };
      }
      if (slotMinutes < minAllowedMinutesForToday) {
        return {
          ...slot,
          available: false,
          reason: 'travel_buffer',
        };
      }
    }

    return {
      ...slot,
      available: true,
    };
  });
}

