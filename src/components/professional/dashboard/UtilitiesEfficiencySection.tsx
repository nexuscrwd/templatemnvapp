import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Droplets, 
  Gauge, 
  AlertOctagon, 
  ShieldCheck, 
  Pencil, 
  Plus, 
  Check, 
  X, 
  Settings2, 
  TrendingUp, 
  Trash2,
  HelpCircle
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';

export type UtilityPeriod = 'diario' | 'semanal' | 'mensal';

export interface UtilityAppliance {
  id: string;
  name: string;
  powerWatts: number; // Potência descrita no aparelho
  category: 'energia' | 'agua';
  dailyHoursOrUsages: number; // Horas diárias (energia) ou usos diários (água em litros)
}

export interface MeterReading {
  date: string;
  electricityKwh: number;
  waterM3: number;
}

const DEFAULT_APPLIANCES: UtilityAppliance[] = [];

export interface UtilitiesEfficiencySectionProps {
  completedClientsCount?: number;
}

export const UtilitiesEfficiencySection: React.FC<UtilitiesEfficiencySectionProps> = ({
  completedClientsCount = 0
}) => {
  const { isDark } = useTheme();

  // Período de Análise: Diário, Semanal ou Mensal
  const [period, setPeriod] = useState<UtilityPeriod>('semanal');

  // Tarifas da Concessionária
  const [rates, setRates] = useState<{ electricityKwhRate: number; waterM3Rate: number }>(() => {
    try {
      const s = localStorage.getItem('vagou_utilities_rates');
      if (s) return JSON.parse(s);
    } catch {}
    return { electricityKwhRate: 0.88, waterM3Rate: 9.60 };
  });

  // Leituras dos Medidores (Histórico)
  const [readings, setReadings] = useState<MeterReading[]>(() => {
    try {
      const s = localStorage.getItem('vagou_utilities_readings');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { date: '2026-09-13', electricityKwh: 14710, waterM3: 338 },
      { date: '2026-09-20', electricityKwh: 14890, waterM3: 343 } // Atual: 180 kWh na semana, 5 m³ de água
    ];
  });

  // Inventário de Aparelhos do Salão
  const [appliances, setAppliances] = useState<UtilityAppliance[]>(() => {
    try {
      const s = localStorage.getItem('vagou_utilities_appliances');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_APPLIANCES;
  });

  // Modais de Controle
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [isApplianceModalOpen, setIsApplianceModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'auditoria' | 'aparelhos'>('auditoria');

  // Formulário de Nova Leitura
  const [newElecReading, setNewElecReading] = useState(String(readings[readings.length - 1]?.electricityKwh || 14890));
  const [newWaterReading, setNewWaterReading] = useState(String(readings[readings.length - 1]?.waterM3 || 343));

  // Formulário de Novo Aparelho
  const [newAppName, setNewAppName] = useState('');
  const [newAppPower, setNewAppPower] = useState('1500');
  const [newAppHours, setNewAppHours] = useState('3');
  const [newAppCategory, setNewAppCategory] = useState<'energia' | 'agua'>('energia');

  // Multiplicador de escala de dias com base no período
  const periodDays = period === 'diario' ? 1 : period === 'semanal' ? 7 : 30;

  // 1. Consumo do Medidor Real no Período
  const currentMeterKwh = readings[readings.length - 1]?.electricityKwh || 14890;
  const previousMeterKwh = readings[readings.length - 2]?.electricityKwh || 14710;
  const totalPeriodRealKwh = Math.max(1, (currentMeterKwh - previousMeterKwh) * (periodDays / 7));

  const currentMeterWaterM3 = readings[readings.length - 1]?.waterM3 || 343;
  const previousMeterWaterM3 = readings[readings.length - 2]?.waterM3 || 338;
  const totalPeriodRealWaterM3 = Math.max(0.5, (currentMeterWaterM3 - previousMeterWaterM3) * (periodDays / 7));

  // 2. Consumo Teórico Esperado (Calculado com base nos aparelhos e atendimentos)
  const theoreticalEnergyKwh = useMemo(() => {
    let dailyKwh = 0;
    appliances.filter(a => a.category === 'energia').forEach(app => {
      dailyKwh += (app.powerWatts / 1000) * app.dailyHoursOrUsages;
    });
    return Math.round(dailyKwh * periodDays);
  }, [appliances, periodDays]);

  const theoreticalWaterM3 = useMemo(() => {
    // Estimativa de água: ~25 litros por cliente atendido + 50L/dia para limpeza geral
    const clientsInPeriod = Math.round((completedClientsCount / 30) * periodDays);
    const totalLitros = (clientsInPeriod * 25) + (periodDays * 50);
    return parseFloat((totalLitros / 1000).toFixed(1));
  }, [completedClientsCount, periodDays]);

  // 3. Auditoria de Rede: Comparativo entre Real vs Esperado
  const energyDifferenceKwh = totalPeriodRealKwh - theoreticalEnergyKwh;
  const energyDivergencePercent = Math.round((energyDifferenceKwh / (theoreticalEnergyKwh || 1)) * 100);

  const waterDifferenceM3 = totalPeriodRealWaterM3 - theoreticalWaterM3;
  const waterDivergencePercent = Math.round((waterDifferenceM3 / (theoreticalWaterM3 || 1)) * 100);

  // Detecção de Anomalia
  const hasEnergyLeakAlert = energyDivergencePercent > 25;
  const hasWaterLeakAlert = waterDivergencePercent > 30;

  // Custos em Reais
  const realEnergyCost = totalPeriodRealKwh * rates.electricityKwhRate;
  const realWaterCost = totalPeriodRealWaterM3 * rates.waterM3Rate;
  const totalUtilitiesCost = realEnergyCost + realWaterCost;

  // Handlers
  const handleSaveReading = () => {
    const e = parseFloat(newElecReading);
    const w = parseFloat(newWaterReading);
    if (!isNaN(e) && !isNaN(w)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const updated = [...readings, { date: todayStr, electricityKwh: e, waterM3: w }];
      setReadings(updated);
      try {
        localStorage.setItem('vagou_utilities_readings', JSON.stringify(updated));
      } catch {}
      hapticSuccess();
    }
    setIsReadingModalOpen(false);
  };

  const handleAddAppliance = () => {
    if (!newAppName.trim()) return;
    const power = parseFloat(newAppPower) || 100;
    const hours = parseFloat(newAppHours) || 1;
    const newApp: UtilityAppliance = {
      id: `app-${Date.now()}`,
      name: newAppName.trim(),
      powerWatts: power,
      category: newAppCategory,
      dailyHoursOrUsages: hours,
    };
    const updated = [...appliances, newApp];
    setAppliances(updated);
    try {
      localStorage.setItem('vagou_utilities_appliances', JSON.stringify(updated));
    } catch {}
    setNewAppName('');
    setIsApplianceModalOpen(false);
    hapticSuccess();
  };

  const handleRemoveAppliance = (id: string) => {
    const updated = appliances.filter(a => a.id !== id);
    setAppliances(updated);
    try {
      localStorage.setItem('vagou_utilities_appliances', JSON.stringify(updated));
    } catch {}
    hapticLight();
  };

  return (
    <div className={`rounded-lg border p-3.5 transition-colors select-none ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
    }`}>
      {/* 1. Cabeçalho Principal com Seletor Temporal */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800/40 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold font-['Poppins'] truncate">
              Utilidades & Eficiência (Água & Luz)
            </h3>
          </div>
        </div>

        {/* Alternador de Período: Diário | Semanal | Mensal */}
        <div className={`flex items-center p-0.5 rounded-md border shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {(['diario', 'semanal', 'mensal'] as const).map((p) => {
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
                {p === 'diario' ? 'Diário' : p === 'semanal' ? 'Semanal' : 'Mensal'}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sub-navegação e Ações Rápidas */}
      <div className="w-full flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setActiveTab('auditoria');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'auditoria'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gauge className="w-3 h-3" />
            <span>Auditoria & Leituras</span>
          </button>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              setActiveTab('aparelhos');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'aparelhos'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-3 h-3" />
            <span>Aparelhos ({appliances.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            setIsReadingModalOpen(true);
          }}
          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
        >
          <Pencil className="w-2.5 h-2.5 text-white" />
          <span>Registrar Relógio</span>
        </button>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL: AUDITORIA & LEITURAS */}
      {activeTab === 'auditoria' && (
        <div className="space-y-2.5">
          {/* Grid de 2 Cards: Energia Elétrica vs Água */}
          <div className="grid grid-cols-2 gap-2">
            {/* Card Energia Elétrica */}
            <div className={`p-2.5 rounded border transition-colors ${
              hasEnergyLeakAlert
                ? isDark ? 'bg-amber-950/25 border-amber-800/60' : 'bg-amber-50 border-amber-300'
                : isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Energia
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  R$ {rates.electricityKwhRate.toFixed(2)}/kWh
                </span>
              </div>

              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-sm font-black font-mono tracking-tight text-amber-400">
                  {totalPeriodRealKwh.toFixed(0)} <span className="text-[10px] font-normal">kWh</span>
                </span>
                <span className="text-xs font-bold font-mono text-emerald-500">
                  R$ {realEnergyCost.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <p className={`text-[10px] mt-1 pt-1 border-t border-slate-800/40 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Relógio: <strong className="font-mono text-slate-200">{currentMeterKwh} kWh</strong>
              </p>
            </div>

            {/* Card Água & Saneamento */}
            <div className={`p-2.5 rounded border transition-colors ${
              hasWaterLeakAlert
                ? isDark ? 'bg-blue-950/25 border-blue-800/60' : 'bg-blue-50 border-blue-300'
                : isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-400">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  Água
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  R$ {rates.waterM3Rate.toFixed(2)}/m³
                </span>
              </div>

              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-sm font-black font-mono tracking-tight text-blue-400">
                  {totalPeriodRealWaterM3.toFixed(1)} <span className="text-[10px] font-normal">m³</span>
                </span>
                <span className="text-xs font-bold font-mono text-emerald-500">
                  R$ {realWaterCost.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <p className={`text-[10px] mt-1 pt-1 border-t border-slate-800/40 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Hidrômetro: <strong className="font-mono text-slate-200">{currentMeterWaterM3} m³</strong>
              </p>
            </div>
          </div>

          {/* Termômetro de Auditoria de Rede: Consumo Esperado vs. Medidor Real */}
          <div className={`p-2.5 rounded border transition-colors ${
            hasEnergyLeakAlert || hasWaterLeakAlert
              ? isDark ? 'bg-rose-950/20 border-rose-800/70' : 'bg-rose-50 border-rose-300'
              : isDark ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {hasEnergyLeakAlert || hasWaterLeakAlert ? (
                  <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="text-xs font-bold">
                  {hasEnergyLeakAlert || hasWaterLeakAlert
                    ? 'Atenção: Anomalia de Rede Detectada'
                    : 'Auditoria de Rede: Operação Saudável'}
                </span>
              </div>

              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                hasEnergyLeakAlert || hasWaterLeakAlert
                  ? 'bg-rose-500 text-white'
                  : 'status-green-bg text-white'
              }`}>
                {hasEnergyLeakAlert ? `+${energyDivergencePercent}% Energia` : 'Rede Estável'}
              </span>
            </div>

            {/* Comparativo de Números: Teórico vs Medidor */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono py-1 border-y border-slate-800/40 my-1">
              <div>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Consumo Teórico Ideal:
                </span>
                <p className="font-bold text-slate-300">
                  {theoreticalEnergyKwh} kWh e {theoreticalWaterM3} m³
                </p>
              </div>
              <div className="text-right">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Registrado no Medidor:
                </span>
                <p className={`font-bold ${hasEnergyLeakAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {totalPeriodRealKwh.toFixed(0)} kWh e {totalPeriodRealWaterM3.toFixed(1)} m³
                </p>
              </div>
            </div>

            {/* Diagnóstico Inteligente */}
            <p className={`text-[11px] leading-snug mt-1 ${
              hasEnergyLeakAlert || hasWaterLeakAlert
                ? isDark ? 'text-rose-300' : 'text-rose-800'
                : isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              {hasEnergyLeakAlert ? (
                <>
                  🚨 <strong>Fuga de Corrente ou Rede Compartilhada:</strong> O relógio registrou <strong>{Math.abs(energyDifferenceKwh).toFixed(0)} kWh a mais</strong> (+R$ {(energyDifferenceKwh * rates.electricityKwhRate).toFixed(2)}) do que o salão consumiu em atendimentos. Verifique fiação antiga com fuga, ligação clandestina ("gato") ou vizinho/sala puxando da mesma fase.
                </>
              ) : hasWaterLeakAlert ? (
                <>
                  🚨 <strong>Possível Vazamento Hídrico:</strong> O consumo de água está {waterDivergencePercent}% acima do volume de lavagens de clientes. Cheque vazamentos na válvula de descarga ou torneiras do lavatório.
                </>
              ) : (
                <>
                  O consumo do salão está <strong>alinhado com os equipamentos e atendimentos</strong> realizados no período (~R$ {totalUtilitiesCost.toFixed(2).replace('.', ',')} totais).
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO DA ABA 2: INVENTÁRIO DE APARELHOS & TARIFAS */}
      {activeTab === 'aparelhos' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1">
            <span className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Equipamentos Cadastrados
            </span>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setIsApplianceModalOpen(true);
              }}
              className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5 text-white" />
              <span>Adicionar Aparelho</span>
            </button>
          </div>

          {/* Lista de Aparelhos */}
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
            {appliances.map((app) => (
              <div
                key={app.id}
                className={`p-2 rounded border flex items-center justify-between transition-colors ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                    app.category === 'energia' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {app.category === 'energia' ? <Zap className="w-3 h-3" /> : <Droplets className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">
                      {app.name}
                    </p>
                    <p className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {app.category === 'energia' 
                        ? `${app.powerWatts} Watts • ~${app.dailyHoursOrUsages}h/dia`
                        : `${app.dailyHoursOrUsages} Litros por atendimento`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-emerald-500">
                    {app.category === 'energia'
                      ? `~${(((app.powerWatts / 1000) * app.dailyHoursOrUsages * 30)).toFixed(0)} kWh/mês`
                      : `~${((app.dailyHoursOrUsages * 45) / 1000).toFixed(1)} m³/mês`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAppliance(app.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                    title="Remover aparelho"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Dica de Etiqueta de Aparelho */}
          <div className={`p-2 rounded border flex items-start gap-2 mt-1 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/80 border-slate-200'
          }`}>
            <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className={`text-[10px] leading-snug ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <strong>Dica de Bancada:</strong> A potência em Watts (W) fica descrita na etiqueta de fábrica no cabo do secador, máquina ou na lateral do ar-condicionado. Basta digitar o número para calcular o consumo real!
            </p>
          </div>
        </div>
      )}

      {/* 5. MODAL DE REGISTRO DO RELÓGIO */}
      {isReadingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-sm rounded-lg border p-4 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Registrar Leitura dos Relógios
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsReadingModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Digite os números que aparecem hoje no mostrador do medidor de luz e no hidrômetro de água:
            </p>

            {/* Campo Energia (kWh) */}
            <div className="mb-3">
              <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Medidor de Luz / Relógio (kWh):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newElecReading}
                  onChange={(e) => setNewElecReading(e.target.value)}
                  className={`flex-1 px-3 py-2 text-sm font-bold font-mono rounded border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="Ex: 14890"
                />
                <span className="text-xs font-bold font-mono px-2 py-2 rounded bg-slate-800 text-slate-300">
                  kWh
                </span>
              </div>
            </div>

            {/* Campo Água (m³) */}
            <div className="mb-4">
              <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Hidrômetro de Água (m³):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newWaterReading}
                  onChange={(e) => setNewWaterReading(e.target.value)}
                  className={`flex-1 px-3 py-2 text-sm font-bold font-mono rounded border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="Ex: 343"
                />
                <span className="text-xs font-bold font-mono px-2 py-2 rounded bg-slate-800 text-slate-300">
                  m³
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsReadingModalOpen(false)}
                className={`py-2 rounded text-xs font-bold border transition ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReading}
                className="py-2 rounded text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Salvar Leitura</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE ADICIONAR APARELHO */}
      {isApplianceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-sm rounded-lg border p-4 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Adicionar Aparelho ao Salão
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsApplianceModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Nome do Dispositivo:
                </label>
                <input
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="Ex: Secador Parlux 3800"
                  className={`w-full px-3 py-2 text-xs font-bold rounded border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Potência (Watts):
                  </label>
                  <input
                    type="number"
                    value={newAppPower}
                    onChange={(e) => setNewAppPower(e.target.value)}
                    placeholder="2400"
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Horas de Uso / Dia:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newAppHours}
                    onChange={(e) => setNewAppHours(e.target.value)}
                    placeholder="3.5"
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsApplianceModalOpen(false)}
                className={`py-2 rounded text-xs font-bold border transition ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddAppliance}
                className="py-2 rounded text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Salvar Aparelho</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
