import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Gauge, 
  Calendar, 
  DollarSign, 
  CheckCircle2,
  Sliders,
  Calculator,
  ArrowRight,
  Info
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';
import { EnergyReading, EnergyTariffConfig } from './consumptionTypes';
import { BRAZILIAN_STATES, ENERGY_DISTRIBUTORS } from './concessionariasData';
import { syncAllLocalUtilitiesToDatabase } from '../../../services/mnvSupabaseSync';

export const DEFAULT_ENERGY_TARIFF: EnergyTariffConfig = {
  concessionaria: 'Enel Distribuição São Paulo',
  uf: 'SP',
  teRate: 0.342, // R$/kWh Geração
  tusdRate: 0.448, // R$/kWh Distribuição
  flagType: 'Verde',
  flagRate: 0.0,
  icmsPercent: 18, // 18% ICMS
  pisCofinsPercent: 5.4, // 5.4% PIS/COFINS
  cosipFixed: 32.5, // Iluminação Pública (R$)
};

const INITIAL_ENERGY_READINGS: EnergyReading[] = [];

export const EnergyMeterManager: React.FC = () => {
  const { isDark } = useTheme();

  // Sub-aba interna: 'leitura' | 'config'
  const [activeTab, setActiveTab] = useState<'leitura' | 'config'>('leitura');

  // 1. Configuração Tarifária ANEEL
  const [tariff, setTariff] = useState<EnergyTariffConfig>(() => {
    try {
      const stored = localStorage.getItem('vagou_energy_tariff_config');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return DEFAULT_ENERGY_TARIFF;
  });

  const [selectedUf, setSelectedUf] = useState<string>(() => tariff.uf || 'SP');

  const distributorsForUf = useMemo(() => {
    return ENERGY_DISTRIBUTORS.filter((d) => d.uf === selectedUf);
  }, [selectedUf]);

  const handleSaveTariff = (updated: EnergyTariffConfig) => {
    setTariff(updated);
    try {
      localStorage.setItem('vagou_energy_tariff_config', JSON.stringify(updated));
      localStorage.setItem('vagou_energy_meters', JSON.stringify([updated]));
    } catch {
      // ignore
    }
    syncAllLocalUtilitiesToDatabase();
    hapticSuccess();
  };

  // Cálculo da Tarifa Efetiva ANEEL com tributos por dentro
  const effectiveKwhRate = useMemo(() => {
    const basePure = tariff.teRate + tariff.tusdRate + tariff.flagRate;
    const totalTaxPercent = (tariff.icmsPercent + tariff.pisCofinsPercent) / 100;
    if (totalTaxPercent >= 0.99) return basePure * 1.3;
    // Cálculo tributário padrão brasileiro (ICMS e PIS/COFINS por dentro)
    return basePure / (1 - totalTaxPercent);
  }, [tariff]);

  // 2. Histórico de Leituras do Relógio
  const [readings, setReadings] = useState<EnergyReading[]>(() => {
    try {
      const stored = localStorage.getItem('vagou_energy_meter_readings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_ENERGY_READINGS;
  });

  // Ordenar medições por data decrescente
  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [readings]);

  const latestReading = sortedReadings[0];

  // 3. Simulador & Previsão da Conta com Medidor
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

  // Cálculo da Previsão em Tempo Real
  const forecastData = useMemo(() => {
    const currentVal = parseFloat(currentMeterInput);
    if (!latestReading || isNaN(currentVal) || currentVal <= latestReading.meterReadingKwh) {
      return null;
    }

    const consumedSoFar = currentVal - latestReading.meterReadingKwh;
    const validDays = Math.max(1, Math.min(30, autoDaysOfCycle));
    // Projeção proporcional para ciclo de 30 dias
    const projectedKwhTotal = Math.round((consumedSoFar / validDays) * 30);
    
    // Cálculo dos componentes da conta
    const baseEnergyPure = projectedKwhTotal * tariff.teRate;
    const baseDistributionPure = projectedKwhTotal * tariff.tusdRate;
    const flagCost = projectedKwhTotal * tariff.flagRate;
    const pureSubtotal = baseEnergyPure + baseDistributionPure + flagCost;
    
    const taxRate = (tariff.icmsPercent + tariff.pisCofinsPercent) / 100;
    const taxesAmount = taxRate < 0.99 ? (pureSubtotal / (1 - taxRate)) - pureSubtotal : pureSubtotal * taxRate;
    const totalProjectedBill = pureSubtotal + taxesAmount + tariff.cosipFixed;

    // Custo acumulado até o momento
    const soFarSubtotal = consumedSoFar * (tariff.teRate + tariff.tusdRate + tariff.flagRate);
    const soFarTaxes = taxRate < 0.99 ? (soFarSubtotal / (1 - taxRate)) - soFarSubtotal : soFarSubtotal * taxRate;
    const totalSoFar = soFarSubtotal + soFarTaxes + (tariff.cosipFixed * (validDays / 30));

    return {
      consumedSoFar,
      projectedKwhTotal,
      baseEnergyPure,
      baseDistributionPure,
      flagCost,
      taxesAmount,
      totalProjectedBill,
      totalSoFar,
    };
  }, [currentMeterInput, latestReading, autoDaysOfCycle, tariff]);

  // Salvar Leitura do Simulador como Registro Oficial
  const handleSaveSimulatedReading = () => {
    if (!forecastData || !currentMeterInput) return;
    hapticSuccess();

    const newRecord: EnergyReading = {
      id: `energy-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      meterReadingKwh: parseFloat(currentMeterInput),
      consumptionPeriodKwh: forecastData.consumedSoFar,
      costAmountReais: forecastData.totalProjectedBill,
      notes: `Previsão (${autoDaysOfCycle}d - ${forecastData.projectedKwhTotal} kWh projetados)`,
    };

    const updated = [newRecord, ...readings];
    setReadings(updated);
    try {
      localStorage.setItem('vagou_energy_meter_readings', JSON.stringify(updated));
      localStorage.setItem('vagou_energy_readings', JSON.stringify(updated));
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
      localStorage.setItem('vagou_energy_meter_readings', JSON.stringify(updated));
      localStorage.setItem('vagou_energy_readings', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncAllLocalUtilitiesToDatabase();
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-150">
      {/* 1. SELETOR DE MODO / SUB-ABAS (Zero blablabla, ultra-sintético) */}
      <div className={`p-1 rounded border flex items-center gap-1 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            setActiveTab('leitura');
          }}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'leitura'
              ? 'bg-amber-500 text-white shadow-xs'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>Medidor & Previsão</span>
        </button>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            setActiveTab('config');
          }}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'config'
              ? 'bg-amber-500 text-white shadow-xs'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Tarifa & Impostos</span>
        </button>
      </div>

      {/* ========================================================
          ABA 1: MEDIDOR, SIMULAÇÃO E PREVISÃO DA CONTA NO FIM DO MÊS
         ======================================================== */}
      {activeTab === 'leitura' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Card do Simulador / Previsão */}
          <div className={`p-4 rounded border space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold font-['Poppins'] ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    Previsão da Conta de Energia
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Insira o número do relógio para prever a fatura final
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-500">Tarifa Efetiva</span>
                <p className={`text-xs font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  R$ {effectiveKwhRate.toFixed(3)}/kWh
                </p>
              </div>
            </div>

            {/* Input do Medidor */}
            <div className="pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">
                  Número do Medidor (kWh) *
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    step="1"
                    placeholder={latestReading ? `Ex: ${latestReading.meterReadingKwh + 180}` : 'Ex: 15600'}
                    value={currentMeterInput}
                    onChange={(e) => setCurrentMeterInput(e.target.value)}
                    className={`w-full px-3 py-2 text-sm font-mono font-bold rounded border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-500">
                    kWh
                  </span>
                </div>
                {latestReading && (
                  <p className="text-[9px] text-slate-500 mt-1">
                    Último registro: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{latestReading.meterReadingKwh} kWh</strong> ({latestReading.date})
                  </p>
                )}
              </div>
            </div>

            {/* Resultado da Previsão Calculada */}
            {forecastData && (
              <div className={`p-3.5 rounded border space-y-2.5 animate-in slide-in-from-top-2 duration-200 ${
                isDark ? 'bg-slate-950/70 border-amber-500/40' : 'bg-amber-50/70 border-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Estimativa Final do Mês</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Projeção: {forecastData.projectedKwhTotal} kWh
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div>
                    <span className={`text-2xl font-black font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      R$ {forecastData.totalProjectedBill.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Gasto até hoje ({autoDaysOfCycle}d): R$ {forecastData.totalSoFar.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSimulatedReading}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar no Histórico</span>
                  </button>
                </div>

                {/* Memória de Cálculo ANEEL (Transparência Total) */}
                <div className={`pt-2 border-t grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9.5px] ${
                  isDark ? 'border-slate-800/80' : 'border-amber-200'
                }`}>
                  <div>
                    <span className="text-slate-500 block">Energia (TE):</span>
                    <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>R$ {forecastData.baseEnergyPure.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Distribuição (TUSD):</span>
                    <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>R$ {forecastData.baseDistributionPure.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Impostos (ICMS/PIS):</span>
                    <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>R$ {forecastData.taxesAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ilum. Pública (COSIP):</span>
                    <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>R$ {tariff.cosipFixed.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Histórico das Leituras Passadas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Histórico de Leituras & Faturas ({readings.length})
              </span>
            </div>

            <div className="space-y-2">
              {sortedReadings.map((r) => (
                <div
                  key={r.id}
                  className={`p-3 rounded border flex items-center justify-between gap-2 transition ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {r.meterReadingKwh.toLocaleString('pt-BR')} kWh
                        </span>
                        {r.consumptionPeriodKwh && (
                          <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                            (+{r.consumptionPeriodKwh} kWh)
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] text-slate-500 block truncate">
                        {r.date} {r.notes ? `• ${r.notes}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {r.costAmountReais && (
                      <span className={`text-xs font-black font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        R$ {r.costAmountReais.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteReading(r.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition cursor-pointer"
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
          ABA 2: PRÉ-CONFIGURAÇÃO DA TARIFA (COMPOSIÇÃO ANEEL)
         ======================================================== */}
      {activeTab === 'config' && (
        <div className={`p-4 rounded border space-y-4 animate-in fade-in duration-150 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <h4 className={`text-xs font-bold font-['Poppins'] flex items-center gap-1.5 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>Composição da Conta de Energia (ANEEL)</span>
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Ajuste as tarifas da sua concessionária para prever a conta com precisão real
            </p>
          </div>

          {/* Seleção de Estado (UF) e Distribuidora ANEEL de todos os estados */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                Selecione seu Estado e Concessionária (ANEEL):
              </label>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                27 Estados Homologados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Dropdown de Estados */}
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-slate-500">
                  Estado (UF)
                </label>
                <select
                  value={selectedUf}
                  onChange={(e) => {
                    const newUf = e.target.value;
                    setSelectedUf(newUf);
                    const firstDist = ENERGY_DISTRIBUTORS.find((d) => d.uf === newUf);
                    if (firstDist) {
                      handleSaveTariff({
                        ...tariff,
                        concessionaria: firstDist.name,
                        uf: firstDist.uf,
                        teRate: firstDist.teRate,
                        tusdRate: firstDist.tusdRate,
                        icmsPercent: firstDist.icmsPercent,
                        cosipFixed: firstDist.cosipDefault,
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs font-bold rounded border outline-none ${
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

              {/* Dropdown de Distribuidora daquele Estado */}
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-slate-500">
                  Concessionária Distribuidora
                </label>
                <select
                  value={ENERGY_DISTRIBUTORS.find((d) => d.name === tariff.concessionaria && d.uf === selectedUf)?.id || distributorsForUf[0]?.id || ''}
                  onChange={(e) => {
                    const dist = ENERGY_DISTRIBUTORS.find((d) => d.id === e.target.value);
                    if (dist) {
                      hapticSuccess();
                      handleSaveTariff({
                        ...tariff,
                        concessionaria: dist.name,
                        uf: dist.uf,
                        teRate: dist.teRate,
                        tusdRate: dist.tusdRate,
                        icmsPercent: dist.icmsPercent,
                        cosipFixed: dist.cosipDefault,
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs font-bold rounded border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-900'
                  }`}
                >
                  {distributorsForUf.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`p-2.5 rounded border flex items-center justify-between text-[10px] ${
              isDark ? 'bg-slate-950 border-amber-500/30 text-slate-300' : 'bg-amber-50 border-amber-200 text-slate-700'
            }`}>
              <span className="flex items-center gap-1.5 font-bold text-amber-500">
                <Zap className="w-3.5 h-3.5" />
                <span>{tariff.concessionaria}</span>
              </span>
              <span className="text-slate-500 font-mono text-[9.5px]">
                Dados ANEEL • ICMS {tariff.icmsPercent}% • COSIP R$ {tariff.cosipFixed.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Campos Tarifários Manuais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">
                Tarifa TE (Geração) — R$/kWh
              </label>
              <input
                type="number"
                step="0.001"
                value={tariff.teRate}
                onChange={(e) => handleSaveTariff({ ...tariff, teRate: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">
                Tarifa TUSD (Distribuição/Rede) — R$/kWh
              </label>
              <input
                type="number"
                step="0.001"
                value={tariff.tusdRate}
                onChange={(e) => handleSaveTariff({ ...tariff, tusdRate: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">
                Bandeira Tarifária
              </label>
              <select
                value={tariff.flagType}
                onChange={(e) => {
                  const fType = e.target.value as EnergyTariffConfig['flagType'];
                  const rates: Record<string, number> = {
                    'Verde': 0.0,
                    'Amarela': 0.01885,
                    'Vermelha 1': 0.04463,
                    'Vermelha 2': 0.07877,
                  };
                  handleSaveTariff({ ...tariff, flagType: fType, flagRate: rates[fType] || 0 });
                }}
                className={`w-full px-3 py-1.5 text-xs rounded border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="Verde">Verde (Sem acréscimo)</option>
                <option value="Amarela">Amarela (+ R$ 0,0188/kWh)</option>
                <option value="Vermelha 1">Vermelha Patamar 1 (+ R$ 0,0446/kWh)</option>
                <option value="Vermelha 2">Vermelha Patamar 2 (+ R$ 0,0787/kWh)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">
                Iluminação Pública (COSIP / CIP) — R$ Fixo
              </label>
              <input
                type="number"
                step="0.5"
                value={tariff.cosipFixed}
                onChange={(e) => handleSaveTariff({ ...tariff, cosipFixed: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">
                Alíquota ICMS (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={tariff.icmsPercent}
                onChange={(e) => handleSaveTariff({ ...tariff, icmsPercent: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                PIS + COFINS (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={tariff.pisCofinsPercent}
                onChange={(e) => handleSaveTariff({ ...tariff, pisCofinsPercent: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Resumo da Tarifa Efetiva Final */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Tarifa Efetiva com Tributos Calculados
                </span>
                <span className="text-[10px] text-slate-400">
                  (TE + TUSD + Bandeira) com ICMS e PIS/COFINS por dentro
                </span>
              </div>
            </div>
            <span className="text-base font-black font-mono text-emerald-400">
              R$ {effectiveKwhRate.toFixed(3)} <span className="text-[10px]">/ kWh</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
