export interface EnergyDistributor {
  id: string;
  name: string;
  uf: string;
  teRate: number; // R$/kWh Tarifa de Energia (Geração)
  tusdRate: number; // R$/kWh Tarifa de Distribuição (Uso do Sistema)
  icmsPercent: number; // Alíquota ICMS padrão do estado (%)
  cosipDefault: number; // Taxa de iluminação pública média (R$)
}

export interface WaterUtility {
  id: string;
  name: string;
  uf: string;
  waterRateM3: number; // R$/m³
  sewagePercent: number; // % sobre o consumo de água
  fixedAvailability: number; // Taxa mínima de ligação / disponibilidade (R$)
  waterPerServiceLiters: number; // Consumo médio por lavatório (Litros)
}

export const BRAZILIAN_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];

export const ENERGY_DISTRIBUTORS: EnergyDistributor[] = [
  // SP
  { id: 'enel-sp', name: 'Enel Distribuição São Paulo', uf: 'SP', teRate: 0.342, tusdRate: 0.448, icmsPercent: 18, cosipDefault: 32.50 },
  { id: 'cpfl-paulista', name: 'CPFL Paulista', uf: 'SP', teRate: 0.365, tusdRate: 0.462, icmsPercent: 18, cosipDefault: 28.00 },
  { id: 'cpfl-piratininga', name: 'CPFL Piratininga', uf: 'SP', teRate: 0.358, tusdRate: 0.450, icmsPercent: 18, cosipDefault: 29.50 },
  { id: 'edp-sp', name: 'EDP São Paulo', uf: 'SP', teRate: 0.350, tusdRate: 0.455, icmsPercent: 18, cosipDefault: 30.00 },
  { id: 'elektro', name: 'Neoenergia Elektro', uf: 'SP', teRate: 0.360, tusdRate: 0.470, icmsPercent: 18, cosipDefault: 27.00 },
  // RJ
  { id: 'light-rj', name: 'Light (Rio de Janeiro)', uf: 'RJ', teRate: 0.395, tusdRate: 0.520, icmsPercent: 20, cosipDefault: 38.00 },
  { id: 'enel-rj', name: 'Enel Distribuição Rio', uf: 'RJ', teRate: 0.388, tusdRate: 0.510, icmsPercent: 20, cosipDefault: 35.00 },
  // MG
  { id: 'cemig', name: 'Cemig Distribuição', uf: 'MG', teRate: 0.380, tusdRate: 0.490, icmsPercent: 18, cosipDefault: 35.00 },
  { id: 'dme-pocos', name: 'DME Poços de Caldas', uf: 'MG', teRate: 0.345, tusdRate: 0.430, icmsPercent: 18, cosipDefault: 25.00 },
  // RS
  { id: 'rge', name: 'RGE (CPFL Energia)', uf: 'RS', teRate: 0.370, tusdRate: 0.480, icmsPercent: 17, cosipDefault: 30.00 },
  { id: 'ceee-equatorial', name: 'CEEE Equatorial', uf: 'RS', teRate: 0.375, tusdRate: 0.485, icmsPercent: 17, cosipDefault: 32.00 },
  // PR
  { id: 'copel', name: 'Copel Distribuição', uf: 'PR', teRate: 0.355, tusdRate: 0.440, icmsPercent: 18, cosipDefault: 26.50 },
  // SC
  { id: 'celesc', name: 'Celesc Distribuição', uf: 'SC', teRate: 0.340, tusdRate: 0.420, icmsPercent: 17, cosipDefault: 24.00 },
  // BA
  { id: 'coelba', name: 'Neoenergia Coelba', uf: 'BA', teRate: 0.375, tusdRate: 0.495, icmsPercent: 19, cosipDefault: 30.00 },
  // PE
  { id: 'celpe', name: 'Neoenergia Pernambuco', uf: 'PE', teRate: 0.370, tusdRate: 0.485, icmsPercent: 18, cosipDefault: 28.00 },
  // CE
  { id: 'enel-ce', name: 'Enel Distribuição Ceará', uf: 'CE', teRate: 0.365, tusdRate: 0.475, icmsPercent: 18, cosipDefault: 27.00 },
  // GO
  { id: 'equatorial-go', name: 'Equatorial Goiás', uf: 'GO', teRate: 0.385, tusdRate: 0.505, icmsPercent: 17, cosipDefault: 34.00 },
  // DF
  { id: 'neoenergia-df', name: 'Neoenergia Brasília (CEB)', uf: 'DF', teRate: 0.360, tusdRate: 0.445, icmsPercent: 18, cosipDefault: 32.00 },
  // ES
  { id: 'edp-es', name: 'EDP Espírito Santo', uf: 'ES', teRate: 0.352, tusdRate: 0.450, icmsPercent: 17, cosipDefault: 28.00 },
  // MT
  { id: 'energisa-mt', name: 'Energisa Mato Grosso', uf: 'MT', teRate: 0.390, tusdRate: 0.530, icmsPercent: 17, cosipDefault: 36.00 },
  // MS
  { id: 'energisa-ms', name: 'Energisa Mato Grosso do Sul', uf: 'MS', teRate: 0.385, tusdRate: 0.515, icmsPercent: 17, cosipDefault: 33.00 },
  // PA
  { id: 'equatorial-pa', name: 'Equatorial Pará', uf: 'PA', teRate: 0.410, tusdRate: 0.560, icmsPercent: 17, cosipDefault: 35.00 },
  // AM
  { id: 'amazonas-energia', name: 'Amazonas Energia', uf: 'AM', teRate: 0.425, tusdRate: 0.575, icmsPercent: 18, cosipDefault: 37.00 },
  // MA
  { id: 'equatorial-ma', name: 'Equatorial Maranhão', uf: 'MA', teRate: 0.395, tusdRate: 0.535, icmsPercent: 18, cosipDefault: 31.00 },
  // RN
  { id: 'cosern', name: 'Neoenergia Cosern', uf: 'RN', teRate: 0.368, tusdRate: 0.470, icmsPercent: 18, cosipDefault: 26.00 },
  // PB
  { id: 'energisa-pb', name: 'Energisa Paraíba', uf: 'PB', teRate: 0.372, tusdRate: 0.478, icmsPercent: 18, cosipDefault: 27.50 },
  // AL
  { id: 'equatorial-al', name: 'Equatorial Alagoas', uf: 'AL', teRate: 0.380, tusdRate: 0.490, icmsPercent: 19, cosipDefault: 29.00 },
  // SE
  { id: 'energisa-se', name: 'Energisa Sergipe', uf: 'SE', teRate: 0.365, tusdRate: 0.465, icmsPercent: 18, cosipDefault: 26.00 },
  // PI
  { id: 'equatorial-pi', name: 'Equatorial Piauí', uf: 'PI', teRate: 0.388, tusdRate: 0.510, icmsPercent: 18, cosipDefault: 30.00 },
  // TO
  { id: 'energisa-to', name: 'Energisa Tocantins', uf: 'TO', teRate: 0.390, tusdRate: 0.520, icmsPercent: 18, cosipDefault: 32.00 },
  // RO
  { id: 'energisa-ro', name: 'Energisa Rondônia', uf: 'RO', teRate: 0.400, tusdRate: 0.540, icmsPercent: 17.5, cosipDefault: 34.00 },
  // AC
  { id: 'energisa-ac', name: 'Energisa Acre', uf: 'AC', teRate: 0.405, tusdRate: 0.550, icmsPercent: 17, cosipDefault: 33.00 },
  // AP
  { id: 'cea-equatorial', name: 'CEA Equatorial (Amapá)', uf: 'AP', teRate: 0.398, tusdRate: 0.530, icmsPercent: 18, cosipDefault: 31.00 },
  // RR
  { id: 'roraima-energia', name: 'Roraima Energia', uf: 'RR', teRate: 0.420, tusdRate: 0.560, icmsPercent: 17, cosipDefault: 36.00 },
];

export const WATER_UTILITIES: WaterUtility[] = [
  // SP
  { id: 'sabesp', name: 'Sabesp (São Paulo & Região)', uf: 'SP', waterRateM3: 4.80, sewagePercent: 80, fixedAvailability: 38.00, waterPerServiceLiters: 20 },
  { id: 'sanasa-campinas', name: 'SANASA (Campinas)', uf: 'SP', waterRateM3: 5.10, sewagePercent: 85, fixedAvailability: 42.00, waterPerServiceLiters: 20 },
  { id: 'dae-jundiai', name: 'DAE Jundiaí', uf: 'SP', waterRateM3: 4.50, sewagePercent: 80, fixedAvailability: 35.00, waterPerServiceLiters: 20 },
  { id: 'semae-piracicaba', name: 'SEMAE Piracicaba', uf: 'SP', waterRateM3: 4.20, sewagePercent: 80, fixedAvailability: 32.00, waterPerServiceLiters: 20 },
  // RJ
  { id: 'aguas-do-rio', name: 'Águas do Rio / Cedae (Capital & Baixada)', uf: 'RJ', waterRateM3: 5.40, sewagePercent: 100, fixedAvailability: 46.00, waterPerServiceLiters: 20 },
  { id: 'igua-rj', name: 'Iguá Saneamento (Barra & Jacarepaguá)', uf: 'RJ', waterRateM3: 5.50, sewagePercent: 100, fixedAvailability: 48.00, waterPerServiceLiters: 20 },
  // MG
  { id: 'copasa-mg', name: 'Copasa Minas Gerais', uf: 'MG', waterRateM3: 5.10, sewagePercent: 90, fixedAvailability: 42.00, waterPerServiceLiters: 20 },
  { id: 'dmae-uberlandia', name: 'DMAE Uberlândia', uf: 'MG', waterRateM3: 4.10, sewagePercent: 80, fixedAvailability: 30.00, waterPerServiceLiters: 20 },
  // RS
  { id: 'corsan', name: 'Corsan (Aegea RS)', uf: 'RS', waterRateM3: 4.90, sewagePercent: 70, fixedAvailability: 39.00, waterPerServiceLiters: 20 },
  { id: 'dmae-poa', name: 'DMAE Porto Alegre', uf: 'RS', waterRateM3: 4.60, sewagePercent: 80, fixedAvailability: 36.00, waterPerServiceLiters: 20 },
  // PR
  { id: 'sanepar', name: 'Sanepar Paraná', uf: 'PR', waterRateM3: 4.50, sewagePercent: 80, fixedAvailability: 34.00, waterPerServiceLiters: 20 },
  // SC
  { id: 'casan', name: 'Casan Santa Catarina', uf: 'SC', waterRateM3: 4.70, sewagePercent: 80, fixedAvailability: 36.00, waterPerServiceLiters: 20 },
  { id: 'samae-blumenau', name: 'SAMAE Blumenau', uf: 'SC', waterRateM3: 4.30, sewagePercent: 80, fixedAvailability: 33.00, waterPerServiceLiters: 20 },
  // BA
  { id: 'embasa', name: 'Embasa Bahia', uf: 'BA', waterRateM3: 4.65, sewagePercent: 80, fixedAvailability: 35.00, waterPerServiceLiters: 20 },
  // PE
  { id: 'compesa', name: 'Compesa Pernambuco', uf: 'PE', waterRateM3: 4.75, sewagePercent: 80, fixedAvailability: 37.00, waterPerServiceLiters: 20 },
  // CE
  { id: 'cagece', name: 'Cagece Ceará', uf: 'CE', waterRateM3: 4.85, sewagePercent: 80, fixedAvailability: 38.00, waterPerServiceLiters: 20 },
  // GO
  { id: 'saneago', name: 'Saneago Goiás', uf: 'GO', waterRateM3: 4.95, sewagePercent: 80, fixedAvailability: 40.00, waterPerServiceLiters: 20 },
  // DF
  { id: 'caesb', name: 'Caesb Distrito Federal', uf: 'DF', waterRateM3: 5.20, sewagePercent: 100, fixedAvailability: 44.00, waterPerServiceLiters: 20 },
  // ES
  { id: 'cesan', name: 'Cesan Espírito Santo', uf: 'ES', waterRateM3: 4.70, sewagePercent: 80, fixedAvailability: 36.00, waterPerServiceLiters: 20 },
  // MT
  { id: 'aguas-cuiaba', name: 'Águas Cuiabá', uf: 'MT', waterRateM3: 5.30, sewagePercent: 90, fixedAvailability: 45.00, waterPerServiceLiters: 20 },
  // MS
  { id: 'sanesul', name: 'Sanesul Mato Grosso do Sul', uf: 'MS', waterRateM3: 4.90, sewagePercent: 80, fixedAvailability: 38.00, waterPerServiceLiters: 20 },
  // PA
  { id: 'cosanpa', name: 'Cosanpa Pará', uf: 'PA', waterRateM3: 4.80, sewagePercent: 80, fixedAvailability: 36.00, waterPerServiceLiters: 20 },
  // AM
  { id: 'aguas-manaus', name: 'Águas de Manaus', uf: 'AM', waterRateM3: 5.40, sewagePercent: 100, fixedAvailability: 45.00, waterPerServiceLiters: 20 },
  // MA
  { id: 'caema', name: 'Caema Maranhão', uf: 'MA', waterRateM3: 4.60, sewagePercent: 80, fixedAvailability: 35.00, waterPerServiceLiters: 20 },
  // RN
  { id: 'caern', name: 'Caern Rio Grande do Norte', uf: 'RN', waterRateM3: 4.70, sewagePercent: 80, fixedAvailability: 36.00, waterPerServiceLiters: 20 },
  // PB
  { id: 'cagepa', name: 'Cagepa Paraíba', uf: 'PB', waterRateM3: 4.65, sewagePercent: 80, fixedAvailability: 35.00, waterPerServiceLiters: 20 },
  // AL
  { id: 'brk-alagoas', name: 'BRK Ambiental Alagoas', uf: 'AL', waterRateM3: 5.10, sewagePercent: 80, fixedAvailability: 42.00, waterPerServiceLiters: 20 },
  // SE
  { id: 'deso', name: 'Deso Sergipe', uf: 'SE', waterRateM3: 4.55, sewagePercent: 80, fixedAvailability: 34.00, waterPerServiceLiters: 20 },
  // PI
  { id: 'aguas-teresina', name: 'Águas de Teresina', uf: 'PI', waterRateM3: 4.90, sewagePercent: 80, fixedAvailability: 38.00, waterPerServiceLiters: 20 },
  // TO
  { id: 'brk-tocantins', name: 'BRK Ambiental Tocantins', uf: 'TO', waterRateM3: 5.00, sewagePercent: 80, fixedAvailability: 40.00, waterPerServiceLiters: 20 },
  // RO
  { id: 'caerd', name: 'Caerd Rondônia', uf: 'RO', waterRateM3: 4.75, sewagePercent: 80, fixedAvailability: 37.00, waterPerServiceLiters: 20 },
  // AC
  { id: 'saneacre', name: 'Saneacre (Acre)', uf: 'AC', waterRateM3: 4.60, sewagePercent: 80, fixedAvailability: 35.00, waterPerServiceLiters: 20 },
  // AP
  { id: 'csa-amapa', name: 'CSA (Saneamento do Amapá)', uf: 'AP', waterRateM3: 4.80, sewagePercent: 80, fixedAvailability: 36.00, waterPerServiceLiters: 20 },
  // RR
  { id: 'caer-roraima', name: 'Caer Roraima', uf: 'RR', waterRateM3: 4.70, sewagePercent: 80, fixedAvailability: 36.00, waterPerServiceLiters: 20 },
];
