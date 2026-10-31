export interface EnergyTariffConfig {
  concessionaria: string;
  uf?: string;
  teRate: number; // Tarifa de Energia (R$/kWh) - Geração
  tusdRate: number; // Tarifa de Uso do Sistema de Distribuição (R$/kWh)
  flagType: 'Verde' | 'Amarela' | 'Vermelha 1' | 'Vermelha 2';
  flagRate: number; // R$/kWh adicional da bandeira
  icmsPercent: number; // Alíquota ICMS (%)
  pisCofinsPercent: number; // Alíquota PIS/COFINS (%)
  cosipFixed: number; // Iluminação Pública Municipal (R$)
}

export interface WaterTariffConfig {
  concessionaria: string;
  uf?: string;
  waterRateM3: number; // Tarifa de Água (R$/m³)
  sewagePercent: number; // Esgoto (% sobre o valor da água, ex: 80% ou 100%)
  fixedAvailability: number; // Taxa mínima de ligação / disponibilidade (R$)
  waterPerServiceLiters: number; // Litros médios de água por lavagem/atendimento
}

export interface EnergyReading {
  id: string;
  date: string; // YYYY-MM-DD ou DD/MM/YYYY
  meterReadingKwh: number; // Leitura do relógio
  consumptionPeriodKwh?: number; // Consumo no período (diferença)
  costAmountReais?: number; // Valor da fatura em R$
  notes?: string;
}

export interface WaterReading {
  id: string;
  date: string;
  meterReadingM3: number; // Leitura do hidrômetro em m³
  consumptionPeriodM3?: number;
  costAmountReais?: number;
  notes?: string;
}

export interface OperationalEquipment {
  id: string;
  name: string;
  category: 'Corte & Acabamento' | 'Térmico & Secagem' | 'Lavatório & Água' | 'Outros Operacionais';
  voltage: '110V' | '220V' | 'Bivolt';
  powerWatts: number;
  kwhPerHour: number; // Consumo por hora (kWh/h)
  avgHoursPerDay: number; // Média de horas de uso por dia
  lastMaintenance: string;
  status: 'Operacional' | 'Revisão' | 'Manutenção';
}

export interface InfrastructureEquipment {
  id: string;
  name: string;
  category: 'Climatização' | 'Copa dos Funcionários' | 'Bebidas & Clientes' | 'Outra Infraestrutura';
  voltage: '110V' | '220V' | 'Bivolt';
  powerWatts: number;
  kwhPerHour: number; // Consumo por hora (kWh/h)
  avgHoursPerDay: number; // Média de horas de uso por dia
  lastMaintenance: string;
  status: 'Operacional' | 'Revisão' | 'Manutenção';
}
