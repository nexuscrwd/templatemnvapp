import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Target, 
  TrendingUp, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  DollarSign, 
  CreditCard, 
  QrCode, 
  Banknote,
  Wrench
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { BookingAppointment } from '../../../types';
import { hapticLight } from '../../../utils/haptics';

export interface CaixaDailyWeeklyCardProps {
  appointments: BookingAppointment[];
  matchesSelectedPro?: (app: BookingAppointment) => boolean;
  onNavigateToUtilitiesFinancial?: () => void;
  actionLabel?: string;
}

export const CaixaDailyWeeklyCard: React.FC<CaixaDailyWeeklyCardProps> = ({
  appointments = [],
  matchesSelectedPro,
  onNavigateToUtilitiesFinancial,
  actionLabel = 'Abrir DRE Completo',
}) => {
  const { isDark } = useTheme();

  // Alternador de Visualização: 'dia' (Caixa do Dia) | 'semana' (Caixa da Semana)
  const [viewScope, setViewScope] = useState<'dia' | 'semana'>('dia');

  // Metas persistidas
  const [dailyGoal] = useState<number>(() => {
    try {
      const s = localStorage.getItem('vagou_daily_goal');
      if (s && Number(s) > 0) return Number(s);
    } catch {}
    return 0;
  });

  const [weeklyGoal] = useState<number>(() => {
    try {
      const s = localStorage.getItem('vagou_weekly_goal');
      if (s && Number(s) > 0) return Number(s);
    } catch {}
    return 0;
  });

  // 1. DADOS DO CAIXA DO DIA (HOJE)
  const todayCashData = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let realizedAmount = 0;
    let completedCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    let pixAmount = 0;
    let cardAmount = 0;
    let cashAmount = 0;

    appointments.forEach((app) => {
      if (matchesSelectedPro && !matchesSelectedPro(app)) return;

      const st = (app.status || '').toUpperCase();
      if (st === 'CANCELADO') return;

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

      if (appDate >= todayStart && appDate <= todayEnd) {
        const val = Number(app.totalPrice) || 45;
        if (st === 'CONCLUÍDO' || st === 'CONCLUIDO') {
          realizedAmount += val;
          completedCount += 1;

          // Simulação/Distribuição por método
          const method = (app.paymentMethod || '').toLowerCase();
          if (method.includes('pix')) {
            pixAmount += val;
          } else if (method.includes('cartao') || method.includes('card') || method.includes('debito') || method.includes('credito')) {
            cardAmount += val;
          } else if (method.includes('dinheiro') || method.includes('cash')) {
            cashAmount += val;
          } else {
            // Distribuição balanceada padrão
            if (completedCount % 3 === 1) pixAmount += val;
            else if (completedCount % 3 === 2) cardAmount += val;
            else cashAmount += val;
          }
        } else {
          pendingAmount += val;
          pendingCount += 1;
        }
      }
    });

    // Zerado para estabelecimentos sem agendamentos gravados
    if (completedCount === 0 && pendingCount === 0) {
      realizedAmount = 0;
      completedCount = 0;
      pendingAmount = 0;
      pendingCount = 0;
      pixAmount = 0;
      cardAmount = 0;
      cashAmount = 0;
    }

    const projectedTotal = realizedAmount + pendingAmount;
    const progressPercent = Math.min(100, Math.round((realizedAmount / dailyGoal) * 100));
    const projectedPercent = Math.min(150, Math.round((projectedTotal / dailyGoal) * 100));

    return {
      realizedAmount,
      completedCount,
      pendingAmount,
      pendingCount,
      projectedTotal,
      progressPercent,
      projectedPercent,
      pixAmount,
      cardAmount,
      cashAmount,
    };
  }, [appointments, matchesSelectedPro, dailyGoal]);

  // 2. DADOS DO CAIXA DA SEMANA (ÚLTIMOS 7 DIAS)
  const weekCashData = useMemo(() => {
    const now = new Date();
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const days: Array<{ dayLabel: string; dateStr: string; amount: number; count: number; isToday: boolean }> = [];

    let totalWeekAmount = 0;
    let totalWeekCount = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      let dayAmount = 0;
      let dayCount = 0;

      appointments.forEach((app) => {
        if (matchesSelectedPro && !matchesSelectedPro(app)) return;

        const st = (app.status || '').toUpperCase();
        if (st === 'CANCELADO') return;

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
          if (st === 'CONCLUÍDO' || st === 'CONCLUIDO') {
            dayAmount += Number(app.totalPrice) || 45;
            dayCount += 1;
          }
        }
      });

      // Sem histórico gravado no dia
      if (dayCount === 0 && i > 0) {
        dayAmount = 0;
        dayCount = 0;
      } else if (i === 0 && dayCount === 0) {
        dayAmount = todayCashData.realizedAmount;
        dayCount = todayCashData.completedCount;
      }

      totalWeekAmount += dayAmount;
      totalWeekCount += dayCount;

      days.push({
        dayLabel: i === 0 ? 'Hoje' : dayNames[d.getDay()],
        dateStr: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        amount: dayAmount,
        count: dayCount,
        isToday: i === 0,
      });
    }

    const progressPercent = Math.min(100, Math.round((totalWeekAmount / weeklyGoal) * 100));
    const averageTicket = totalWeekCount > 0 ? Math.round(totalWeekAmount / totalWeekCount) : 48;
    const maxDayAmount = Math.max(...days.map((d) => d.amount), 1);

    return {
      days,
      totalWeekAmount,
      totalWeekCount,
      progressPercent,
      averageTicket,
      maxDayAmount,
    };
  }, [appointments, matchesSelectedPro, weeklyGoal, todayCashData]);

  return (
    <div
      id="dashboard-caixa-card"
      className={`p-3 rounded-lg border select-none transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
      }`}
    >
      {/* 1. CABEÇALHO DO CAIXA: TÍTULO & ALTERNADOR DIA / SEMANA */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/40 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-5 h-5 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Wallet className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-xs font-bold font-['Poppins']">
            Caixa & Entradas
          </span>
        </div>

        {/* Alternador de Escopo: Hoje (Dia) vs Semana */}
        <div
          className={`flex items-center p-0.5 rounded border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300 shadow-xs'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setViewScope('dia');
            }}
            className={`px-2.5 py-0.5 text-[9.5px] font-bold rounded transition cursor-pointer ${
              viewScope === 'dia'
                ? 'bg-emerald-500 text-white shadow-xs font-extrabold'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Hoje (Dia)
          </button>
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setViewScope('semana');
            }}
            className={`px-2.5 py-0.5 text-[9.5px] font-bold rounded transition cursor-pointer ${
              viewScope === 'semana'
                ? 'bg-emerald-500 text-white shadow-xs font-extrabold'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Esta Semana
          </button>
        </div>
      </div>

      {/* 2. CONTEÚDO DINÂMICO CONFORME O ESCOPO SELECIONADO */}
      {viewScope === 'dia' ? (
        /* VISÃO: CAIXA DO DIA (HOJE) */
        <div className="space-y-2.5">
          {/* Linha Principal: Entradas Realizadas + Meta Diária */}
          <div className="flex items-end justify-between gap-2">
            <div>
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Entradas Realizadas Hoje
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black font-mono text-emerald-400">
                  R$ {todayCashData.realizedAmount.toFixed(2).replace('.', ',')}
                </span>
                <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ({todayCashData.completedCount} {todayCashData.completedCount === 1 ? 'atendimento' : 'atendimentos'})
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Meta do Dia
              </span>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="text-xs font-bold font-mono text-slate-300">
                  R$ {dailyGoal.toFixed(2).replace('.', ',')}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  todayCashData.progressPercent >= 100
                    ? 'bg-emerald-500 text-white'
                    : isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-emerald-700'
                }`}>
                  {todayCashData.progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Progresso da Meta Diária */}
          <div className="space-y-1">
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${todayCashData.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>0%</span>
              <span>Projeção final hoje: R$ {todayCashData.projectedTotal.toFixed(2).replace('.', ',')} ({todayCashData.projectedPercent}%)</span>
              <span>Meta: R$ {dailyGoal}</span>
            </div>
          </div>

          {/* Grade de 2 Colunas: Previsão a Receber & Métodos de Pagamento */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/40">
            {/* Coluna 1: Previsão Restante */}
            <div className={`p-2 rounded border flex flex-col justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Previsto a Receber</span>
              </div>
              <div className="mt-1">
                <span className="text-sm font-black font-mono text-amber-400">
                  + R$ {todayCashData.pendingAmount.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {todayCashData.pendingCount} {todayCashData.pendingCount === 1 ? 'cliente na fila' : 'clientes na fila'}
                </span>
              </div>
            </div>

            {/* Coluna 2: Entradas por Método (Hoje) */}
            <div className={`p-2 rounded border flex flex-col justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">
                Métodos de Entrada
              </span>
              <div className="space-y-0.5 text-[9.5px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <QrCode className="w-2.5 h-2.5 text-emerald-400" /> PIX
                  </span>
                  <span className="font-bold text-white">R$ {todayCashData.pixAmount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CreditCard className="w-2.5 h-2.5 text-blue-400" /> Cartão
                  </span>
                  <span className="font-bold text-white">R$ {todayCashData.cardAmount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Banknote className="w-2.5 h-2.5 text-amber-400" /> Dinheiro
                  </span>
                  <span className="font-bold text-white">R$ {todayCashData.cashAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VISÃO: CAIXA DA SEMANA */
        <div className="space-y-2.5">
          {/* Linha Principal: Total da Semana + Meta Semanal */}
          <div className="flex items-end justify-between gap-2">
            <div>
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Entradas da Semana (7 dias)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black font-mono text-emerald-400">
                  R$ {weekCashData.totalWeekAmount.toFixed(2).replace('.', ',')}
                </span>
                <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ({weekCashData.totalWeekCount} atendimentos)
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Meta Semanal
              </span>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="text-xs font-bold font-mono text-slate-300">
                  R$ {weeklyGoal.toFixed(2).replace('.', ',')}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  weekCashData.progressPercent >= 100
                    ? 'bg-emerald-500 text-white'
                    : isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-emerald-700'
                }`}>
                  {weekCashData.progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Semanal */}
          <div className="space-y-1">
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${weekCashData.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>Ticket Médio: R$ {weekCashData.averageTicket},00</span>
              <span>{weekCashData.progressPercent}% da meta semanal</span>
              <span>Meta: R$ {weeklyGoal}</span>
            </div>
          </div>

          {/* Mini Gráfico de Barras dos 7 Dias da Semana */}
          <div className="pt-1 border-t border-slate-800/40">
            <div className="flex items-end justify-between gap-1 h-16 pt-2">
              {weekCashData.days.map((day, idx) => {
                const heightPercent = Math.max(15, Math.round((day.amount / weekCashData.maxDayAmount) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[8px] font-mono text-slate-400 leading-none">
                      {day.amount > 0 ? `${day.amount}` : '-'}
                    </span>
                    <div className="w-full max-w-[20px] bg-slate-800 rounded-t h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          day.isToday
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                            : 'bg-emerald-500/60 hover:bg-emerald-500/80'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                        title={`${day.dayLabel} (${day.dateStr}): R$ ${day.amount} (${day.count} clientes)`}
                      />
                    </div>
                    <span className={`text-[8.5px] font-bold ${day.isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {day.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. ATALHO INFORMATIVO: GESTÃO FINANCEIRA EM UTILIDADES */}
      {onNavigateToUtilitiesFinancial && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Wrench className="w-3 h-3 text-emerald-400" />
            <span>Despesas, DRE e Balanço Completo</span>
          </div>
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onNavigateToUtilitiesFinancial();
            }}
            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer hover:underline"
          >
            <span>{actionLabel}</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
