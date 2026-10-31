import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, 
  Plus, Phone, User, Check, X,
  AlertCircle, ExternalLink,
  DollarSign, Mail,
  ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Send, ShieldCheck,
  Lock, Unlock, ArrowRight,
  LayoutGrid, List, Zap, Baby, Heart,
  Navigation, Package, Map as MapIcon, AlertTriangle, Bell, Home
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { BookingAppointment, CatalogServiceItem, SalonAdminSettings, SalonProfessionalItem } from '../../types';
import { hapticLight, hapticSuccess, hapticMedium } from '../../utils/haptics';
import { PixCheckoutModal } from './PixCheckoutModal';
import { LiveRouteDepartureModal, LiveTrackingDrawerModal } from '../live-tracking/LiveTrackingModal';
import { syncAppointmentAcrossStorageAndDb, formatCurrentClockTime } from '../../hooks/useLiveRouteTracker';

export interface ProfessionalAgendaViewProps {
  appointments: BookingAppointment[];
  onUpdateAppointments: (appointments: BookingAppointment[]) => void;
  services?: CatalogServiceItem[];
  professionals?: SalonProfessionalItem[];
  salonName?: string;
  adminSettings?: SalonAdminSettings;
}

export type DemandStatusKey = 'confirmados' | 'pendentes' | 'trocas' | 'concluidos' | 'cancelados';

export const getStatusCategory = (statusRaw?: string, swapRequest?: any): { 
  key: DemandStatusKey; 
  order: number; 
  label: string; 
  shortLabel: string;
  gridLabel: string;
  badgeBg: string; 
  badgeText: string; 
  badgeBorder: string;
  badgeFullClass: string;
  cardBorderDark: string;
  cardBorderLight: string;
  dotColor: string;
} => {
  const status = (statusRaw || '').toUpperCase().trim();

  // 0. EM ATENDIMENTO (Iniciado pelo profissional)
  if (status.includes('ATEND') || status.includes('INICI')) {
    return {
      key: 'confirmados',
      order: 0,
      label: 'Em Atendimento',
      shortLabel: 'Em Atendimento',
      gridLabel: 'Atend.',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/50',
      badgeFullClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold',
      cardBorderDark: 'border-emerald-500 hover:border-emerald-400',
      cardBorderLight: 'border-emerald-500 hover:border-emerald-600',
      dotColor: 'bg-emerald-400'
    };
  }

  // BLOQUEADO (Horários trancados / Intervalo / Almoço)
  if (status.includes('BLOQUE')) {
    return {
      key: 'cancelados',
      order: 5,
      label: 'Horários Bloqueados',
      shortLabel: 'Bloqueado',
      gridLabel: 'Trava',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/30',
      badgeFullClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      cardBorderDark: 'border-amber-500 hover:border-amber-400',
      cardBorderLight: 'border-amber-500 hover:border-amber-600',
      dotColor: 'bg-amber-400'
    };
  }

  // 2. TROCA A CONFIRMAR (Troca entre clientes pendente de confirmação)
  if ((swapRequest && swapRequest.isClientSwap) || status.includes('TROCA') || status.includes('SWAP')) {
    return {
      key: 'trocas',
      order: 2,
      label: 'Trocas a Confirmar',
      shortLabel: 'Troca',
      gridLabel: 'Troca',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      badgeFullClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold',
      cardBorderDark: 'border-amber-500 hover:border-amber-400',
      cardBorderLight: 'border-amber-500 hover:border-amber-600',
      dotColor: 'bg-amber-400'
    };
  }

  // 3. ALTERAÇÃO / PENDENTES COMUNS (aguarda confirmação do profissional)
  if (status.includes('ALTER') || status.includes('REMANEJ') || status.includes('REAGEND')) {
    return {
      key: 'pendentes',
      order: 3,
      label: 'Alteração (Aguardando Aceite)',
      shortLabel: 'Alteração',
      gridLabel: 'Alter.',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/30',
      badgeFullClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      cardBorderDark: 'border-amber-500 hover:border-amber-400',
      cardBorderLight: 'border-amber-500 hover:border-amber-600',
      dotColor: 'bg-amber-400'
    };
  }

  if (status.includes('PEND') || status.includes('AGUARD')) {
    return {
      key: 'pendentes',
      order: 3,
      label: 'Agendamentos a Confirmar',
      shortLabel: 'A Confirmar',
      gridLabel: 'A Conf.',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/30',
      badgeFullClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      cardBorderDark: 'border-amber-500 hover:border-amber-400',
      cardBorderLight: 'border-amber-500 hover:border-amber-600',
      dotColor: 'bg-amber-400'
    };
  }

  // 4. CONCLUÍDOS
  if (status.includes('CONCLU')) {
    return {
      key: 'concluidos',
      order: 4,
      label: 'Concluídos',
      shortLabel: 'Concluído',
      gridLabel: 'Concl.',
      badgeBg: 'bg-blue-500/15',
      badgeText: 'text-blue-400',
      badgeBorder: 'border-blue-500/30',
      badgeFullClass: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      cardBorderDark: 'border-blue-500 hover:border-blue-400',
      cardBorderLight: 'border-blue-500 hover:border-blue-600',
      dotColor: 'bg-blue-400'
    };
  }

  // 6. CANCELADOS
  if (status.includes('CANCEL')) {
    return {
      key: 'cancelados',
      order: 6,
      label: 'Cancelados',
      shortLabel: 'Cancelado',
      gridLabel: 'Cancel.',
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-500/30',
      badgeFullClass: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      cardBorderDark: 'border-rose-500 hover:border-rose-400',
      cardBorderLight: 'border-rose-500 hover:border-rose-600',
      dotColor: 'bg-rose-400'
    };
  }

  // 1. CONFIRMADOS (Padrão)
  return {
    key: 'confirmados',
    order: 1,
    label: 'Confirmados',
    shortLabel: 'Confirmado',
    gridLabel: 'Conf.',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    badgeFullClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    cardBorderDark: 'border-emerald-500 hover:border-emerald-400',
    cardBorderLight: 'border-emerald-500 hover:border-emerald-600',
    dotColor: 'bg-emerald-400'
  };
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};

const isBeforeToday = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

export const parseDurationToMinutes = (durationStr?: string): number => {
  if (!durationStr) return 40;
  let durationMinutes = 40;
  if (durationStr.includes('h')) {
    const hMatch = durationStr.match(/(\d+)\s*h/);
    const mMatch = durationStr.match(/(\d+)\s*m/);
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;
    durationMinutes = (h * 60) + m;
  } else {
    const mMatch = durationStr.match(/(\d+)/);
    if (mMatch) {
      durationMinutes = parseInt(mMatch[1], 10);
    }
  }
  return durationMinutes > 0 ? durationMinutes : 40;
};

export const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return (h * 60) + m;
};

export const formatMinutesToTime = (totalMinutes: number): string => {
  const norm = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const formatDurationDisplay = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export const calculateEndTime = (startTime?: string, durationStr?: string): string => {
  if (!startTime) return '--:--';
  const startM = parseTimeToMinutes(startTime);
  const durM = parseDurationToMinutes(durationStr);
  return formatMinutesToTime(startM + durM);
};

export const CHECKOUT_BUFFER_MINUTES = 15; // 15 minutos de intervalo para pagamento, conferência e higienização
export const WORK_DAY_START_MINUTES = 8 * 60; // 08:00
export const WORK_DAY_END_MINUTES = 20 * 60; // 20:00

export interface DynamicTimelineItem {
  id: string;
  type: 'APPOINTMENT' | 'FREE_SLOT';
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  appointment?: BookingAppointment;
  chairFreeTime?: string;
  chairFreeMinutes?: number;
  bufferMinutes?: number;
  freeSlotDurationText?: string;
}

export const formatSelectedDateHeading = (date: Date) => {
  const isToday = isSameDay(date, new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = isSameDay(date, tomorrow);

  const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayOfWeekCap = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
  const dayAndMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

  if (isToday) {
    return `Hoje • ${dayOfWeekCap}, ${dayAndMonth}`;
  }
  if (isTomorrow) {
    return `Amanhã • ${dayOfWeekCap}, ${dayAndMonth}`;
  }
  return `${dayOfWeekCap}, ${dayAndMonth}`;
};

export const ProfessionalAgendaView: React.FC<ProfessionalAgendaViewProps> = ({
  appointments = [],
  onUpdateAppointments,
  services = [],
  professionals = [],
  salonName = 'Meu Estabelecimento',
  adminSettings,
}) => {
  const { isDark } = useTheme();

  // Estados de Data Selecionada e Calendário do Mês Fixo
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(true);
  const [slotFilter, setSlotFilter] = useState<'todos' | 'confirmados' | 'livres' | 'concluidos'>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'lista'>('grid');
  
  // Modais
  const [selectedAppointment, setSelectedAppointment] = useState<BookingAppointment | null>(null);
  const [pixCheckoutAppointment, setPixCheckoutAppointment] = useState<BookingAppointment | null>(null);
  const [liveTrackingViewerState, setLiveTrackingViewerState] = useState<{
    appointment: BookingAppointment;
    initialTab: 'timeline' | 'map';
  } | null>(null);
  const [proDeliveryDepartureApt, setProDeliveryDepartureApt] = useState<BookingAppointment | null>(null);

  const handleSingleLiveAppointmentUpdate = (updated: BookingAppointment) => {
    const nextList = appointments.map((apt) =>
      apt.protocolCode === updated.protocolCode || (apt.id && apt.id === updated.id)
        ? { ...apt, ...updated }
        : apt
    );
    onUpdateAppointments(nextList);
    if (selectedAppointment && selectedAppointment.protocolCode === updated.protocolCode) {
      setSelectedAppointment(updated);
    }
    if (liveTrackingViewerState && liveTrackingViewerState.appointment.protocolCode === updated.protocolCode) {
      setLiveTrackingViewerState({ ...liveTrackingViewerState, appointment: updated });
    }
    if (proDeliveryDepartureApt && proDeliveryDepartureApt.protocolCode === updated.protocolCode) {
      setProDeliveryDepartureApt(updated);
    }
  };

  useEffect(() => {
    const handleGlobalLiveUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ appointment?: BookingAppointment }>;
      const updated = customEvt.detail?.appointment;
      if (!updated) return;
      handleSingleLiveAppointmentUpdate(updated);
    };
    window.addEventListener('vagou:appointments-updated', handleGlobalLiveUpdate);
    return () => window.removeEventListener('vagou:appointments-updated', handleGlobalLiveUpdate);
  }, [appointments, selectedAppointment, liveTrackingViewerState, proDeliveryDepartureApt]);

  const [isNewModalOpen, setIsNewModalOpen] = useState(() => {
    try {
      const shouldOpen = localStorage.getItem('vagou_pending_open_schedule');
      if (shouldOpen) {
        localStorage.removeItem('vagou_pending_open_schedule');
        return true;
      }
    } catch {}
    return false;
  });
  const [swapConfirmedModalData, setSwapConfirmedModalData] = useState<{
    clientA: { name: string; newTime: string };
    clientB: { name: string; newTime: string };
  } | null>(null);

  // Estados para Bloqueio de Horário
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('Almoço / Intervalo');
  const [blockTime, setBlockTime] = useState('12:00');
  const [blockDuration, setBlockDuration] = useState('1h');
  const [blockProfessional, setBlockProfessional] = useState('Todos');

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    hapticSuccess();
    const dayNum = selectedDate.getDate().toString().padStart(2, '0');
    const monthNum = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const selectedDateStr = isSelectedDateToday ? 'Hoje' : `${dayNum}/${monthNum}`;
    const now = new Date();
    const formattedCreatedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newBlock: BookingAppointment = {
      protocolCode: `BLK-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: `🔒 ${blockReason}`,
      clientName: `🔒 ${blockReason}`,
      service: `Bloqueio: ${blockReason}`,
      serviceTitle: `Bloqueio: ${blockReason}`,
      duration: blockDuration,
      salonName: salonName || 'Meu Estabelecimento',
      dateTime: `${selectedDateStr}, ${blockTime}`,
      dayGroup: selectedDateStr,
      time: blockTime,
      totalPrice: 0,
      status: 'BLOQUEADO',
      isBlockedSlot: true,
      blockReason: blockReason,
      professional: blockProfessional,
      professionalName: blockProfessional,
      createdAt: formattedCreatedDate,
      dateIso: selectedDate.toISOString().split('T')[0],
    };

    const updated = [newBlock, ...appointments];
    onUpdateAppointments(updated);
    try {
      localStorage.setItem('vagou_salon_appointments', JSON.stringify(updated));
    } catch {}
    setIsBlockModalOpen(false);
  };

  const handleUnblockSlot = (protocolCode: string) => {
    hapticSuccess();
    const updated = appointments.filter((app) => app.protocolCode !== protocolCode);
    onUpdateAppointments(updated);
    try {
      localStorage.setItem('vagou_salon_appointments', JSON.stringify(updated));
    } catch {}
    setSelectedAppointment(null);
  };

  // Estados do Chat Interno no App
  const [activeChatAppointment, setActiveChatAppointment] = useState<BookingAppointment | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'professional' | 'client' | 'system'; text: string; timestamp: string }>>([]);
  const [inputChatMessage, setInputChatMessage] = useState('');

  const openChatForAppointment = (app: BookingAppointment) => {
    setActiveChatAppointment(app);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setChatMessages([
      {
        id: 'sys-1',
        sender: 'system',
        text: `Atendimento de "${app.service || app.serviceTitle || 'Serviço'}" em ${app.time || '14:00'}. Protocolo #${app.protocolCode || 'VG-001'}. Chat seguro do Vagou.`,
        timestamp: timeStr,
      },
      {
        id: 'client-1',
        sender: 'client',
        text: `Olá! Gostaria de confirmar detalhes sobre meu agendamento (#${app.protocolCode || 'VG-001'}).`,
        timestamp: timeStr,
      }
    ]);
  };

  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputChatMessage.trim()) return;
    hapticSuccess();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newMsg = {
      id: `prof-${Date.now()}`,
      sender: 'professional' as const,
      text: inputChatMessage.trim(),
      timestamp: timeStr,
    };
    setChatMessages(prev => [...prev, newMsg]);
    setInputChatMessage('');

    setTimeout(() => {
      const replyTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
      setChatMessages(prev => [
        ...prev,
        {
          id: `client-${Date.now()}`,
          sender: 'client',
          text: 'Perfeito! Obrigado pelas informações. Nos vemos no horário agendado!',
          timestamp: replyTime,
        }
      ]);
    }, 1100);
  };

  // Estados do Formulário de Novo Agendamento
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedService, setSelectedService] = useState(services[0]?.title || '');
  const [selectedTime, setSelectedTime] = useState(() => {
    try {
      const pendingTime = localStorage.getItem('vagou_pending_schedule_time');
      if (pendingTime) {
        localStorage.removeItem('vagou_pending_schedule_time');
        return pendingTime;
      }
    } catch {}
    return '14:00';
  });
  const [selectedDuration, setSelectedDuration] = useState('40 min');
  const [selectedPrice, setSelectedPrice] = useState(services[0]?.price?.toString() || '0');

  useEffect(() => {
    try {
      const pendingTime = localStorage.getItem('vagou_pending_schedule_time');
      const shouldOpen = localStorage.getItem('vagou_pending_open_schedule');
      if (pendingTime) {
        setSelectedTime(pendingTime);
        localStorage.removeItem('vagou_pending_schedule_time');
      }
      if (shouldOpen) {
        setIsNewModalOpen(true);
        localStorage.removeItem('vagou_pending_open_schedule');
      }
    } catch {}
  }, []);

  const isSelectedDateToday = useMemo(() => {
    const today = new Date();
    return isSameDay(selectedDate, today);
  }, [selectedDate]);

  // Dias com agendamentos marcados no mês para exibir indicador visual sutil
  const daysWithAppointments = useMemo(() => {
    const datesSet = new Set<string>();
    const now = new Date();
    const currentYear = calendarViewDate.getFullYear();
    const todayIso = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    appointments.forEach((app) => {
      if (app.status === 'CANCELADO') return;
      if (app.dateIso) {
        datesSet.add(app.dateIso);
        return;
      }
      const match = app.dateTime?.match(/(\d{2})\/(\d{2})/);
      if (match) {
        datesSet.add(`${currentYear}-${match[2]}-${match[1]}`);
      } else if (app.dayGroup === 'Hoje' || app.dateTime?.includes('Hoje')) {
        datesSet.add(todayIso);
      }
    });

    return datesSet;
  }, [appointments, calendarViewDate]);

  // Grid do Calendário do Mês (7 colunas)
  const monthGridDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const grid = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push({ date: null });
    }

    for (let d = 1; d <= totalDays; d++) {
      grid.push({ date: new Date(year, month, d) });
    }

    return grid;
  }, [calendarViewDate]);

  // Agendamentos pertencentes ao dia selecionado no calendário
  const selectedDayAppointments = useMemo(() => {
    const targetYear = selectedDate.getFullYear();
    const targetMonth = selectedDate.getMonth();
    const targetDay = selectedDate.getDate();

    const targetDayPad = targetDay.toString().padStart(2, '0');
    const targetMonthPad = (targetMonth + 1).toString().padStart(2, '0');
    const targetIso = `${targetYear}-${targetMonthPad}-${targetDayPad}`;
    const targetPtPattern = `${targetDayPad}/${targetMonthPad}`;

    return appointments.filter((app) => {
      if (app.dateIso) {
        return app.dateIso === targetIso;
      }
      if (app.dateTime && app.dateTime.includes(targetPtPattern)) {
        return true;
      }
      if (app.dayGroup && app.dayGroup.includes(targetPtPattern)) {
        return true;
      }
      if (isSameDay(selectedDate, new Date())) {
        if (app.dayGroup === 'Hoje' || (app.dateTime && app.dateTime.includes('Hoje'))) {
          return true;
        }
        if (!app.dateIso && !app.dateTime?.includes('/')) {
          return true;
        }
      }
      return false;
    });
  }, [appointments, selectedDate]);

  // Próximo agendamento ativo a ser atendido no dia selecionado
  const nextActiveAppointment = useMemo(() => {
    const inProgress = selectedDayAppointments.find(a => {
      const s = (a.status || '').toUpperCase().trim();
      return s.includes('ATEND') || s.includes('INICI');
    });
    if (inProgress) return inProgress;

    const upcoming = selectedDayAppointments
      .filter(a => {
        if (a.isBlockedSlot) return false;
        const s = (a.status || '').toUpperCase().trim();
        return s !== 'CANCELADO' && !s.includes('CONCLU') && !s.includes('FINALIZ');
      })
      .sort((a, b) => {
        const timeA = (a.time || '').padStart(5, '0');
        const timeB = (b.time || '').padStart(5, '0');
        return timeA.localeCompare(timeB);
      });

    return upcoming[0] || null;
  }, [selectedDayAppointments]);

  // Linha do tempo dinâmica inteligente: Atendimentos reais sequenciais + cálculo automático de intervalos vagos
  const timelineData = useMemo(() => {
    if (services.length === 0) {
      return { items: [], freeSlotsSummary: [], completedItems: [] };
    }
    // 1. Atendimentos concluídos (separados da visão ativa para não poluir "agora ou o futuro")
    const completedApps = selectedDayAppointments.filter(a => {
      const s = (a.status || '').toUpperCase().trim();
      return s === 'CONCLUIDO' || s === 'FINALIZADO';
    });

    const completedItems: DynamicTimelineItem[] = completedApps.map((app, idx) => {
      let timeStr = app.time ? app.time.trim() : '';
      if (!timeStr && app.dateTime) {
        const match = app.dateTime.match(/(\d{1,2}:\d{2})/);
        if (match) timeStr = match[1];
      }
      if (!timeStr) timeStr = '14:00';
      timeStr = timeStr.padStart(5, '0');

      const startMinutes = parseTimeToMinutes(timeStr);
      const durationMinutes = parseDurationToMinutes(app.duration);
      const endMinutes = startMinutes + durationMinutes;

      return {
        id: `completed-${app.protocolCode || idx}-${timeStr}`,
        type: 'APPOINTMENT' as const,
        startTime: timeStr,
        endTime: formatMinutesToTime(endMinutes),
        startMinutes,
        endMinutes,
        durationMinutes,
        appointment: app,
      };
    }).sort((a, b) => a.startMinutes - b.startMinutes);

    // 2. Atendimentos ativos (exclui CANCELADO e CONCLUIDO/FINALIZADO)
    const validApps = selectedDayAppointments
      .filter(a => {
        const s = (a.status || '').toUpperCase().trim();
        return s !== 'CANCELADO' && s !== 'CONCLUIDO' && s !== 'FINALIZADO';
      })
      .map(app => {
        let timeStr = app.time ? app.time.trim() : '';
        if (!timeStr && app.dateTime) {
          const match = app.dateTime.match(/(\d{1,2}:\d{2})/);
          if (match) timeStr = match[1];
        }
        if (!timeStr) timeStr = '14:00';
        timeStr = timeStr.padStart(5, '0');

        const startMinutes = parseTimeToMinutes(timeStr);
        const durationMinutes = parseDurationToMinutes(app.duration);
        const endMinutes = startMinutes + durationMinutes;
        const chairFreeMinutes = endMinutes + CHECKOUT_BUFFER_MINUTES;

        return {
          app,
          startTime: timeStr,
          startMinutes,
          durationMinutes,
          endMinutes,
          endTime: formatMinutesToTime(endMinutes),
          chairFreeMinutes,
          chairFreeTime: formatMinutesToTime(chairFreeMinutes),
        };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);

    const items: DynamicTimelineItem[] = [];
    const freeSlotsSummary: { time: string; durationText: string; durationMinutes: number }[] = [];

    // Cursor temporal ao longo do expediente (inicia às 08:00)
    let currentCursor = WORK_DAY_START_MINUTES;

    validApps.forEach((item, idx) => {
      // Verifica se existe lacuna livre antes deste agendamento
      if (item.startMinutes > currentCursor) {
        const gapMinutes = item.startMinutes - currentCursor;
        if (gapMinutes >= 15) {
          const slotStart = formatMinutesToTime(currentCursor);
          const slotEnd = formatMinutesToTime(item.startMinutes);
          const durText = formatDurationDisplay(gapMinutes);
          
          items.push({
            id: `free-before-${idx}-${slotStart}`,
            type: 'FREE_SLOT',
            startTime: slotStart,
            endTime: slotEnd,
            startMinutes: currentCursor,
            endMinutes: item.startMinutes,
            durationMinutes: gapMinutes,
            freeSlotDurationText: durText,
          });

          freeSlotsSummary.push({
            time: slotStart,
            durationText: durText,
            durationMinutes: gapMinutes,
          });
        }
      }

      // Adiciona o atendimento real (exatamente 1 card, sem duplicidade!)
      items.push({
        id: `app-${item.app.protocolCode || idx}-${item.startTime}`,
        type: 'APPOINTMENT',
        startTime: item.startTime,
        endTime: item.endTime,
        startMinutes: item.startMinutes,
        endMinutes: item.endMinutes,
        durationMinutes: item.durationMinutes,
        appointment: item.app,
        chairFreeTime: item.chairFreeTime,
        chairFreeMinutes: item.chairFreeMinutes,
        bufferMinutes: CHECKOUT_BUFFER_MINUTES,
      });

      // Atualiza o cursor para quando a cadeira for liberada (após o buffer de 15 min de higienização/caixa)
      currentCursor = Math.max(currentCursor, item.chairFreeMinutes);
    });

    // Lacuna livre restante até o fim do expediente (20:00)
    if (currentCursor < WORK_DAY_END_MINUTES) {
      const remainingMinutes = WORK_DAY_END_MINUTES - currentCursor;
      if (remainingMinutes >= 15) {
        const slotStart = formatMinutesToTime(currentCursor);
        const slotEnd = formatMinutesToTime(WORK_DAY_END_MINUTES);
        const durText = formatDurationDisplay(remainingMinutes);

        items.push({
          id: `free-end-${slotStart}`,
          type: 'FREE_SLOT',
          startTime: slotStart,
          endTime: slotEnd,
          startMinutes: currentCursor,
          endMinutes: WORK_DAY_END_MINUTES,
          durationMinutes: remainingMinutes,
          freeSlotDurationText: durText,
        });

        freeSlotsSummary.push({
          time: slotStart,
          durationText: durText,
          durationMinutes: remainingMinutes,
        });
      }
    }

    const confirmedApps = validApps.filter(item => {
      if (item.app.isBlockedSlot || (item.app.status || '').toUpperCase() === 'BLOQUEADO') return false;
      const cat = getStatusCategory(item.app.status, item.app.swapRequest);
      return cat.key === 'confirmados';
    });

    return {
      items,
      completedItems,
      freeSlotsSummary,
      totalAppointments: validApps.length,
      totalConfirmed: confirmedApps.length,
      totalFreeSlots: freeSlotsSummary.length,
      totalCompleted: completedApps.length,
    };
  }, [selectedDayAppointments]);

  // Itens da timeline visíveis de acordo com o filtro (Todos / Confirmados / Livres / Concluídos)
  const visibleTimelineItems = useMemo(() => {
    if (slotFilter === 'confirmados') {
      return timelineData.items.filter(item => {
        if (item.type !== 'APPOINTMENT' || !item.appointment) return false;
        const app = item.appointment;
        if (app.isBlockedSlot || (app.status || '').toUpperCase() === 'BLOQUEADO') return false;
        const cat = getStatusCategory(app.status, app.swapRequest);
        return cat.key === 'confirmados';
      });
    }
    if (slotFilter === 'livres') {
      return timelineData.items.filter(item => item.type === 'FREE_SLOT');
    }
    if (slotFilter === 'concluidos') {
      return timelineData.completedItems;
    }
    return timelineData.items;
  }, [timelineData, slotFilter]);

  const isCurrentMonthOrFuture = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const viewMonthStart = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    return viewMonthStart.getTime() > currentMonthStart.getTime();
  }, [calendarViewDate]);

  const handlePrevMonth = () => {
    if (!isCurrentMonthOrFuture) return;
    hapticLight();
    const prev = new Date(calendarViewDate);
    prev.setMonth(prev.getMonth() - 1);
    setCalendarViewDate(prev);
  };

  const handleNextMonth = () => {
    hapticLight();
    const next = new Date(calendarViewDate);
    next.setMonth(next.getMonth() + 1);
    setCalendarViewDate(next);
  };

  const handleGoToToday = () => {
    hapticLight();
    const today = new Date();
    setSelectedDate(today);
    setCalendarViewDate(today);
  };

  const handleStatusChange = (protocolCode: string, newStatus: string) => {
    hapticSuccess();
    const updated = appointments.map((app) => {
      if (app.protocolCode === protocolCode) {
        return { ...app, status: newStatus };
      }
      return app;
    });
    onUpdateAppointments(updated);
    
    if (selectedAppointment && selectedAppointment.protocolCode === protocolCode) {
      setSelectedAppointment({ ...selectedAppointment, status: newStatus });
    }
  };

  const handleConfirmSwapRequest = (app: BookingAppointment) => {
    hapticSuccess();
    const swap = app.swapRequest;
    if (!swap || !swap.clientA || !swap.clientB) {
      handleStatusChange(app.protocolCode, 'CONFIRMADO');
      return;
    }

    const clientAName = swap.clientA.name;
    const clientBName = swap.clientB.name;
    const clientANewTime = swap.clientA.requestedTime || '15:00';
    const clientBNewTime = swap.clientA.originalTime || '14:00';

    // Update appointment with new swapped time and confirmed status
    const updated = appointments.map((item) => {
      if (item.protocolCode === app.protocolCode) {
        const updatedTime = clientANewTime;
        const updatedDateTime = item.dateTime ? item.dateTime.replace(/\d{1,2}:\d{2}/, updatedTime) : `Hoje, ${updatedTime}`;
        return {
          ...item,
          time: updatedTime,
          dateTime: updatedDateTime,
          status: 'CONFIRMADO',
          swapRequest: {
            ...swap,
            status: 'completed' as const,
          },
        };
      }
      // Se houver outro agendamento correspondente ao Cliente B no mesmo dia
      if (item.customerName?.toLowerCase() === clientBName.toLowerCase() || item.clientName?.toLowerCase() === clientBName.toLowerCase()) {
        const updatedTimeB = clientBNewTime;
        const updatedDateTimeB = item.dateTime ? item.dateTime.replace(/\d{1,2}:\d{2}/, updatedTimeB) : `Hoje, ${updatedTimeB}`;
        return {
          ...item,
          time: updatedTimeB,
          dateTime: updatedDateTimeB,
          status: 'CONFIRMADO',
        };
      }
      return item;
    });

    onUpdateAppointments(updated);
    try {
      localStorage.setItem('vagou_salon_appointments', JSON.stringify(updated));
    } catch {}

    // Fecha o modal de detalhes do agendamento e abre o modal de confirmação de troca
    setSelectedAppointment(null);
    setSwapConfirmedModalData({
      clientA: { name: clientAName, newTime: clientANewTime },
      clientB: { name: clientBName, newTime: clientBNewTime },
    });
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    hapticSuccess();
    const now = new Date();
    const formattedCreatedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const dayNum = selectedDate.getDate().toString().padStart(2, '0');
    const monthNum = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const selectedDateStr = isSelectedDateToday ? 'Hoje' : `${dayNum}/${monthNum}`;

    const newApp: BookingAppointment = {
      protocolCode: `VG-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: clientName.trim(),
      clientName: clientName.trim(),
      customerPhone: clientPhone.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      service: selectedService,
      serviceTitle: selectedService,
      duration: selectedDuration,
      salonName: salonName || 'Meu Estabelecimento',
      dateTime: `${selectedDateStr}, ${selectedTime}`,
      dayGroup: selectedDateStr,
      time: selectedTime,
      totalPrice: parseFloat(selectedPrice) || 0,
      status: 'CONFIRMADO',
      createdAt: formattedCreatedDate,
      dateIso: selectedDate.toISOString().split('T')[0],
    };

    onUpdateAppointments([newApp, ...appointments]);
    setIsNewModalOpen(false);
    setClientName('');
    setClientPhone('');
  };

  return (
    <div className={`w-full h-full flex flex-col justify-between overflow-hidden ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Cabeçalho da Seção: Título Sintético */}
      <div className={`p-3 border-b shrink-0 flex items-center justify-between gap-2 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <h2 className="text-xs font-bold font-['Poppins'] truncate">Agenda de Atendimentos</h2>
          </div>
        </div>
      </div>

      {/* 1. SEÇÃO FIXA NO TOPO: Calendário Mensal com Seleção do Dia do Mês */}
      <div className={`border-b shrink-0 px-3 py-2.5 ${
        isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
      }`}>
        {/* Barra do Mês: Navegação com Mês / Ano */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={!isCurrentMonthOrFuture}
              title={!isCurrentMonthOrFuture ? 'Meses anteriores indisponíveis' : 'Mês anterior'}
              className={`p-1 rounded-[4px] border transition ${
                !isCurrentMonthOrFuture
                  ? 'opacity-20 cursor-not-allowed border-transparent text-slate-600'
                  : isDark
                  ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-white'
                  : 'border-slate-200 bg-slate-100 hover:bg-slate-200 cursor-pointer text-slate-400 hover:text-slate-900'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-bold font-['Poppins'] uppercase tracking-wider text-emerald-400 select-none">
              {MONTH_NAMES[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-1 rounded-[4px] border transition cursor-pointer text-slate-400 hover:text-white ${
                isDark ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800' : 'border-slate-200 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setIsCalendarCollapsed(!isCalendarCollapsed);
              }}
              className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
                isCalendarCollapsed
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-400'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{isCalendarCollapsed ? 'Expandir Dias' : 'Recolher Dias'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCalendarCollapsed ? '-rotate-90 text-emerald-400' : 'rotate-0 text-slate-400'}`} />
            </button>
          </div>
        </div>

        {/* Grade do Calendário Mensal */}
        {!isCalendarCollapsed && (
          <div>
            {/* Cabeçalho dos Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 uppercase mb-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName) => (
                <div key={dayName} className="py-0.5">{dayName}</div>
              ))}
            </div>

            {/* Grid dos Dias do Mês (7 colunas) */}
            <div className="grid grid-cols-7 gap-1">
              {monthGridDays.map((gridItem, idx) => {
                if (!gridItem.date) {
                  return <div key={`empty-${idx}`} className="h-7" />;
                }

                const isPast = isBeforeToday(gridItem.date);
                const isSel = !isPast && isSameDay(gridItem.date, selectedDate);
                const isTod = isSameDay(gridItem.date, new Date());
                const dateIsoStr = `${gridItem.date.getFullYear()}-${(gridItem.date.getMonth() + 1).toString().padStart(2, '0')}-${gridItem.date.getDate().toString().padStart(2, '0')}`;
                const hasAppointments = !isPast && daysWithAppointments.has(dateIsoStr);

                return (
                  <button
                    key={gridItem.date.toISOString()}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      if (isPast) return;
                      hapticLight();
                      setSelectedDate(gridItem.date!);
                    }}
                    className={`h-7 sm:h-8 rounded-[4px] text-xs font-bold transition flex flex-col items-center justify-center relative select-none ${
                      isPast
                        ? isDark
                          ? 'opacity-25 cursor-not-allowed bg-slate-950/20 text-slate-600 border border-transparent'
                          : 'opacity-30 cursor-not-allowed bg-slate-100/50 text-slate-400 border border-transparent'
                        : isSel
                        ? 'bg-emerald-500 text-white font-black shadow-xs cursor-pointer'
                        : isTod
                        ? 'border border-emerald-500/80 text-emerald-400 font-bold bg-emerald-500/10 cursor-pointer hover:bg-emerald-500/20'
                        : isDark
                        ? 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 cursor-pointer'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer'
                    }`}
                  >
                    <span className={isPast ? 'text-slate-600' : ''}>{gridItem.date.getDate()}</span>
                    {hasAppointments && (
                      <span className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                        isSel ? 'bg-white' : 'bg-emerald-400'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. BARRA DE RESUMO DO DIA SELECIONADO & FILTROS DE HORÁRIO */}
      <div className={`border-b shrink-0 ${
        isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Linha da Data Ativa (Sempre visível em alto contraste) */}
        <div className={`px-3 py-1.5 flex items-center justify-between gap-2 border-b ${
          isDark ? 'border-slate-800/60 bg-slate-900/40' : 'border-slate-200/70 bg-white'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className={`text-xs font-bold font-['Poppins'] truncate ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {formatSelectedDateHeading(selectedDate)}
            </span>
          </div>

          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-[3px] shrink-0 ${
            isDark ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {timelineData.items.length} {timelineData.items.length === 1 ? 'horário' : 'horários'}
          </span>
        </div>

        {/* Chips de Filtro: Todos / Confirmados / Livres / Concluídos */}
        <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'todos', label: 'Todos', count: timelineData.items.length },
            { id: 'confirmados', label: 'Confirmados', count: timelineData.totalConfirmed },
            { id: 'livres', label: 'Livres', count: timelineData.totalFreeSlots },
            { id: 'concluidos', label: 'Concluídos', count: timelineData.totalCompleted },
          ].map((tab) => {
            const isTabActive = slotFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  setSlotFilter(tab.id as 'todos' | 'confirmados' | 'livres' | 'concluidos');
                }}
                className={`px-2.5 py-1 rounded-[4px] text-[10px] sm:text-[11px] font-bold border transition cursor-pointer whitespace-nowrap shrink-0 active:scale-98 ${
                  isTabActive
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. AGENDA DINÂMICA DE HORÁRIOS */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {/* Barra de Ferramentas: Alternador Grid de Horas / Lista */}
        <div className="flex items-center justify-end mb-2 px-0.5">
          {/* Toggle Grid de Horas (Minicards Poupatempo/Clínica) vs Lista */}
          <div className={`flex items-center border rounded-[4px] p-0.5 shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setViewMode('grid');
              }}
              title="Grid de Horas (Minicards estilo Poupatempo)"
              className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition ${
                viewMode === 'grid'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setViewMode('lista');
              }}
              title="Lista Detalhada de Horários"
              className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition ${
                viewMode === 'lista'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3 h-3" />
              <span>Lista</span>
            </button>
          </div>
        </div>

        {/* Conteúdo: Grid de Horas ou Lista */}
        {services.length === 0 ? (
          <div className={`p-8 rounded-[4px] border text-center my-4 ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <Clock className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Não há serviço ainda cadastrado</p>
            <p className="text-[10px] mt-1 text-slate-400 max-w-sm mx-auto">
              Para habilitar a agenda e os agendamentos de clientes, você precisa cadastrar pelo menos 1 serviço na seção 'Serviços'.
            </p>
          </div>
        ) : visibleTimelineItems.length === 0 ? (
          <div className={`p-8 rounded-[4px] border text-center my-4 ${
            isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Nenhum horário neste filtro</p>
            <p className="text-[10px] mt-0.5 text-slate-400">
              {slotFilter === 'confirmados'
                ? 'Nenhum agendamento confirmado para este dia.'
                : slotFilter === 'livres' 
                ? 'Todos os horários estão ocupados para esta data!' 
                : slotFilter === 'concluidos'
                ? 'Nenhum atendimento concluído encontrado para este dia.'
                : 'Nenhum agendamento ou horário encontrado para este dia.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ======================================================== */
          /* MODO GRID: 3 COLUNAS COM AJUSTE PRECISO DE ELEMENTOS     */
          /* ======================================================== */
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {visibleTimelineItems.map((item) => {
              // 1. Vaga Livre no Grid
              if (item.type === 'FREE_SLOT') {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setSelectedTime(item.startTime);
                      setIsNewModalOpen(true);
                    }}
                    className={`p-1.5 sm:p-2.5 rounded-[4px] border border-dashed transition flex flex-col justify-between items-start text-left cursor-pointer select-none active:scale-[0.97] min-h-[56px] sm:min-h-[62px] ${
                      isDark
                        ? 'bg-slate-900/40 border-emerald-500 hover:border-emerald-400 hover:bg-emerald-950/20'
                        : 'bg-emerald-50/40 border-emerald-500 hover:border-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full min-w-0">
                      <span className="font-mono text-xs sm:text-sm font-black text-emerald-400 tracking-tight leading-none shrink-0">
                        {item.startTime}
                      </span>
                      <span className="text-[6.5px] sm:text-[7.5px] font-black uppercase px-1 sm:px-1.5 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 whitespace-nowrap">
                        Livre
                      </span>
                    </div>
                    <div className="mt-1.5 w-full">
                      <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-400 truncate">
                        Disponível
                      </p>
                    </div>
                  </button>
                );
              }

              // 2. Atendimento no Grid
              const app = item.appointment!;
              const catInfo = getStatusCategory(app.status, app.swapRequest);
              const clientName = app.customerName || app.clientName || 'Cliente';
              const isBlocked = app.isBlockedSlot || app.status === 'BLOQUEADO';

              if (isBlocked) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setSelectedAppointment(app);
                    }}
                    className={`p-1.5 sm:p-2.5 rounded-[4px] border transition flex flex-col justify-between items-start text-left cursor-pointer select-none active:scale-[0.97] min-h-[56px] sm:min-h-[62px] ${
                      isDark
                        ? 'bg-amber-950/20 border-amber-500 hover:border-amber-400'
                        : 'bg-amber-50 border-amber-500 hover:border-amber-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full min-w-0">
                      <span className="font-mono text-xs sm:text-sm font-black text-amber-300 tracking-tight leading-none shrink-0">
                        {item.startTime}
                      </span>
                      <span className="text-[6.5px] sm:text-[7.5px] font-black uppercase px-1 sm:px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 whitespace-nowrap">
                        Trava
                      </span>
                    </div>
                    <div className="mt-1.5 w-full">
                      <p className="text-[10px] sm:text-[11px] font-semibold text-amber-400 truncate">
                        {app.blockReason || 'Bloqueado'}
                      </p>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setSelectedAppointment(app);
                  }}
                  className={`p-1.5 sm:p-2.5 rounded-[4px] border transition flex flex-col justify-between items-start text-left cursor-pointer select-none active:scale-[0.97] min-h-[56px] sm:min-h-[62px] shadow-2xs ${
                    isDark
                      ? `bg-slate-900 ${catInfo.cardBorderDark}`
                      : `bg-white ${catInfo.cardBorderLight}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <span className={`font-mono text-xs sm:text-sm font-black tracking-tight leading-none shrink-0 ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {item.startTime}
                    </span>
                    <span 
                      className={`text-[6.5px] sm:text-[7.5px] font-black uppercase px-1 sm:px-1.5 py-0.5 rounded-[2px] shrink-0 whitespace-nowrap ${
                        catInfo.key === 'confirmados'
                          ? 'bg-emerald-600 text-white'
                          : catInfo.badgeFullClass
                      }`}
                      title={catInfo.label}
                    >
                      <span className="inline sm:hidden">{catInfo.gridLabel}</span>
                      <span className="hidden sm:inline">{catInfo.shortLabel}</span>
                    </span>
                  </div>

                  <div className="mt-1.5 w-full">
                    <p className={`text-[10px] sm:text-[11px] font-semibold truncate ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      {app.is_dependent && app.dependent_name ? (
                        <span className="inline-flex items-center gap-1">
                          <Baby className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                          <span>{app.dependent_name}</span>
                        </span>
                      ) : (
                        clientName
                      )}
                    </p>
                    {app.is_dependent && app.dependent_name && (
                      <p className="text-[8px] text-slate-400 truncate">
                        Dep. de {clientName}
                      </p>
                    )}
                    {/* Selo Compacto bol-020 no Grid */}
                    {(app.tracking_status === 'live_sharing' || app.tracking_status === 'arriving_5min') && (
                      <div className="mt-1 px-1 py-0.5 rounded-[2px] bg-emerald-500 text-white text-[7.5px] font-mono tabular-nums font-black truncate flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5 text-white shrink-0" />
                        <span className="text-white truncate">
                          {app.tracking_status === 'arriving_5min'
                            ? `Chega 5m!`
                            : `${app.current_street_name || 'Rota'} • ${app.eta_minutes ?? 12}m`}
                        </span>
                      </div>
                    )}
                    {app.tracking_status === 'on_way_no_map' && (
                      <div className="mt-1 text-[8px] font-bold text-emerald-400 truncate">
                        A caminho
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* ======================================================== */
          /* MODO LISTA: LINHA DO TEMPO SEQUENCIAL SEM REDUNDÂNCIA    */
          /* ======================================================== */
          <div className="space-y-2">
            {visibleTimelineItems.map((item) => {
              if (item.type === 'FREE_SLOT') {
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      hapticLight();
                      setSelectedTime(item.startTime);
                      setIsNewModalOpen(true);
                    }}
                    className={`p-2.5 rounded-[4px] border border-dashed transition cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                      isDark
                        ? 'bg-emerald-950/10 border-emerald-500 hover:border-emerald-400 hover:bg-emerald-950/20'
                        : 'bg-emerald-50/50 border-emerald-500 hover:border-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-sm sm:text-base font-black px-2 py-0.5 rounded-[3px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        {item.startTime}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                        Vaga Disponível
                      </span>
                    </div>

                    <span className="text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shrink-0">
                      Livre
                    </span>
                  </div>
                );
              }

              const app = item.appointment!;
              const catInfo = getStatusCategory(app.status, app.swapRequest);
              const clientName = app.customerName || app.clientName || 'Cliente';
              const isBlocked = app.isBlockedSlot || app.status === 'BLOQUEADO';

              if (isBlocked) {
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      hapticLight();
                      setSelectedAppointment(app);
                    }}
                    className={`p-2.5 rounded-[4px] border transition cursor-pointer select-none active:scale-[0.99] flex items-center justify-between gap-2.5 ${
                      isDark
                        ? 'bg-amber-950/20 border-amber-500 hover:border-amber-400'
                        : 'bg-amber-50/80 border-amber-500 hover:border-amber-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-sm sm:text-base font-black px-2 py-0.5 rounded-[3px] bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                        {item.startTime}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-amber-300 truncate">
                        {app.blockReason || 'Horário Bloqueado'}
                      </span>
                    </div>

                    <span className="text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border border-amber-500/40 bg-amber-500/20 text-amber-300 shrink-0">
                      Trava
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    hapticLight();
                    setSelectedAppointment(app);
                  }}
                  className={`p-2.5 rounded-[4px] border transition cursor-pointer select-none active:scale-[0.99] flex items-center justify-between gap-2.5 shadow-2xs ${
                    isDark
                      ? `bg-slate-900 ${catInfo.cardBorderDark}`
                      : `bg-white ${catInfo.cardBorderLight}`
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm sm:text-base font-black px-2 py-0.5 rounded-[3px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      {item.startTime}
                    </span>
                    <div className="min-w-0 truncate">
                      <h4 className={`text-xs sm:text-sm font-bold truncate flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {app.is_dependent && app.dependent_name ? (
                          <>
                            <span className="truncate">{app.dependent_name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5 shrink-0">
                              <Baby className="w-2.5 h-2.5" />
                              <span>Dep</span>
                            </span>
                          </>
                        ) : (
                          clientName
                        )}
                      </h4>
                      {app.is_dependent && app.dependent_name && (
                        <p className="text-[10px] text-slate-400 truncate">
                          Resp: {clientName}
                        </p>
                      )}
                      {/* Pílula Dinâmica de Deslocamento Ao Vivo na Lista (bol-020) */}
                      {(app.tracking_status === 'live_sharing' || app.tracking_status === 'arriving_5min') && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500 text-white text-[9.5px] font-mono tabular-nums font-black flex items-center gap-1 whitespace-nowrap">
                            <Navigation className="w-2.5 h-2.5 text-white shrink-0" />
                            <span className="text-white">
                              {app.tracking_status === 'arriving_5min'
                                ? `Chegando em ${app.eta_minutes ?? 4} min — Prepare a cadeira!`
                                : `A caminho • ${app.current_street_name || 'Av. Rebouças'} (ETA ${app.eta_minutes ?? 12}m)`}
                            </span>
                          </span>
                          {app.active_adversity && (
                            <span className="px-1.5 py-0.5 rounded-[3px] bg-amber-500/20 text-amber-300 text-[9.5px] font-mono tabular-nums font-bold flex items-center gap-1 whitespace-nowrap">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <span>+{app.active_adversity.addedMinutes}m ({app.active_adversity.label})</span>
                            </span>
                          )}
                        </div>
                      )}
                      {app.tracking_status === 'on_way_no_map' && (
                        <p className="text-[10px] font-bold text-emerald-400 mt-0.5">
                          Cliente a caminho (sem mapa compartilhado)
                        </p>
                      )}
                      {app.cancellation_reason && app.status === 'CANCELADO' && (
                        <p className="text-[10px] text-rose-400 mt-0.5 truncate">
                          Motivo: {app.cancellation_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(app.tracking_status === 'live_sharing' || app.tracking_status === 'arriving_5min') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticLight();
                          setLiveTrackingViewerState({ appointment: app, initialTab: 'timeline' });
                        }}
                        className="px-2 py-1 rounded-[3px] bg-emerald-500 hover:bg-emerald-600 text-white text-[9.5px] font-black uppercase flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        title="Abrir Gaveta de Rastreamento Ao Vivo (Linha Shopee ⇄ Mapa 10s)"
                      >
                        <Package className="w-3 h-3 text-white shrink-0" />
                        <span className="text-white">Rastrear 10s</span>
                      </button>
                    )}
                    <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border whitespace-nowrap shrink-0 ${
                      catInfo.key === 'confirmados'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : catInfo.badgeFullClass
                    }`}>
                      {catInfo.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MODAL: Detalhes Completos do Serviço e Atendimento */}
      {selectedAppointment && (() => {
        const statusClean = (selectedAppointment.status || '').toUpperCase().trim();
        const isConcluded = statusClean === 'CONCLUIDO' || statusClean === 'CONCLUÍDO' || statusClean === 'FINALIZADO' || getStatusCategory(selectedAppointment.status).key === 'concluidos';
        const cat = getStatusCategory(selectedAppointment.status);

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-xs animate-in fade-in"
            onClick={() => setSelectedAppointment(null)}
          >
            <div 
              className={`w-full max-w-md rounded-[4px] overflow-hidden shadow-2xl border flex flex-col max-h-[90vh] ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Topo do Modal */}
              <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
                isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  {isConcluded ? (
                    <span className="px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider border bg-blue-500/15 border-blue-500/30 text-blue-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      <span>Concluído</span>
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider border ${cat.badgeFullClass}`}>
                      {cat.shortLabel}
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-slate-400">
                    #{selectedAppointment.protocolCode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  className="p-1.5 rounded-[4px] text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conteúdo Rolável do Modal */}
              <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
                {/* Bloco no Topo: Dados do Cliente (sem botões de mensagem no app e ligar) */}
                <div className={`p-3 rounded-[4px] border space-y-1.5 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                      {isConcluded ? 'Cliente Atendido' : 'Cliente'}
                    </span>
                    {selectedAppointment.is_dependent && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Baby className="w-3 h-3 text-cyan-400" />
                        <span>Perfil Familiar / Dependente</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-black shrink-0">
                        {selectedAppointment.is_dependent && selectedAppointment.dependent_name
                          ? selectedAppointment.dependent_name[0].toUpperCase()
                          : (selectedAppointment.customerName || selectedAppointment.clientName || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {selectedAppointment.is_dependent && selectedAppointment.dependent_name
                            ? selectedAppointment.dependent_name
                            : (selectedAppointment.customerName || selectedAppointment.clientName || 'Cliente sem nome')}
                        </p>
                        {selectedAppointment.is_dependent && (
                          <p className="text-[10px] text-slate-400 truncate">
                            Responsável: {selectedAppointment.customerName || selectedAppointment.clientName || 'Titular'}
                          </p>
                        )}
                        <p className="text-[10.5px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{selectedAppointment.customerPhone || selectedAppointment.clientPhone || '(41) 99123-4567'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner no Passado para Serviço Concluído */}
                {isConcluded && (
                  <div className={`p-2.5 rounded-[4px] border text-xs flex items-center justify-between gap-2 ${
                    isDark ? 'bg-blue-950/25 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
                      <div>
                        <p className="font-bold text-xs">Atendimento Finalizado</p>
                        <p className="text-[10px] text-blue-300/80">Serviço prestado e registrado no histórico.</p>
                      </div>
                    </div>
                    {selectedAppointment.isPaid ? (
                      <span className="px-2 py-0.5 rounded-[3px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[9px] uppercase tracking-wider shrink-0">
                        {selectedAppointment.paymentMethod ? `Pago (${selectedAppointment.paymentMethod})` : 'Pago'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-[3px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-[9px] uppercase tracking-wider shrink-0">
                        Concluído
                      </span>
                    )}
                  </div>
                )}

                {/* Banner para Atendimento em Andamento */}
                {!isConcluded && ((selectedAppointment.status || '').toUpperCase().includes('ATEND') || (selectedAppointment.status || '').toUpperCase().includes('INICI')) && (
                  <div className={`p-2.5 rounded-[4px] border text-xs flex items-center justify-between gap-2 ${
                    isDark ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 shrink-0 text-emerald-400 fill-emerald-400 animate-pulse" />
                      <div>
                        <p className="font-bold text-xs">Atendimento Iniciado</p>
                        <p className="text-[10px] text-emerald-300/80">Serviço em andamento no salão.</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-[3px] bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider shrink-0">
                      Ao Vivo
                    </span>
                  </div>
                )}

                {/* Indicador de Próximo a ser Atendido */}
                {!isConcluded && nextActiveAppointment && nextActiveAppointment.protocolCode === selectedAppointment.protocolCode && !((selectedAppointment.status || '').toUpperCase().includes('ATEND')) && (
                  <div className={`p-2 rounded-[4px] border text-xs flex items-center justify-between gap-2 ${
                    isDark ? 'bg-slate-900/90 border-emerald-500/40 text-slate-200' : 'bg-emerald-50/70 border-emerald-300 text-slate-800'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-[11px] text-emerald-400">Próximo Cliente da Fila</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {selectedAppointment.time || '10:00'}
                    </span>
                  </div>
                )}

                {/* PAINEL BOL-020: RADAR BIDIRECIONAL DE DESLOCAMENTO AO VIVO (MAPA 10S ⇄ LINHA SHOPEE) */}
                {!isConcluded && !(selectedAppointment.isBlockedSlot || selectedAppointment.status === 'BLOQUEADO') && (
                  <div className={`p-3 rounded-[4px] space-y-2.5 ${
                    isDark ? 'bg-slate-900' : 'bg-slate-100'
                  }`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Radar de Deslocamento Ao Vivo (10s)</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          const nextLoc = selectedAppointment.service_location_type === 'home_delivery' ? 'in_salon' : 'home_delivery';
                          syncAppointmentAcrossStorageAndDb(
                            selectedAppointment,
                            { service_location_type: nextLoc },
                            handleSingleLiveAppointmentUpdate
                          );
                        }}
                        className="px-2 py-0.5 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9.5px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Home className="w-3 h-3 text-emerald-400" />
                        <span>
                          {selectedAppointment.service_location_type === 'home_delivery'
                            ? 'Atendimento Delivery'
                            : 'Atendimento no Salão'}
                        </span>
                      </button>
                    </div>

                    {/* Alerta de Chegada em 5 Minutos */}
                    {(selectedAppointment.tracking_status === 'arriving_5min' ||
                      ((selectedAppointment.eta_minutes ?? 99) <= 5 && (selectedAppointment.eta_minutes ?? 0) > 0)) && (
                      <div className="p-2.5 rounded-[4px] bg-emerald-500 text-white flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-black text-white">
                          <Bell className="w-4 h-4 text-white shrink-0 animate-bounce" />
                          <span className="text-white">
                            Chegando em {selectedAppointment.eta_minutes ?? 4} min — Prepare a cadeira!
                          </span>
                        </span>
                        <span className="text-[10px] font-mono tabular-nums font-black text-white">
                          {formatCurrentClockTime(selectedAppointment.eta_minutes ?? 4)}
                        </span>
                      </div>
                    )}

                    {/* Status atual da rota */}
                    {(selectedAppointment.tracking_status === 'live_sharing' ||
                      selectedAppointment.tracking_status === 'arriving_5min') ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-semibold">
                            Rua atual: <strong className="text-white">{selectedAppointment.current_street_name || 'Av. Rebouças'}</strong>
                          </span>
                          <span className="font-mono tabular-nums font-bold text-emerald-400">
                            ETA {selectedAppointment.eta_minutes ?? 12} min ({selectedAppointment.distance_km ?? 2.4} km)
                          </span>
                        </div>
                        {selectedAppointment.active_adversity && (
                          <div className="p-2 rounded-[4px] bg-amber-500/15 text-amber-300 text-[10.5px] flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>
                                {selectedAppointment.active_adversity.label} na {selectedAppointment.active_adversity.street}
                              </span>
                            </span>
                            <span className="font-mono tabular-nums font-black text-amber-400">
                              +{selectedAppointment.active_adversity.addedMinutes} min
                            </span>
                          </div>
                        )}
                      </div>
                    ) : selectedAppointment.tracking_status === 'on_way_no_map' ? (
                      <p className="text-[11px] text-emerald-400 font-semibold">
                        Cliente confirmou partida (deslocamento sem compartilhamento de mapa).
                      </p>
                    ) : selectedAppointment.tracking_status === 'hurry_confirmed' ? (
                      <p className="text-[11px] text-amber-300 font-semibold">
                        Cliente confirmou que vai comparecer e sairá em instantes.
                      </p>
                    ) : selectedAppointment.cancellation_reason ? (
                      <p className="text-[11px] text-rose-400 font-semibold">
                        Cancelado pelo cliente • Motivo: {selectedAppointment.cancellation_reason}
                      </p>
                    ) : (
                      <p className="text-[10.5px] text-slate-400">
                        Aguardando início do deslocamento (Alerta automático em ETA + 10 min).
                      </p>
                    )}

                    {/* Botões de 1 Toque: Linha de Ruas Shopee ⇄ Mapa 10s + Modo Delivery */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setLiveTrackingViewerState({
                            appointment: selectedAppointment,
                            initialTab: 'timeline',
                          });
                        }}
                        className="py-2 px-2.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98 whitespace-nowrap"
                      >
                        <Package className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="text-white">Ver Linha Ruas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setLiveTrackingViewerState({
                            appointment: selectedAppointment,
                            initialTab: 'map',
                          });
                        }}
                        className="py-2 px-2.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98 whitespace-nowrap"
                      >
                        <MapIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Ver Mapa 10s</span>
                      </button>
                    </div>

                    {selectedAppointment.service_location_type === 'home_delivery' && (
                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setProDeliveryDepartureApt(selectedAppointment);
                        }}
                        className="w-full py-2 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98 whitespace-nowrap"
                      >
                        <Navigation className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="text-white">
                          Iniciar Deslocamento até o Cliente (Traçar Rota)
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Contexto especial para Solicitação de Troca entre Clientes */}
                {!isConcluded && selectedAppointment.swapRequest && selectedAppointment.swapRequest.isClientSwap && (
                  <div className="p-3 rounded-[4px] bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <RefreshCw className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Proposta de Troca de Horário</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-[3px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Entre Clientes
                      </span>
                    </div>

                    {/* Informação visual dos dois clientes e a troca */}
                    <div className="p-2.5 rounded-[4px] bg-slate-900/90 border border-slate-800 space-y-2">
                      {/* Linha da Troca com Horários */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        {/* Cliente A */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                            <span>Cliente Solicitante</span>
                          </div>
                          <p className="font-bold text-white truncate text-xs mt-0.5">
                            {selectedAppointment.swapRequest.clientA.name}
                          </p>
                          <p className="text-[11px] font-mono font-bold text-amber-400">
                            {selectedAppointment.swapRequest.clientA.originalTime}
                          </p>
                        </div>

                        {/* Ícone de Troca */}
                        <div className="flex flex-col items-center justify-center shrink-0 px-1">
                          <ArrowRight className="w-4 h-4 text-emerald-400" />
                        </div>

                        {/* Cliente B com Ícone de Aceito */}
                        <div className="flex-1 min-w-0 text-right">
                          <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-400 uppercase font-bold">
                            {selectedAppointment.swapRequest.clientB.accepted && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            )}
                            <span>Aceitou Ajudar</span>
                          </div>
                          <p className="font-bold text-white truncate text-xs mt-0.5">
                            {selectedAppointment.swapRequest.clientB.name}
                          </p>
                          <p className="text-[11px] font-mono font-bold text-emerald-400">
                            {selectedAppointment.swapRequest.clientB.originalTime}
                          </p>
                        </div>
                      </div>

                      {/* Resumo Direto da Troca */}
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-center gap-1 text-center">
                        <span className="text-white font-bold">{selectedAppointment.swapRequest.clientA.name}</span>
                        <span className="text-slate-400">({selectedAppointment.swapRequest.clientA.originalTime})</span>
                        <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 inline mx-0.5" />
                        <span className="text-white font-bold">{selectedAppointment.swapRequest.clientB.name}</span>
                        <span className="text-slate-400">({selectedAppointment.swapRequest.clientB.originalTime})</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contexto especial para Pendentes ou Alterações normais */}
                {!isConcluded && !selectedAppointment.swapRequest?.isClientSwap && (() => {
                  const stUpper = (selectedAppointment.status || '').toUpperCase();
                  const isAlter = stUpper.includes('ALTER') || stUpper.includes('REMANEJ') || stUpper.includes('REAGEND');

                  if (isAlter) {
                    return (
                      <div className="p-2.5 rounded-[4px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Solicitação de alteração de horário. Aguardando confirmação do estabelecimento.</span>
                      </div>
                    );
                  }

                  const catKey = getStatusCategory(selectedAppointment.status).key;
                  if (catKey === 'pendentes') {
                    return (
                      <div className="p-2.5 rounded-[4px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Agendamento realizado pelo cliente. Aguardando sua confirmação.</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Bloco 1: Serviço & Valor */}
                <div className={`p-3 rounded-[4px] border space-y-1.5 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                        {isConcluded ? 'Serviço Realizado' : 'Serviço Agendado'}
                      </span>
                      <h3 className="text-sm font-bold font-['Poppins'] text-emerald-400 mt-0.5">
                        {selectedAppointment.serviceTitle || selectedAppointment.service || 'Serviço'}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                        {isConcluded ? 'Valor Pago' : 'Valor'}
                      </span>
                      <span className="text-sm font-black text-emerald-400 block">
                        R$ {Number(selectedAppointment.totalPrice || 0).toFixed(2).replace('.', ',')}
                      </span>
                      {isConcluded && (
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                          {selectedAppointment.isPaid ? `✓ Pago via ${selectedAppointment.paymentMethod || 'Caixa'}` : 'Finalizado'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        {isConcluded ? 'Tempo de Atendimento' : 'Duração Estimada'}
                      </span>
                      <span className="font-bold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {selectedAppointment.duration || '40 min'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        {isConcluded ? 'Atendido por' : 'Profissional'}
                      </span>
                      <span className="font-bold flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-emerald-400" />
                        {selectedAppointment.professionalName || selectedAppointment.professional || 'Profissional'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Período do Atendimento (Tratado no Passado quando Concluído) */}
                <div className={`p-3 rounded-[4px] border space-y-2 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                      {isConcluded ? 'Horário da Realização' : 'Horário do Atendimento'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isConcluded 
                        ? `Realizado em: ${selectedAppointment.dateTime || selectedAppointment.dayGroup || 'Hoje'}`
                        : (selectedAppointment.dateTime || selectedAppointment.dayGroup || 'Hoje')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className={`p-2 rounded-[4px] border text-center ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                        {isConcluded ? 'Iniciado às' : 'Início'}
                      </span>
                      <span className="text-xs font-mono font-black text-emerald-400 block mt-0.5">
                        {selectedAppointment.time || '09:00'}
                      </span>
                    </div>

                    <div className={`p-2 rounded-[4px] border text-center ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
                        {isConcluded ? 'Tempo Total' : 'Duração'}
                      </span>
                      <span className={`text-xs font-bold block mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {selectedAppointment.duration || '40 min'}
                      </span>
                    </div>

                    <div className={`p-2 rounded-[4px] border text-center ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                        {isConcluded ? 'Finalizado às' : 'Término Previsto'}
                      </span>
                      <span className="text-xs font-mono font-black text-emerald-400 block mt-0.5">
                        {calculateEndTime(selectedAppointment.time || '09:00', selectedAppointment.duration || '40 min')}
                      </span>
                    </div>
                  </div>

                  {isConcluded && (
                    <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>Expediente encerrado às {calculateEndTime(selectedAppointment.time || '09:00', selectedAppointment.duration || '40 min')}</span>
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">Histórico Fechado</span>
                    </div>
                  )}
                </div>

                {/* Bloco 3: Registro de Agendamento */}
                <div className={`p-3 rounded-[4px] border space-y-1.5 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                    {isConcluded ? 'Histórico do Registro' : 'Data/Hora da Realização do Agendamento'}
                  </span>
                  <div className="space-y-1 text-xs">
                    <p className="text-[11px] text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">{isConcluded ? 'Agendado originalmente:' : 'Registrado em:'}</span>
                      <span className="font-medium text-white">{selectedAppointment.createdAt || '15/09/2026 às 14:32'}</span>
                    </p>
                    {isConcluded && selectedAppointment.paidAt && (
                      <p className="text-[11px] text-slate-300 flex items-center justify-between">
                        <span className="text-slate-400">Finalizado e pago em:</span>
                        <span className="font-medium text-emerald-400">
                          {new Date(selectedAppointment.paidAt).toLocaleDateString('pt-BR')} às {new Date(selectedAppointment.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rodapé Fixo de Ação do Modal */}
              <div className={`p-3 border-t sticky bottom-0 z-20 flex flex-col gap-2 ${
                isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'
              } backdrop-blur-xs`}>
                {(() => {
                  // Caso Concluído: Ações no Passado (Fechar ou Reabrir)
                  if (isConcluded || cat.key === 'concluidos') {
                    return (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CONFIRMADO')}
                          className="py-2 px-3 rounded-[4px] border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                          title="Reabrir este agendamento para a grade ativa"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                          <span>Reabrir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAppointment(null)}
                          className="flex-1 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          <span>Fechar Detalhes</span>
                        </button>
                      </div>
                    );
                  }

                  // Caso 1: Troca entre clientes aguardando confirmação do estabelecimento
                  if (selectedAppointment.swapRequest && selectedAppointment.swapRequest.isClientSwap && selectedAppointment.swapRequest.status !== 'completed') {
                    return (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CANCELADO')}
                          className="flex-1 py-2 rounded-[4px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5 text-rose-400" />
                          <span>Recusar Troca</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmSwapRequest(selectedAppointment)}
                          className="flex-1 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          <span>Confirmar Troca</span>
                        </button>
                      </div>
                    );
                  }

                  const stUpper = (selectedAppointment.status || '').toUpperCase();
                  const isAlter = stUpper.includes('ALTER') || stUpper.includes('REMANEJ') || stUpper.includes('REAGEND');

                  if (isAlter) {
                    return (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CANCELADO')}
                          className="flex-1 py-2 rounded-[4px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5 text-rose-400" />
                          <span>Recusar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CONFIRMADO')}
                          className="flex-1 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          <span>Aceitar Alteração</span>
                        </button>
                      </div>
                    );
                  }

                  const catKey = cat.key;

                  if (catKey === 'pendentes') {
                    return (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CANCELADO')}
                          className="flex-1 py-2 rounded-[4px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5 text-rose-400" />
                          <span>Recusar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CONFIRMADO')}
                          className="flex-1 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          <span>Confirmar</span>
                        </button>
                      </div>
                    );
                  }

                  if (selectedAppointment.isBlockedSlot || selectedAppointment.status === 'BLOQUEADO') {
                    return (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleUnblockSlot(selectedAppointment.protocolCode)}
                          className="flex-1 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Unlock className="w-3.5 h-3.5 text-white" />
                          <span>Desbloquear Horário</span>
                        </button>
                      </div>
                    );
                  }

                  if (catKey === 'confirmados') {
                    const stUpper = (selectedAppointment.status || '').toUpperCase();
                    const isInProgress = stUpper.includes('ATEND') || stUpper.includes('INICI');
                    const isNextToServe = !isInProgress && nextActiveAppointment && nextActiveAppointment.protocolCode === selectedAppointment.protocolCode;

                    // 1. Se já estiver em atendimento:
                    if (isInProgress) {
                      return (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => setSelectedAppointment(null)}
                            className="flex-1 py-2 px-2 rounded-[4px] border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                          >
                            <span>Fechar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hapticSuccess();
                              const finishedApp = selectedAppointment;
                              handleStatusChange(selectedAppointment.protocolCode, 'CONCLUÍDO');
                              setSelectedAppointment(null);
                              setPixCheckoutAppointment(finishedApp);
                            }}
                            className="flex-1 py-2 px-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            <span>Finalizar Serviço</span>
                          </button>
                        </div>
                      );
                    }

                    // 2. Se for o próximo a ser atendido:
                    if (isNextToServe) {
                      return (
                        <div className="flex flex-col gap-2 w-full">
                          <div className="grid grid-cols-3 gap-1.5 w-full">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'ALTERAÇÃO')}
                              className="py-2 px-1 rounded-[4px] border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10.5px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-400" />
                              <span>Remanejar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CANCELADO')}
                              className="py-2 px-1 rounded-[4px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10.5px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              <X className="w-3 h-3 text-rose-400" />
                              <span>Cancelar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedAppointment(null)}
                              className="py-2 px-1 rounded-[4px] border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>Fechar</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              hapticSuccess();
                              handleStatusChange(selectedAppointment.protocolCode, 'EM ATENDIMENTO');
                              setSelectedAppointment(null);
                            }}
                            className="w-full py-2.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-xs"
                          >
                            <Zap className="w-3.5 h-3.5 text-white fill-white" />
                            <span>Iniciar Atendimento</span>
                          </button>
                        </div>
                      );
                    }

                    // 3. Demais confirmados:
                    return (
                      <div className="grid grid-cols-3 gap-1.5 w-full">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'ALTERAÇÃO')}
                          className="py-2 px-1 rounded-[4px] border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10.5px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3 text-amber-400" />
                          <span>Remanejar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CANCELADO')}
                          className="py-2 px-1 rounded-[4px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10.5px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3 text-rose-400" />
                          <span>Cancelar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAppointment(null)}
                          className="py-2 px-1 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                        >
                          <span>Fechar</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedAppointment.protocolCode, 'CONFIRMADO')}
                      className="w-full py-2 rounded-[4px] border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reativar Agendamento</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Novo Agendamento Manual */}
      {isNewModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsNewModalOpen(false)}
        >
          <div 
            className={`w-full max-w-sm rounded-[4px] overflow-hidden shadow-2xl border flex flex-col ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-3.5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50'
            }`}>
              <h3 className="text-xs font-bold font-['Poppins']">
                Novo Agendamento Manual
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-[4px] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Roberto Gomes"
                  required
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs font-medium outline-hidden ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Telefone / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs font-medium outline-hidden ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Serviço
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => {
                    setSelectedService(e.target.value);
                    const matchedSrv = services.find((s) => s.title === e.target.value);
                    if (matchedSrv) {
                      setSelectedPrice(matchedSrv.price.toString());
                      setSelectedDuration(matchedSrv.duration);
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs font-medium outline-hidden ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {services.length > 0 ? (
                    services.map((s) => (
                      <option key={s.id} value={s.title}>
                        {s.title} ({s.duration}) - R$ {s.price}
                      </option>
                    ))
                  ) : (
                    <option value="Corte Masculino">Corte Masculino (40 min) - R$ 50</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs font-medium outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(e.target.value)}
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs font-medium outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className={`flex-1 py-2 rounded-[4px] text-xs font-bold transition cursor-pointer border ${
                    isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-xs active:scale-98"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal do Chat Interno do App */}
      {activeChatAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full max-w-md h-[85vh] sm:h-[550px] rounded-t-[4px] sm:rounded-[4px] border flex flex-col overflow-hidden shadow-2xl ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Cabeçalho do Chat */}
            <div className={`p-3 border-b shrink-0 flex items-center justify-between ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black shrink-0">
                  {(activeChatAppointment.customerName || activeChatAppointment.clientName || 'C')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {activeChatAppointment.customerName || activeChatAppointment.clientName || 'Cliente'}
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Online no Vagou" />
                  </div>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Chat Seguro Vagou • #{activeChatAppointment.protocolCode}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveChatAppointment(null)}
                className={`p-1.5 rounded-[4px] border transition cursor-pointer ${
                  isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 bg-slate-950/40">
              {chatMessages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="my-2 p-2 rounded-[4px] bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{msg.text}</span>
                    </div>
                  );
                }

                const isProf = msg.sender === 'professional';

                return (
                  <div key={msg.id} className={`flex flex-col ${isProf ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-2.5 rounded-[4px] text-xs ${
                      isProf
                        ? 'bg-emerald-500 text-white font-medium'
                        : isDark
                        ? 'bg-slate-800 text-slate-100 border border-slate-700 font-medium'
                        : 'bg-slate-100 text-slate-900 border border-slate-200 font-medium'
                    }`}>
                      <p>{msg.text}</p>
                      <span className={`block text-[9px] mt-1 text-right font-mono ${
                        isProf ? 'text-white/80' : 'text-slate-400'
                      }`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chips de Resposta Rápida */}
            <div className={`px-2.5 py-1.5 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
              isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              {[
                'Confirmo seu horário!',
                'Estou te aguardando!',
                'Gostaria de remarcar?'
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setInputChatMessage(chip);
                  }}
                  className={`px-2 py-1 rounded-[4px] text-[10px] font-bold border transition cursor-pointer whitespace-nowrap ${
                    isDark 
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500/50'
                      : 'bg-white border-slate-300 text-slate-700 hover:text-emerald-600 hover:border-emerald-500'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Formuário de Envio */}
            <form onSubmit={handleSendChatMessage} className={`p-2.5 border-t shrink-0 flex items-center gap-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <input
                type="text"
                value={inputChatMessage}
                onChange={(e) => setInputChatMessage(e.target.value)}
                placeholder="Escreva sua mensagem no app..."
                className={`flex-1 px-3 py-2 rounded-[4px] border text-xs font-medium outline-hidden transition ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
                }`}
              />
              <button
                type="submit"
                disabled={!inputChatMessage.trim()}
                className="py-2 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer active:scale-98"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bloquear Horário na Agenda (Opção B) */}
      {isBlockModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsBlockModalOpen(false)}
        >
          <div 
            className={`w-full max-w-sm rounded-[4px] overflow-hidden shadow-2xl border flex flex-col ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-3.5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[4px] bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold font-['Poppins']">
                  Bloquear Horário na Agenda
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="p-1 rounded-[4px] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="p-3.5 space-y-3">
              {/* Motivos Rápidos */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Motivo da Trava / Bloqueio
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    { label: '🚨 Emergência', value: 'Emergência Médica / Pessoal' },
                    { label: '🔒 Trava do Turno', value: 'Trava do Turno' },
                    { label: 'Almoço', value: 'Almoço' },
                    { label: 'Intervalo', value: 'Intervalo' },
                    { label: 'Folga', value: 'Folga' },
                    { label: 'Manutenção', value: 'Manutenção' },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setBlockReason(chip.value);
                        if (chip.label.includes('Emergência') || chip.label.includes('Turno')) {
                          setBlockDuration('Turno todo');
                        }
                      }}
                      className={`px-2 py-1 rounded-[4px] text-[10px] font-bold border transition cursor-pointer ${
                        blockReason === chip.value
                          ? 'bg-amber-500 border-amber-500 text-slate-950 font-black'
                          : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-amber-500/50'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-amber-500/50'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Emergência Médica / Almoço"
                  required
                  className={`w-full px-2.5 py-1.5 rounded-[4px] border text-xs outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                />
              </div>

              {/* Horário & Duração */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Horário Início
                  </label>
                  <input
                    type="time"
                    value={blockTime}
                    onChange={(e) => setBlockTime(e.target.value)}
                    required
                    className={`w-full px-2 py-1.5 rounded-[4px] border text-xs font-mono font-bold outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Duração
                  </label>
                  <select
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(e.target.value)}
                    className={`w-full px-2 py-1.5 rounded-[4px] border text-xs font-bold outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="30 min">30 min</option>
                    <option value="45 min">45 min</option>
                    <option value="1h">1 hora</option>
                    <option value="1h 30min">1h 30min</option>
                    <option value="2h">2 horas</option>
                    <option value="Turno todo">Turno todo</option>
                  </select>
                </div>
              </div>

              {/* Profissional Afetado */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Profissional
                </label>
                <select
                  value={blockProfessional}
                  onChange={(e) => setBlockProfessional(e.target.value)}
                  className={`w-full px-2 py-1.5 rounded-[4px] border text-xs font-bold outline-hidden ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option key="Todos" value="Todos">Todos da Equipe</option>
                  {professionals && professionals.length > 0 ? (
                    professionals.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))
                  ) : (
                    <option value="Profissional">Profissional Principal</option>
                  )}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-3 py-1.5 rounded-[4px] text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-[4px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear Horário</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Simples e Rápido de Confirmação da Troca de Horários */}
      {swapConfirmedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-sm rounded-[4px] border shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Cabeçalho */}
            <div className={`p-3.5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold font-['Poppins'] text-white">
                  Troca Confirmada!
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSwapConfirmedModalData(null)}
                className="p-1 rounded-[4px] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Simples com a Nova Distribuição */}
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-300 text-center">
                Os horários foram realocados com sucesso na sua agenda:
              </p>

              <div className={`p-3 rounded-[4px] border space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Cliente B no novo horário */}
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    {swapConfirmedModalData.clientB.name}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-[3px] border border-emerald-500/30">
                    às {swapConfirmedModalData.clientB.newTime}
                  </span>
                </div>

                {/* Cliente A no novo horário */}
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    {swapConfirmedModalData.clientA.name}
                  </span>
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-[3px] border border-amber-500/30">
                    às {swapConfirmedModalData.clientA.newTime}
                  </span>
                </div>
              </div>

              {/* Botão de Fechar Rápido (Fundo Verde = Texto Branco) */}
              <button
                type="button"
                onClick={() => {
                  hapticSuccess();
                  setSwapConfirmedModalData(null);
                }}
                className="w-full py-2.5 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs mt-2"
              >
                <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                <span>Entendido</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Checkout PIX Pós-Serviço */}
      <PixCheckoutModal
        isOpen={Boolean(pixCheckoutAppointment)}
        onClose={() => setPixCheckoutAppointment(null)}
        salonName={adminSettings?.salonName || salonName}
        salonCity={adminSettings?.cidade || 'BRASIL'}
        clientName={pixCheckoutAppointment?.customerName || pixCheckoutAppointment?.clientName || 'Cliente'}
        clientPhone={pixCheckoutAppointment?.customerPhone || pixCheckoutAppointment?.clientPhone || ''}
        serviceTitle={pixCheckoutAppointment?.serviceTitle || pixCheckoutAppointment?.service || 'Atendimento'}
        initialAmount={Number(pixCheckoutAppointment?.totalPrice || 45)}
        protocolCode={pixCheckoutAppointment?.protocolCode}
        pixKeys={adminSettings?.pixKeys}
        fallbackPixKey={adminSettings?.pixKey}
        onConfirmPaid={(paidAmount, method) => {
          if (!pixCheckoutAppointment) return;
          const targetCode = pixCheckoutAppointment.protocolCode || pixCheckoutAppointment.id;
          const updated = appointments.map((a) => {
            if (a.protocolCode === targetCode || a.id === targetCode) {
              return {
                ...a,
                status: 'CONCLUÍDO',
                totalPrice: paidAmount,
                isPaid: true,
                paymentMethod: method,
                paidAt: new Date().toISOString(),
              };
            }
            return a;
          });
          onUpdateAppointments(updated);
          try {
            localStorage.setItem('vagou_salon_appointments', JSON.stringify(updated));
          } catch {}
        }}
      />

      {/* GAVETA DE RASTREAMENTO AO VIVO EM 1 TOQUE (LINHA SHOPEE/CORREIOS ⇄ MAPA 10S) */}
      {liveTrackingViewerState && (
        <LiveTrackingDrawerModal
          isOpen={Boolean(liveTrackingViewerState)}
          appointment={liveTrackingViewerState.appointment}
          initialTab={liveTrackingViewerState.initialTab}
          viewerRole="salon"
          onClose={() => setLiveTrackingViewerState(null)}
          onUpdateAppointment={handleSingleLiveAppointmentUpdate}
        />
      )}

      {/* MODAL DE PARTIDA DO PROFISSIONAL DELIVERY (TRAÇADOR DE ROTA GOOGLE MAPS IN-APP) */}
      {proDeliveryDepartureApt && (
        <LiveRouteDepartureModal
          isOpen={Boolean(proDeliveryDepartureApt)}
          appointment={proDeliveryDepartureApt}
          isProfessionalDeliveryMode={true}
          onClose={() => setProDeliveryDepartureApt(null)}
          onUpdateAppointment={handleSingleLiveAppointmentUpdate}
          onOpenLiveViewer={(apt, tab) => {
            setProDeliveryDepartureApt(null);
            setLiveTrackingViewerState({ appointment: apt, initialTab: tab });
          }}
        />
      )}
    </div>
  );
};
