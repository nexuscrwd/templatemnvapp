import React, { useState, useMemo } from 'react';
import { 
  Droplets, 
  Trash2, 
  Gauge, 
  Calendar, 
  CheckCircle2,
  Sliders,
  Calculator,
  Info
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';
import { WaterReading, WaterTariffConfig } from './consumptionTypes';
import { BRAZILIAN_STATES, WATER_UTILITIES } from './concessionariasData';
import { syncAllLocalUtilitiesToDatabase } from '../../../services/mnvSupabaseSync';

export const DEFAULT_WATER_TARIFF: WaterTariffConfig = {
  concessionaria: 'Sabesp (São Paulo & Região)',
  uf: 'SP',
  waterRateM3: 4.80, // R$/m³
  sewagePercent: 80, // 80% de taxa de esgoto
  fixedAvailability: 38.00, // Taxa mínima de ligação / disponibilidade
  waterPerServiceLiters: 20, // 20 litros por lavagem de cabelo
};

const INITIAL_WATER_READINGS: WaterReading[] = [];

export const WaterConsumptionManager: React.FC = () => {
  const { isDark } = useTheme();

  // Sub-aba: 'leitura' | 'config'
  const [activeTab, setActiveTab] = useState<'leitura' | 'config'>('leitura');

  // 1. Configuração da Tarifa de Água
  const [tariff, setTariff] = useState<WaterTariffConfig>(() => {
    try {
      const stored = localStorage.getItem('vagou_water_tariff_config');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return DEFAULT_WATER_TARIFF;
  });

  const [selectedUf, setSelectedUf] = useState<string>(() => tariff.uf || 'SP');

  const utilitiesForUf = useMemo(() => {
    return WATER_UTILITIES.filter((u) => u.uf === selectedUf);
  }, [selectedUf]);

  const handleSaveTariff = (updated: WaterTariffConfig) => {
    setTariff(updated);
    try {
      localStorage.setItem('vagou_water_tariff_config', JSON.stringify(updated));
      localStorage.setItem('vagou_water_meters', JSON.stringify([updated]));
    } catch {
      // ignore
    }
    syncAllLocalUtilitiesToDatabase();
    hapticSuccess();
  };

  // Custo efetivo por m³ (Água + Esgoto)
  const effectiveM3Rate = useMemo(() => {
    return tariff.waterRateM3 * (1 + tariff.sewagePercent / 100);
  }, [tariff]);

  // Custo de água por lavatório / cliente
  const costPerService = useMemo(() => {
    // 1 m³ = 1000 Litros
    return (tariff.waterPerServiceLiters / 1000) * effectiveM3Rate;
  }, [tariff, effectiveM3Rate]);

  // 2. Histórico de Leituras
  const [readings, setReadings] = useState<WaterReading[]>(() => {
    try {
      const stored = localStorage.getItem('vagou_water_meter_readings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_WATER_READINGS;
  });

  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [readings]);

  const latestReading = sortedReadings[0];

  // 3. Simulador & Previsão da Conta com Hidrômetro
  const [currentMeterInput, setCurrentMeterInput] = useState<string>('');

  // Dias decorridos no ciclo calculados automaticamente a partir da última leitura ou dia do mês
  const autoDaysOfCycle = useMemo(() => {
    if (latestReading?.date) {
      const readDate = new Date(latestReading.date + 'T00:00:00');
      const now = new Date();
      const diffMs = now.getTime() - readDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 1 && diffDays <= 30) return diffDays;
    }
    const currentDayOfMonth = new Date().getDate();
    return Math.max(1, Math.min(30, currentDayOfMonth));
  }, [latestReading?.date]);

  const forecastData = useMemo(() => {
    const currentVal = parseFloat(currentMeterInput);
    if (!latestReading || isNaN(currentVal) || currentVal <= latestReading.meterReadingM3) {
      return null;
    }

    const consumedSoFarM3 = currentVal - latestReading.meterReadingM3;
    const validDays = Math.max(1, Math.min(30, autoDaysOfCycle));
    const projectedM3Total = Math.round((consumedSoFarM3 / validDays) * 30);

    const waterAmount = projectedM3Total * tariff.waterRateM3;
    const sewageAmount = waterAmount * (tariff.sewagePercent / 100);
    const totalProjectedBill = waterAmount + sewageAmount + tariff.fixedAvailability;

    const soFarWater = consumedSoFarM3 * tariff.waterRateM3;
    const soFarSewage = soFarWater * (tariff.sewagePercent / 100);
    const totalSoFar = soFarWater + soFarSewage + (tariff.fixedAvailability * (validDays / 30));

    return {
      consumedSoFarM3,
      projectedM3Total,
      waterAmount,
      sewageAmount,
      totalProjectedBill,
      totalSoFar,
    };
  }, [currentMeterInput, latestReading, autoDaysOfCycle, tariff]);

  const handleSaveSimulatedReading = () => {
    if (!forecastData || !currentMeterInput) return;
    hapticSuccess();

    const newRecord: WaterReading = {
      id: `water-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      meterReadingM3: parseFloat(currentMeterInput),
      consumptionPeriodM3: forecastData.consumedSoFarM3,
      costAmountReais: forecastData.totalProjectedBill,
      notes: `Previsão (${autoDaysOfCycle}d - ${forecastData.projectedM3Total} m³ projetados)`,
    };

    const updated = [newRecord, ...readings];
    setReadings(updated);
    try {
      localStorage.setItem('vagou_water_meter_readings', JSON.stringify(updated));
      localStorage.setItem('vagou_water_readings', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncAllLocalUtilitiesToDatabase();
    setCurrentMeterInput('');
  };

  const handleDeleteReading = (id: string) => {
    hapticLight();
    const updated = readings.filter(r => r.id !== id);
    setReadings(updated);
    try {
      localStorage.setItem('vagou_water_meter_readings', JSON.stringify(updated));
      localStorage.setItem('vagou_water_readings', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncAllLocalUtilitiesToDatabase();
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-150">
      {/* 1. SELETOR DE MODO / SUB-ABAS */}
      <div className={`p-1 rounded-xl border flex items-center gap-1 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            setActiveTab('leitura');
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'leitura'
              ? 'bg-cyan-500 text-white shadow-xs'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>Hidrômetro & Previsão</span>
        </button>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            setActiveTab('config');
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'config'
              ? 'bg-cyan-500 text-white shadow-xs'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Tarifa & Saneamento</span>
        </button>
      </div>

      {/* ========================================================
          ABA 1: HIDRÔMETRO, SIMULAÇÃO E PREVISÃO DA CONTA
         ======================================================== */}
      {activeTab === 'leitura' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Card do Simulador / Previsão */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-['Poppins'] text-white">
                    Previsão da Conta de Água
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Insira o hidrômetro atual para estimar o mês
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400">Água + Esgoto</span>
                <p className="text-xs font-mono font-bold text-cyan-400">
                  R$ {effectiveM3Rate.toFixed(2)}/m³
                </p>
              </div>
            </div>

            {/* Input do Hidrômetro */}
            <div className="pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                  Leitura do Hidrômetro (m³) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    placeholder={latestReading ? `Ex: ${latestReading.meterReadingM3 + 7}` : 'Ex: 365'}
                    value={currentMeterInput}
                    onChange={(e) => setCurrentMeterInput(e.target.value)}
                    className={`w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-cyan-400">
                    m³
                  </span>
                </div>
                {latestReading && (
                  <p className="text-[9px] text-slate-500 mt-1">
                    Último registro: <strong className="text-slate-300">{latestReading.meterReadingM3} m³</strong> ({latestReading.date})
                  </p>
                )}
              </div>
            </div>

            {/* Resultado da Previsão Calculada */}
            {forecastData && (
              <div className={`p-3.5 rounded-lg border space-y-2.5 animate-in slide-in-from-top-2 duration-200 ${
                isDark ? 'bg-slate-950/70 border-cyan-500/40' : 'bg-cyan-50/70 border-cyan-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Estimativa Final de Água</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Projeção: {forecastData.projectedM3Total} m³
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div>
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      R$ {forecastData.totalProjectedBill.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Gasto até hoje ({autoDaysOfCycle}d): R$ {forecastData.totalSoFar.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSimulatedReading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar no Histórico</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[9.5px]">
                  <div>
                    <span className="text-slate-500 block">Água ({forecastData.projectedM3Total} m³):</span>
                    <span className="font-mono text-slate-200">R$ {forecastData.waterAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Esgoto ({tariff.sewagePercent}%):</span>
                    <span className="font-mono text-slate-200">R$ {forecastData.sewageAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Taxa Fixa Mínima:</span>
                    <span className="font-mono text-slate-200">R$ {tariff.fixedAvailability.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Histórico das Leituras Passadas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Histórico de Hidrômetro & Faturas ({readings.length})
              </span>
            </div>

            <div className="space-y-2">
              {sortedReadings.map((r) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-white">
                          {r.meterReadingM3} m³
                        </span>
                        {r.consumptionPeriodM3 && (
                          <span className="text-[10px] font-mono font-bold text-cyan-400">
                            (+{r.consumptionPeriodM3} m³)
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] text-slate-400 block truncate">
                        {r.date} {r.notes ? `• ${r.notes}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {r.costAmountReais && (
                      <span className="text-xs font-black font-mono text-emerald-400">
                        R$ {r.costAmountReais.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteReading(r.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Excluir medição"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 2: CONFIGURAÇÃO DA TARIFA DE ÁGUA E ESGOTO
         ======================================================== */}
      {activeTab === 'config' && (
        <div className={`p-4 rounded-xl border space-y-4 animate-in fade-in duration-150 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <h4 className="text-xs font-bold font-['Poppins'] text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Configuração da Tarifa de Água & Saneamento</span>
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Ajuste as taxas da companhia de água para prever a conta com precisão
            </p>
          </div>

          {/* Seleção de Estado (UF) e Companhia de Saneamento de todos os estados */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Selecione seu Estado e Companhia de Saneamento:
              </label>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                27 Estados Atendidos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Dropdown de Estados */}
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-slate-400">
                  Estado (UF)
                </label>
                <select
                  value={selectedUf}
                  onChange={(e) => {
                    const newUf = e.target.value;
                    setSelectedUf(newUf);
                    const firstUtil = WATER_UTILITIES.find((u) => u.uf === newUf);
                    if (firstUtil) {
                      handleSaveTariff({
                        ...tariff,
                        concessionaria: firstUtil.name,
                        uf: firstUtil.uf,
                        waterRateM3: firstUtil.waterRateM3,
                        sewagePercent: firstUtil.sewagePercent,
                        fixedAvailability: firstUtil.fixedAvailability,
                        waterPerServiceLiters: firstUtil.waterPerServiceLiters,
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs font-bold rounded-lg border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {BRAZILIAN_STATES.map((s) => (
                    <option key={s.uf} value={s.uf}>
                      {s.uf} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown de Companhia de Saneamento */}
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-slate-400">
                  Companhia de Água e Saneamento
                </label>
                <select
                  value={WATER_UTILITIES.find((u) => u.name === tariff.concessionaria && u.uf === selectedUf)?.id || utilitiesForUf[0]?.id || ''}
                  onChange={(e) => {
                    const util = WATER_UTILITIES.find((u) => u.id === e.target.value);
                    if (util) {
                      hapticSuccess();
                      handleSaveTariff({
                        ...tariff,
                        concessionaria: util.name,
                        uf: util.uf,
                        waterRateM3: util.waterRateM3,
                        sewagePercent: util.sewagePercent,
                        fixedAvailability: util.fixedAvailability,
                        waterPerServiceLiters: util.waterPerServiceLiters,
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs font-bold rounded-lg border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-cyan-300' : 'bg-slate-50 border-slate-300 text-cyan-800'
                  }`}
                >
                  {utilitiesForUf.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg border flex items-center justify-between text-[10px] ${
              isDark ? 'bg-slate-950 border-cyan-500/30 text-slate-300' : 'bg-cyan-50 border-cyan-200 text-slate-700'
            }`}>
              <span className="flex items-center gap-1.5 font-bold text-cyan-400">
                <Droplets className="w-3.5 h-3.5" />
                <span>{tariff.concessionaria}</span>
              </span>
              <span className="text-slate-400 font-mono text-[9.5px]">
                Esgoto: {tariff.sewagePercent}% • Mínima: R$ {tariff.fixedAvailability.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Campos Tarifários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Tarifa de Água (R$/m³)
              </label>
              <input
                type="number"
                step="0.1"
                value={tariff.waterRateM3}
                onChange={(e) => handleSaveTariff({ ...tariff, waterRateM3: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Taxa de Esgoto (% sobre a água)
              </label>
              <input
                type="number"
                step="5"
                value={tariff.sewagePercent}
                onChange={(e) => handleSaveTariff({ ...tariff, sewagePercent: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Taxa Fixa Mínima / Disponibilidade (R$)
              </label>
              <input
                type="number"
                step="1"
                value={tariff.fixedAvailability}
                onChange={(e) => handleSaveTariff({ ...tariff, fixedAvailability: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Consumo Médio por Lavatório (Litros)
              </label>
              <input
                type="number"
                step="1"
                value={tariff.waterPerServiceLiters}
                onChange={(e) => handleSaveTariff({ ...tariff, waterPerServiceLiters: parseFloat(e.target.value) || 10 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Custo Efetivo da Água (Água + Esgoto)
                </span>
                <span className="text-[10px] text-slate-400">
                  R$ {costPerService.toFixed(2)} por atendimento de lavatório
                </span>
              </div>
            </div>
            <span className="text-base font-black font-mono text-cyan-400">
              R$ {effectiveM3Rate.toFixed(2)} <span className="text-[10px]">/ m³</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
