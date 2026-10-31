import React, { useState, useMemo, useCallback } from 'react';
import { 
  Clock, CalendarCheck, DollarSign, Target, User, Zap, Check, Play, Pause, Plus, X,
  ArrowRightLeft, AlertCircle, ArrowLeft, Users, CheckCircle2, TrendingUp, ArrowUpRight, Sparkles,
  MessageCircle, Scissors
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SalonAdminSettings, CatalogServiceItem, BookingAppointment, SalonProfessionalItem, UserPersona } from '../../types';
import { hapticLight, hapticSuccess, hapticMedium } from '../../utils/haptics';
import { DayEvolutionData } from './dashboard/ClientEvolutionChart';
import { GoalsAndShiftsCard } from './dashboard/GoalsAndShiftsCard';
import { PixCheckoutModal } from './PixCheckoutModal';

const getAppointmentDurationMinutes = (app: BookingAppointment): number => {
  if (typeof app.durationMinutes === 'number' && app.durationMinutes > 0) {
    return app.durationMinutes;
  }
  if (app.duration) {
    const matchMin = app.duration.match(/(\d+)\s*min/i);
    const matchHour = app.duration.match(/(\d+)\s*h/i);
    if (matchMin) return parseInt(matchMin[1], 10);
    if (matchHour) return parseInt(matchHour[1], 10) * 60;
    const numericOnly = parseInt(app.duration, 10);
    if (!isNaN(numericOnly) && numericOnly > 0) return numericOnly;
  }
  return 45;
};

const calculateAppointmentTimes = (app: BookingAppointment) => {
  const startTimeStr = app.time || '10:00';
  const [startH, startM] = startTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const durationMinutes = getAppointmentDurationMinutes(app);
  const durHours = Math.floor(durationMinutes / 60);
  const durMins = durationMinutes % 60;
  const durationHhMm = `${String(durHours).padStart(2, '0')}:${String(durMins).padStart(2, '0')}`;

  const totalEndMins = (startH * 60 + startM + durationMinutes) % (24 * 60);
  const endH = Math.floor(totalEndMins / 60);
  const endM = totalEndMins % 60;
  const endTimeHhMm = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  return { startTimeStr, durationMinutes, durationHhMm, endTimeHhMm };
};

export interface DashboardTeamMember {
  id: string;
  name: string;
  role: 'admin' | 'professional';
  roleLabel: string;
  commissionRate: number;
  avatar?: string;
}

const DEFAULT_TEAM_MEMBERS: DashboardTeamMember[] = [];

export interface ProfessionalDashboardViewProps {
  adminSettings?: SalonAdminSettings;
  onUpdateSettings?: (settings: Partial<SalonAdminSettings>) => void;
  services?: CatalogServiceItem[];
  appointments?: BookingAppointment[];
  onUpdateAppointments?: (appointments: BookingAppointment[]) => void;
  professionals?: SalonProfessionalItem[];
  onNavigateTab?: (tab: 'home' | 'servicos' | 'vagas' | 'espaco' | 'equipe' | 'financeiro' | 'caixa' | 'personalizar' | 'utilidades' | 'dados' | 'visual') => void;
  onOpenNewService?: () => void;
  onOpenNewAppointment?: () => void;
  onLogout?: () => void;
  salonName?: string;
  currentUserName?: string;
  currentPersona?: UserPersona;
  isProAdmin?: boolean;
  activeProId?: string;
  onSelectActiveProId?: (id: string) => void;
  onRequestManage?: () => void;
}

export const ProfessionalDashboardView: React.FC<ProfessionalDashboardViewProps> = ({
  adminSettings,
  onUpdateSettings,
  services = [],
  appointments = [],
  onUpdateAppointments,
  professionals = [],
  onNavigateTab,
  onOpenNewService,
  onOpenNewAppointment,
  onLogout,
  salonName = 'Meu Estabelecimento',
  currentUserName,
  currentPersona = 'admin',
  isProAdmin,
  activeProId,
  onSelectActiveProId,
  onRequestManage,
}) => {
  const { isDark } = useTheme();

  // Lista consolidada de membros da equipe com taxas de comissão
  const teamList = useMemo<DashboardTeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('vagou_salon_team_members') || localStorage.getItem('vagou_team_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any, idx: number) => ({
            id: m.id || `pro-${idx}`,
            name: m.name || `Profissional ${idx + 1}`,
            role: m.role === 'admin' ? 'admin' : 'professional',
            roleLabel: m.role === 'admin' ? 'Dono / Gerente' : (m.specialties?.join(', ') || 'Profissional da Equipe'),
            commissionRate: typeof m.commissionRate === 'number' ? m.commissionRate : (m.role === 'admin' ? 100 : 50),
            avatar: m.avatarUrl || m.avatar || '',
          }));
        }
      }
    } catch {}

    if (professionals && professionals.length > 0) {
      return professionals.map((p, idx) => {
        const isOwner = p.role?.toLowerCase().includes('dono') || p.role?.toLowerCase().includes('gerente') || idx === 0;
        return {
          id: p.id || `pro-${idx}`,
          name: p.name,
          role: isOwner ? 'admin' : 'professional',
          roleLabel: p.role || (isOwner ? 'Dono / Gerente' : 'Profissional da Equipe'),
          commissionRate: isOwner ? 100 : 50,
          avatar: p.avatar || p.avatarUrl || '',
        };
      });
    }

    if (currentUserName) {
      return [{
        id: 'owner-1',
        name: currentUserName,
        role: 'admin',
        roleLabel: 'Proprietário',
        commissionRate: 100,
        avatar: '',
      }];
    }

    return [];
  }, [professionals, currentUserName]);

  // Papel do usuário logado: 'admin' (Dono) ou 'professional' (Colaborador)
  const [userRole, setUserRole] = useState<'admin' | 'professional'>(() => {
    try {
      const saved = localStorage.getItem('vagou_dashboard_user_role');
      if (saved === 'admin' || saved === 'professional') return saved;
    } catch {}
    return 'admin';
  });

  // Nome do profissional que está logado atualmente
  const [loggedProfessionalName, setLoggedProfessionalName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vagou_dashboard_logged_pro_name');
      if (saved) return saved;
    } catch {}
    return currentUserName || 'Profissional';
  });

  // Filtro ativo de visualização no Dashboard: 'all' (Todo o Salão) ou nome do profissional
  const [selectedFilterPro, setSelectedFilterPro] = useState<string>(() => {
    try {
      const savedRole = localStorage.getItem('vagou_dashboard_user_role');
      const savedPro = localStorage.getItem('vagou_dashboard_selected_pro');
      if (savedRole === 'professional') {
        return localStorage.getItem('vagou_dashboard_logged_pro_name') || currentUserName || 'Profissional';
      }
      if (savedPro) return savedPro;
    } catch {}
    return 'all';
  });

  // Estados de Filtro para os Atendimentos do Painel
  const [timeFilter, setTimeFilter] = useState<'proximo' | 'hoje' | 'semana' | 'mes'>('proximo');

  // Mapa local de status do atendimento (Ex: 'EM ANDAMENTO' ou 'CONCLUÍDO')
  const [localAppointmentStatuses, setLocalAppointmentStatuses] = useState<Record<string, string>>({});

  const handleUpdateAppointmentStatus = useCallback((appKey: string, newStatus: string) => {
    hapticLight();
    setLocalAppointmentStatuses((prev) => ({
      ...prev,
      [appKey]: newStatus,
    }));
  }, []);

  // Meta Mensal configurada pelo profissional (persistida no localStorage)
  const [targetAmount, setTargetAmount] = useState<number>(() => {
    try {
      const s = localStorage.getItem('vagou_monthly_goal');
      if (s) {
        const val = Number(s);
        if (val > 0) return val;
      }
    } catch {}
    return 0;
  });

  const handleUpdateTarget = useCallback((newTarget: number) => {
    setTargetAmount(newTarget);
    try {
      localStorage.setItem('vagou_monthly_goal', String(newTarget));
    } catch {}
  }, []);

  // Função utilitária para verificar se um agendamento pertence ao profissional filtrado
  const matchesSelectedPro = useCallback((app: BookingAppointment) => {
    if (selectedFilterPro === 'all') return true;
    const appPro = (app.professionalName || app.professional || '').trim().toLowerCase();
    const target = selectedFilterPro.trim().toLowerCase();
    if (!appPro) return false;
    return appPro.includes(target) || target.includes(appPro);
  }, [selectedFilterPro]);

  // Contagem para Badges das categorias no período selecionado
  const categoryCounts = React.useMemo(() => {
    const counts = {
      concluidos: 0,
      confirmados: 0,
      pendentes: 0,
      cancelados: 0,
    };

    appointments.forEach((app) => {
      // Filtragem por Profissional Ativo
      if (!matchesSelectedPro(app)) return;

      let appDate = new Date();
      if (app.dateIso) {
        appDate = new Date(app.dateIso + 'T00:00:00');
      } else {
        const match = app.dateTime?.match(/(\d{2})\/(\d{2})/);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const year = new Date().getFullYear();
          appDate = new Date(year, month, day);
        } else if (app.dayGroup === 'Hoje' || app.dateTime?.includes('Hoje')) {
          appDate = new Date();
        }
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      let matchesTime = true;
      if (timeFilter === 'hoje') {
        matchesTime = appDate >= todayStart && appDate <= todayEnd;
      } else if (timeFilter === 'proximo') {
        matchesTime = appDate >= todayStart;
      } else if (timeFilter === 'semana') {
        const sunday = new Date(todayStart);
        sunday.setDate(todayStart.getDate() - todayStart.getDay());
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        saturday.setHours(23, 59, 59, 999);
        matchesTime = appDate >= sunday && appDate <= saturday;
      } else if (timeFilter === 'mes') {
        matchesTime = appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
      }

      if (matchesTime) {
        const st = (app.status || '').toUpperCase();
        if (st === 'CONCLUÍDO' || st === 'CONCLUIDO') {
          counts.concluidos++;
        } else if (st === 'CONFIRMADO' || st === 'AGENDADO') {
          counts.confirmados++;
        } else if (st === 'PENDENTE' || st === 'ALTERADO') {
          counts.pendentes++;
        } else if (st === 'CANCELADO') {
          counts.cancelados++;
        }
      }
    });

    return counts;
  }, [appointments, timeFilter, matchesSelectedPro]);

  // Atendimento iniciado e em andamento no momento (se houver)
  const inProgressAppointment = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return appointments.find((app) => {
      if (!matchesSelectedPro(app)) return false;
      const appKey = app.protocolCode || app.id || `${app.time}-${app.clientName}`;
      const effectiveStatus = localAppointmentStatuses[appKey] || app.status || '';
      const st = effectiveStatus.toUpperCase();
      if (!st.includes('ATEND') && !st.includes('INICI')) return false;

      let appDate = new Date();
      if (app.dateIso) {
        appDate = new Date(app.dateIso + 'T00:00:00');
      } else {
        const match = app.dateTime?.match(/(\d{2})\/(\d{2})/);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const year = new Date().getFullYear();
          appDate = new Date(year, month, day);
        } else if (app.dayGroup === 'Hoje' || app.dateTime?.includes('Hoje')) {
          appDate = new Date();
        }
      }
      return appDate >= todayStart && appDate <= todayEnd;
    }) || null;
  }, [appointments, matchesSelectedPro, localAppointmentStatuses]);

  // Próximo atendimento do dia para o profissional ativo (excluindo os já iniciados)
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const upcoming = appointments.filter((app) => {
      if (!matchesSelectedPro(app)) return false;
      const appKey = app.protocolCode || app.id || `${app.time}-${app.clientName}`;
      const effectiveStatus = localAppointmentStatuses[appKey] || app.status || '';
      const st = effectiveStatus.toUpperCase();
      if (st === 'CANCELADO' || st === 'CONCLUÍDO' || st === 'CONCLUIDO' || st.includes('ATEND') || st.includes('INICI')) return false;

      let appDate = new Date();
      if (app.dateIso) {
        appDate = new Date(app.dateIso + 'T00:00:00');
      } else {
        const match = app.dateTime?.match(/(\d{2})\/(\d{2})/);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const year = new Date().getFullYear();
          appDate = new Date(year, month, day);
        }
      }
      return appDate >= todayStart && appDate <= todayEnd;
    });

    return upcoming.sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0] || null;
  }, [appointments, matchesSelectedPro, localAppointmentStatuses]);

  // Ação de iniciar atendimento do próximo cliente
  const handleStartAppointment = useCallback((protocolCode?: string) => {
    if (!protocolCode) return;
    hapticSuccess();
    setLocalAppointmentStatuses((prev) => ({
      ...prev,
      [protocolCode]: 'EM ATENDIMENTO'
    }));

    if (onUpdateAppointments && appointments.length > 0) {
      const updated = appointments.map((a) => {
        if (a.protocolCode === protocolCode) {
          return { ...a, status: 'EM ATENDIMENTO' };
        }
        return a;
      });
      onUpdateAppointments(updated);
      try {
        localStorage.setItem('vagou_salon_appointments', JSON.stringify(updated));
      } catch {}
    }
  }, [appointments, onUpdateAppointments]);

  // Estado para o Checkout PIX Pós-Serviço
  const [pixCheckoutAppointment, setPixCheckoutAppointment] = useState<BookingAppointment | null>(null);

  // Ação de finalizar atendimento em andamento e abrir o PixCheckoutModal
  const handleCompleteAppointment = useCallback((protocolCode?: string, targetApp?: BookingAppointment) => {
    if (!protocolCode) return;
    hapticSuccess();
    setLocalAppointmentStatuses((prev) => ({
      ...prev,
      [protocolCode]: 'CONCLUÍDO'
    }));

    const matchedApp =
      targetApp ||
      appointments.find((a) => a.protocolCode === protocolCode || a.id === protocolCode) ||
      null;

    if (onUpdateAppointments && appointments.length > 0) {
      const updated = appointments.map((a) => {
        if (a.protocolCode === protocolCode || a.id === protocolCode) {
          return { ...a, status: 'CONCLUÍDO' };
        }
        return a;
      });
      onUpdateAppointments(updated);
      try {
        localStorage.setItem('vagou_salon_appointments', JSON.stringify(updated));
      } catch {}
    }

    if (matchedApp) {
      setPixCheckoutAppointment(matchedApp);
    }
  }, [appointments, onUpdateAppointments]);

  // Estados para o Modal Operacional de Atendimento (Iniciar, Pausar, Adicionar Mais Tempo, Concluir, Transferir)
  const [actionModalAppointment, setActionModalAppointment] = useState<BookingAppointment | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [timeExtensionFeedback, setTimeExtensionFeedback] = useState<string | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState<string | null>(null);

  // Fila ativa de hoje para o profissional ativo (excluindo concluídos e cancelados)
  const todayActiveAppointments = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const activeList = appointments.filter((app) => {
      if (!matchesSelectedPro(app)) return false;
      const appKey = app.protocolCode || app.id || `${app.time}-${app.clientName}`;
      const effectiveStatus = localAppointmentStatuses[appKey] || app.status || '';
      const st = effectiveStatus.toUpperCase();
      if (st === 'CANCELADO' || st === 'CONCLUÍDO' || st === 'CONCLUIDO') return false;

      let appDate = new Date();
      if (app.dateIso) {
        appDate = new Date(app.dateIso + 'T00:00:00');
      } else {
        const match = app.dateTime?.match(/(\d{2})\/(\d{2})/);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const year = new Date().getFullYear();
          appDate = new Date(year, month, day);
        } else if (app.dayGroup === 'Hoje' || app.dateTime?.includes('Hoje')) {
          appDate = new Date();
        }
      }
      return appDate >= todayStart && appDate <= todayEnd;
    });

    // Ordenação: 1º em atendimento / pausado, depois por horário ascendente
    return activeList.sort((a, b) => {
      const keyA = a.protocolCode || a.id || `${a.time}-${a.clientName}`;
      const keyB = b.protocolCode || b.id || `${b.time}-${b.clientName}`;
      const stA = (localAppointmentStatuses[keyA] || a.status || '').toUpperCase();
      const stB = (localAppointmentStatuses[keyB] || b.status || '').toUpperCase();
      const isProgA = stA.includes('ATEND') || stA.includes('INICI') || stA.includes('PAUS');
      const isProgB = stB.includes('ATEND') || stB.includes('INICI') || stB.includes('PAUS');

      if (isProgA && !isProgB) return -1;
      if (!isProgA && isProgB) return 1;

      return (a.time || '').localeCompare(b.time || '');
    });
  }, [appointments, matchesSelectedPro, localAppointmentStatuses]);

  const firstCardAppointment = todayActiveAppointments[0] || null;
  const secondCardAppointment = todayActiveAppointments[1] || null;

  // Trava Operacional de Mitigação: O próximo atendimento não pode ser iniciado sem a conclusão ou definição do anterior
  const isModalBlockedByPrevious = useMemo(() => {
    if (!actionModalAppointment || !firstCardAppointment) return false;
    const modalKey = actionModalAppointment.protocolCode || actionModalAppointment.id || `${actionModalAppointment.time}-${actionModalAppointment.clientName}`;
    const firstKey = firstCardAppointment.protocolCode || firstCardAppointment.id || `${firstCardAppointment.time}-${firstCardAppointment.clientName}`;

    // Se o agendamento no modal for o segundo (ou posterior ao primeiro), verifica se o primeiro ainda está ativo
    if (modalKey !== firstKey) {
      const firstStatus = (localAppointmentStatuses[firstKey] || firstCardAppointment.status || '').toUpperCase();
      const isFirstFinished = firstStatus.includes('CONCLU') || firstStatus.includes('CANCEL');
      return !isFirstFinished;
    }
    return false;
  }, [actionModalAppointment, firstCardAppointment, localAppointmentStatuses]);

  // Colegas da equipe disponíveis para transferência (excluindo o profissional atual)
  const availableColleaguesForTransfer = useMemo(() => {
    const currentProName = (activeProId || selectedFilterPro || currentUserName || '').trim().toLowerCase();
    const list = teamList.filter((m) => {
      const mName = m.name.trim().toLowerCase();
      const mId = m.id.trim().toLowerCase();
      if (mName === currentProName || mId === currentProName) return false;
      if (selectedFilterPro !== 'all' && (mName.includes(selectedFilterPro.toLowerCase()) || selectedFilterPro.toLowerCase().includes(mName))) {
        return false;
      }
      return true;
    });
    return list;
  }, [teamList, activeProId, selectedFilterPro, currentUserName]);

  // Abertura do Modal de Operações do Atendimento
  const handleOpenActionModal = useCallback((app: BookingAppointment) => {
    hapticLight();
    const appKey = app.protocolCode || app.id || `${app.time}-${app.clientName}`;
    const effectiveStatus = localAppointmentStatuses[appKey] || app.status || 'CONFIRMADO';
    setActionModalAppointment({ ...app, status: effectiveStatus });
    setTimeExtensionFeedback(null);
    setIsTransferOpen(false);
    setTransferSuccessMessage(null);
    setIsActionModalOpen(true);
  }, [localAppointmentStatuses]);

  // Transferência / Repasse de Atendimento para outro profissional do mesmo estabelecimento (Apenas se NÃO iniciado)
  const handleTransferAppointment = useCallback((targetPro: DashboardTeamMember) => {
    if (!actionModalAppointment) return;
    const appKey = actionModalAppointment.protocolCode || actionModalAppointment.id || `${actionModalAppointment.time}-${actionModalAppointment.clientName}`;
    const effectiveStatus = (localAppointmentStatuses[appKey] || actionModalAppointment.status || '').toUpperCase();
    
    // Trava lógica estrita: atendimento já iniciado não pode ser transferido
    if (effectiveStatus.includes('ATEND') || effectiveStatus.includes('INICI')) {
      return;
    }

    hapticSuccess();

    const updatedList = appointments.map((a) => {
      const k = a.protocolCode || a.id || `${a.time}-${a.clientName}`;
      if (k === appKey) {
        return {
          ...a,
          professional: targetPro.name,
          professionalName: targetPro.name,
          professionalId: targetPro.id,
        };
      }
      return a;
    });

    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }
    try {
      localStorage.setItem('vagou_salon_appointments', JSON.stringify(updatedList));
    } catch {}

    setTransferSuccessMessage(`Atendimento transferido para ${targetPro.name}!`);
    setTimeout(() => {
      setTransferSuccessMessage(null);
      setIsTransferOpen(false);
      setIsActionModalOpen(false);
      setActionModalAppointment(null);
    }, 1200);
  }, [actionModalAppointment, appointments, onUpdateAppointments]);

  // Ações do Modal de Atendimento: Iniciar / Retomar, Pausar, Adicionar Tempo, Concluir
  const handleStartFromModal = useCallback(() => {
    if (!actionModalAppointment || isModalBlockedByPrevious) return;
    const protocolCode = actionModalAppointment.protocolCode || actionModalAppointment.id;
    handleStartAppointment(protocolCode);
    setActionModalAppointment((prev) => prev ? { ...prev, status: 'EM ATENDIMENTO' } : null);
  }, [actionModalAppointment, isModalBlockedByPrevious, handleStartAppointment]);

  const handlePauseFromModal = useCallback(() => {
    if (!actionModalAppointment) return;
    hapticMedium();
    const appKey = actionModalAppointment.protocolCode || actionModalAppointment.id || `${actionModalAppointment.time}-${actionModalAppointment.clientName}`;
    const currentSt = (localAppointmentStatuses[appKey] || actionModalAppointment.status || '').toUpperCase();
    const newSt = currentSt === 'PAUSADO' ? 'EM ATENDIMENTO' : 'PAUSADO';

    setLocalAppointmentStatuses((prev) => ({
      ...prev,
      [appKey]: newSt
    }));

    const updatedApp = { ...actionModalAppointment, status: newSt };
    setActionModalAppointment(updatedApp);

    if (onUpdateAppointments && appointments.length > 0) {
      const updatedList = appointments.map((a) => {
        const k = a.protocolCode || a.id || `${a.time}-${a.clientName}`;
        if (k === appKey) {
          return { ...a, status: newSt };
        }
        return a;
      });
      onUpdateAppointments(updatedList);
      try {
        localStorage.setItem('vagou_salon_appointments', JSON.stringify(updatedList));
      } catch {}
    }
  }, [actionModalAppointment, localAppointmentStatuses, onUpdateAppointments, appointments]);

  const handleAddMoreTime = useCallback((additionalMinutes: number) => {
    if (!actionModalAppointment) return;
    hapticLight();
    const currentDur = getAppointmentDurationMinutes(actionModalAppointment);
    const newDur = currentDur + additionalMinutes;
    const newDurText = newDur >= 60 
      ? `${Math.floor(newDur / 60)}h${newDur % 60 > 0 ? (newDur % 60) + 'min' : ''}`
      : `${newDur} min`;

    const appKey = actionModalAppointment.protocolCode || actionModalAppointment.id || `${actionModalAppointment.time}-${actionModalAppointment.clientName}`;
    
    const updatedApp: BookingAppointment = {
      ...actionModalAppointment,
      duration: newDurText,
      durationMinutes: newDur,
    };
    setActionModalAppointment(updatedApp);

    const { endTimeHhMm } = calculateAppointmentTimes(updatedApp);
    setTimeExtensionFeedback(`+${additionalMinutes} min adicionados (término previsto às ${endTimeHhMm})`);

    if (onUpdateAppointments && appointments.length > 0) {
      const updatedList = appointments.map((a) => {
        const k = a.protocolCode || a.id || `${a.time}-${a.clientName}`;
        if (k === appKey) {
          return updatedApp;
        }
        return a;
      });
      onUpdateAppointments(updatedList);
      try {
        localStorage.setItem('vagou_salon_appointments', JSON.stringify(updatedList));
      } catch {}
    }
  }, [actionModalAppointment, onUpdateAppointments, appointments]);

  const handleCompleteFromModal = useCallback(() => {
    if (!actionModalAppointment) return;
    const protocolCode = actionModalAppointment.protocolCode || actionModalAppointment.id;
    handleCompleteAppointment(protocolCode, actionModalAppointment);
    setIsActionModalOpen(false);
    setActionModalAppointment(null);
  }, [actionModalAppointment, handleCompleteAppointment]);

  // 1. Resumo Financeiro Rápido (Linguagem Direta: Caixa, Previsão, Ticket Médio e Líquido)
  const financialQuickSummary = useMemo(() => {
    let realizedRevenue = 0;
    let completedCount = 0;
    let forecastRevenue = 0;
    let pendingCount = 0;

    appointments.forEach((app) => {
      if (!matchesSelectedPro(app)) return;
      const val = Number(app.totalPrice) || 45;
      const st = (app.status || '').toUpperCase();
      if (st === 'CONCLUÍDO' || st === 'CONCLUIDO') {
        realizedRevenue += val;
        completedCount += 1;
      } else if (st !== 'CANCELADO') {
        forecastRevenue += val;
        pendingCount += 1;
      }
    });

    // Se não há agendamentos concluídos ou previstos, mantem 0
    const averageTicket = completedCount > 0 ? realizedRevenue / completedCount : 0;
    const isOwner = userRole === 'admin' || currentPersona === 'admin';
    const activeMember = teamList.find(m => m.name === loggedProfessionalName);
    const commissionRate = isOwner ? 100 : (activeMember?.commissionRate ?? 60);
    const netProfitOrCommission = (realizedRevenue * commissionRate) / 100;

    return {
      realizedRevenue,
      completedCount,
      forecastRevenue,
      pendingCount,
      averageTicket,
      netProfitOrCommission,
      isOwner,
    };
  }, [appointments, matchesSelectedPro, userRole, currentPersona, teamList, loggedProfessionalName]);

  // 2. Gráfico de Evolução de Clientes nos Últimos 7 Dias
  const weekEvolutionData = useMemo<DayEvolutionData[]>(() => {
    const days: DayEvolutionData[] = [];
    const now = new Date();
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      let count = 0;
      let rev = 0;

      appointments.forEach((app) => {
        if (!matchesSelectedPro(app)) return;
        let appDate = new Date();
        if (app.dateIso) {
          appDate = new Date(app.dateIso + 'T00:00:00');
        } else {
          const match = app.dateTime?.match(/(\d{2})\/(\d{2})/);
          if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const year = new Date().getFullYear();
            appDate = new Date(year, month, day);
          } else if (app.dayGroup === 'Hoje' || app.dateTime?.includes('Hoje')) {
            appDate = new Date();
          }
        }

        if (appDate >= dayStart && appDate <= dayEnd) {
          const st = (app.status || '').toUpperCase();
          if (st !== 'CANCELADO') {
            count += 1;
            rev += Number(app.totalPrice) || 50;
          }
        }
      });

      if (count === 0 && i > 0) {
        count = 0;
        rev = 0;
      }

      days.push({
        dayLabel: i === 0 ? 'Hoje' : dayNames[d.getDay()],
        dateStr: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        clientsCount: count,
        totalRevenue: rev,
      });
    }
    return days;
  }, [appointments, matchesSelectedPro]);

  // Valores de Faturamento Diário e Semanal para o Velocímetro de Metas
  const dailyRealizedRevenue = useMemo(() => {
    const today = weekEvolutionData[weekEvolutionData.length - 1];
    return today && today.totalRevenue > 0 ? today.totalRevenue : 165;
  }, [weekEvolutionData]);

  const weeklyRealizedRevenue = useMemo(() => {
    const sum = weekEvolutionData.reduce((acc, d) => acc + d.totalRevenue, 0);
    return sum > 0 ? sum : 980;
  }, [weekEvolutionData]);

  const renderAppointmentButtonCard = (app: BookingAppointment, cardIndex: number) => {
    const appKey = app.protocolCode || app.id || `${app.time}-${app.clientName}`;
    const effectiveStatus = (localAppointmentStatuses[appKey] || app.status || '').toUpperCase();
    const isProgress = effectiveStatus.includes('ATEND') || effectiveStatus.includes('INICI');
    const isPaused = effectiveStatus.includes('PAUS');

    const rawFullName = (app.clientName || app.customerName || 'Cliente').trim();
    const firstName = rawFullName.split(' ')[0] || 'Cliente';
    const serviceText = app.serviceName || app.service || app.serviceTitle || 'Atendimento';

    const { startTimeStr, durationHhMm, endTimeHhMm, durationMinutes } = calculateAppointmentTimes(app);

    // Formatação de telefone e link para WhatsApp com 1 toque
    const clientPhone = (app.clientPhone || app.customerPhone || '').replace(/\D/g, '');
    const hasPhone = clientPhone.length >= 10;
    const whatsappUrl = hasPhone 
      ? `https://wa.me/55${clientPhone}?text=${encodeURIComponent(`Olá ${firstName}! Tudo bem? Seu atendimento de ${serviceText} no Vagou está próximo. Já estou com tudo pronto na bancada!`)}`
      : null;

    // Card 1: Ficha Sintética Operacional de Bancada (Próximo / Em Atendimento)
    if (cardIndex === 1) {
      return (
        <div
          key={appKey}
          id="professional-next-appointment-card"
          className={`w-full rounded border select-none transition-all duration-200 overflow-hidden ${
            isDark 
              ? isProgress 
                ? 'bg-slate-900 border-emerald-500/80 ring-1 ring-emerald-500/40' 
                : 'bg-slate-900 border-slate-800' 
              : isProgress 
                ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-500/40' 
                : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          {/* Faixa Superior: Status + Horário + Controles Rápidos */}
          <div className={`px-3 py-2 border-b flex items-center justify-between ${
            isProgress 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                isProgress
                  ? 'bg-emerald-500 text-white'
                  : isPaused
                    ? 'bg-amber-500 text-white'
                    : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
              }`}>
                {isProgress ? (
                  <>
                    <Zap className="w-2.5 h-2.5 text-white fill-white animate-pulse" />
                    <span>Na Cadeira</span>
                  </>
                ) : isPaused ? (
                  <>
                    <Pause className="w-2.5 h-2.5 text-white fill-white" />
                    <span>Pausado</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-2.5 h-2.5" />
                    <span>Próximo Atendimento</span>
                  </>
                )}
              </span>

              <span className="font-mono text-xs font-bold text-slate-400">
                {startTimeStr} → {endTimeHhMm} ({durationHhMm})
              </span>
            </div>

            {/* Valor do Serviço */}
            <div className="flex items-center gap-1 font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
              <span>R$ {Number(app.totalPrice || 45).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {/* Corpo: Mini-Ficha do Cliente (Foto + Nome + Serviço + Badges Operacionais) */}
          <div className="p-3 flex items-center justify-between gap-3">
            <div 
              onClick={() => handleOpenActionModal(app)}
              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
              title="Clique para abrir detalhes do atendimento"
            >
              {/* Foto ou Avatar com Inicial */}
              <div className={`w-11 h-11 rounded shrink-0 flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden border ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <User className="w-6 h-6 stroke-[1.75]" />
              </div>

              {/* Nome + Serviço + Tag de Ficha */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className={`font-bold text-sm truncate leading-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {rawFullName}
                  </h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    Cliente Cadastrado
                  </span>
                </div>

                <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                  <Scissors className="w-3 h-3 shrink-0 text-slate-400" />
                  <span>{serviceText}</span>
                </p>
              </div>
            </div>

            {/* Ações Rápidas de Bancada: WhatsApp + Iniciar / Concluir */}
            <div className="flex items-center gap-1.5 shrink-0">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticLight();
                  }}
                  className={`w-9 h-9 rounded border flex items-center justify-center transition active:scale-95 cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-750' 
                      : 'bg-slate-100 border-slate-200 text-emerald-600 hover:bg-slate-200'
                  }`}
                  title={`Enviar WhatsApp para ${firstName}`}
                >
                  <MessageCircle className="w-4 h-4 fill-emerald-500/20" />
                </a>
              )}

              {isProgress ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const protocolCode = app.protocolCode || app.id;
                    handleCompleteAppointment(protocolCode, app);
                  }}
                  className="h-9 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                  title="Finalizar Serviço & Cobrar PIX"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5] text-white" />
                  <span className="hidden sm:inline">Finalizar Serviço</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const protocolCode = app.protocolCode || app.id;
                    handleStartAppointment(protocolCode);
                  }}
                  className="h-9 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                  title="Iniciar Atendimento na Cadeira"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Iniciar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Card 2: Subsequente Sintético Compacto
    return (
      <button
        key={appKey}
        id="professional-subsequent-appointment-card"
        type="button"
        onClick={() => handleOpenActionModal(app)}
        style={{ height: '62px' }}
        title={`Subsequente: ${rawFullName} às ${startTimeStr}`}
        className={`grid grid-cols-[0.8fr_0.8fr_1.4fr_1fr] rounded border overflow-hidden select-none w-full text-left cursor-pointer active:scale-[0.99] transition hover:shadow-xs ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-white hover:border-slate-700' 
            : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-slate-300'
        }`}
      >
        {/* Coluna 1: Horário */}
        <div className={`flex flex-col items-center justify-center text-center p-0.5 border-r overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-900'
        }`}>
          <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-500 leading-none mb-0.5">
            Seguinte
          </span>
          <span className="font-mono font-black text-sm leading-none">
            {startTimeStr}
          </span>
        </div>

        {/* Coluna 2: Foto + Nome */}
        <div className={`flex flex-col h-full w-full p-0 border-r overflow-hidden ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className={`h-[65%] w-full flex items-center justify-center p-0.5 border-b ${
            isDark ? 'bg-slate-800/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className={`w-[90%] h-[90%] max-w-[34px] max-h-[34px] aspect-square rounded flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ${
              isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700'
            }`}>
              <User className="w-[65%] h-[65%] stroke-[1.75]" />
            </div>
          </div>
          <div className={`h-[35%] w-full flex items-center justify-center px-0.5 ${
            isDark ? 'bg-slate-900/60' : 'bg-white'
          }`}>
            <span className={`font-bold truncate max-w-full text-[9px] leading-tight text-center ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {firstName}
            </span>
          </div>
        </div>

        {/* Coluna 3: Serviço */}
        <div className={`flex items-center justify-center text-center px-1.5 py-0.5 border-r overflow-hidden ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <p className={`text-[10px] font-bold text-center leading-snug line-clamp-2 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            {serviceText}
          </p>
        </div>

        {/* Coluna 4: Duração e Término */}
        <div className="flex flex-col h-full w-full p-0 overflow-hidden">
          <div className={`flex-1 w-full flex items-center justify-center border-b px-1 font-mono text-[10px] font-bold ${
            isDark ? 'bg-slate-850 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <span>{durationHhMm}</span>
          </div>
          <div className={`flex-1 w-full flex items-center justify-center px-1 font-mono text-[10.5px] font-bold ${
            isDark ? 'bg-slate-900 text-emerald-400' : 'bg-slate-50 text-emerald-600'
          }`}>
            <span>térm. {endTimeHhMm}</span>
          </div>
        </div>
      </button>
    );
  };

  const renderEmptyAppointmentCard = (cardIndex: number) => {
    if (cardIndex === 1) {
      return (
        <div 
          id="professional-next-appointment-card"
          style={{ height: '65px' }}
          className={`p-2 rounded border flex flex-col items-center justify-center select-none w-full text-center ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
          }`}
        >
          <Clock className={`w-4 h-4 mb-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
          <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
            Próximo Atendimento
          </p>
          <p className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Sem atendimento agendado no momento
          </p>
        </div>
      );
    }

    return (
      <div 
        id="professional-subsequent-appointment-card-empty"
        style={{ height: '65px' }}
        className={`p-2 rounded border border-dashed flex items-center justify-center gap-2 select-none w-full text-center ${
          isDark ? 'bg-slate-900/40 border-slate-800/80 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <Clock className="w-3.5 h-3.5 opacity-60" />
        <span className="text-[10.5px] font-medium">Sem agendamento subsequente na fila</span>
      </div>
    );
  };

  return (
    <div className={`w-full h-full flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 2. Conteúdo Rolável: Fila & Agenda seguido de Dashboard & Metas */}
      <div className="p-2 flex flex-col gap-3 flex-1">
        {/* Bloco de Atendimentos Prioritários: Atual / Próximo e Subsequente (Acima de Próximas Vagas Livres) */}
        <div className="space-y-2">
          {/* Título do Grupo de Atendimento */}
          <div className="flex items-center justify-between px-0.5 pt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Fila de Atendimento da Cadeira</span>
            </span>
          </div>

          {/* Card 1: Próximo / Em Atendimento */}
          {firstCardAppointment ? (
            renderAppointmentButtonCard(firstCardAppointment, 1)
          ) : (
            renderEmptyAppointmentCard(1)
          )}

          {/* Card 2: Próximo Atendimento após este (Subsequente) */}
          {secondCardAppointment ? (
            renderAppointmentButtonCard(secondCardAppointment, 2)
          ) : (
            firstCardAppointment && renderEmptyAppointmentCard(2)
          )}
        </div>

        {/* Itens de Dashboard & Caixa Operacional (Posicionados abaixo da Fila & Atendimentos) */}
        <div className="space-y-3 pb-6">
          {/* Bloco 1: KPIs Principais (Copiado da Seção Caixa) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Caixa Realizado */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Caixa Realizado</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-1">
                <span className="text-lg font-black font-mono tracking-tight text-emerald-400">
                  R$ {financialQuickSummary.realizedRevenue.toFixed(2).replace('.', ',')}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {financialQuickSummary.completedCount} {financialQuickSummary.completedCount === 1 ? 'atendimento' : 'atendimentos'}
                </p>
              </div>
            </div>

            {/* Previsão Restante */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previsão Aberta</span>
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="mt-1">
                <span className="text-lg font-black font-mono tracking-tight text-amber-400">
                  R$ {financialQuickSummary.forecastRevenue.toFixed(2).replace('.', ',')}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {financialQuickSummary.pendingCount} {financialQuickSummary.pendingCount === 1 ? 'agendamento' : 'agendamentos'}
                </p>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket Médio</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="mt-1">
                <span className={`text-base font-black font-mono tracking-tight ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  R$ {financialQuickSummary.averageTicket.toFixed(2).replace('.', ',')}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">Por cliente atendido</p>
              </div>
            </div>

            {/* Lucro Líquido do Salão / Meu Bolso */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              isDark ? 'bg-slate-900/90 border-emerald-500/40' : 'bg-white border-emerald-300 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {financialQuickSummary.isOwner ? 'Lucro Líquido' : 'Meu Bolso'}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-1">
                <span className="text-base font-black font-mono tracking-tight text-emerald-400">
                  R$ {financialQuickSummary.netProfitOrCommission.toFixed(2).replace('.', ',')}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {financialQuickSummary.isOwner ? 'Após repasses & taxas' : 'Livre de comissão'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Grupo: Metas & Turnos */}
          <div className="space-y-1.5">
            {/* Cabeçalho do Grupo de Metas & Turnos */}
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Target className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-xs font-bold font-['Poppins']">
                  Metas & Turnos
                </span>
              </div>
            </div>

            {/* Card Unificado: Velocímetro de Metas e Evolução por Turno Lado a Lado */}
            <GoalsAndShiftsCard
              currentAmount={financialQuickSummary.realizedRevenue}
              dailyAmount={dailyRealizedRevenue}
              weeklyAmount={weeklyRealizedRevenue}
              targetAmount={targetAmount}
              averageTicket={financialQuickSummary.averageTicket}
              remainingDays={10}
              appointments={appointments}
              activeProId={activeProId}
              selectedFilterPro={selectedFilterPro}
              matchesSelectedPro={matchesSelectedPro}
              onUpdateTarget={handleUpdateTarget}
            />
          </div>
        </div>
      </div>

      {/* Modal Operacional de Atendimento (Iniciar, Pausar, Adicionar Mais Tempo, Concluir) */}
      {isActionModalOpen && actionModalAppointment && (() => {
        const appKey = actionModalAppointment.protocolCode || actionModalAppointment.id || `${actionModalAppointment.time}-${actionModalAppointment.clientName}`;
        const effectiveStatus = (localAppointmentStatuses[appKey] || actionModalAppointment.status || '').toUpperCase();
        const isProgress = effectiveStatus.includes('ATEND') || effectiveStatus.includes('INICI');
        const isPaused = effectiveStatus.includes('PAUS');

        const clientFullName = (actionModalAppointment.clientName || actionModalAppointment.customerName || 'Cliente').trim();
        const serviceName = actionModalAppointment.serviceName || actionModalAppointment.service || actionModalAppointment.serviceTitle || 'Serviço';
        const { startTimeStr, durationMinutes, durationHhMm, endTimeHhMm } = calculateAppointmentTimes(actionModalAppointment);

        return (
          <div 
            id="professional-appointment-action-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => {
              setIsActionModalOpen(false);
              setActionModalAppointment(null);
            }}
          >
            <div 
              id="professional-appointment-action-modal"
              className={`w-full max-w-sm rounded border p-4 flex flex-col gap-3.5 shadow-2xl relative select-none animate-in zoom-in-95 duration-150 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho do Modal com Status e Fechar */}
              <div className="flex items-center justify-between border-b pb-2.5 border-slate-800/80">
                <div className="flex items-center gap-2">
                  {isProgress ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3 text-white fill-white animate-pulse" />
                      <span>Em Atendimento</span>
                    </span>
                  ) : isPaused ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Pause className="w-3 h-3 text-white fill-white" />
                      <span>Atendimento Pausado</span>
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      Aguardando Início
                    </span>
                  )}
                </div>

                <button 
                  type="button"
                  id="modal-close-action-button"
                  onClick={() => {
                    hapticLight();
                    setIsActionModalOpen(false);
                    setActionModalAppointment(null);
                  }}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  }`}
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informações do Cliente e Serviço */}
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  <User className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm truncate leading-snug">
                    {clientFullName}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {serviceName}
                  </p>
                </div>
              </div>

              {/* Régua de Horários e Duração */}
              <div className={`grid grid-cols-3 gap-2 p-2.5 rounded border text-center ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                    Início
                  </span>
                  <span className={`font-mono text-xs font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {startTimeStr}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                    Duração
                  </span>
                  <span className={`font-mono text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {durationHhMm} ({durationMinutes}m)
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                    Término
                  </span>
                  <span className={`font-mono text-xs font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {endTimeHhMm}
                  </span>
                </div>
              </div>

              {/* Feedback de Adição de Tempo */}
              {timeExtensionFeedback && (
                <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{timeExtensionFeedback}</span>
                </div>
              )}

              {/* Trava Operacional: Alerta se Cadeira Ocupada pelo atendimento anterior */}
              {isModalBlockedByPrevious && (
                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-start gap-2 text-amber-300 text-xs animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="flex-1">
                    <p className="font-bold text-[11px] leading-tight text-amber-200">Cadeira Ocupada no Momento</p>
                    <p className="text-[10px] text-amber-300/80 mt-0.5 leading-snug">
                      Conclua o atendimento anterior para liberar a cadeira, ou transfira este cliente para um colega da equipe caso o procedimento atual tenha atrasado.
                    </p>
                  </div>
                </div>
              )}

              {/* Feedback de Transferência Concluída */}
              {transferSuccessMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-white font-bold text-xs flex items-center justify-center gap-2 text-center animate-in fade-in duration-150">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                  <span>{transferSuccessMessage}</span>
                </div>
              )}

              {/* Seção Principal: Ações Operacionais OU Tela de Transferência para Colega */}
              {isTransferOpen ? (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-800">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Repassar para Colega</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTransferOpen(false)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Voltar</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Selecione o profissional disponível para assumir este atendimento:
                  </p>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
                    {availableColleaguesForTransfer.map((colleague) => (
                      <div 
                        key={colleague.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition ${
                          isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {colleague.avatar ? (
                            <img src={colleague.avatar} alt={colleague.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                              {colleague.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate leading-tight">{colleague.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{colleague.roleLabel}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          id={`modal-btn-transfer-to-${colleague.id}`}
                          onClick={() => handleTransferAppointment(colleague)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider shrink-0 transition cursor-pointer active:scale-95"
                        >
                          Repassar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Ação 1: Iniciar / Retomar Atendimento OU Pausar */}
                  {!isProgress ? (
                    <button
                      type="button"
                      id="modal-btn-start-appointment"
                      disabled={isModalBlockedByPrevious}
                      onClick={handleStartFromModal}
                      className={`w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition ${
                        isModalBlockedByPrevious
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-98'
                      }`}
                      title={isModalBlockedByPrevious ? 'Conclua o atendimento anterior para iniciar este' : undefined}
                    >
                      <Zap className={`w-4 h-4 ${isModalBlockedByPrevious ? 'text-slate-500' : 'text-white fill-white'}`} />
                      <span>{isModalBlockedByPrevious ? 'Início Bloqueado (Cadeira Ocupada)' : (isPaused ? 'Retomar Atendimento' : 'Iniciar Atendimento')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="modal-btn-pause-appointment"
                      onClick={handlePauseFromModal}
                      className="w-full py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-98"
                    >
                      <Pause className="w-4 h-4 text-white fill-white" />
                      <span>Pausar Atendimento</span>
                    </button>
                  )}

                  {/* Ação 2: Adicionar Mais Tempo (Estender) */}
                  <div className={`p-2.5 rounded border flex flex-col gap-1.5 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>Adicionar Mais Tempo</span>
                      </span>
                      <span className="text-[9px] text-slate-500">
                        Estende o término
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          id={`modal-btn-add-time-${mins}`}
                          onClick={() => handleAddMoreTime(mins)}
                          className={`py-1.5 px-1 rounded border border-dashed font-mono font-bold text-[11px] flex items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 ${
                            isDark 
                              ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-white' 
                              : 'border-emerald-500/60 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                          title={`Adicionar +${mins} minutos à duração`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>{mins}m</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ação 3: Finalizar Serviço & Cobrar PIX */}
                  <button
                    type="button"
                    id="modal-btn-complete-appointment"
                    onClick={handleCompleteFromModal}
                    className="w-full py-2.5 px-4 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-98"
                  >
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>Finalizar Serviço</span>
                  </button>

                  {/* Ação 4: Repassar / Transferir Atendimento para Colega do Estabelecimento (Apenas atendimentos NÃO iniciados) */}
                  {!isProgress && (
                    <button
                      type="button"
                      id="modal-btn-open-transfer"
                      onClick={() => {
                        hapticLight();
                        setIsTransferOpen(true);
                      }}
                      className={`w-full py-2 px-3 rounded border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 ${
                        isDark 
                          ? 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white' 
                          : 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Transferir para Colega</span>
                    </button>
                  )}
                </div>
              )}

              {/* Botão Secundário Fechar */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  id="modal-btn-dismiss"
                  onClick={() => {
                    hapticLight();
                    setIsActionModalOpen(false);
                    setActionModalAppointment(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white font-medium py-1 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Checkout PIX Pós-Serviço */}
      <PixCheckoutModal
        isOpen={Boolean(pixCheckoutAppointment)}
        onClose={() => setPixCheckoutAppointment(null)}
        salonName={adminSettings?.salonName || salonName}
        salonCity={adminSettings?.cidade || 'BRASIL'}
        clientName={pixCheckoutAppointment?.clientName || pixCheckoutAppointment?.customerName || 'Cliente'}
        clientPhone={pixCheckoutAppointment?.clientPhone || pixCheckoutAppointment?.customerPhone || ''}
        serviceTitle={pixCheckoutAppointment?.serviceTitle || pixCheckoutAppointment?.service || 'Atendimento'}
        initialAmount={Number(pixCheckoutAppointment?.totalPrice || 45)}
        protocolCode={pixCheckoutAppointment?.protocolCode}
        pixKeys={adminSettings?.pixKeys}
        fallbackPixKey={adminSettings?.pixKey}
        onConfirmPaid={(paidAmount, method) => {
          if (!pixCheckoutAppointment || !onUpdateAppointments) return;
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
    </div>
  );
};
