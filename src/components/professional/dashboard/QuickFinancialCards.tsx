import React from 'react';
import { DollarSign, Clock, Users, Wallet } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export interface QuickFinancialCardsProps {
  realizedRevenue: number;
  completedCount: number;
  forecastRevenue: number;
  pendingCount: number;
  averageTicket: number;
  netProfitOrCommission: number;
  isOwner?: boolean;
}

export const QuickFinancialCards: React.FC<QuickFinancialCardsProps> = ({
  realizedRevenue,
  forecastRevenue,
  averageTicket,
  netProfitOrCommission,
  isOwner = false,
}) => {
  const { isDark } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-2 select-none">
      {/* 1. Caixa Realizado (Dinheiro já garantido) */}
      <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
        isDark ? 'bg-emerald-950/40 border-emerald-800/60' : 'status-green-bg text-white'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            isDark ? 'text-emerald-400' : 'text-emerald-100'
          }`}>
            Caixa Realizado
          </span>
          <DollarSign className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-white'}`} />
        </div>
        <div className="my-1">
          <span className={`text-base sm:text-lg font-black font-mono leading-none ${
            isDark ? 'text-emerald-400' : 'text-white'
          }`}>
            R$ {realizedRevenue.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      {/* 2. Previsão em Aberto (Ainda vai entrar hoje/mês) */}
      <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
        isDark ? 'bg-blue-950/40 border-blue-800/60' : 'status-blue-bg text-white'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            isDark ? 'text-blue-400' : 'text-blue-100'
          }`}>
            Previsão na Agenda
          </span>
          <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-white'}`} />
        </div>
        <div className="my-1">
          <span className={`text-base sm:text-lg font-black font-mono leading-none ${
            isDark ? 'text-blue-400' : 'text-white'
          }`}>
            R$ {forecastRevenue.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      {/* 3. Ticket Médio (Média por cadeira) */}
      <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
        isDark ? 'bg-amber-950/40 border-amber-800/60' : 'status-amber-bg text-slate-950'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            isDark ? 'text-amber-400' : 'text-amber-950 font-extrabold'
          }`}>
            Média por Cliente
          </span>
          <Users className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-slate-950'}`} />
        </div>
        <div className="my-1">
          <span className={`text-base sm:text-lg font-black font-mono leading-none ${
            isDark ? 'text-amber-400' : 'text-slate-950'
          }`}>
            R$ {averageTicket.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <span className={`text-[9px] font-mono ${
          isDark ? 'text-amber-300/80' : 'text-amber-900 font-bold'
        }`}>
          Ticket médio praticado
        </span>
      </div>

      {/* 4. Lucro Líquido / Meu Bolso */}
      <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {isOwner ? 'Lucro Líquido' : 'Meu Bolso (Líquido)'}
          </span>
          <Wallet className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div className="my-1">
          <span className="text-base sm:text-lg font-black font-mono leading-none text-emerald-500">
            R$ {netProfitOrCommission.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <span className={`text-[9px] font-mono ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {isOwner ? 'Após repasse e taxas' : 'Livre de comissão'}
        </span>
      </div>
    </div>
  );
};
