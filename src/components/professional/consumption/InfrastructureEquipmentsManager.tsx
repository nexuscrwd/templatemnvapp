import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Zap,
  PieChart,
  Coins
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';
import { InfrastructureEquipment } from './consumptionTypes';
import { syncAllLocalUtilitiesToDatabase } from '../../../services/mnvSupabaseSync';

interface FreeDecimalInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
}

const FreeDecimalInput: React.FC<FreeDecimalInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
  maxLength,
}) => {
  const [localText, setLocalText] = useState<string>(() => value.toString().replace('.', ','));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  React.useEffect(() => {
    if (!isFocused) {
      setLocalText(value.toString().replace('.', ','));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (maxLength && raw.length > maxLength) return;
    if (/^[0-9.,]*$/.test(raw)) {
      setLocalText(raw);
      const normalized = raw.replace(',', '.');
      const parsed = parseFloat(normalized);
      if (!isNaN(parsed) && parsed >= 0) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = localText.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
      setLocalText(parsed.toString().replace('.', ','));
    } else {
      setLocalText(value.toString().replace('.', ','));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      maxLength={maxLength}
      value={localText}
      onFocus={() => setIsFocused(true)}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
};

const INITIAL_INFRA_EQUIPMENTS: InfrastructureEquipment[] = [];

interface InfrastructureEquipmentCardProps {
  eq: InfrastructureEquipment;
  totalDailyKwh: number;
  effectiveKwhRate: number;
  isDark: boolean;
  onUpdate: (id: string, newKwh: number, newHours: number) => void;
  onDelete: (id: string) => void;
}

const InfrastructureEquipmentCard: React.FC<InfrastructureEquipmentCardProps> = ({
  eq,
  totalDailyKwh,
  effectiveKwhRate,
  isDark,
  onUpdate,
  onDelete,
}) => {
  const [unit, setUnit] = useState<'W' | 'kW'>(() => (eq.powerWatts >= 100 || eq.kwhPerHour >= 0.1 ? 'W' : 'kW'));

  const costPerHour = eq.kwhPerHour * effectiveKwhRate;
  const dailyKwh = eq.kwhPerHour * eq.avgHoursPerDay;
  const monthlyKwh = dailyKwh * 30;
  const sharePercent = totalDailyKwh > 0 ? (dailyKwh / totalDailyKwh) * 100 : 0;

  const handlePowerValueChange = (newVal: number) => {
    if (unit === 'W') {
      const newKwh = parseFloat((newVal / 1000).toFixed(3));
      onUpdate(eq.id, Math.max(0.001, newKwh), eq.avgHoursPerDay);
    } else {
      onUpdate(eq.id, Math.max(0.001, newVal), eq.avgHoursPerDay);
    }
  };

  const handleToggleUnit = (newUnit: 'W' | 'kW') => {
    hapticLight();
    setUnit(newUnit);
  };

  return (
    <div
      className={`p-3 rounded border flex flex-col gap-2.5 transition ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}
    >
      {/* Topo do Card: Identificação + Porcentagem de Carga */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className={`text-xs font-bold font-['Poppins'] truncate ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {eq.name}
            </h4>
            <span className="text-[9.5px] text-slate-500">
              {eq.category} • {eq.voltage}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Badge de Porcentagem da Carga */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9.5px] font-mono font-bold ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <PieChart className="w-3 h-3 text-blue-500" />
            <span className="text-blue-500">{sharePercent.toFixed(1).replace('.', ',')}%</span>
            <span className="text-slate-500 text-[8.5px]">da carga</span>
          </div>

          <button
            type="button"
            onClick={() => onDelete(eq.id)}
            className="p-1 rounded text-slate-400 hover:text-rose-500 transition cursor-pointer"
            title="Excluir equipamento"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Barra de Progresso da Carga Total */}
      <div className={`w-full h-1.5 rounded-full overflow-hidden border ${
        isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-100 border-slate-200'
      }`}>
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(2, sharePercent))}%` }}
        />
      </div>

      {/* Parâmetros do Equipamento (Potência e Uso em 2 Colunas Equilibradas) */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        {/* Coluna 1: Potência + Seletor W/kW + Conversão */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[8.5px] font-bold">
            <span className="uppercase text-slate-500">Potência</span>
            <span className={`font-mono ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              ↳ {unit === 'W' 
                ? `${eq.kwhPerHour.toFixed(2).replace('.', ',')} kWh/h`
                : `${(eq.powerWatts || Math.round(eq.kwhPerHour * 1000))} W`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <FreeDecimalInput
              value={unit === 'W' ? (eq.powerWatts || Math.round(eq.kwhPerHour * 1000)) : eq.kwhPerHour}
              onChange={handlePowerValueChange}
              maxLength={6}
              className={`flex-1 min-w-0 max-w-[100px] px-2 py-1 text-xs font-mono font-bold rounded border outline-none text-center ${
                isDark ? 'bg-slate-950 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-900'
              }`}
            />

            {/* Seletor W / kW ao lado do input */}
            <div className={`flex items-center rounded border p-0.5 shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}>
              <button
                type="button"
                onClick={() => handleToggleUnit('W')}
                className={`px-2 py-0.5 text-[8.5px] font-bold rounded transition cursor-pointer ${
                  unit === 'W'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                W
              </button>
              <button
                type="button"
                onClick={() => handleToggleUnit('kW')}
                className={`px-2 py-0.5 text-[8.5px] font-bold rounded transition cursor-pointer ${
                  unit === 'kW'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                kW
              </button>
            </div>
          </div>
        </div>

        {/* Coluna 2: Uso Diário */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[8.5px] font-bold">
            <span className="uppercase text-slate-500">Uso Diário</span>
            <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {dailyKwh.toFixed(1).replace('.', ',')} <span className="text-slate-400">kWh/d</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <FreeDecimalInput
              value={eq.avgHoursPerDay}
              onChange={(newVal) => onUpdate(eq.id, eq.kwhPerHour, Math.max(0.1, newVal))}
              maxLength={4}
              className={`flex-1 min-w-0 max-w-[80px] px-2 py-1 text-xs font-mono font-bold rounded border outline-none text-center ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <span className={`px-2 py-1 rounded border text-[9px] font-bold font-mono shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              h / dia
            </span>
          </div>
        </div>
      </div>

      {/* Faixa Financeira: Custo/Hora & Custo Mensal Estimado (Proporcional 50% / 50%) */}
      <div className={`grid grid-cols-2 gap-2 p-2 rounded border items-center ${
        isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className={`flex items-center justify-between pr-2 border-r ${
          isDark ? 'border-slate-800/70' : 'border-slate-200'
        }`}>
          <span className="text-[8px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Coins className="w-3 h-3 text-blue-500" />
            <span>Custo / Hora</span>
          </span>
          <span className="text-xs font-mono font-bold text-blue-500">
            R$ {costPerHour.toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div className="flex items-center justify-between pl-1">
          <span className="text-[8px] uppercase font-bold text-slate-500">
            Custo / Mês
          </span>
          <span className={`text-xs font-mono font-bold ${
            isDark ? 'text-slate-200' : 'text-slate-900'
          }`}>
            R$ {(dailyKwh * 30 * effectiveKwhRate).toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>
    </div>
  );
};

export const InfrastructureEquipmentsManager: React.FC = () => {
  const { isDark } = useTheme();

  const [equipments, setEquipments] = useState<InfrastructureEquipment[]>(() => {
    try {
      const stored = localStorage.getItem('vagou_infrastructure_equipments');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: Partial<InfrastructureEquipment>) => ({
            ...item,
            kwhPerHour: item.kwhPerHour ?? ((item.powerWatts || 100) / 1000),
            avgHoursPerDay: item.avgHoursPerDay ?? 3.0,
            powerWatts: item.powerWatts ?? Math.round((item.kwhPerHour || 0.1) * 1000),
          })) as InfrastructureEquipment[];
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_INFRA_EQUIPMENTS;
  });

  const effectiveKwhRate = useMemo(() => {
    try {
      const stored = localStorage.getItem('vagou_energy_tariff_config');
      if (stored) {
        const t = JSON.parse(stored);
        const pureRate = (t.teRate || 0.38) + (t.tusdRate || 0.42) + (t.flagRate || 0.0);
        const taxRate = ((t.icmsPercent || 18) + (t.pisCofinsPercent || 4.5)) / 100;
        return taxRate < 0.99 ? pureRate / (1 - taxRate) : pureRate * 1.25;
      }
    } catch {
      // ignore
    }
    return 1.07;
  }, []);

  const totals = useMemo(() => {
    const totalDailyKwh = equipments.reduce((acc, eq) => acc + (eq.kwhPerHour * eq.avgHoursPerDay), 0);
    const totalMonthlyKwh = totalDailyKwh * 30;
    const totalMonthlyCost = totalMonthlyKwh * effectiveKwhRate;
    const totalWatts = equipments.reduce((acc, eq) => acc + (eq.powerWatts || Math.round(eq.kwhPerHour * 1000)), 0);

    return {
      totalDailyKwh,
      totalMonthlyKwh,
      totalMonthlyCost,
      totalWatts,
    };
  }, [equipments, effectiveKwhRate]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InfrastructureEquipment['category']>('Climatização');
  const [voltage, setVoltage] = useState<InfrastructureEquipment['voltage']>('220V');
  const [formUnit, setFormUnit] = useState<'W' | 'kW'>('W');
  const [formPowerInput, setFormPowerInput] = useState<number>(2100);
  const [avgHoursPerDay, setAvgHoursPerDay] = useState<number>(8.0);
  const [status] = useState<InfrastructureEquipment['status']>('Operacional');

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    hapticSuccess();

    const computedWatts = formUnit === 'W' ? formPowerInput : Math.round(formPowerInput * 1000);
    const computedKwh = formUnit === 'kW' ? formPowerInput : parseFloat((formPowerInput / 1000).toFixed(3));

    const newEq: InfrastructureEquipment = {
      id: `inf-eq-${Date.now()}`,
      name: name.trim(),
      category,
      voltage,
      powerWatts: computedWatts > 0 ? computedWatts : 50,
      kwhPerHour: computedKwh > 0 ? computedKwh : 0.05,
      avgHoursPerDay: avgHoursPerDay > 0 ? avgHoursPerDay : 1.0,
      lastMaintenance: new Date().toLocaleDateString('pt-BR'),
      status,
    };

    const updated = [newEq, ...equipments];
    setEquipments(updated);
    try {
      localStorage.setItem('vagou_infrastructure_equipments', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncAllLocalUtilitiesToDatabase();

    setName('');
    setShowAddForm(false);
  };

  const handleUpdateInline = (id: string, newKwh: number, newHours: number) => {
    const updated = equipments.map(eq => {
      if (eq.id === id) {
        return {
          ...eq,
          kwhPerHour: Math.max(0.001, newKwh),
          avgHoursPerDay: Math.max(0.1, newHours),
          powerWatts: Math.round(newKwh * 1000),
        };
      }
      return eq;
    });
    setEquipments(updated);
    try {
      localStorage.setItem('vagou_infrastructure_equipments', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncAllLocalUtilitiesToDatabase();
  };

  const handleDeleteEquipment = (id: string) => {
    hapticLight();
    const updated = equipments.filter(eq => eq.id !== id);
    setEquipments(updated);
    try {
      localStorage.setItem('vagou_infrastructure_equipments', JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncAllLocalUtilitiesToDatabase();
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-150">
      {/* Header com Ação */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xs font-bold font-['Poppins'] text-white flex items-center gap-1.5">
            <span>Estrutura</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {equipments.length} Ativos
            </span>
          </h3>
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Controle de consumo, conversão W ⇄ kW e impacto de cada aparelho na conta
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            setShowAddForm(!showAddForm);
          }}
          className="px-2.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Cadastrar</span>
        </button>
      </div>

      {/* Card Resumo de Carga Total Estimada */}
      <div className={`p-3 rounded-xl border ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/70 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold font-['Poppins'] text-white">
                Carga Total Estimada da Estrutura
              </h4>
              <p className="text-[9.5px] text-slate-400">
                Soma de potência e projeção de consumo mensal
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Custo Estimado/Mês</span>
            <span className="text-sm font-mono font-black text-blue-400">
              R$ {totals.totalMonthlyCost.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-950/70 border border-slate-800/80' : 'bg-slate-50'}`}>
            <span className="text-[8px] uppercase font-bold text-slate-400 block">Consumo Diário</span>
            <span className="text-xs font-mono font-bold text-white">
              {totals.totalDailyKwh.toFixed(2).replace('.', ',')} <span className="text-[9px] text-slate-400">kWh/dia</span>
            </span>
          </div>
          <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-950/70 border border-slate-800/80' : 'bg-slate-50'}`}>
            <span className="text-[8px] uppercase font-bold text-slate-400 block">Consumo Mensal</span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {totals.totalMonthlyKwh.toFixed(1).replace('.', ',')} <span className="text-[9px] text-slate-400">kWh</span>
            </span>
          </div>
          <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-950/70 border border-slate-800/80' : 'bg-slate-50'}`}>
            <span className="text-[8px] uppercase font-bold text-slate-400 block">Potência Instalada</span>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {totals.totalWatts >= 1000 ? `${(totals.totalWatts / 1000).toFixed(2).replace('.', ',')} kW` : `${totals.totalWatts} W`}
            </span>
          </div>
        </div>
      </div>

      {/* Formulário Novo Equipamento */}
      {showAddForm && (
        <form
          onSubmit={handleAddEquipment}
          className={`p-3.5 rounded-xl border space-y-3 animate-in fade-in duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-['Poppins'] text-blue-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>Novo Equipamento de Estrutura</span>
            </h4>
            <span className="text-[10px] text-slate-400">Preencha os dados de consumo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Nome do Equipamento *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ar-Condicionado Split 18.000 BTUs"
                className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InfrastructureEquipment['category'])}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="Copa dos Funcionários">Copa dos Funcionários (Micro-ondas/Geladeira)</option>
                <option value="Climatização">Climatização (Ar-condicionado/Ventilador)</option>
                <option value="Bebidas & Clientes">Bebidas & Clientes (Café/Frigobar/Bebedouro)</option>
                <option value="Outra Infraestrutura">Outra Infraestrutura</option>
              </select>
            </div>

            {/* Potência com Seletor W / kW */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Potência Nominal *
                </label>
                <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (formUnit !== 'W') {
                        setFormUnit('W');
                        setFormPowerInput(Math.round(formPowerInput * 1000));
                      }
                    }}
                    className={`px-1.5 py-0.2 text-[8px] font-bold rounded transition cursor-pointer ${
                      formUnit === 'W'
                        ? 'bg-blue-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    W
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formUnit !== 'kW') {
                        setFormUnit('kW');
                        setFormPowerInput(parseFloat((formPowerInput / 1000).toFixed(3)));
                      }
                    }}
                    className={`px-1.5 py-0.2 text-[8px] font-bold rounded transition cursor-pointer ${
                      formUnit === 'kW'
                        ? 'bg-blue-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    kW
                  </button>
                </div>
              </div>

              <div className="relative">
                <FreeDecimalInput
                  value={formPowerInput}
                  onChange={setFormPowerInput}
                  className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none pr-9 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-800'
                  }`}
                />
                <span className="absolute right-3 top-1.5 text-[10px] font-bold text-slate-400">
                  {formUnit}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                ↳ Convertido: <strong className="text-amber-400">
                  {formUnit === 'W' ? `${(formPowerInput / 1000).toFixed(2).replace('.', ',')} kWh/h` : `${Math.round(formPowerInput * 1000)} W`}
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Uso Estimado (Horas/Dia) *
              </label>
              <FreeDecimalInput
                value={avgHoursPerDay}
                onChange={setAvgHoursPerDay}
                className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Voltagem
              </label>
              <select
                value={voltage}
                onChange={(e) => setVoltage(e.target.value as InfrastructureEquipment['voltage'])}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="110V">110V</option>
                <option value="220V">220V</option>
                <option value="Bivolt">Bivolt</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Salvar Equipamento</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Equipamentos com Seletor W/kW, Conversão, Custo/Hora e % da Carga */}
      <div className="space-y-2.5">
        {equipments.map((eq) => (
          <InfrastructureEquipmentCard
            key={eq.id}
            eq={eq}
            totalDailyKwh={totals.totalDailyKwh}
            effectiveKwhRate={effectiveKwhRate}
            isDark={isDark}
            onUpdate={handleUpdateInline}
            onDelete={handleDeleteEquipment}
          />
        ))}
      </div>
    </div>
  );
};
