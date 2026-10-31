import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, CreditCard, 
  ArrowUpRight, Share2, 
  Sparkles, CheckCircle2,
  Wallet, Banknote, QrCode, Receipt, Target,
  PieChart, Users, Printer, Plus, Trash2, Star
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { 
  BookingAppointment, PaymentMethod, ProfessionalTeamMember, 
  UserPersona, FinancialExpense, SalonAdminSettings, 
  SalonPixKeyItem, PixKeyType 
} from '../../types';
import { hapticLight, hapticSuccess, hapticMedium } from '../../utils/haptics';
import { ExpensesManager } from './financial/ExpensesManager';
import { BreakEvenSimulator } from './financial/BreakEvenSimulator';
import { SemiCircleGauge } from './dashboard/SemiCircleGauge';
import { ClientEvolutionChart, DayEvolutionData } from './dashboard/ClientEvolutionChart';
import { ServiceDistributionChart, ServiceStat } from './dashboard/ServiceDistributionChart';
import { syncAllLocalUtilitiesToDatabase } from '../../services/mnvSupabaseSync';
import { SalonPixPrintModal } from './SalonPixPrintModal';
import { getPixQrCodeUrl } from '../../services/pixGenerator';

export interface FinancialManagerViewProps {
  appointments: BookingAppointment[];
  onUpdateAppointments?: (appointments: BookingAppointment[]) => void;
  salonName?: string;
  currentPersona?: UserPersona;
  hideHeader?: boolean;
  hideTabs?: boolean;
  initialTab?: 'caixa' | 'despesas' | 'balanco' | 'pix_billing';
  variant?: 'full' | 'caixa';
  adminSettings?: SalonAdminSettings;
  onUpdateSettings?: (settings: Partial<SalonAdminSettings>) => Promise<any> | void;
}

export const FinancialManagerView: React.FC<FinancialManagerViewProps> = ({
  appointments = [],
  salonName = 'Meu Estabelecimento',
  hideHeader = false,
  hideTabs = false,
  initialTab = 'caixa',
  variant = 'full',
  adminSettings,
  onUpdateSettings,
}) => {
  const { isDark } = useTheme();

  // Sub-Aba do Módulo Financeiro (Caixa, PIX & Placa, Despesas, Balanço)
  const [activeTab, setActiveTab] = useState<'caixa' | 'despesas' | 'balanco' | 'pix_billing'>(initialTab);
  const [isPixPrintModalOpen, setIsPixPrintModalOpen] = useState(false);

  // Estado de Chaves PIX (hidratado de adminSettings ou localStorage)
  const [pixKeys, setPixKeys] = useState<SalonPixKeyItem[]>(() => {
    if (Array.isArray(adminSettings?.pixKeys) && adminSettings!.pixKeys.length > 0) {
      return adminSettings!.pixKeys;
    }
    if (adminSettings?.pixKey && adminSettings.pixKey.trim()) {
      return [
        {
          id: 'pix_primary_1',
          type: 'cpf',
          key: adminSettings.pixKey.trim(),
          holderName: adminSettings.legalManagerName || adminSettings.salonName || salonName,
          isPrimary: true,
          verified: true,
        },
      ];
    }
    try {
      const saved = localStorage.getItem('vagou_admin_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.pixKeys) && parsed.pixKeys.length > 0) return parsed.pixKeys;
        if (parsed.pixKey) {
          return [
            {
              id: 'pix_primary_1',
              type: 'cpf',
              key: String(parsed.pixKey).trim(),
              holderName: parsed.legalManagerName || parsed.salonName || salonName,
              isPrimary: true,
              verified: true,
            },
          ];
        }
      }
    } catch {}
    return [];
  });

  const [newPixType, setNewPixType] = useState<PixKeyType>('cpf');
  const [newPixKey, setNewPixKey] = useState('');
  const [newPixHolder, setNewPixHolder] = useState('');
  const [newPixInstitution, setNewPixInstitution] = useState('');

  const persistPixKeys = (nextKeys: SalonPixKeyItem[]) => {
    setPixKeys(nextKeys);
    const primaryPix = nextKeys.find((k) => k.isPrimary)?.key || nextKeys[0]?.key || '';
    try {
      const saved = localStorage.getItem('vagou_admin_settings');
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem(
        'vagou_admin_settings',
        JSON.stringify({ ...parsed, pixKey: primaryPix, pixKeys: nextKeys })
      );
    } catch {}
    onUpdateSettings?.({ pixKey: primaryPix, pixKeys: nextKeys });
  };

  const formatCpf = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 11);
    return raw
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  };

  const formatCnpj = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 14);
    return raw
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatPhone = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      return raw
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return raw
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  const handleAddPixKey = () => {
    const cleanKey = newPixKey.trim();
    if (!cleanKey) return;
    hapticSuccess();
    const isFirst = pixKeys.length === 0;
    const item: SalonPixKeyItem = {
      id: `pix_${Date.now()}`,
      type: newPixType,
      key: cleanKey,
      holderName: newPixHolder.trim() || adminSettings?.legalManagerName || salonName || undefined,
      institution: newPixInstitution.trim() || undefined,
      isPrimary: isFirst,
      verified: true,
    };
    const next = [...pixKeys, item];
    persistPixKeys(next);
    setNewPixKey('');
    setNewPixHolder('');
    setNewPixInstitution('');
  };

  const handleSetPrimaryPixKey = (id: string) => {
    hapticLight();
    const next = pixKeys.map((item) => ({
      ...item,
      isPrimary: item.id === id,
    }));
    persistPixKeys(next);
  };

  const handleRemovePixKey = (id: string) => {
    hapticMedium();
    const filtered = pixKeys.filter((item) => item.id !== id);
    if (filtered.length > 0 && !filtered.some((k) => k.isPrimary)) {
      filtered[0] = { ...filtered[0], isPrimary: true };
    }
    persistPixKeys(filtered);
  };

  // Filtro de Período
  const [periodFilter, setPeriodFilter] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('hoje');

  // Estado de Custos & Despesas (Persistido no localStorage)
  const [expenses, setExpenses] = useState<FinancialExpense[]>(() => {
    try {
      const saved = localStorage.getItem('vagou_financial_expenses');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Persiste despesas e sincroniza com public.salon_utilities_records (dre_records)
  useEffect(() => {
    try {
      localStorage.setItem('vagou_financial_expenses', JSON.stringify(expenses));
      localStorage.setItem('vagou_dre_records', JSON.stringify(expenses));
    } catch {}
    syncAllLocalUtilitiesToDatabase();
  }, [expenses]);

  // Handlers para despesas
  const handleAddExpense = (newExp: Omit<FinancialExpense, 'id' | 'createdAt'>) => {
    const created: FinancialExpense = {
      ...newExp,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setExpenses(prev => [created, ...prev]);
  };

  const handleToggleExpenseStatus = (id: string) => {
    setExpenses(prev => prev.map(exp => {
      if (exp.id === id) {
        return {
          ...exp,
          status: exp.status === 'paid' ? 'pending' : 'paid',
        };
      }
      return exp;
    }));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  // Carrega profissionais e suas comissões do localStorage
  const teamMembers = useMemo<ProfessionalTeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('vagou_salon_team_members');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    const ownerName = localStorage.getItem('vagou_user_name') || 'Proprietário';
    return [
      {
        id: '1',
        name: ownerName,
        email: '',
        phone: '',
        role: 'admin',
        active: true,
        specialties: [],
        commissionRate: 100,
      }
    ];
  }, []);

  // Filtragem de Agendamentos por Período
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return appointments.filter((app) => {
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

      if (periodFilter === 'hoje') {
        return appDate >= todayStart && appDate <= todayEnd;
      }
      if (periodFilter === 'semana') {
        const sunday = new Date(todayStart);
        sunday.setDate(todayStart.getDate() - todayStart.getDay());
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        saturday.setHours(23, 59, 59, 999);
        return appDate >= sunday && appDate <= saturday;
      }
      if (periodFilter === 'mes') {
        return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [appointments, periodFilter]);

  // Cálculos Consolidados
  const completedAppointments = useMemo(() => {
    return filteredAppointments.filter((app) => {
      const st = (app.status || '').toUpperCase();
      return st === 'CONCLUÍDO' || st === 'CONCLUIDO';
    });
  }, [filteredAppointments]);

  const pendingAppointments = useMemo(() => {
    return filteredAppointments.filter((app) => {
      const st = (app.status || '').toUpperCase();
      return st === 'CONFIRMADO' || st === 'PENDENTE' || st === 'EM ANDAMENTO';
    });
  }, [filteredAppointments]);

  // Faturamento Realizado (Caixa Fechado)
  const totalRealizedRevenue = useMemo(() => {
    return completedAppointments.reduce((acc, app) => acc + (Number(app.totalPrice) || 0), 0);
  }, [completedAppointments]);

  // Previsão em Aberto
  const totalForecastRevenue = useMemo(() => {
    return pendingAppointments.reduce((acc, app) => acc + (Number(app.totalPrice) || 0), 0);
  }, [pendingAppointments]);

  // Ticket Médio
  const averageTicket = useMemo(() => {
    if (completedAppointments.length === 0) return 0;
    return totalRealizedRevenue / completedAppointments.length;
  }, [completedAppointments, totalRealizedRevenue]);

  // Taxa Plataforma Vagou (R$ 2,50 por atendimento concluído)
  const totalPlatformFees = useMemo(() => {
    return completedAppointments.length * 2.50;
  }, [completedAppointments]);

  // Rateio de Comissões por Profissional
  const proFinancialStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      rate: number;
      completedCount: number;
      grossRevenue: number;
      commissionAmount: number;
      salonRetention: number;
    }> = {};

    teamMembers.forEach((m) => {
      stats[m.name] = {
        name: m.name,
        rate: m.commissionRate ?? (m.role === 'admin' ? 100 : 50),
        completedCount: 0,
        grossRevenue: 0,
        commissionAmount: 0,
        salonRetention: 0,
      };
    });

    completedAppointments.forEach((app) => {
      const proName = app.professionalName || app.professional || teamMembers[0]?.name || 'Profissional';
      if (!stats[proName]) {
        stats[proName] = {
          name: proName,
          rate: 50,
          completedCount: 0,
          grossRevenue: 0,
          commissionAmount: 0,
          salonRetention: 0,
        };
      }
      const val = Number(app.totalPrice) || 0;
      stats[proName].completedCount += 1;
      stats[proName].grossRevenue += val;
      const commission = (val * stats[proName].rate) / 100;
      stats[proName].commissionAmount += commission;
      stats[proName].salonRetention += (val - commission);
    });

    return Object.values(stats);
  }, [teamMembers, completedAppointments]);

  // Total de Comissões a Repassar
  const totalCommissionsDue = useMemo(() => {
    return proFinancialStats.reduce((acc, p) => acc + p.commissionAmount, 0);
  }, [proFinancialStats]);

  // Lucro Líquido Real Salão
  const salonNetProfit = useMemo(() => {
    return Math.max(0, totalRealizedRevenue - totalCommissionsDue - totalPlatformFees);
  }, [totalRealizedRevenue, totalCommissionsDue, totalPlatformFees]);

  // Métodos de Pagamento
  const paymentBreakdown = useMemo(() => {
    const methods: Record<string, { count: number; total: number; label: string; icon: typeof QrCode }> = {
      pix: { count: 0, total: 0, label: 'PIX Instantâneo', icon: QrCode },
      cartao_credito: { count: 0, total: 0, label: 'Cartão Crédito', icon: CreditCard },
      cartao_debito: { count: 0, total: 0, label: 'Cartão Débito', icon: Wallet },
      dinheiro: { count: 0, total: 0, label: 'Dinheiro Espécie', icon: Banknote },
      outro: { count: 0, total: 0, label: 'Outro / App Vagou', icon: Sparkles },
    };

    completedAppointments.forEach((app) => {
      const pm = (app.paymentMethod || 'pix') as PaymentMethod;
      const val = Number(app.totalPrice) || 0;
      if (methods[pm]) {
        methods[pm].count += 1;
        methods[pm].total += val;
      } else {
        methods.pix.count += 1;
        methods.pix.total += val;
      }
    });

    return Object.entries(methods).map(([key, data]) => ({
      key,
      ...data,
      percent: totalRealizedRevenue > 0 ? (data.total / totalRealizedRevenue) * 100 : 0
    }));
  }, [completedAppointments, totalRealizedRevenue]);

  // Meta Mensal configurada para o Salão
  const [salonMonthlyGoal, setSalonMonthlyGoal] = useState<number>(() => {
    try {
      const s = localStorage.getItem('vagou_salon_monthly_goal');
      if (s) {
        const val = Number(s);
        if (val > 0) return val;
      }
    } catch {}
    return 8000;
  });

  const handleUpdateSalonGoal = (val: number) => {
    setSalonMonthlyGoal(val);
    try {
      localStorage.setItem('vagou_salon_monthly_goal', String(val));
    } catch {}
  };

  // Gráfico de Evolução de Clientes nos Últimos 7 Dias (Salão Completo)
  const salonWeekEvolution = useMemo<DayEvolutionData[]>(() => {
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
  }, [appointments]);

  // Gráfico de Distribuição dos Serviços Mais Realizados (Salão Completo)
  const salonServiceDistribution = useMemo<ServiceStat[]>(() => {
    const map: Record<string, { count: number; totalRevenue: number }> = {};

    appointments.forEach((app) => {
      const title = app.service || app.serviceTitle || app.serviceName || 'Corte Degradê Navalhado';
      const price = Number(app.totalPrice) || 45;
      if (!map[title]) {
        map[title] = { count: 0, totalRevenue: 0 };
      }
      map[title].count += 1;
      map[title].totalRevenue += price;
    });

    const total = Object.values(map).reduce((acc, s) => acc + s.count, 0);
    if (total === 0) return [];
    return Object.entries(map)
      .map(([serviceName, data]) => ({
        serviceName,
        count: data.count,
        totalRevenue: data.totalRevenue,
        percentage: Math.round((data.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [appointments]);

  // Ação de Envio do Fechamento no WhatsApp
  const handleShareWhatsApp = () => {
    hapticSuccess();
    const periodName = periodFilter === 'hoje' ? 'Hoje' : periodFilter === 'semana' ? 'Esta Semana' : periodFilter === 'mes' ? 'Este Mês' : 'Período Completo';
    const dateStr = new Date().toLocaleDateString('pt-BR');

    let text = `📊 *FECHAMENTO DE CAIXA — VAGOU*\n`;
    text += `💈 *${salonName}*\n`;
    text += `🗓️ Data: ${dateStr} (${periodName})\n`;
    text += `--------------------------------\n`;
    text += `💰 *Faturamento Realizado:* R$ ${totalRealizedRevenue.toFixed(2).replace('.', ',')} (${completedAppointments.length} atendimentos)\n`;
    text += `⏳ *Previsão em Aberto:* R$ ${totalForecastRevenue.toFixed(2).replace('.', ',')} (${pendingAppointments.length} agendados)\n`;
    text += `🎯 *Ticket Médio:* R$ ${averageTicket.toFixed(2).replace('.', ',')}\n\n`;

    text += `💳 *Formas de Pagamento:*\n`;
    paymentBreakdown.forEach((p) => {
      if (p.total > 0) {
        text += ` • ${p.label}: R$ ${p.total.toFixed(2).replace('.', ',')} (${p.percent.toFixed(0)}%)\n`;
      }
    });

    text += `\n✂️ *Comissões da Equipe:*\n`;
    proFinancialStats.forEach((p) => {
      if (p.completedCount > 0) {
        text += ` • ${p.name} (${p.rate}%): R$ ${p.commissionAmount.toFixed(2).replace('.', ',')} (${p.completedCount} clientes)\n`;
      }
    });

    text += `\n--------------------------------\n`;
    text += `🏢 *Retenção Bruta Salão:* R$ ${(totalRealizedRevenue - totalCommissionsDue).toFixed(2).replace('.', ',')}\n`;
    text += `🛡️ *Taxa Plataforma Vagou:* R$ ${totalPlatformFees.toFixed(2).replace('.', ',')}\n`;
    text += `✨ *LUCRO LÍQUIDO DO SALÃO:* R$ ${salonNetProfit.toFixed(2).replace('.', ',')}\n`;
    text += `--------------------------------\n`;
    text += `📱 Gestão automatizada via *Vagou*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className={`w-full flex flex-col ${
      hideHeader ? 'bg-transparent' : 'h-full justify-between overflow-y-auto ' + (isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900')
    }`}>
      {/* 1. Header do Módulo Financeiro */}
      {!hideHeader && (
        <div className={`p-3.5 border-b shrink-0 flex items-center justify-between gap-2 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold font-['Poppins'] truncate">Módulo Financeiro</h2>
              <p className="text-[10px] text-slate-400">Caixa, Custos & Projeções</p>
            </div>
          </div>

          {/* Botão de Fechamento / WhatsApp */}
          {activeTab === 'caixa' && (
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span className="whitespace-nowrap">Enviar WhatsApp</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Sub-Abas do Financeiro em 2 Linhas de Mini-Cards: [Caixa & Entradas] | [PIX & Placa] / [Custos & Despesas] | [Balanço & Metas] */}
      {!hideTabs && (
        <div className={` shrink-0 ${
          hideHeader
            ? 'pb-2'
            : `px-3 py-2 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`
        }`}>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: 'caixa', label: 'Caixa & Entradas', icon: DollarSign },
                { id: 'pix_billing', label: 'PIX & Placa', icon: QrCode },
                { id: 'despesas', label: 'Custos & Despesas', icon: Receipt },
                { id: 'balanco', label: 'Balanço & Metas', icon: Target },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setActiveTab(tab.id);
                  }}
                  className={`py-2 px-2.5 rounded-[4px] text-[11px] font-bold border transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                      : isDark
                      ? 'bg-slate-950 text-slate-300 hover:border-emerald-500/40 border-slate-800'
                      : 'bg-white text-slate-700 hover:border-emerald-500/40 border-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                  <span className={isActive ? 'text-white' : ''}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Filtro de Período exclusivo para a aba Caixa */}
      {activeTab === 'caixa' && (
        <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 ${
          hideHeader 
            ? 'px-0 pb-3' 
            : `px-3 py-2 border-b ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`
        }`}>
          {(['hoje', 'semana', 'mes'] as const).map((p) => {
            const isActive = periodFilter === p;
            const labels = {
              hoje: 'Hoje',
              semana: 'Esta semana',
              mes: 'Este mês',
            };
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  hapticLight();
                  setPeriodFilter(p);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Corpo Rolável do Módulo Financeiro */}
      <div className={`flex-1 min-h-0 ${hideHeader ? 'p-0 space-y-3' : 'p-3 space-y-3'}`}>
        
        {/* ABA 1: CAIXA & ENTRADAS */}
        {activeTab === 'caixa' && (
          <>
            {/* Bloco 1: KPIs Principais (Layout Plano & Sem Box dentro de Box) */}
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
                    R$ {totalRealizedRevenue.toFixed(2).replace('.', ',')}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {completedAppointments.length} {completedAppointments.length === 1 ? 'atendimento' : 'atendimentos'}
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
                    R$ {totalForecastRevenue.toFixed(2).replace('.', ',')}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {pendingAppointments.length} {pendingAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
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
                    R$ {averageTicket.toFixed(2).replace('.', ',')}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Por cliente atendido</p>
                </div>
              </div>

              {/* Lucro Líquido do Salão */}
              <div className={`p-3 rounded border flex flex-col justify-between ${
                isDark ? 'bg-slate-900/90 border-emerald-500/40' : 'bg-white border-emerald-300 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Lucro Líquido</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="mt-1">
                  <span className="text-base font-black font-mono tracking-tight text-emerald-400">
                    R$ {salonNetProfit.toFixed(2).replace('.', ',')}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Após repasses & taxas</p>
                </div>
              </div>
            </div>

            {/* SEÇÃO COMPLETA: DRE, MEIOS DE PAGAMENTO E COMISSÕES (Visível na gestão financeira completa) */}
            {variant === 'full' && (
              <>
                {/* Bloco 2: Demonstrativo Financeiro / DRE do Estabelecimento */}
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <PieChart className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-100">Demonstrativo Financeiro (DRE)</h3>
                        <p className="text-[10px] text-slate-400">Visão consolidada de receitas, repasses e resultado</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {periodFilter === 'hoje' ? 'Hoje' : periodFilter === 'semana' ? 'Esta Semana' : periodFilter === 'mes' ? 'Este Mês' : 'Geral'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">(+) Faturamento Bruto Realizado</span>
                      <span className="font-mono font-bold text-slate-100">R$ {totalRealizedRevenue.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                      <span className="text-rose-400">(-) Comissões da Equipe</span>
                      <span className="font-mono font-bold text-rose-400">- R$ {totalCommissionsDue.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                      <span className="text-slate-300 font-medium">(=) Retenção Bruta do Salão</span>
                      <span className="font-mono font-bold text-slate-200">R$ {(totalRealizedRevenue - totalCommissionsDue).toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                      <span className="text-amber-400">(-) Taxa Plataforma Vagou</span>
                      <span className="font-mono font-bold text-amber-400">- R$ {totalPlatformFees.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-emerald-400 font-bold uppercase text-[11px] tracking-wider">(=) Lucro Líquido Real</span>
                      <span className="font-mono font-black text-emerald-400 text-sm">R$ {salonNetProfit.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>

                {/* Bloco 3: Entradas por Meio de Pagamento */}
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-100">Entradas por Meio de Pagamento</h3>
                        <p className="text-[10px] text-slate-400">Distribuição do faturamento por forma de recebimento</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {paymentBreakdown.map((pm) => {
                      const Icon = pm.icon;
                      return (
                        <div key={pm.key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Icon className="w-3.5 h-3.5 text-slate-400" />
                              <span>{pm.label}</span>
                              <span className="text-[10px] text-slate-500">({pm.count} {pm.count === 1 ? 'pgto' : 'pgtos'})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-100">R$ {pm.total.toFixed(2).replace('.', ',')}</span>
                              <span className="text-[10px] font-bold text-emerald-400 w-9 text-right">{pm.percent.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${pm.percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bloco 4: Comissões da Equipe no Período */}
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-100">Comissões da Equipe no Período</h3>
                        <p className="text-[10px] text-slate-400">Repasses calculados por profissional</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      Total: R$ {totalCommissionsDue.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {proFinancialStats.map((pro) => (
                      <div
                        key={pro.name}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200">{pro.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
                              {pro.rate}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {pro.completedCount} {pro.completedCount === 1 ? 'atendimento' : 'atendimentos'} • Bruto: R$ {pro.grossRevenue.toFixed(2).replace('.', ',')}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 block">Comissão</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm">
                            R$ {pro.commissionAmount.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ABA 2: CUSTOS & DESPESAS */}
        {activeTab === 'despesas' && (
          <ExpensesManager
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onToggleStatus={handleToggleExpenseStatus}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {/* ABA 3: BALANÇO & METAS */}
        {activeTab === 'balanco' && (
          <div className="space-y-3 pb-8">
            {/* 1. Velocímetro / Gráfico Meia-Lua da Meta */}
            <SemiCircleGauge
              currentAmount={totalRealizedRevenue}
              targetAmount={salonMonthlyGoal}
              averageTicket={averageTicket}
              remainingDays={10}
              onUpdateTarget={handleUpdateSalonGoal}
            />

            {/* 2. Gráfico de Evolução de Clientes nos Últimos 7 Dias */}
            <ClientEvolutionChart data={salonWeekEvolution} />

            {/* 3. Gráfico de Ranking dos Serviços Mais Realizados */}
            <ServiceDistributionChart services={salonServiceDistribution} />

            {/* 4. Simulador de Ponto de Equilíbrio & Paga de Contas */}
            <BreakEvenSimulator
              expenses={expenses}
              currentRealizedRevenue={totalRealizedRevenue}
              currentAverageTicket={averageTicket}
              completedAppointmentsCount={completedAppointments.length}
            />
          </div>
        )}

        {/* ABA 4: PIX & PLACA */}
        {activeTab === 'pix_billing' && (
          <div className={`p-3.5 rounded-[4px] border space-y-3.5 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 gap-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                  PIX & Placa ({pixKeys.length})
                </h3>
              </div>
              {pixKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setIsPixPrintModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Gerar Plaquinha QR</span>
                </button>
              )}
            </div>

            {pixKeys.length > 0 && (() => {
              const primaryItem = pixKeys.find((k) => k.isPrimary) || pixKeys[0];
              const previewQrUrl = getPixQrCodeUrl({
                pixKey: primaryItem.key,
                keyType: primaryItem.type,
                merchantName: primaryItem.holderName || adminSettings?.salonName || salonName || 'ESTABELECIMENTO',
                merchantCity: adminSettings?.cidade || 'BRASIL',
              }, 160);

              return (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-3">
                    {previewQrUrl && (
                      <div className="p-1.5 rounded-[4px] bg-white shrink-0">
                        <img
                          src={previewQrUrl}
                          alt="QR Code PIX BACEN"
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                        QR Code Oficial BACEN Ativo
                      </span>
                      <p className="text-xs font-mono font-bold">
                        {primaryItem.type.toUpperCase()}: {primaryItem.key}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Usado na Plaquinha de Balcão e no Checkout Pós-Serviço
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setIsPixPrintModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-3 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <QrCode className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Abrir Plaquinha Acrílico</span>
                  </button>
                </div>
              );
            })()}

            {pixKeys.length > 0 && (
              <div className="divide-y divide-slate-800/60">
                {pixKeys.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] bg-slate-800 text-slate-200">
                          {item.type.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono font-bold truncate">
                          {item.key}
                        </span>
                        {item.isPrimary && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] bg-emerald-500 text-white whitespace-nowrap">
                            Principal
                          </span>
                        )}
                      </div>
                      {(item.holderName || item.institution) && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {[item.holderName, item.institution].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!item.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryPixKey(item.id)}
                          className="px-2 py-1 rounded-[4px] text-[10px] font-bold bg-slate-800 hover:bg-emerald-500 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          title="Definir como Chave Principal"
                        >
                          <Star className="w-3 h-3" />
                          <span>Tornar Principal</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePixKey(item.id)}
                        className="p-1.5 rounded-[4px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="Remover chave PIX"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tipo de Chave
                </label>
                <select
                  value={newPixType}
                  onChange={(e) => setNewPixType(e.target.value as PixKeyType)}
                  className={`w-full px-2.5 py-2 rounded-[4px] border text-xs font-bold outline-hidden ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="phone">Celular</option>
                  <option value="email">E-mail</option>
                  <option value="evp">Aleatória (EVP)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Chave PIX
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newPixKey}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (newPixType === 'cpf') setNewPixKey(formatCpf(v));
                      else if (newPixType === 'cnpj') setNewPixKey(formatCnpj(v));
                      else if (newPixType === 'phone') setNewPixKey(formatPhone(v));
                      else setNewPixKey(v);
                    }}
                    placeholder={
                      newPixType === 'cpf'
                        ? '000.000.000-00'
                        : newPixType === 'cnpj'
                        ? '00.000.000/0000-00'
                        : newPixType === 'phone'
                        ? '(00) 00000-0000'
                        : newPixType === 'email'
                        ? 'pix@estabelecimento.com'
                        : 'Chave aleatória EVP'
                    }
                    className={`flex-1 px-3 py-2 rounded-[4px] border text-xs font-mono outline-hidden transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddPixKey}
                    className="px-3 py-2 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Adicionar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newPixHolder}
                onChange={(e) => setNewPixHolder(e.target.value)}
                placeholder="Titular da conta (opcional)"
                className={`w-full px-3 py-1.5 rounded-[4px] border text-xs outline-hidden transition ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                }`}
              />
              <input
                type="text"
                value={newPixInstitution}
                onChange={(e) => setNewPixInstitution(e.target.value)}
                placeholder="Banco / Instituição (opcional)"
                className={`w-full px-3 py-1.5 rounded-[4px] border text-xs outline-hidden transition ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>
        )}

      </div>

      {/* Modal de Impressão da Plaquinha Acrílica PIX */}
      <SalonPixPrintModal
        isOpen={isPixPrintModalOpen}
        onClose={() => setIsPixPrintModalOpen(false)}
        salonName={adminSettings?.salonName || salonName || 'Meu Estabelecimento'}
        salonCity={adminSettings?.cidade || 'BRASIL'}
        salonLogo={adminSettings?.salonLogo || adminSettings?.salonIcon}
        slogan={adminSettings?.slogan}
        pixKeys={pixKeys}
        fallbackPixKey={adminSettings?.pixKey}
      />
    </div>
  );
};
