import React from 'react';
import { Scissors } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export interface ServiceStat {
  serviceName: string;
  count: number;
  totalRevenue: number;
  percentage: number;
}

export interface ServiceDistributionChartProps {
  services: ServiceStat[];
}

export const ServiceDistributionChart: React.FC<ServiceDistributionChartProps> = ({ services }) => {
  const { isDark } = useTheme();

  return (
    <div className={`p-3.5 rounded-lg border flex flex-col select-none ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
    }`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/40">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Scissors className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-bold font-['Poppins'] block leading-tight">Serviços Mais Realizados</span>
            <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ranking por volume e receita</span>
          </div>
        </div>
      </div>

      {/* Lista de Barras Horizontais */}
      <div className="space-y-2.5">
        {services.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">Nenhum atendimento registrado no período.</p>
        ) : (
          services.slice(0, 5).map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span className={`text-[10px] font-bold w-4 text-center shrink-0 ${
                    idx === 0 
                      ? 'text-emerald-500 font-black' 
                      : isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {idx + 1}º
                  </span>
                  <span className={`font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {item.serviceName}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {item.count}x
                  </span>
                  <span className="text-emerald-500 font-bold">
                    R$ {item.totalRevenue.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Horizontal */}
              <div className={`w-full h-2 rounded-full overflow-hidden ${
                isDark ? 'bg-slate-800' : 'bg-slate-100'
              }`}>
                <div
                  style={{ width: `${Math.max(6, item.percentage)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    idx === 0
                      ? 'status-green-bg'
                      : idx === 1
                      ? 'status-blue-bg'
                      : isDark ? 'bg-slate-600' : 'bg-slate-400'
                  }`}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
