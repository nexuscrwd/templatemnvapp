import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  ArrowLeft, 
  CheckCircle, 
  Clock3, 
  Sparkles, 
  Scissors,
  Check,
  ChevronRight,
  Info,
  Download,
  ExternalLink,
  Baby,
  Navigation,
  Package,
  Map as MapIcon,
  AlertTriangle,
  Bell,
  Home,
  Bookmark
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { BookingAppointment } from '../types';
import { hapticLight, hapticMedium } from '../utils/haptics';
import {
  LiveRouteDepartureModal,
  LiveTrackingDrawerModal,
} from './live-tracking/LiveTrackingModal';
import { RouteSimulatorModal } from './live-tracking/RouteSimulatorModal';
import { syncAppointmentAcrossStorageAndDb } from '../hooks/useLiveRouteTracker';
import { getSavedBookingDraft, saveBookingDraft, BookingDraftItem } from '../utils/bookingSlots';

const parseAppointmentDateTime = (dateTimeStr: string): { start: Date; end: Date } => {
  const now = new Date();
  let year = 2026;
  let month = now.getMonth();
  let day = now.getDate();
  let hours = 12;
  let minutes = 0;

  const cleanStr = dateTimeStr.toLowerCase().trim();

  if (cleanStr.includes('hoje')) {
    day = now.getDate();
    month = now.getMonth();
  } else if (cleanStr.includes('amanhã') || cleanStr.includes('amanha')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    day = tomorrow.getDate();
    month = tomorrow.getMonth();
    year = tomorrow.getFullYear();
  } else {
    // Check format like "10/09"
    const dateMatch = cleanStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
      day = parseInt(dateMatch[1]);
      month = parseInt(dateMatch[2]) - 1;
    }
  }

  // Check format like "15:30"
  const timeMatch = cleanStr.match(/(\d{1,2})[h:](\d{2})/);
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = parseInt(timeMatch[2]);
  }

  const start = new Date(year, month, day, hours, minutes);
  const end = new Date(start.getTime() + 45 * 60 * 1000); // 45 minute default
  return { start, end };
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 22,
    }
  }
};

interface UserAppointmentsViewProps {
  appointments: BookingAppointment[];
  onBack: () => void;
  onCancelAppointment?: (protocolCode: string, reason?: string) => void;
  onUpdateAppointments?: (updatedList: BookingAppointment[]) => void;
  onRescheduleAppointment?: (appointment: BookingAppointment) => void;
}

export const UserAppointmentsView: React.FC<UserAppointmentsViewProps> = ({
  appointments,
  onBack,
  onCancelAppointment,
  onUpdateAppointments,
  onRescheduleAppointment,
}) => {
  const { isDark } = useTheme();
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null);
  const [departureModalApt, setDepartureModalApt] = useState<BookingAppointment | null>(null);
  const [drawerViewerState, setDrawerViewerState] = useState<{
    appointment: BookingAppointment;
    initialTab: 'timeline' | 'map';
  } | null>(null);
  const [savedDraft, setSavedDraft] = useState<BookingDraftItem | null>(() => getSavedBookingDraft());
  const [isRouteSimulatorOpen, setIsRouteSimulatorOpen] = useState<boolean>(false);

  const handleSingleAppointmentUpdate = (updated: BookingAppointment) => {
    const nextList = appointments.map((apt) =>
      apt.protocolCode === updated.protocolCode || (apt.id && apt.id === updated.id)
        ? { ...apt, ...updated }
        : apt
    );
    if (onUpdateAppointments) {
      onUpdateAppointments(nextList);
    }
    if (departureModalApt && departureModalApt.protocolCode === updated.protocolCode) {
      setDepartureModalApt(updated);
    }
    if (drawerViewerState && drawerViewerState.appointment.protocolCode === updated.protocolCode) {
      setDrawerViewerState({ ...drawerViewerState, appointment: updated });
    }
  };

  const getGoogleCalendarUrl = (item: BookingAppointment) => {
    const { start, end } = parseAppointmentDateTime(item.dateTime || '');
    const title = `${item.serviceTitle || item.service || 'Serviço'} - ${item.salonName || 'Estabelecimento'}`;
    const description = `Profissional: ${item.professionalName || item.professional || 'Especialista'}\nCódigo do Voucher: ${item.protocolCode}\nAgendado pelo Vagou.`;
    const location = item.address || item.salonName || 'Estabelecimento';
    
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatGoogleDate(start)}/${formatGoogleDate(end)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
  };

  const handleDownloadIcs = (item: BookingAppointment) => {
    const { start, end } = parseAppointmentDateTime(item.dateTime || '');
    const title = `${item.serviceTitle || item.service || 'Serviço'} - ${item.salonName || 'Estabelecimento'}`;
    const description = `Profissional: ${item.professionalName || item.professional || 'Especialista'}\\nCódigo do Voucher: ${item.protocolCode}\\nAgendado pelo Vagou.`;
    const location = item.address || item.salonName || 'Estabelecimento';

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PROID:-//Vagou//Agenda Client//PT',
      'BEGIN:VEVENT',
      `UID:${item.protocolCode || Date.now()}@vagou.com.br`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agendamento-${(item.serviceTitle || 'servico').toLowerCase().replace(/\s+/g, '-')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar apenas agendamentos reais do cliente (evitar bloqueios ou agendamentos de outros)
  const clientAppointments = appointments.filter(
    (apt) => !apt.isBlockedSlot && apt.protocolCode
  );

  const getStatusBadge = (status?: string) => {
    const s = (status || 'CONFIRMADO').toUpperCase();
    
    switch (s) {
      case 'CONFIRMADO':
      case 'AGENDADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-bold bg-emerald-500 border border-emerald-400 text-white whitespace-nowrap">
            <Check className="w-3.5 h-3.5 text-white" />
            Confirmado
          </span>
        );
      case 'PENDENTE':
      case 'EM ANDAMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-bold bg-amber-400 border border-amber-500 text-slate-950 whitespace-nowrap">
            <Clock3 className="w-3.5 h-3.5 text-slate-950" />
            Pendente
          </span>
        );
      case 'CONCLUÍDO':
      case 'CONCLUIDO':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-bold border whitespace-nowrap ${
            isDark 
              ? 'bg-slate-800 border-slate-700 text-slate-300' 
              : 'bg-slate-200 border-slate-300 text-slate-700'
          }`}>
            <CheckCircle className="w-3.5 h-3.5" />
            Concluído
          </span>
        );
      case 'CANCELADO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-bold bg-rose-500 border border-rose-400 text-white whitespace-nowrap">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden ${
      isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* HEADER DA SEÇÃO */}
      <header className={`shrink-0 h-14 border-b flex items-center justify-between px-4 sticky top-0 z-40 ${
        isDark ? 'bg-slate-950/95 border-slate-800/80' : 'bg-white/95 border-slate-200 shadow-xs'
      } backdrop-blur-md`}>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onBack();
            }}
            className={`w-9 h-9 rounded-[4px] flex items-center justify-center transition active:scale-95 cursor-pointer ${
              isDark ? 'hover:bg-slate-900 border border-slate-800' : 'hover:bg-slate-100 border border-slate-200'
            }`}
            aria-label="Voltar para o salão"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-400" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-extrabold tracking-tight font-['Poppins']">Minha Agenda</h1>
            <p className="text-[10px] text-slate-400 leading-none">Vagou achou.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setIsRouteSimulatorOpen(true);
            }}
            className="px-2.5 py-1 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            title="Simulador de Trajeto GPS (Teste)"
          >
            <Navigation className="w-3.5 h-3.5 text-white" />
            <span className="text-white">Trajeto</span>
          </button>
          <span className={`text-[11px] font-bold px-2 py-1 rounded-[4px] ${
            isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'
          }`}>
            {clientAppointments.length} Ativos
          </span>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO ROLANTE */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* CARD DE PRÉ-AGENDAMENTO PAUSADO (RASCUNHO) */}
        {savedDraft && (
          <div className={`w-full rounded-[4px] p-4 border space-y-2.5 ${
            isDark ? 'bg-slate-900 border-amber-500/50 text-white' : 'bg-amber-50 border-amber-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                <Bookmark className="w-3 h-3" />
                <span>Pré-Agendamento (Não garante vaga)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  saveBookingDraft(null);
                  setSavedDraft(null);
                }}
                className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
              >
                Descartar
              </button>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-emerald-400">{savedDraft.combinedServiceTitle}</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {savedDraft.isDependentBooking && savedDraft.dependentName
                  ? `Dependente: ${savedDraft.dependentName}`
                  : 'Para Você (Titular)'}{' '}
                • {savedDraft.professional}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/40">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{savedDraft.dateFormatted} às {savedDraft.timeSlot}</span>
              </span>
              <span className="font-extrabold">R$ {savedDraft.totalPrice.toFixed(0)}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticMedium();
                onBack();
              }}
              className="w-full py-2.5 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-4 h-4 text-white" />
              <span className="text-white">Retomar e Confirmar Vaga</span>
            </button>
          </div>
        )}

        {clientAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center border ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400 shadow-xs'
            }`}>
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold">Nenhum agendamento ativo</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Você ainda não tem nenhum horário agendado ou pendente neste estabelecimento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onBack();
              }}
              className="px-5 py-2.5 rounded-[4px] bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Scissors className="w-4 h-4 text-white" />
              <span>Ver Serviços & Agendar</span>
            </button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {clientAppointments.map((item, idx) => (
              <motion.div
                key={item.id || item.protocolCode || idx}
                variants={itemVariants}
                className={`w-full rounded-[4px] p-4 border flex flex-col space-y-3 ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700' 
                    : 'bg-white border-slate-200 shadow-xs hover:shadow-sm'
                } transition-all`}
              >
                {/* TOPO: Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/20 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Voucher Digital
                      </span>
                      {item.is_dependent && item.dependent_name && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Baby className="w-2.5 h-2.5" />
                          <span>{item.dependent_name}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-extrabold leading-tight text-emerald-400">
                      {item.serviceTitle || item.service || 'Serviço Personalizado'}
                    </h3>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                {/* CORPO: Informações de Data, Profissional e Local */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Data e Horário</div>
                        <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {item.dateTime || 'Hoje, às 15:30'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Profissional</div>
                        <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {item.professionalName || item.professional || 'Especialista'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Localização</div>
                        <div className={`font-bold truncate max-w-[150px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {item.salonName || 'Estabelecimento'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Código Protocolo</div>
                        <div className="font-mono font-bold text-emerald-400 text-xs">
                          {item.protocolCode}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO BOL-020: RADAR BIDIRECIONAL DE DESLOCAMENTO AO VIVO ("ESTOU A CAMINHO" / DELIVERY) */}
                {item.status !== 'CANCELADO' && item.status !== 'CONCLUÍDO' && item.status !== 'concluido' && item.status !== 'cancelado' ? (
                  <div className="pt-2.5 border-t border-slate-800/40 space-y-2">
                    {/* Seletor rápido de modalidade (No Salão vs Delivery em Casa) + Status Ao Vivo */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            hapticLight();
                            const nextType = item.service_location_type === 'home_delivery' ? 'in_salon' : 'home_delivery';
                            syncAppointmentAcrossStorageAndDb(
                              item,
                              { service_location_type: nextType },
                              handleSingleAppointmentUpdate
                            );
                          }}
                          className="px-2 py-0.5 rounded-[3px] bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition"
                          title="Alternar modalidade entre Atendimento no Salão e Delivery"
                        >
                          {item.service_location_type === 'home_delivery' ? (
                            <>
                              <Home className="w-3 h-3 text-emerald-400" />
                              <span>Modo Delivery (Profissional vem até você)</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 text-emerald-400" />
                              <span>No Salão (Você vai até o salão)</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Pílula de Status de Deslocamento Ao Vivo */}
                      {(item.tracking_status === 'live_sharing' || item.tracking_status === 'arriving_5min') && (
                        <span className="px-2 py-0.5 rounded-[3px] bg-emerald-500 text-white text-[10px] font-mono tabular-nums font-black flex items-center gap-1">
                          <Bell className="w-3 h-3 text-white" />
                          <span className="text-white">
                            {item.tracking_status === 'arriving_5min'
                              ? `Chegando em ${item.eta_minutes ?? 4} min!`
                              : `${item.current_street_name || 'Av. Rebouças'} • ETA ${item.eta_minutes ?? 12}m`}
                          </span>
                        </span>
                      )}
                      {item.tracking_status === 'on_way_no_map' && (
                        <span className="px-2 py-0.5 rounded-[3px] bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          A caminho (Sem mapa)
                        </span>
                      )}
                      {item.tracking_status === 'hurry_confirmed' && (
                        <span className="px-2 py-0.5 rounded-[3px] bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          Comparecimento confirmado • Saindo em instantes
                        </span>
                      )}
                    </div>

                    {/* Alerta de Adversidade Ativa */}
                    {item.active_adversity && (
                      <div className="p-2 rounded-[4px] bg-amber-500/15 text-amber-300 text-[11px] flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            {item.active_adversity.label} ({item.active_adversity.street})
                          </span>
                        </span>
                        <span className="font-mono tabular-nums font-black text-amber-400">
                          +{item.active_adversity.addedMinutes} min
                        </span>
                      </div>
                    )}

                    {/* Botões de Ação de Deslocamento conforme Modalidade */}
                    {item.service_location_type === 'home_delivery' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setDrawerViewerState({ appointment: item, initialTab: 'timeline' });
                          }}
                          className="py-2 px-2.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98 whitespace-nowrap"
                        >
                          <Package className="w-3.5 h-3.5 text-white shrink-0" />
                          <span className="text-white">Linha Shopee (Ruas)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setDrawerViewerState({ appointment: item, initialTab: 'map' });
                          }}
                          className="py-2 px-2.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98 whitespace-nowrap"
                        >
                          <MapIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Mapa Ao Vivo (10s)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            hapticLight();
                            setDepartureModalApt(item);
                          }}
                          className="flex-1 py-2 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98 whitespace-nowrap shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5 text-white shrink-0" />
                          <span className="text-white">Ir</span>
                        </button>

                        {(item.tracking_status === 'live_sharing' || item.tracking_status === 'arriving_5min') && (
                          <button
                            type="button"
                            onClick={() => {
                              hapticLight();
                              setDrawerViewerState({ appointment: item, initialTab: 'timeline' });
                            }}
                            className="py-2 px-2.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition active:scale-98 whitespace-nowrap"
                          >
                            <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Ver Ruas</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : item.cancellation_reason ? (
                  <div className="pt-2 border-t border-slate-800/40 text-[11px] text-rose-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Motivo do cancelamento: <strong>{item.cancellation_reason}</strong></span>
                  </div>
                ) : null}

                {/* RODAPÉ: Valor e Botões de Ação */}
                <div className="flex items-center justify-between border-t border-slate-800/10 pt-3 mt-1.5 gap-2 flex-wrap">
                  <div className="flex flex-col shrink-0">
                    <span className="text-[10px] text-slate-400">Valor Estimado</span>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                      R$ {item.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Botão Adicionar ao Calendário (Apenas se o agendamento estiver confirmado ou agendado) */}
                    {(item.status === 'CONFIRMADO' || item.status === 'AGENDADO' || (item.status || 'CONFIRMADO').toUpperCase() === 'CONFIRMADO') && (
                      <div className="relative">
                        <button
                          type="button"
                          id={`btn-add-cal-${item.protocolCode}`}
                          onClick={() => {
                            hapticLight();
                            setOpenCalendarId(openCalendarId === item.protocolCode ? null : (item.protocolCode || ''));
                          }}
                          className={`px-3 py-1.5 rounded-[4px] border font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                            isDark 
                              ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-850' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Adicionar ao Calendário</span>
                        </button>

                        {openCalendarId === item.protocolCode && (
                          <>
                            {/* Backdrop invisível para fechar ao clicar fora */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setOpenCalendarId(null)}
                            />
                            
                            <div className={`absolute right-0 bottom-full mb-1.5 z-50 w-48 rounded-[4px] border p-1 shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-150 ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-200' 
                                : 'bg-white border-slate-200 text-slate-700 shadow-lg'
                            }`}>
                              <button
                                type="button"
                                id={`cal-option-google-${item.protocolCode}`}
                                onClick={() => {
                                  hapticLight();
                                  setOpenCalendarId(null);
                                  const url = getGoogleCalendarUrl(item);
                                  window.open(url, '_blank');
                                }}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-[4px] text-left transition ${
                                  isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-100'
                                }`}
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Google Agenda</span>
                              </button>
                              <button
                                type="button"
                                id={`cal-option-ics-${item.protocolCode}`}
                                onClick={() => {
                                  hapticLight();
                                  setOpenCalendarId(null);
                                  handleDownloadIcs(item);
                                }}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-[4px] text-left transition ${
                                  isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-100'
                                }`}
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Baixar arquivo .ics</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {item.status !== 'CANCELADO' && item.status !== 'CONCLUÍDO' && item.status !== 'concluido' && item.status !== 'cancelado' && (
                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setDepartureModalApt(item);
                        }}
                        className="px-3 py-1.5 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white font-bold text-xs transition cursor-pointer active:scale-95 whitespace-nowrap"
                      >
                        Cancelar / Remarcar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* MODAL PRÉ-PARTIDA (ETA + 10 MIN) & TRAÇADOR DE ROTA GOOGLE MAPS IN-APP */}
        {departureModalApt && (
          <LiveRouteDepartureModal
            isOpen={Boolean(departureModalApt)}
            appointment={departureModalApt}
            initialStep="in_app_map"
            onClose={() => setDepartureModalApt(null)}
            onUpdateAppointment={handleSingleAppointmentUpdate}
            onCancelWithReason={(proto, reason) => {
              if (onCancelAppointment) {
                onCancelAppointment(proto, reason);
              }
            }}
            onRequestReschedule={(apt) => {
              if (onRescheduleAppointment) {
                onRescheduleAppointment(apt);
              } else {
                onBack();
              }
            }}
            onOpenLiveViewer={(apt, tab) => {
              setDepartureModalApt(null);
              setDrawerViewerState({ appointment: apt, initialTab: tab });
            }}
          />
        )}

        {/* MODAL PROVISÓRIO DE TESTE DE TRAJETO GPS */}
        {isRouteSimulatorOpen && (
          <RouteSimulatorModal
            isOpen={isRouteSimulatorOpen}
            onClose={() => setIsRouteSimulatorOpen(false)}
            onStartRoute={(testAppointment) => {
              setIsRouteSimulatorOpen(false);
              setDepartureModalApt(testAppointment);
            }}
          />
        )}

        {/* GAVETA DE RASTREAMENTO AO VIVO (LINHA SHOPEE/CORREIOS ⇄ MAPA 10S) */}
        {drawerViewerState && (
          <LiveTrackingDrawerModal
            isOpen={Boolean(drawerViewerState)}
            appointment={drawerViewerState.appointment}
            initialTab={drawerViewerState.initialTab}
            viewerRole="client"
            onClose={() => setDrawerViewerState(null)}
            onUpdateAppointment={handleSingleAppointmentUpdate}
          />
        )}

        {/* NOTA DE COBERTURA & AJUDA */}
        <div className={`rounded-[4px] p-3.5 border flex items-start gap-3 ${
          isDark ? 'bg-slate-900/40 border-slate-800/80 text-slate-400' : 'bg-slate-100/60 border-slate-200 text-slate-500'
        }`}>
          <Info className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-normal space-y-1">
            <p className="font-bold text-emerald-400">Precisa reagendar ou realizar uma permuta?</p>
            <p>
              Caso ocorra algum imprevisto, você pode utilizar a rede solidária de permuta de horários do Vagou ou cancelar seu horário com antecedência mínima de 1 hora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
