import React, { useState } from 'react';
import { Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { hapticLight } from '../../../utils/haptics';

export type GoalPeriod = 'diaria' | 'semanal' | 'mensal';

export interface SemiCircleGaugeProps {
  currentAmount?: number;
  targetAmount?: number;
  dailyAmount?: number;
  weeklyAmount?: number;
  averageTicket?: number;
  remainingDays?: number;
  onUpdateTarget?: (newTarget: number, period: GoalPeriod) => void;
}

export const SemiCircleGauge: React.FC<SemiCircleGaugeProps> = ({
  currentAmount = 0,
  targetAmount = 0,
  dailyAmount = 0,
  weeklyAmount = 0,
  averageTicket = 0,
  remainingDays = 0,
  onUpdateTarget,
}) => {
  const { isDark } = useTheme();

  // Período da Meta selecionado (Diária, Semanal ou Mensal) - default 'diaria' para uso diário ágil
  const [period, setPeriod] = useState<GoalPeriod>('diaria');

  // Metas persistidas por período
  const [dailyTarget] = useState<number>(() => {
    try {
      const s = localStorage.getItem('vagou_daily_goal');
      if (s && Number(s) > 0) return Number(s);
    } catch {}
    return 0;
  });

  const [weeklyTarget] = useState<number>(() => {
    try {
      const s = localStorage.getItem('vagou_weekly_goal');
      if (s && Number(s) > 0) return Number(s);
    } catch {}
    return 0;
  });

  const [monthlyTarget] = useState<number>(() => {
    try {
      const s = localStorage.getItem('vagou_monthly_goal');
      if (s && Number(s) > 0) return Number(s);
    } catch {}
    return targetAmount > 0 ? targetAmount : 0;
  });

  // Valores dinâmicos conforme período ativo
  const activeTarget = period === 'diaria' ? dailyTarget : period === 'semanal' ? weeklyTarget : monthlyTarget;
  const activeRealized = period === 'diaria' ? dailyAmount : period === 'semanal' ? weeklyAmount : currentAmount;

  const safeTarget = activeTarget > 0 ? activeTarget : 100;
  const percentage = Math.min(100, Math.round((activeRealized / safeTarget) * 100));
  const remainingAmount = Math.max(0, safeTarget - activeRealized);

  // Tradução prática em atendimentos / cortes restantes
  const ticketForCalc = averageTicket > 0 ? averageTicket : 50;
  const cutsNeeded = Math.ceil(remainingAmount / ticketForCalc);
  const cutsPerDay = remainingDays > 0 ? Math.ceil(cutsNeeded / remainingDays) : cutsNeeded;

  // Geometria do Arco Meia-Lua (Semicírculo)
  const radius = 72;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Meio círculo = pi * r
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`p-3.5 rounded-lg border flex flex-col items-center select-none ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
    }`}>
      {/* Cabeçalho com Título & Seletor de Período (Diária / Semanal / Mensal) */}
      <div className="w-full flex items-center justify-between pb-2 mb-1 border-b border-slate-800/40 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xs font-bold font-['Poppins']">Velocímetro de Metas</span>
        </div>

        {/* Alternador Abrangente de Período */}
        <div className={`flex items-center p-0.5 rounded-md border shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {(['diaria', 'semanal', 'mensal'] as const).map((p) => {
            const isSelected = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  hapticLight();
                  setPeriod(p);
                }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-500 text-white shadow-xs font-extrabold'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'diaria' ? 'Diária' : p === 'semanal' ? 'Semanal' : 'Mensal'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-faixa de Status da Meta Selecionada */}
      <div className="w-full flex items-center justify-between py-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {period === 'diaria' ? 'Meta do Dia' : period === 'semanal' ? 'Meta da Semana' : 'Meta do Mês'}
        </span>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
          percentage >= 100 
            ? 'status-green-bg text-white font-extrabold' 
            : percentage >= 70 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
            : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
        }`}>
          {percentage >= 100 ? 'Meta Batida! 🎉' : `${percentage}% alcançado`}
        </span>
      </div>

      {/* Gráfico Meia-Lua em SVG */}
      <div className="relative w-[190px] h-[105px] flex items-center justify-center mt-1">
        <svg
          viewBox="0 0 190 105"
          className="w-full h-full overflow-visible"
        >
          {/* Definição de gradiente esmeralda */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Arco de Fundo Neutro (Meia-Lua) */}
          <path
            d="M 23 95 A 72 72 0 0 1 167 95"
            fill="none"
            stroke={isDark ? '#1e293b' : '#e2e8f0'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Arco de Preenchimento da Meta */}
          <path
            d="M 23 95 A 72 72 0 0 1 167 95"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Texto Centralizado na Base da Meia-Lua */}
        <div className="absolute bottom-1 left-0 right-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black font-['Poppins'] tracking-tight leading-none text-emerald-500">
            {percentage}%
          </span>
          <span className={`text-[9px] uppercase tracking-wider font-bold mt-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {period === 'diaria' ? 'Progresso Hoje' : period === 'semanal' ? 'Progresso Semanal' : 'Progresso Mensal'}
          </span>
        </div>
      </div>

      {/* Tradução Prática em Linguagem Simples (Sem MBA) */}
      <div className={`w-full mt-2 p-2 rounded border flex items-start gap-2 ${
        percentage >= 100
          ? isDark ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
          : isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/80 border-slate-200'
      }`}>
        {percentage >= 100 ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        )}

        <div className="text-[11px] leading-snug">
          {percentage >= 100 ? (
            <p className="font-medium text-emerald-500">
              {period === 'diaria' && (
                <>Parabéns! <strong>Meta diária batida!</strong> Você faturou <strong>R$ {activeRealized.toFixed(2).replace('.', ',')}</strong> hoje.</>
              )}
              {period === 'semanal' && (
                <>Parabéns! <strong>Meta semanal batida!</strong> Você faturou <strong>R$ {activeRealized.toFixed(2).replace('.', ',')}</strong> nesta semana.</>
              )}
              {period === 'mensal' && (
                <>Parabéns! <strong>Meta do mês batida!</strong> Você alcançou 100% da sua meta com <strong>R$ {activeRealized.toFixed(2).replace('.', ',')}</strong> faturados!</>
              )}
            </p>
          ) : (
            <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              {period === 'diaria' && (
                <>Faltam <strong className="text-emerald-500">R$ {remainingAmount.toFixed(2).replace('.', ',')}</strong> hoje. Na sua média, falta só <strong className="text-emerald-500">{cutsNeeded} {cutsNeeded === 1 ? 'corte' : 'cortes'}</strong> para fechar a diária.</>
              )}
              {period === 'semanal' && (
                <>Faltam <strong className="text-emerald-500">R$ {remainingAmount.toFixed(2).replace('.', ',')}</strong> na semana. Na sua média, são <strong className="text-emerald-500">{cutsNeeded} {cutsNeeded === 1 ? 'corte' : 'cortes'}</strong> nos próximos atendimentos.</>
              )}
              {period === 'mensal' && (
                <>Faltam <strong className="text-emerald-500">R$ {remainingAmount.toFixed(2).replace('.', ',')}</strong> para o mês. Na sua média, são só <strong className="text-emerald-500">{cutsNeeded} cortes</strong> (~{cutsPerDay}/dia nos próximos {remainingDays} dias).</>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
