export interface ServiceOffer {
  id: string;
  salonName: string;
  salonLogo?: string;
  professionalName: string;
  professionalAvatar?: string;
  serviceTitle: string;
  serviceCategory: 'cabelo' | 'barba' | 'unhas' | 'beleza' | 'estetica';
  price: number;
  originalPrice?: number;
  rating: number;
  ratingCount: number;
  distance: string;
  distanceMeters?: number;
  neighborhood: string;
  timeSlot: string;
  dayLabel: string;
  duration: string;
  imageUrl: string;
  lat: number;
  lng: number;
  featured?: boolean;

  // Extensões de mídia e urgência
  mediaLevel?: 1 | 2 | 3;
  videoUrl?: string;
  galleryImages?: string[];
  expiresInMinutes?: number;
  expiresTimestamp?: number;
  activeViewers?: number;
  isFlashDeal?: boolean;
  isRecurring?: boolean;
  recurringCount?: number;
  brandColor?: string;
  brandGradient?: string;
  categoryIconKey?: 'cabelo' | 'barba' | 'unhas' | 'sobrancelha' | 'estetica' | 'beleza';
  description?: string;
  reviewsCount?: number;
  salonAddress?: string;
}

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'vagou_app';

export interface BookingAppointment {
  id?: string;
  protocolCode: string;
  service?: string;
  serviceTitle?: string;
  serviceName?: string;
  professional?: string;
  professionalName?: string;
  salonName: string;
  dateTime: string;
  dayGroup?: string;
  time?: string;
  duration?: string;
  durationMinutes?: number;
  totalPrice: number;
  status: 'EM ANDAMENTO' | 'CONFIRMADO' | 'AGENDADO' | 'CONCLUÍDO' | 'CANCELADO' | 'PENDENTE' | 'ALTERADO' | 'BLOQUEADO' | 'concluido' | 'confirmado' | 'cancelado' | 'agendado' | 'em andamento' | 'pendente' | 'alterado' | 'bloqueado' | string;
  address?: string;
  qrCodeUrl?: string;
  customerName?: string;
  clientName?: string;
  customerPhone?: string;
  clientPhone?: string;
  customerEmail?: string;
  dateIso?: string;
  createdAt?: string;

  // Vagou Family / Dependentes (Multi-Perfis)
  is_dependent?: boolean;
  dependent_id?: string;
  dependent_name?: string;
  client_user_id?: string;

  // Gestão Financeira & Caixa
  paymentMethod?: PaymentMethod;
  isPaid?: boolean;
  paidAt?: string;
  commissionRate?: number;
  commissionAmount?: number;
  platformFee?: number;

  // Bloqueio de Horário
  isBlockedSlot?: boolean;
  blockReason?: string;

  // Remanejamento e Troca de Horário entre Clientes (Proposta A <-> B)
  swapRequest?: {
    isClientSwap: boolean;
    message?: string;
    clientA: {
      name: string;
      originalTime: string;
      requestedTime: string;
      phone?: string;
    };
    clientB: {
      name: string;
      originalTime: string;
      accepted: boolean;
      rejected?: boolean;
      phone?: string;
    };
    status: 'pending_client_b' | 'pending_salon_confirmation' | 'confirmed' | 'rejected' | 'completed';
    rejectedSlots?: string[];
    // Fila em Cascata Automática (A -> B -> C -> D)
    cascadeTargets?: SwapTargetQueueItem[];
    currentCascadeIndex?: number;
    timeoutSecondsPerTarget?: number;
    lastTargetUpdatedAt?: number;
  };

  // Radar Bidirecional de Deslocamento Ao Vivo ("Estou a Caminho" — bol-020)
  service_location_type?: ServiceLocationType;
  transport_mode?: TransportMode;
  tracking_status?: LiveTrackingStatus;
  selected_route_summary?: string;
  route_polyline?: string;
  current_street_name?: string;
  route_checkpoints?: LiveRouteCheckpoint[];
  active_adversity?: LiveAdversityReport | null;
  delay_minutes?: number;
  client_lat?: number;
  client_lng?: number;
  distance_km?: number;
  eta_minutes?: number;
  prep_buffer_minutes?: number;
  cancellation_reason?: string;
  last_location_update?: string;
}

export type ServiceLocationType = 'in_salon' | 'home_delivery';

export type TransportMode = 'walking' | 'bicycling' | 'motorcycle' | 'car' | 'driving' | 'transit' | 'rideshare';

export type LiveTrackingStatus =
  | 'idle'
  | 'alerted'
  | 'hurry_confirmed'
  | 'on_way_no_map'
  | 'live_sharing'
  | 'arriving_5min'
  | 'arrived'
  | 'rescheduled'
  | 'cancelled';

export interface LiveAdversityReport {
  type: 'traffic' | 'roadwork' | 'parking' | 'other';
  label: string;
  street: string;
  addedMinutes: number;
  reportedAt: string;
}

export interface LiveRouteCheckpoint {
  street: string;
  distanceText?: string;
  status: 'passed' | 'current' | 'upcoming';
  timestamp?: string;
  adversity?: {
    type: string;
    label: string;
    addedMinutes: number;
  };
}

export interface SwapTargetQueueItem {
  slotTime: string;
  customerName?: string;
  customerPhone?: string;
  status: 'pending' | 'timeout' | 'rejected' | 'accepted';
  sentAt?: number;
  expiresAt?: number;
}

export interface ClientSwapGovernance {
  optIn: boolean; // Optante para participar da rede solidária de trocas
  monthlyQuota: number; // Padrão 2 trocas por mês
  usedThisMonth: number; // Trocas solicitadas no mês corrente
  activeRejections: number; // Recusas ativas explícitas (limite 5)
  consecutiveTimeouts: number; // Vácuos consecutivos (limite 3 -> desativa optIn)
  isBannedFromRequesting: boolean; // Suspenso se activeRejections >= 5
}

export type UserPersona = 'cliente' | 'pro' | 'profissional' | 'admin';

export type FamilyRelationship = 'filho' | 'filha' | 'esposo' | 'esposa' | 'pai' | 'mae' | 'outro';
export type FamilyAutonomyLevel = 'parent_controlled' | 'teen_assisted' | 'emancipated';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: FamilyRelationship;
  birthDate?: string; // YYYY-MM-DD para cálculo de faixa etária e maioridade
  avatarUrl?: string;
  avatarEmoji?: string;
  gender?: 'M' | 'F' | 'O';
  notes?: string; // Preferências de corte, alergias, estilo favorito
  autonomyLevel: FamilyAutonomyLevel;
  phone?: string; // Celular do jovem quando atingir autonomia
  email?: string;
  emancipatedUserId?: string; // ID da conta emancipada quando virar independente
  createdAt?: string;
}

// Dependente da Conta Família (Padrão Unificado Tríade VagouApp / admvapp)
export interface UserFamilyDependent {
  id: string;
  parent_client_id?: string;
  full_name: string;
  relationship: 'son' | 'daughter' | 'spouse' | 'parent' | 'other';
  birth_date?: string;
  notes?: string;
  is_unlinked?: boolean;
  unlinked_at?: string;
  created_at?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  address: string;
  avatarUrl?: string;
  swapGovernance?: ClientSwapGovernance;
  familyMembers?: FamilyMember[];
}

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'evp';

export interface SalonPixKeyItem {
  id: string;
  type: PixKeyType;
  key: string;
  holderName?: string;
  institution?: string;
  isPrimary: boolean;
  verified?: boolean;
}

export interface DayOperatingHours {
  dayKey: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
  dayLabel: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasBreak?: boolean;
  breakStart?: string;
  breakEnd?: string;
  pauseReason?: string;
}

export interface OperatingSchedule {
  preset: 'salao' | 'comercial' | 'todos' | 'personalizado';
  days: DayOperatingHours[];
  defaultOpenTime?: string;
  defaultCloseTime?: string;
  professionalSchedules?: Record<string, DayOperatingHours[]>;
}

export interface SalonAdminSettings {
  salonName: string;
  salonSlug?: string;
  category?: string;
  email?: string;
  phoneLandline?: string;
  salonPhone: string;
  salonAddress: string;
  openingHours: string;
  isOpenNow: boolean;
  pinCode?: string;
  accentColor?: string;
  salonLogo?: string; // Logo padrão / fallback
  salonLogoLight?: string; // Logo horizontal para o tema claro (fundo claro)
  salonLogoDark?: string; // Logo horizontal para o tema escuro (fundo escuro)
  salonIcon?: string; // Ícone quadrado (1:1) para o PWA (instalação no celular)
  pwaName?: string;   // Nome curto/completo exibido na tela inicial do celular
  slogan?: string;    // Assinatura curta da marca (até 60 caracteres) exibida abaixo do nome do salão
  showSlogan?: boolean; // Ocultar ou exibir slogan do cabeçalho (padrão true)
  logoTextFallback?: string; // Texto provisório do cabeçalho na ausência de logotipo
  logoTextColor?: string; // Cor personalizada da fonte do texto provisório
  showHeroSlides?: boolean; // Ocultar ou exibir slide da página principal (padrão true)
  brandFont?: 'Poppins' | 'Cormorant Garamond' | 'Oswald' | 'Plus Jakarta Sans' | string; // Fonte de destaque do Nome/Cabeçalho
  defaultTheme?: 'dark' | 'light'; // Layout claro ou escuro permanente
  navStyle?: 'minimal' | 'solid' | 'boxed'; // Estilo visual da barra de navegação inferior (BottomNav)
  navShape?: 'square' | 'circle'; // Formato dos botões da navegação inferior (quadrado vs circular)
  navBorder?: 'bordered' | 'none'; // Botão com borda ou sem borda (box externo)
  navIconBorder?: 'bordered' | 'none'; // Ícone com borda ou sem borda (box interno do ícone)
  navBgStyle?: 'solid' | 'glass' | 'transparent'; // Fundo do rodapé: sólido, alpha-vidro jateado, alpha 100% (transparente)
  navBgColor?: string; // Cor personalizada do fundo do rodapé
  navBtnBgColor?: string; // Cor personalizada do fundo dos botões (inativos / base)
  navBtnActiveBgColor?: string; // Cor personalizada do fundo do botão quando ativo
  navActiveColor?: string; // Cor personalizada de destaque da navegação inferior (ícone e texto ativos)
  navTextColor?: string; // Cor personalizada do texto e ícones (inativos / base)
  navBtnShadow?: 'none' | 'subtle' | 'medium' | 'glow'; // Efeito de sombra nos botões da barra de navegação
  navBtnBlur?: 'none' | 'sm' | 'md' | 'lg'; // Efeito de blur/desfoque nos botões da barra de navegação
  navBtnFont?: 'Poppins' | 'Inter' | 'Plus Jakarta Sans' | 'Oswald' | 'Cormorant Garamond' | string; // Fonte dos botões da navegação
  welcomeStyle?: 'atmospheric' | 'glass'; // Estilo da faixa de boas-vindas na seção Início

  // Personalização da Barra de Título das Seções (Subcabeçalhos) & Botões
  sectionHeaderBgColor?: string; // Cor de fundo da barra de título das seções
  sectionHeaderTextColor?: string; // Cor do texto do título das seções
  sectionHeaderIconColor?: string; // Cor dos ícones de destaque das seções
  sectionHeaderBgStyle?: 'solid' | 'glass' | 'transparent'; // Estilo do fundo da barra de título
  sectionHeaderBorder?: 'bordered' | 'none'; // Borda inferior da barra de título
  sectionHeaderBtnBgColor?: string; // Cor do fundo dos botões/crachás da barra de títulos
  sectionHeaderBtnActiveBgColor?: string; // Cor do fundo do botão/crachá ativo da barra de títulos
  sectionHeaderBtnBorder?: 'bordered' | 'none'; // Borda dos botões/crachás da barra de títulos
  sectionHeaderBtnShadow?: 'none' | 'subtle' | 'medium' | 'glow'; // Efeito de sombra nos botões/crachás
  sectionHeaderBtnBlur?: 'none' | 'sm' | 'md' | 'lg'; // Efeito de blur/desfoque nos botões/crachás
  sectionHeaderBtnFont?: 'Poppins' | 'Inter' | 'Plus Jakarta Sans' | 'Oswald' | 'Cormorant Garamond' | string; // Fonte dos botões da barra de títulos

  bio?: string;       // História/apresentação do espaço (preenchida pós-cadastro no painel do salão)
  websiteUrl?: string; // Site oficial do estabelecimento
  instagramUrl?: string; // @instagram ou URL
  facebookUrl?: string; // Facebook página ou URL
  mapsUrl?: string; // Link ou referência do Google Maps

  // Dados Cadastrais e Fiscais (Exclusivos para CNPJ 14 dígitos; vazios '' quando Autônomo)
  razaoSocial?: string;
  cnpj?: string;

  // Chaves PIX do Estabelecimento (Principal + Múltiplas Chaves JSONB)
  pixKey?: string;
  pixKeys?: SalonPixKeyItem[];

  // Localização Detalhada
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;

  // Atendimento Inteligente & Espaço
  operatingSchedule?: OperatingSchedule;
  operatingHoursJson?: Record<string, any>;
  holidays?: Array<{ id: string; date: string; name: string }>;
  cancellationPolicy?: {
    minAdvanceHours: number;
    chargeCancellationFee: boolean;
    cancellationFeePercent: number;
    allowAutoReschedule: boolean;
    maxNoShowsBeforeBlock: number;
  };
  spacePhotos?: Array<{ id: string; url: string; caption: string }>;
  spaceDescription?: string;
  amenities?: string[];
  workingDays?: string[];
  openTime?: string;
  closeTime?: string;
  closedOnHolidays?: boolean;

  // Responsável Legal / Titular Pessoal (clients.cpf & salons.owner_cpf)
  ownerCpf?: string;
  legalManagerName?: string;
  legalManagerCpf?: string;
  legalManagerPhone?: string;
  legalManagerEmail?: string;

  // Formato Operacional & Atendimento
  operatingModel?: 'solo' | 'team' | 'home_delivery' | 'hybrid';
  homeDeliverySettings?: {
    enabled: boolean;
    areaDescription?: string;
    maxDistanceKm?: number;
    travelFee?: number;
    isFreeForCondo?: boolean;
  };

  // Governança e Moderação Centralizada (adm.vagouapp.com / admvapp)
  status?: 'active' | 'pending' | 'incomplete' | 'suspended';
  isVerified?: boolean;
  moderationNotes?: string;
}

export interface ServiceCategoryItem {
  id: string;
  name: string;
  description?: string;
  iconKey?: string;
  color?: string;
  sortOrder?: number;
  isCustom?: boolean;
}

export interface SalonProfessionalItem {
  id?: string;
  name: string;
  role?: string;
  systemRole?: 'admin' | 'member';
  avatar?: string;
  avatarUrl?: string;
  rating?: number;
  phone?: string;
  email?: string;
  commissionRate?: number;
  specialties?: string[];
  workSchedule?: ProfessionalWorkSchedule;
  isActive?: boolean;
}

export interface CatalogServiceItem {
  id: string;
  title: string;
  duration: string;
  price: number;
  description: string;
  category: string;
  categoryId?: string;
  image?: string;
  photos?: string[];
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  videoDurationSeconds?: number;
  displayMode?: 'static' | 'slideshow' | 'video';
  aspectRatio?: string;
  professionalId?: string; // Multi-tenant RBAC: vincula o serviço a um profissional específico
}

export type ProfessionalRole = 'admin' | 'professional' | 'receptionist';

export interface FinancialExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: 'fixed' | 'variable'; // Fixo ou Variável
  status: 'paid' | 'pending' | 'overdue';
  scope: 'salon' | 'personal'; // Salão Todo ou Custo Pessoal
  createdAt: string;
}

export interface ProfessionalWorkSchedule {
  shiftType: 'manha' | 'tarde' | 'integral' | 'sabados' | 'personalizado';
  shiftLabel?: string;
  days: string[]; // e.g. ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
  startTime: string; // e.g. '08:00'
  endTime: string; // e.g. '14:00'
}

export interface ProfessionalTeamMember {
  id: string;
  name: string;
  role: ProfessionalRole;
  avatarUrl?: string;
  phone?: string;
  email?: string;
  specialties: string[];
  commissionRate?: number; // Percentual de repasse (ex: 50 para 50%)
  workSchedule?: ProfessionalWorkSchedule;
  isActive: boolean;
  joinedAt: string;
}

// Utilitários de feedback tátil e fallbacks determinísticos
export const hapticLight = () => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(10); } catch {}
  }
};

export const hapticMedium = () => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(25); } catch {}
  }
};

export const hapticSuccess = () => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([15, 50, 20]); } catch {}
  }
};

export const getSalonLogo = (_salonName?: string, logoUrl?: string): string => {
  if (logoUrl) return logoUrl;
  return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=200&q=80';
};


