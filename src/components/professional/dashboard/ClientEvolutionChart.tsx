import React from 'react';
import { Users, Calendar } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export interface DayEvolutionData {
  dayLabel: string;
  dateStr: string;
  clientsCount: number;
  totalRevenue: number;
}

export interface ClientEvolutionChartProps {
  data: DayEvolutionData[];
}

export const ClientEvolutionChart: React.FC<ClientEvolutionChartProps> = ({ data }) => {
  const { isDark } = useTheme();

  const maxClients = Math.max(...data.map(d => d.clientsCount), 1);
  const totalClients = data.reduce((acc, d) => acc + d.clientsCount, 0);
  const totalRevenue = data.reduce((acc, d) => acc + d.totalRevenue, 0);

  return (
    <div className={`p-3.5 rounded-lg border flex flex-col select-none ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
    }`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/40">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-bold font-['Poppins'] block leading-tight">Evolução de Clientes</span>
            <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Movimento nos últimos 7 dias</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-black font-mono block text-blue-500">
            {totalClients} clientes
          </span>
          <span className={`text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            R$ {totalRevenue.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      {/* Gráfico de Barras Verticais */}
      <div className="w-full h-32 pt-4 pb-1 flex items-end justify-between gap-1.5">
        {data.map((item, idx) => {
          const heightPercent = Math.max(8, Math.round((item.clientsCount / maxClients) * 100));
          const isPeak = item.clientsCount === maxClients && item.clientsCount > 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip ao passar o mouse ou tocar */}
              <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-8 bg-slate-950 text-white text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10 font-mono">
                {item.clientsCount} clientes (R$ {item.totalRevenue.toFixed(0)})
              </div>

              {/* Quantidade no topo da barra */}
              <span className={`text-[9px] font-bold font-mono mb-1 ${
                isPeak 
                  ? 'text-emerald-500 font-black' 
                  : isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {item.clientsCount}
              </span>

              {/* Barra Vertical */}
              <div 
                style={{ height: `${heightPercent}%` }}
                className={`w-full max-w-[28px] rounded-t transition-all duration-500 ${
                  isPeak
                    ? 'status-green-bg'
                    : isDark
                    ? 'bg-blue-600/70 group-hover:bg-blue-500'
                    : 'bg-blue-500/80 group-hover:bg-blue-600'
                }`}
              />

              {/* Rótulo do Dia da Semana */}
              <span className={`text-[9px] font-bold mt-1.5 uppercase ${
                isPeak 
                  ? 'text-emerald-500' 
                  : isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {item.dayLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rodapé Informativo */}
      <div className={`mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] ${
        isDark ? 'text-slate-400' : 'text-slate-500'
      }`}>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-blue-400" />
          <span>Média: <strong>{(totalClients / (data.length || 1)).toFixed(1)}</strong> clientes/dia</span>
        </span>
        <span className="text-[9px] text-emerald-500 font-bold">
          ★ Barra verde = Dia de pico
        </span>
      </div>
    </div>
  );
};
