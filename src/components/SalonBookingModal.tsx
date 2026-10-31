import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Calendar, Clock, User, Users, CheckCircle2, ChevronLeft, ChevronRight,
  Scissors, ArrowLeft, AlertCircle,
  Check, Video, Images, Plus, Navigation, MapPin, Search,
  Sun, Sunset, Moon, Bookmark, RotateCcw, Loader2, Car, Home,
  Bike, Bus, Smartphone, ExternalLink, Footprints
} from 'lucide-react';
import { supabase, isSupabaseConfigured, fetchClientFamilyMembers, generateUuidV4 } from '../lib/supabase';
import { syncClientDependentToDatabase } from '../services/mnvSupabaseSync';
import { ServiceOffer, CatalogServiceItem, UserFamilyDependent, SalonProfessionalItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  getAvailableSlotsForDate,
  fetchBusySlotsDirectly,
  fetchAvailableProfessionalsForDate,
  BusySlotRecord,
  resolveAddressDistanceToSalon,
  saveBookingDraft,
  BookingDraftItem,
  BookingSlotItem,
  TransportMode,
  TRANSPORT_MODE_META,
  buildTransportDeepLinks,
  formatMaxDepartureTime,
  computeCalibratedEtaForMode,
} from '../utils/bookingSlots';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics';
import { SalonClientAuthModal } from './SalonClientAuthModal';
import {
  computeGoogleDetailedRoute,
  fetchGoogleModalRouteMatrix,
  searchGooglePlacesSuggestions,
  snapAndReverseGeocodeGps,
  GoogleComputedRouteResult,
  GooglePlaceSuggestion,
  ModalMatrixMap,
} from '../services/googleMapsService';
import { InteractiveGoogleRouteMap } from './live-tracking/InteractiveGoogleRouteMap';

export type { CatalogServiceItem, SalonProfessionalItem };

interface SalonBookingModalProps {
  isOpen?: boolean;
  inline?: boolean;
  onClose?: () => void;
  salonId?: string;
  salonName: string;
  salonAddress?: string;
  salonCep?: string;
  salonSlug?: string;
  salonLogo?: string;
  salonLogoLight?: string;
  salonLogoDark?: string;
  salonCoords?: { lat: number; lng: number };
  primaryColor?: string;
  services: CatalogServiceItem[];
  professionals: SalonProfessionalItem[];
  initialService?: CatalogServiceItem | null;
  bookingTrigger?: number;
  resumeDraft?: BookingDraftItem | null;
  baseOffer?: ServiceOffer;
  skipDateStep?: boolean;
  initialTimeSlot?: string | null;
  initialDateIso?: string;
  preSelectedProfessionalName?: string;
  onDraftSaved?: (draft: BookingDraftItem | null) => void;
  onNavigateToAgenda?: () => void;
  onBeneficiaryState?: (state: {
    isDependentBooking: boolean;
    dependentName: string;
    selectedService: CatalogServiceItem | null;
    openBeneficiaryModal: () => void;
  }) => void;
  onConfirmAppointment: (bookingData: {
    service: CatalogServiceItem;
    professional: string;
    professionalAvatar?: string;
    dateIso: string;
    dateFormatted: string;
    timeSlot: string;
    salonName: string;
    salonAddress: string;
    price: number;
    offerId?: string;
    isDependentBooking?: boolean;
    dependentId?: string;
    dependentName?: string;
    clientPhone?: string;
    notes?: string;
    distanceKm?: number;
    etaMinutes?: number;
    prepBufferMinutes?: number;
    transportMode?: 'driving' | 'motorcycle' | 'walking' | 'bicycling' | 'transit';
    uiTransportMode?: TransportMode;
    maxDepartureTime?: string;
    originFormattedAddress?: string;
    originLat?: number;
    originLng?: number;
    salonLat?: number;
    salonLng?: number;
    selectedRouteSummary?: string;
  }) => Promise<{ success: boolean; error?: string } | void> | void;
}

type Step = 'service' | 'date' | 'professionals_and_time';

const PREP_BUFFER_MINUTES = 15;

export const SalonBookingModal: React.FC<SalonBookingModalProps> = ({
  isOpen = true,
  inline = false,
  onClose,
  salonId = '',
  salonName,
  salonAddress = '',
  salonCep = '',
  salonSlug = '',
  salonLogo,
  salonLogoLight,
  salonLogoDark,
  salonCoords = { lat: -23.5621, lng: -46.4795 },
  primaryColor = '#00a033',
  services,
  professionals,
  initialService,
  bookingTrigger = 0,
  resumeDraft = null,
  baseOffer,
  skipDateStep = false,
  initialTimeSlot,
  initialDateIso,
  preSelectedProfessionalName,
  onDraftSaved,
  onNavigateToAgenda,
  onBeneficiaryState,
  onConfirmAppointment,
}) => {
  const { isDark } = useTheme();

  // 1. Selected Services State
  const [selectedServices, setSelectedServices] = useState<CatalogServiceItem[]>(() => {
    if (initialService) return [initialService];
    return [];
  });

  // Objeto consolidado de serviços selecionados
  const selectedService = useMemo(() => {
    if (selectedServices.length === 0) return null;
    if (selectedServices.length === 1) return selectedServices[0];

    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const combinedTitle = selectedServices.map((s) => s.title).join(' + ');

    let totalMinutes = 0;
    let canParseMinutes = true;
    for (const s of selectedServices) {
      const match = String(s.duration || '').match(/(\d+)/);
      if (match) {
        totalMinutes += parseInt(match[1], 10);
      } else {
        canParseMinutes = false;
        break;
      }
    }
    const combinedDuration = canParseMinutes
      ? `${totalMinutes} min`
      : selectedServices.map((s) => s.duration).join(' + ');

    return {
      id: selectedServices.map((s) => s.id).join('+'),
      title: combinedTitle,
      price: totalPrice,
      duration: combinedDuration,
      category: selectedServices[0]?.category || 'Combo',
    } as CatalogServiceItem;
  }, [selectedServices]);

  // Step state: se o serviço já veio selecionado da seção Serviços, avança direto para Data e Horário ('date')
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    if (initialTimeSlot) return 'professionals_and_time';
    if (initialService) return skipDateStep ? 'professionals_and_time' : 'date';
    return 'service';
  });

  const pendingAuthActionRef = useRef<'start_booking' | 'confirm_final'>('start_booking');

  const checkIsClientAuthenticatedSync = (): boolean => {
    try {
      const rawClientSession = localStorage.getItem('vagou_client_session');
      if (rawClientSession) {
        const parsed = JSON.parse(rawClientSession);
        if (parsed && (parsed.id || parsed.clientId || parsed.email || parsed.username)) {
          return true;
        }
      }
      const localUserId = (localStorage.getItem('vagou_auth_user_id') || '').trim();
      if (localUserId && !localUserId.startsWith('guest-')) {
        return true;
      }
      const localEmail = (
        localStorage.getItem('vagou_user_email') ||
        localStorage.getItem('vagou_active_partner') ||
        ''
      ).trim();
      if (localEmail) {
        return true;
      }
    } catch {}
    return false;
  };

  // Modal Inline "Para Você ou Dependente?" (abre imediatamente ao escolher o serviço quando autenticado)
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState<boolean>(() => {
    if (initialService && !initialTimeSlot && !resumeDraft && checkIsClientAuthenticatedSync()) return true;
    return false;
  });
  const [returnToSummaryAfterBeneficiary, setReturnToSummaryAfterBeneficiary] = useState<boolean>(false);

  // Modal Simples de Origem ("Local Atual GPS" vs "Saindo de Casa" vs "Outro Local" com cálculo de distância e sugestão de dia/horário propício)
  const [isOriginModalOpen, setIsOriginModalOpen] = useState<boolean>(false);
  const [originModalMode, setOriginModalMode] = useState<'choice' | 'custom_cep'>('choice');
  const [originType, setOriginType] = useState<'gps' | 'home' | 'other'>('gps');
  const [customCepInput, setCustomCepInput] = useState('');
  const [hasCalculatedCustomCep, setHasCalculatedCustomCep] = useState(false);
  const [returnToRouteModalAfterOrigin, setReturnToRouteModalAfterOrigin] = useState(false);

  // Modal Independente de Resumo Final / Pré-Salvamento
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [draftSavedFeedback, setDraftSavedFeedback] = useState<string | null>(null);

  // Modal Pós-Confirmação 1: Pergunta "Pôr na Agenda" ou "Ir Agora"
  const [isPostConfirmChoiceModalOpen, setIsPostConfirmChoiceModalOpen] = useState(false);
  // Modal Pós-Confirmação 2: Modal Próprio de Rota / Deslocamento (Google Maps API)
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isEmbeddedMapOpen, setIsEmbeddedMapOpen] = useState(false);
  const [embeddedMapTab, setEmbeddedMapTab] = useState<'map' | 'itinerary'>('map');
  const [isRideAppOptionsOpen, setIsRideAppOptionsOpen] = useState(false);
  const [liveRouteData, setLiveRouteData] = useState<GoogleComputedRouteResult | null>(null);
  const [modalMatrix, setModalMatrix] = useState<ModalMatrixMap>({});
  const [hasReachedDestinationInApp, setHasReachedDestinationInApp] = useState(false);
  const [placesSuggestions, setPlacesSuggestions] = useState<GooglePlaceSuggestion[]>([]);

  // 2. Date Selection State (Monthly Calendar)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const [currentViewMonth, setCurrentViewMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => {
    const d = new Date();
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // 3. Professional Selection State ('any' or professional name)
  const [selectedProfessional, setSelectedProfessional] = useState<string>(preSelectedProfessionalName || 'any');

  // 4. Time Slot & Period Selection (Ordem obrigatória: Manhã, Tarde, Noite, Todos)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(initialTimeSlot || null);
  const [timePeriodFilter, setTimePeriodFilter] = useState<'manha' | 'tarde' | 'noite' | 'todos'>('manha');

  // 5. Cálculo Preditivo de Deslocamento (Casa ou Outro Local via CEP + Modal de Transporte + Margem de Folga + 15 min preparo)
  const [transportMode, setTransportMode] = useState<TransportMode>('car');
  const [addressQuery, setAddressQuery] = useState<string>(() => {
    return (
      localStorage.getItem('vagou_user_cep') ||
      localStorage.getItem('vagou_user_address') ||
      localStorage.getItem('vagou_client_test_address') ||
      '08235-770'
    );
  });
  const [salonDestQuery, setSalonDestQuery] = useState<string>(() => {
    return salonCep || salonAddress || '08285-010';
  });
  const [resolvedAddressLabel, setResolvedAddressLabel] = useState<string>('Endereço Residencial');
  const [resolvedSalonAddressLabel, setResolvedSalonAddressLabel] = useState<string>('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>({
    lat: -23.5505,
    lng: -46.6333,
  });
  const [resolvedSalonCoords, setResolvedSalonCoords] = useState<{ lat: number; lng: number }>(salonCoords);
  const [distanceKm, setDistanceKm] = useState<number>(6.6);
  const [etaMinutes, setEtaMinutes] = useState<number>(28);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

  // Sincronizar CEP/Endereço real do salão assim que hidratar do Supabase
  useEffect(() => {
    const nextDest = (salonCep || salonAddress || '').trim();
    if (nextDest && nextDest !== salonDestQuery) {
      setSalonDestQuery(nextDest);
    }
  }, [salonCep, salonAddress]);

  // Carregar rota detalhada real (Routes API v2) + matriz simultânea dos 5 modais quando o modal de rota ou mapa abrir
  useEffect(() => {
    if (!isRouteModalOpen && !isEmbeddedMapOpen) return;
    let active = true;

    computeGoogleDetailedRoute({
      originLat: originCoords.lat,
      originLng: originCoords.lng,
      originAddress: resolvedAddressLabel || addressQuery,
      destLat: resolvedSalonCoords.lat,
      destLng: resolvedSalonCoords.lng,
      destAddress: salonAddress || resolvedSalonAddressLabel || salonName,
      mode: transportMode,
    }).then((res) => {
      if (active && res) {
        setLiveRouteData(res);
        setDistanceKm(res.distanceKm);
        setEtaMinutes(res.etaMinutes);
      }
    });

    fetchGoogleModalRouteMatrix({
      originLat: originCoords.lat,
      originLng: originCoords.lng,
      originAddress: resolvedAddressLabel || addressQuery,
      destLat: resolvedSalonCoords.lat,
      destLng: resolvedSalonCoords.lng,
      destAddress: salonAddress || resolvedSalonAddressLabel || salonName,
    }).then((matrix) => {
      if (active && matrix) {
        setModalMatrix(matrix);
      }
    });

    return () => {
      active = false;
    };
  }, [
    isRouteModalOpen,
    isEmbeddedMapOpen,
    transportMode,
    originCoords.lat,
    originCoords.lng,
    resolvedSalonCoords.lat,
    resolvedSalonCoords.lng,
  ]);

  // Autocomplete Places API (New v1) ao digitar rua/local em "Outro Local"
  useEffect(() => {
    const clean = customCepInput.trim();
    const hasLetters = /[a-zA-ZÀ-ÿ]/.test(clean);
    if (!isOriginModalOpen || originModalMode !== 'custom_cep' || !hasLetters || clean.length < 3) {
      setPlacesSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchGooglePlacesSuggestions(clean).then((list) => {
        setPlacesSuggestions(list);
      });
    }, 280);

    return () => clearTimeout(timer);
  }, [customCepInput, isOriginModalOpen, originModalMode]);

  // Horários ocupados e profissionais disponíveis no dia vindos do banco de dados
  const [busySlotsFromDb, setBusySlotsFromDb] = useState<BusySlotRecord[]>([]);
  const [availableProfessionalsForDate, setAvailableProfessionalsForDate] = useState<SalonProfessionalItem[]>(() =>
    professionals.filter((p) => p.isActive !== false && !String(p.role || '').toLowerCase().includes('recep'))
  );
  const [isLoadingBusySlots, setIsLoadingBusySlots] = useState(false);

  // Relógio em tempo real para manter o cálculo de Hora Atual + ETA + 15 min sempre preciso
  const [currentTimeTick, setCurrentTimeTick] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Estado de Autenticação e Dependentes (Conta Família sincronizada com o banco)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    if (initialService && !checkIsClientAuthenticatedSync()) return true;
    return false;
  });
  const [isDependentBooking, setIsDependentBooking] = useState(false);
  const [dependentId, setDependentId] = useState<string>('');
  const [dependentName, setDependentName] = useState('');
  const [registeredDependents, setRegisteredDependents] = useState<UserFamilyDependent[]>(() => {
    try {
      const raw = localStorage.getItem('vagou_user_dependents');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Mini-formulário inline para "+ Cadastrar Dependente" dentro do modal "Para Você ou Dependente?"
  const [isCreatingDependentInline, setIsCreatingDependentInline] = useState(false);
  const [newDepFullName, setNewDepFullName] = useState('');
  const [newDepRelationship, setNewDepRelationship] = useState<'son' | 'daughter' | 'spouse' | 'parent' | 'other'>('son');
  const [newDepBirthDate, setNewDepBirthDate] = useState('');
  const [newDepNotes, setNewDepNotes] = useState('');
  const [isSavingInlineDependent, setIsSavingInlineDependent] = useState(false);

  useEffect(() => {
    onBeneficiaryState?.({
      isDependentBooking,
      dependentName,
      selectedService,
      openBeneficiaryModal: () => setIsBeneficiaryModalOpen(true),
    });
  }, [isDependentBooking, dependentName, selectedService]);

  const [clientPhoneInput, setClientPhoneInput] = useState(() => {
    return localStorage.getItem('vagou_user_phone') || '';
  });
  const [bookingErrorMessage, setBookingErrorMessage] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Carregar dependentes reais do cliente no Supabase (public.dependents / public.client_family_members)
  useEffect(() => {
    async function loadClientDependentsFromDb() {
      try {
        const rawLocal = localStorage.getItem('vagou_user_dependents');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) setRegisteredDependents(parsed);
        }
      } catch {}

      if (!isSupabaseConfigured || !supabase) return;
      try {
        let parentClientId = localStorage.getItem('vagou_client_id') || '';
        const cleanEmail = (localStorage.getItem('vagou_user_email') || '').trim().toLowerCase();

        if ((!parentClientId || parentClientId.length < 10) && cleanEmail) {
          const { data: cRow } = await (supabase.from('clients') as any)
            .select('id')
            .ilike('email', `%${cleanEmail}%`)
            .maybeSingle();
          if (cRow?.id) {
            parentClientId = cRow.id;
            localStorage.setItem('vagou_client_id', cRow.id);
          }
        }

        if (parentClientId && parentClientId.length > 10) {
          const remoteDeps = await fetchClientFamilyMembers(parentClientId);
          if (Array.isArray(remoteDeps) && remoteDeps.length > 0) {
            const normalized: UserFamilyDependent[] = remoteDeps.map((d: any) => ({
              id: d.id,
              parent_client_id: d.parent_client_id || d.guardian_client_id || parentClientId,
              full_name: d.full_name || d.name || 'Dependente',
              relationship: d.relationship || 'other',
              birth_date: d.birth_date || undefined,
              notes: d.notes || undefined,
              is_unlinked: Boolean(d.is_unlinked),
              created_at: d.created_at || new Date().toISOString(),
            }));
            setRegisteredDependents(normalized);
            localStorage.setItem('vagou_user_dependents', JSON.stringify(normalized));
          }
        }
      } catch {}
    }

    loadClientDependentsFromDb();
  }, [isOpen, isBeneficiaryModalOpen]);

  // Consultar horários ocupados e disponibilidade real dos profissionais no banco sempre que a data ou o salão mudar
  useEffect(() => {
    let active = true;
    async function loadBusySlotsAndAvailablePros() {
      if (!selectedDateIso) return;
      setIsLoadingBusySlots(true);
      const effectiveSalonId =
        salonId ||
        localStorage.getItem('vagou_salon_db_id') ||
        localStorage.getItem('vagou_salon_slug') ||
        '';
      const slots = await fetchBusySlotsDirectly(effectiveSalonId, selectedDateIso);
      const availablePros = await fetchAvailableProfessionalsForDate(
        effectiveSalonId,
        selectedDateIso,
        professionals,
        slots
      );
      if (active) {
        setBusySlotsFromDb(slots);
        setAvailableProfessionalsForDate(availablePros);
        setIsLoadingBusySlots(false);
      }
    }
    loadBusySlotsAndAvailablePros();
    return () => {
      active = false;
    };
  }, [salonId, selectedDateIso, isSummaryModalOpen, professionals]);

  // Filtrar apenas os profissionais que fazem o tipo de serviço selecionado
  const professionalsForSelectedService = useMemo(() => {
    if (!selectedService) return availableProfessionalsForDate;

    // 1. Vínculo explícito por professionalId no serviço
    if (selectedService.professionalId) {
      const exactMatch = availableProfessionalsForDate.filter(
        (p) => p.id && p.id === selectedService.professionalId
      );
      if (exactMatch.length > 0) return exactMatch;
    }

    // 2. Filtro por especialidade/categoria do serviço
    const normalizeText = (val: string) =>
      String(val || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const srvCategoryNorm = normalizeText(selectedService.category || '');
    const srvTitleNorm = normalizeText(selectedService.title || '');

    const serviceKeywords = new Set<string>();
    if (srvCategoryNorm) serviceKeywords.add(srvCategoryNorm);
    srvTitleNorm.split(/[\s+/,-]+/).forEach((w) => {
      if (w.length >= 3) serviceKeywords.add(w);
    });
    if (
      srvTitleNorm.includes('corte') ||
      srvTitleNorm.includes('degrad') ||
      srvTitleNorm.includes('navalha') ||
      srvCategoryNorm.includes('cabelo')
    ) {
      serviceKeywords.add('cabelo');
      serviceKeywords.add('corte');
      serviceKeywords.add('barbeiro');
      serviceKeywords.add('cabeleireir');
    }
    if (srvTitleNorm.includes('barba') || srvCategoryNorm.includes('barba')) {
      serviceKeywords.add('barba');
      serviceKeywords.add('barbeiro');
    }
    if (
      srvTitleNorm.includes('unha') ||
      srvTitleNorm.includes('gel') ||
      srvCategoryNorm.includes('unha') ||
      srvCategoryNorm.includes('manicure')
    ) {
      serviceKeywords.add('unha');
      serviceKeywords.add('manicure');
      serviceKeywords.add('pedicure');
      serviceKeywords.add('nail');
    }

    const matchedBySpecialty = availableProfessionalsForDate.filter((prof) => {
      const specs = Array.isArray(prof.specialties)
        ? prof.specialties.map(normalizeText).filter(Boolean)
        : [];
      const specificSpecs = specs.filter((s) => s !== 'geral' && s !== 'todos');
      if (specificSpecs.length === 0) return false;

      return specificSpecs.some((spec) => {
        for (const kw of serviceKeywords) {
          if (spec.includes(kw) || kw.includes(spec)) return true;
        }
        return false;
      });
    });

    if (matchedBySpecialty.length > 0) {
      return matchedBySpecialty;
    }

    return availableProfessionalsForDate;
  }, [availableProfessionalsForDate, selectedService]);

  // Selecionar automaticamente o primeiro profissional apto para o serviço (sem botão "Qualquer")
  useEffect(() => {
    if (professionalsForSelectedService.length > 0) {
      const isCurrentValid =
        selectedProfessional !== 'any' &&
        professionalsForSelectedService.some((p) => p.name === selectedProfessional);
      if (!isCurrentValid) {
        setSelectedProfessional(professionalsForSelectedService[0].name);
      }
    }
  }, [professionalsForSelectedService, selectedProfessional]);

  // Verificação unificada de autenticação do cliente (Sessão Local Vagou / admvapp + Supabase Auth)
  const checkIsClientAuthenticated = async (): Promise<boolean> => {
    if (checkIsClientAuthenticatedSync()) return true;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) return true;
      } catch {}
    }

    return false;
  };

  // Abre o modal "Para você / Dependente" ao selecionar um serviço, exigindo login/cadastro caso ainda não autenticado
  const proceedWithConfirmedServiceBooking = async (srv: CatalogServiceItem, bypassAuth = false) => {
    hapticMedium();
    setSelectedServices([srv]);
    if (initialDateIso) setSelectedDateIso(initialDateIso);

    if (!bypassAuth) {
      const isLogged = checkIsClientAuthenticatedSync() || (await checkIsClientAuthenticated());
      if (!isLogged) {
        pendingAuthActionRef.current = 'start_booking';
        setIsAuthModalOpen(true);
        return;
      }
    }

    if (initialTimeSlot) {
      setSelectedTimeSlot(initialTimeSlot);
      setCurrentStep('professionals_and_time');
      setIsSummaryModalOpen(true);
    } else {
      setSelectedTimeSlot(null);
      setCurrentStep(skipDateStep ? 'professionals_and_time' : 'date');
      setIsOriginModalOpen(false);
      setReturnToSummaryAfterBeneficiary(false);
      setIsBeneficiaryModalOpen(true);
    }
  };

  // Reagir imediatamente quando o usuário clica em um Serviço na seção Serviços (abre o modal de Beneficiário)
  const prevBookingTriggerRef = useRef<number>(bookingTrigger);
  const prevInitialServiceIdRef = useRef<string | undefined>(initialService?.id);

  useEffect(() => {
    const triggerChanged = bookingTrigger > 0 && bookingTrigger !== prevBookingTriggerRef.current;
    const serviceChanged = initialService?.id !== prevInitialServiceIdRef.current;

    if (triggerChanged || serviceChanged) {
      prevBookingTriggerRef.current = bookingTrigger;
      prevInitialServiceIdRef.current = initialService?.id;

      if (initialService) {
        setSelectedServices([initialService]);
        if (initialDateIso) setSelectedDateIso(initialDateIso);
        if (!checkIsClientAuthenticatedSync()) {
          pendingAuthActionRef.current = 'start_booking';
          setIsBeneficiaryModalOpen(false);
          setIsAuthModalOpen(true);
          return;
        }
        if (initialTimeSlot) {
          setSelectedTimeSlot(initialTimeSlot);
          setCurrentStep('professionals_and_time');
          setIsSummaryModalOpen(true);
        } else {
          setSelectedTimeSlot(null);
          setCurrentStep(skipDateStep ? 'professionals_and_time' : 'date');
          setIsOriginModalOpen(false);
          setReturnToSummaryAfterBeneficiary(false);
          setIsBeneficiaryModalOpen(true);
        }
      } else {
        setSelectedServices([]);
        setSelectedTimeSlot(null);
        setCurrentStep('service');
        setIsOriginModalOpen(false);
        setIsBeneficiaryModalOpen(false);
      }
    }
  }, [bookingTrigger, initialService, skipDateStep, initialTimeSlot, initialDateIso]);

  // Restaurar rascunho pré-salvo quando solicitado pelo cliente (Banner Flutuante ou Minha Agenda)
  useEffect(() => {
    if (!resumeDraft) return;
    if (Array.isArray(resumeDraft.services) && resumeDraft.services.length > 0) {
      setSelectedServices(resumeDraft.services as CatalogServiceItem[]);
    }
    setSelectedDateIso(resumeDraft.dateIso);
    setSelectedProfessional(resumeDraft.professional || 'any');
    setSelectedTimeSlot(resumeDraft.timeSlot);
    setIsDependentBooking(Boolean(resumeDraft.isDependentBooking));
    setDependentId(resumeDraft.dependentId || '');
    setDependentName(resumeDraft.dependentName || '');
    if (resumeDraft.clientPhone) setClientPhoneInput(resumeDraft.clientPhone);
    if (resumeDraft.distanceKm) setDistanceKm(resumeDraft.distanceKm);
    if (resumeDraft.etaMinutes) setEtaMinutes(resumeDraft.etaMinutes);
    if (resumeDraft.clientAddressQuery) {
      setAddressQuery(resumeDraft.clientAddressQuery);
      setResolvedAddressLabel(resumeDraft.clientAddressQuery);
    }
    setIsOriginModalOpen(false);
    setIsBeneficiaryModalOpen(false);
    setCurrentStep('professionals_and_time');
    setIsSummaryModalOpen(true);
  }, [resumeDraft]);

  // Rastrear abertura em modo modal tradicional (!inline)
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (!inline && isOpen && !prevIsOpenRef.current) {
      if (initialDateIso) setSelectedDateIso(initialDateIso);
      if (initialService) {
        setSelectedServices([initialService]);
        setCurrentStep(skipDateStep ? 'professionals_and_time' : 'date');
        if (!initialTimeSlot && !resumeDraft) {
          setIsOriginModalOpen(false);
          setReturnToSummaryAfterBeneficiary(false);
          setIsBeneficiaryModalOpen(true);
        }
      } else {
        setSelectedServices([]);
        setCurrentStep('service');
      }
      if (initialTimeSlot) {
        setSelectedTimeSlot(initialTimeSlot);
        setCurrentStep('professionals_and_time');
        setIsSummaryModalOpen(true);
      } else {
        setSelectedTimeSlot(null);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [inline, isOpen, skipDateStep, initialTimeSlot, initialDateIso, initialService, resumeDraft]);

  // Handler para salvar novo dependente inline sem sair do fluxo de agendamento
  const handleSaveInlineDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepFullName.trim()) return;
    setIsSavingInlineDependent(true);
    hapticLight();

    const newId = generateUuidV4();
    const newDepItem: UserFamilyDependent = {
      id: newId,
      full_name: newDepFullName.trim(),
      relationship: newDepRelationship,
      birth_date: newDepBirthDate || undefined,
      notes: newDepNotes.trim() || undefined,
      is_unlinked: false,
      created_at: new Date().toISOString(),
    };

    const updatedList = [...registeredDependents, newDepItem];
    setRegisteredDependents(updatedList);
    try {
      localStorage.setItem('vagou_user_dependents', JSON.stringify(updatedList));
    } catch {}

    // Sincronizar no Supabase (public.dependents + public.client_family_members)
    if (isSupabaseConfigured && supabase) {
      try {
        let parentClientId = localStorage.getItem('vagou_client_id') || '';
        const cleanEmail = (localStorage.getItem('vagou_user_email') || '').trim().toLowerCase();
        if ((!parentClientId || parentClientId.length < 10) && cleanEmail) {
          const { data: cRow } = await (supabase.from('clients') as any)
            .select('id')
            .ilike('email', `%${cleanEmail}%`)
            .maybeSingle();
          if (cRow?.id) {
            parentClientId = cRow.id;
            localStorage.setItem('vagou_client_id', cRow.id);
          }
        }
        if (parentClientId && parentClientId.length > 10) {
          await syncClientDependentToDatabase(parentClientId, {
            id: newId,
            fullName: newDepItem.full_name,
            relationship: newDepItem.relationship,
            birthDate: newDepItem.birth_date || null,
            notes: newDepItem.notes || null,
            isUnlinked: false,
          });
        }
      } catch {}
    }

    setIsDependentBooking(true);
    setDependentId(newDepItem.id);
    setDependentName(newDepItem.full_name);
    setNewDepFullName('');
    setNewDepBirthDate('');
    setNewDepNotes('');
    setIsCreatingDependentInline(false);
    setIsSavingInlineDependent(false);
    setIsBeneficiaryModalOpen(false);
    if (returnToSummaryAfterBeneficiary) {
      setReturnToSummaryAfterBeneficiary(false);
      setIsSummaryModalOpen(true);
    } else {
      setReturnToRouteModalAfterOrigin(false);
      setOriginModalMode('choice');
      setIsOriginModalOpen(true);
    }
    if (currentStep === 'service') {
      setCurrentStep(skipDateStep ? 'professionals_and_time' : 'date');
    }
    hapticSuccess();
  };

  // Handler de Cálculo de Rota e ETA (Origem Cliente -> Destino Salão via OSRM + Modal de Transporte + Margem de Folga)
  const runRouteCalculation = async (
    originInput: string,
    destInput: string,
    modeOverride?: TransportMode,
    preserveSlot = false
  ) => {
    if (!originInput.trim()) return;
    const effectiveMode = modeOverride || transportMode;
    setIsCalculatingRoute(true);
    try {
      const result = await resolveAddressDistanceToSalon(
        originInput,
        salonCoords,
        destInput || salonCep || salonAddress || '08285-010',
        effectiveMode
      );
      setResolvedAddressLabel(result.formattedAddress);
      if (result.salonFormattedAddress) {
        setResolvedSalonAddressLabel(result.salonFormattedAddress);
      }
      setOriginCoords({ lat: result.lat, lng: result.lng });
      setResolvedSalonCoords({ lat: result.salonLat, lng: result.salonLng });
      setDistanceKm(result.distanceKm);
      setEtaMinutes(result.etaMinutes);
      if (
        !preserveSlot &&
        !isRouteModalOpen &&
        !isPostConfirmChoiceModalOpen &&
        !returnToRouteModalAfterOrigin &&
        !isSummaryModalOpen
      ) {
        setSelectedTimeSlot(null);
      }
      try {
        localStorage.setItem('vagou_client_test_address', originInput.trim());
      } catch {}
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleDetectDeviceGpsOrigin = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setOriginType('home');
      const savedHomeOrigin =
        localStorage.getItem('vagou_user_cep') ||
        localStorage.getItem('vagou_user_address') ||
        localStorage.getItem('vagou_client_test_address') ||
        '08235-770';
      setAddressQuery(savedHomeOrigin);
      await runRouteCalculation(
        savedHomeOrigin,
        salonDestQuery,
        transportMode,
        returnToRouteModalAfterOrigin
      );
      return;
    }

    setOriginType('gps');
    setIsCalculatingRoute(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const rawLat = pos.coords.latitude;
          const rawLng = pos.coords.longitude;
          const snapped = await snapAndReverseGeocodeGps(rawLat, rawLng);
          const finalLat = snapped?.lat ?? rawLat;
          const finalLng = snapped?.lng ?? rawLng;
          const finalLabel =
            snapped?.formattedAddress || snapped?.streetName || 'Local Atual (GPS)';

          setOriginCoords({ lat: finalLat, lng: finalLng });
          setResolvedAddressLabel(finalLabel);
          setAddressQuery(finalLabel);

          const routeRes = await computeGoogleDetailedRoute({
            originLat: finalLat,
            originLng: finalLng,
            destLat: resolvedSalonCoords.lat,
            destLng: resolvedSalonCoords.lng,
            destAddress: salonAddress || resolvedSalonAddressLabel || salonName,
            mode: transportMode,
          });

          if (routeRes) {
            setDistanceKm(routeRes.distanceKm);
            setEtaMinutes(routeRes.etaMinutes);
            setLiveRouteData(routeRes);
          } else {
            await runRouteCalculation(
              finalLabel,
              salonDestQuery,
              transportMode,
              returnToRouteModalAfterOrigin
            );
          }
        } finally {
          setIsCalculatingRoute(false);
        }
      },
      async () => {
        setOriginType('home');
        const savedHomeOrigin =
          localStorage.getItem('vagou_user_cep') ||
          localStorage.getItem('vagou_user_address') ||
          localStorage.getItem('vagou_client_test_address') ||
          '08235-770';
        setAddressQuery(savedHomeOrigin);
        await runRouteCalculation(
          savedHomeOrigin,
          salonDestQuery,
          transportMode,
          returnToRouteModalAfterOrigin
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000,
      }
    );
  };

  // Reconhecer automaticamente o local atual do dispositivo (GPS) ao abrir o modal "De onde você vai sair?"
  useEffect(() => {
    if (isOriginModalOpen && originModalMode === 'choice' && originType === 'gps') {
      handleDetectDeviceGpsOrigin();
    }
  }, [isOriginModalOpen]);

  const handleCalculateCustomCep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCep = customCepInput.trim();
    if (!cleanCep) return;
    hapticLight();
    setAddressQuery(cleanCep);
    await runRouteCalculation(cleanCep, salonDestQuery, transportMode, returnToRouteModalAfterOrigin || isRouteModalOpen);
    setHasCalculatedCustomCep(true);
  };

  // Auto-calcular rota real ao abrir ou quando digitar um CEP completo de 8 dígitos ou mudar o meio de transporte
  useEffect(() => {
    const cleanOriginDigits = addressQuery.replace(/\D/g, '');
    if (cleanOriginDigits.length === 8 || addressQuery.trim().length >= 6) {
      const timer = setTimeout(() => {
        runRouteCalculation(
          addressQuery,
          salonDestQuery,
          transportMode,
          isRouteModalOpen || isPostConfirmChoiceModalOpen || returnToRouteModalAfterOrigin || isSummaryModalOpen
        );
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [addressQuery, salonDestQuery, transportMode]);

  // Monthly Calendar Generation
  const monthData = useMemo(() => {
    const year = currentViewMonth.getFullYear();
    const month = currentViewMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNameFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
    const monthLabel = monthNameFormatter.format(currentViewMonth);

    const daysGrid: Array<{
      dayNumber: number | null;
      isoString: string | null;
      isToday: boolean;
      isDisabled: boolean;
      isClosed: boolean;
    }> = [];

    for (let i = 0; i < firstDayIndex; i++) {
      daysGrid.push({ dayNumber: null, isoString: null, isToday: false, isDisabled: true, isClosed: false });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);

      const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const isPast = dateObj < today;
      const isSunday = dateObj.getDay() === 0;

      const isDisabled = isPast || isSunday;
      const isToday = dateObj.getTime() === today.getTime();

      daysGrid.push({
        dayNumber: d,
        isoString: iso,
        isToday,
        isDisabled,
        isClosed: isSunday,
      });
    }

    return {
      monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      daysGrid,
      year,
      month,
    };
  }, [currentViewMonth, today]);

  const handlePrevMonth = () => {
    const prev = new Date(currentViewMonth);
    prev.setMonth(prev.getMonth() - 1);
    if (
      prev.getFullYear() < today.getFullYear() ||
      (prev.getFullYear() === today.getFullYear() && prev.getMonth() < today.getMonth())
    ) {
      return;
    }
    setCurrentViewMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentViewMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentViewMonth(next);
  };

  // Cálculo de bloqueio preditivo (Hora Atual + Deslocamento + 15 min preparo) e Abas de Período
  const isSelectedDateToday = selectedDateIso === todayIso;
  const nowMinutes = currentTimeTick.getHours() * 60 + currentTimeTick.getMinutes();
  const totalLeadMinutes = etaMinutes + PREP_BUFFER_MINUTES;
  const minAllowedMinutesToday = nowMinutes + totalLeadMinutes;

  // Regra de Indisponibilização Automática de Abas de Período Passadas (Manhã < 12:00, Tarde < 18:00)
  const isManhaPeriodDisabled = isSelectedDateToday && (nowMinutes >= 12 * 60 || minAllowedMinutesToday > 11 * 60 + 30);
  const isTardePeriodDisabled = isSelectedDateToday && (nowMinutes >= 18 * 60 || minAllowedMinutesToday > 17 * 60 + 30);

  // Auto-selecionar o período ativo válido sempre que a data ou o horário mínimo mudar
  useEffect(() => {
    if (isSelectedDateToday) {
      if (isTardePeriodDisabled && (timePeriodFilter === 'manha' || timePeriodFilter === 'tarde')) {
        setTimePeriodFilter('noite');
      } else if (isManhaPeriodDisabled && timePeriodFilter === 'manha') {
        setTimePeriodFilter('tarde');
      }
    } else {
      if (timePeriodFilter === 'todos') return;
    }
  }, [isSelectedDateToday, isManhaPeriodDisabled, isTardePeriodDisabled, selectedDateIso]);

  // Gerar os slots de horário com validação no banco + escala dos profissionais disponíveis no dia + regra de deslocamento + 15 min
  const generatedSlots = useMemo(() => {
    return getAvailableSlotsForDate(selectedDateIso, selectedProfessional, {
      travelMinutes: etaMinutes,
      prepMinutes: PREP_BUFFER_MINUTES,
      busySlots: busySlotsFromDb,
      availableProfessionals: availableProfessionalsForDate,
      nowOverride: currentTimeTick,
    });
  }, [selectedDateIso, selectedProfessional, etaMinutes, busySlotsFromDb, availableProfessionalsForDate, currentTimeTick]);

  // Agrupamento de slots por período (Manhã, Tarde, Noite)
  const slotsByPeriod = useMemo(() => {
    return {
      manha: generatedSlots.filter((s) => s.period === 'manha'),
      tarde: generatedSlots.filter((s) => s.period === 'tarde'),
      noite: generatedSlots.filter((s) => s.period === 'noite'),
    };
  }, [generatedSlots]);

  // Sugestão inteligente do Dia e Horário mais propício com base na distância e tempo de deslocamento (mesmo vindo de outro estado)
  const propitiousSuggestion = useMemo(() => {
    for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
      const candDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
      if (candDate.getDay() === 0) continue; // Domingo fechado

      const candIso = `${candDate.getFullYear()}-${String(candDate.getMonth() + 1).padStart(2, '0')}-${String(candDate.getDate()).padStart(2, '0')}`;
      const candShortDate = `${String(candDate.getDate()).padStart(2, '0')}/${String(candDate.getMonth() + 1).padStart(2, '0')}`;

      if (dayOffset === 0) {
        const slotsToday = getAvailableSlotsForDate(candIso, selectedProfessional, {
          travelMinutes: etaMinutes,
          prepMinutes: PREP_BUFFER_MINUTES,
          busySlots: busySlotsFromDb,
          availableProfessionals: availableProfessionalsForDate,
          nowOverride: currentTimeTick,
        });
        const firstToday = slotsToday.find((s) => s.available);
        if (firstToday) {
          return {
            dateIso: candIso,
            shortDate: candShortDate,
            timeSlot: firstToday.time,
            isToday: true,
          };
        }
      } else {
        const arrivalTimestamp =
          currentTimeTick.getTime() + (etaMinutes + PREP_BUFFER_MINUTES) * 60 * 1000;
        const candClosingTimestamp = new Date(
          candDate.getFullYear(),
          candDate.getMonth(),
          candDate.getDate(),
          20,
          30,
          0
        ).getTime();

        if (arrivalTimestamp > candClosingTimestamp) {
          continue;
        }

        const slotsFuture = getAvailableSlotsForDate(candIso, selectedProfessional, {
          travelMinutes: 0,
          prepMinutes: 0,
          busySlots: candIso === selectedDateIso ? busySlotsFromDb : [],
          availableProfessionals: availableProfessionalsForDate,
          nowOverride: currentTimeTick,
        });

        const firstReachable = slotsFuture.find((s) => {
          if (!s.available) return false;
          const [sh, sm] = s.time.split(':').map(Number);
          const slotTimestamp = new Date(
            candDate.getFullYear(),
            candDate.getMonth(),
            candDate.getDate(),
            sh,
            sm,
            0
          ).getTime();
          return slotTimestamp >= arrivalTimestamp;
        });

        if (firstReachable) {
          return {
            dateIso: candIso,
            shortDate: candShortDate,
            timeSlot: firstReachable.time,
            isToday: false,
          };
        }
      }
    }
    return null;
  }, [today, etaMinutes, selectedProfessional, busySlotsFromDb, availableProfessionalsForDate, currentTimeTick, selectedDateIso]);

  // Agrupar serviços por categoria
  const groupedServices = useMemo(() => {
    const groups: Record<string, CatalogServiceItem[]> = {};
    services.forEach((srv) => {
      const cat = srv.category?.trim() || 'Geral';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(srv);
    });
    return groups;
  }, [services]);

  if (!isOpen) return null;

  const [, selMonth, selDay] = selectedDateIso.split('-');
  const shortDateFormatted = `${selDay}/${selMonth}`;

  const activeProfObj =
    availableProfessionalsForDate.find((p) => p.name === selectedProfessional) ||
    professionals.find((p) => p.name === selectedProfessional);
  const fallbackProfObj = availableProfessionalsForDate[0] || professionals[0];
  const resolvedProfessionalName = activeProfObj?.name || (fallbackProfObj?.name ?? 'Equipe do Salão');
  const resolvedProfessionalAvatar =
    activeProfObj?.avatar || activeProfObj?.avatarUrl || fallbackProfObj?.avatar || fallbackProfObj?.avatarUrl;

  // Pré-Salvar Agendamento como Rascunho (Não trava a vaga no banco até a confirmação)
  const handleSaveAsDraft = () => {
    if (!selectedService || !selectedTimeSlot) return;
    hapticMedium();

    const draftItem: BookingDraftItem = {
      id: `draft-${Date.now()}`,
      salonId: salonId || localStorage.getItem('vagou_salon_db_id') || undefined,
      salonName,
      salonAddress,
      services: selectedServices.map((s) => ({
        id: s.id,
        title: s.title,
        price: s.price,
        duration: s.duration,
        category: s.category,
      })),
      combinedServiceTitle: selectedService.title,
      totalPrice: selectedService.price,
      professional: selectedProfessional === 'any' ? resolvedProfessionalName : selectedProfessional,
      professionalAvatar: resolvedProfessionalAvatar,
      dateIso: selectedDateIso,
      dateFormatted: shortDateFormatted,
      timeSlot: selectedTimeSlot,
      isDependentBooking,
      dependentId: isDependentBooking ? dependentId : undefined,
      dependentName: isDependentBooking ? dependentName.trim() : undefined,
      clientPhone: clientPhoneInput.trim() || undefined,
      clientAddressQuery: addressQuery.trim() || resolvedAddressLabel,
      distanceKm,
      etaMinutes,
      prepBufferMinutes: PREP_BUFFER_MINUTES,
      savedAt: new Date().toISOString(),
    };

    saveBookingDraft(draftItem);
    onDraftSaved?.(draftItem);
    setDraftSavedFeedback('Pré-agendamento salvo! Você pode retomá-lo no aviso da tela ou em Minha Agenda.');
    setTimeout(() => {
      setDraftSavedFeedback(null);
      setIsSummaryModalOpen(false);
    }, 1400);
  };

  // Confirmar Agendamento Final no Banco de Dados (com campos preditivos BOL-020)
  const handleConfirmFinal = async (bypassAuthCheck = false) => {
    setBookingErrorMessage('');
    if (!selectedService || !selectedTimeSlot) return;

    if (isDependentBooking && !dependentName.trim()) {
      setBookingErrorMessage('Selecione ou informe o dependente para concluir.');
      return;
    }

    if (!bypassAuthCheck) {
      const isLogged = await checkIsClientAuthenticated();
      if (!isLogged) {
        hapticMedium();
        pendingAuthActionRef.current = 'confirm_final';
        setIsAuthModalOpen(true);
        return;
      }
    }

    const cleanPhone =
      clientPhoneInput.trim() ||
      localStorage.getItem('vagou_user_phone') ||
      (() => {
        try {
          const raw = localStorage.getItem('vagou_client_session');
          return raw ? JSON.parse(raw)?.phone || '' : '';
        } catch {
          return '';
        }
      })() ||
      'Não informado';

    setIsSubmittingBooking(true);
    try {
      const dbTransportMode =
        transportMode === 'walking'
          ? 'walking'
          : transportMode === 'bicycling'
          ? 'bicycling'
          : transportMode === 'motorcycle'
          ? 'motorcycle'
          : transportMode === 'transit'
          ? 'transit'
          : 'driving';

      const result = await onConfirmAppointment({
        service: selectedService,
        professional: selectedProfessional === 'any' ? `${resolvedProfessionalName} (Designado)` : selectedProfessional,
        professionalAvatar: resolvedProfessionalAvatar,
        dateIso: selectedDateIso,
        dateFormatted: shortDateFormatted,
        timeSlot: selectedTimeSlot,
        salonName,
        salonAddress,
        price: selectedService.price,
        offerId: baseOffer?.id,
        isDependentBooking,
        dependentId: isDependentBooking ? dependentId : undefined,
        dependentName: isDependentBooking ? dependentName.trim() : undefined,
        clientPhone: cleanPhone,
        notes: isDependentBooking ? `Dependente: ${dependentName.trim()}` : undefined,
        distanceKm,
        etaMinutes,
        prepBufferMinutes: PREP_BUFFER_MINUTES,
        transportMode: dbTransportMode,
        uiTransportMode: transportMode,
        maxDepartureTime: formatMaxDepartureTime(selectedTimeSlot, etaMinutes),
        originFormattedAddress: resolvedAddressLabel,
        originLat: originCoords.lat,
        originLng: originCoords.lng,
        salonLat: resolvedSalonCoords.lat,
        salonLng: resolvedSalonCoords.lng,
        selectedRouteSummary: `${resolvedAddressLabel} (${TRANSPORT_MODE_META[transportMode].shortLabel} • ${distanceKm.toFixed(1).replace('.', ',')} km • ~${etaMinutes} min c/ folga)`,
      });

      if (result && !result.success && result.error) {
        setBookingErrorMessage(result.error);
        setIsSubmittingBooking(false);
        return;
      }

      // Após terminar o cadastro/confirmação, não exibe "Ir Agora" — direciona exclusivamente para a Agenda
      saveBookingDraft(null);
      onDraftSaved?.(null);
      setIsSummaryModalOpen(false);
      hapticSuccess();
      if (onNavigateToAgenda) {
        onNavigateToAgenda();
      } else {
        setIsPostConfirmChoiceModalOpen(true);
      }
    } catch (err: any) {
      setBookingErrorMessage(err?.message || 'Falha ao realizar agendamento.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Renderizador de grade de horários para um período específico
  const renderPeriodSlotsBlock = (
    periodKey: 'manha' | 'tarde' | 'noite',
    label: string,
    PeriodIcon: React.ElementType,
    slots: BookingSlotItem[],
    isPeriodBlocked: boolean
  ) => {
    const availableCount = slots.filter((s) => s.available).length;
    return (
      <div key={periodKey} className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <PeriodIcon className={`w-3.5 h-3.5 ${isPeriodBlocked ? 'text-slate-500' : 'text-emerald-500'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider font-['Poppins'] ${
              isPeriodBlocked
                ? isDark ? 'text-slate-600 line-through' : 'text-slate-400 line-through'
                : isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {label}
            </span>
          </div>
          <span className={`text-[10px] font-semibold ${
            availableCount > 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isPeriodBlocked ? 'Período encerrado hoje' : `${availableCount} livres`}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {slots.map((slot) => {
            const isSelected = selectedTimeSlot === slot.time;
            const isAvailable = slot.available && !isPeriodBlocked;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  hapticLight();
                  setSelectedTimeSlot(slot.time);
                  setIsSummaryModalOpen(true);
                }}
                title={
                  !isAvailable
                    ? slot.reason === 'busy'
                      ? 'Horário já ocupado no banco'
                      : slot.reason === 'travel_buffer'
                      ? `Insuficiente para deslocamento (${etaMinutes}m + 15m preparo)`
                      : 'Horário já passou'
                    : `Agendar às ${slot.time}`
                }
                className={`py-2 px-1 rounded-[4px] text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-500 text-white font-black shadow-sm'
                    : !isAvailable
                    ? isDark
                      ? 'bg-slate-900/30 border-slate-900 text-slate-600 line-through opacity-40 cursor-not-allowed'
                      : 'bg-slate-100/60 border-slate-200 text-slate-300 line-through opacity-45 cursor-not-allowed'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:text-emerald-700'
                }`}
              >
                <Clock className={`w-3 h-3 ${
                  isSelected
                    ? 'text-white'
                    : isAvailable
                    ? 'text-emerald-500'
                    : isDark
                    ? 'text-slate-600'
                    : 'text-slate-300'
                }`} />
                <span className={isSelected ? 'text-white' : ''}>{slot.time}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const bookingContent = (
    <div
      className={`w-full flex flex-col overflow-hidden transition-colors ${
        inline ? 'h-full border-0 rounded-none' : 'max-w-lg border rounded-[4px] max-h-[92vh] shadow-2xl'
      } ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}
      role={inline ? undefined : 'dialog'}
      aria-modal={inline ? undefined : 'true'}
    >
      {/* Header Limpo & Stepper Inteligente com Seleções Reais */}
      <div className={`px-3 py-2 border-b sticky top-0 z-10 transition-colors space-y-2 ${
        isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-100/95 border-slate-200'
      }`}>
        {/* Linha 1: Sub-Cabeçalho com Botão Voltar + Detalhe Completo do Serviço ao lado */}
        {(currentStep !== 'service' || !inline) && (
          <div className="flex items-center justify-between gap-2 min-h-7">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {currentStep !== 'service' && (
                <button
                  type="button"
                  onClick={() => {
                    hapticMedium();
                    if (currentStep === 'date') {
                      setCurrentStep('service');
                    } else if (currentStep === 'professionals_and_time') {
                      setCurrentStep('date');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-bold transition cursor-pointer shrink-0 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800 hover:text-slate-950'
                  }`}
                  title="Voltar etapa"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Voltar</span>
                </button>
              )}

              {!inline && onClose && currentStep === 'service' && (
                <button
                  type="button"
                  onClick={onClose}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-bold transition cursor-pointer shrink-0 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800 hover:text-slate-950'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Voltar</span>
                </button>
              )}

              {/* Detalhe/Descrição completa do serviço ao lado do botão Voltar */}
              {currentStep !== 'service' && selectedService && (
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className={`text-xs font-extrabold truncate font-['Poppins'] ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                    title={selectedService.title}
                  >
                    {selectedService.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-[4px] whitespace-nowrap ${
                      isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {selectedService.duration} • R$ {selectedService.price.toFixed(0)}
                  </span>
                </div>
              )}

              {!inline && selectedService && (
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setIsBeneficiaryModalOpen(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-bold text-xs transition cursor-pointer shrink-0 whitespace-nowrap ${
                    isDependentBooking
                      ? 'bg-emerald-500 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                  }`}
                  title="Alterar para quem é o agendamento"
                >
                  {isDependentBooking ? (
                    <Users className="w-3.5 h-3.5 text-white shrink-0" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className={isDependentBooking ? 'text-white' : ''}>
                    {isDependentBooking && dependentName ? dependentName : 'Para Você'}
                  </span>
                </button>
              )}
            </div>

            {!inline && onClose && (
              <div className="flex items-center justify-end gap-1.5 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-950'
                  }`}
                  aria-label="Fechar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Linha 2: Abas Dinâmicas Exibindo o Nome Resumido do Serviço (ex: Corte, Unha) | Data | Horário */}
        <div className="grid grid-cols-3 gap-1.5">
          {(() => {
            // 1. Nome resumido de 1 palavra na aba (ex: "Corte Navalhado" -> "Corte", "Unha em Gel" -> "Unha")
            const getAbbreviatedServiceLabel = (): string => {
              if (!selectedServices.length) return 'Serviço';
              const rawTitle = selectedServices[0].title.trim();
              const lower = rawTitle.toLowerCase();
              if (lower.includes('corte') || lower.includes('degrad') || lower.includes('navalha')) return 'Corte';
              if (lower.includes('unha') || lower.includes('manicure') || lower.includes('pedicure') || lower.includes('gel') || lower.includes('fibra')) return 'Unha';
              if (lower.includes('barba') || lower.includes('bigode')) return 'Barba';
              if (lower.includes('sobrancelha') || lower.includes('cilio') || lower.includes('cílio')) return 'Sobrancelha';
              if (lower.includes('escova') || lower.includes('chapinha') || lower.includes('prancha')) return 'Escova';
              if (lower.includes('hidrata') || lower.includes('cronograma') || lower.includes('botox') || lower.includes('progressiva')) return 'Cabelo';
              if (lower.includes('limpeza') || lower.includes('pele') || lower.includes('facial')) return 'Estética';
              if (lower.includes('massagem') || lower.includes('drenagem')) return 'Massagem';
              if (lower.includes('depila')) return 'Depilação';
              const firstWord = rawTitle.split(/[\s+/,-]+/)[0] || 'Serviço';
              return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
            };

            // 2. Data: se o cliente ainda não chegou na seção de data, mostra "Data"; senão, mostra a data selecionada
            const dateStepLabel =
              currentStep !== 'service' && selectedDateIso ? shortDateFormatted : 'Data';

            // 3. Horário: se não houver horário selecionado, mostra "Horário"; quando selecionado, mostra o horário
            const timeStepLabel = selectedTimeSlot ? selectedTimeSlot : 'Horário';

            const dynamicSteps: Array<{
              key: Step;
              label: string;
              hasValue: boolean;
              Icon: React.ElementType;
            }> = [
              {
                key: 'service',
                label: getAbbreviatedServiceLabel(),
                hasValue: selectedServices.length > 0,
                Icon: Scissors,
              },
              {
                key: 'date',
                label: dateStepLabel,
                hasValue: currentStep !== 'service' && Boolean(selectedDateIso),
                Icon: Calendar,
              },
              {
                key: 'professionals_and_time',
                label: timeStepLabel,
                hasValue: Boolean(selectedTimeSlot),
                Icon: Clock,
              },
            ];

            const stepOrder: Record<Step, number> = {
              service: 1,
              date: 2,
              professionals_and_time: 3,
            };
            const currentOrder = stepOrder[currentStep];

            return dynamicSteps.map((st, idx) => {
              const thisOrder = idx + 1;
              const isPassed = thisOrder < currentOrder;
              const isCurrent = thisOrder === currentOrder;
              const StepIcon = st.Icon;

              return (
                <button
                  key={st.key}
                  type="button"
                  disabled={!isPassed}
                  onClick={() => {
                    if (isPassed) {
                      hapticLight();
                      setCurrentStep(st.key);
                    }
                  }}
                  title={st.label}
                  className={`flex flex-col gap-1 min-w-0 ${
                    isPassed ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-[4px] min-w-0 w-full transition-colors ${
                      isCurrent
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-700'
                        : isPassed || st.hasValue
                        ? isDark
                          ? 'text-slate-100'
                          : 'text-slate-800'
                        : isDark
                        ? 'text-slate-500'
                        : 'text-slate-400'
                    }`}
                  >
                    <StepIcon
                      className={`w-3 h-3 shrink-0 ${
                        isCurrent || isPassed || st.hasValue
                          ? 'text-emerald-500'
                          : isDark
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="text-[11px] sm:text-xs font-extrabold truncate">
                      {st.label}
                    </span>
                  </div>
                  <div
                    className={`h-1.5 w-full rounded-[4px] transition-all duration-300 ${
                      isCurrent
                        ? 'bg-emerald-500'
                        : isPassed
                        ? 'bg-emerald-600'
                        : isDark
                        ? 'bg-slate-800'
                        : 'bg-slate-200'
                    }`}
                  />
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 no-scrollbar">
        {/* ============================================================ */}
        {/* ETAPA 1: SELEÇÃO DE SERVIÇO (OU ADICIONAR MAIS SERVIÇOS) */}
        {/* ============================================================ */}
        {currentStep === 'service' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {services.length === 0 ? (
              <div className={`p-8 rounded-[4px] border text-center my-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <Scissors className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Não há serviço cadastrado neste estabelecimento
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(Object.entries(groupedServices) as [string, CatalogServiceItem[]][]).map(([categoryName, catServices]) => (
                  <div key={categoryName} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1 pt-1 pb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <h3 className={`text-[11px] font-black uppercase tracking-wider font-['Poppins'] ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {categoryName}
                      </h3>
                      <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        ({catServices.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {catServices.map((srv) => {
                        const isSelected = selectedServices.some((s) => s.id === srv.id);
                        const isVideoMode = (srv.displayMode === 'video' || srv.mediaType === 'video') && !!srv.videoUrl;
                        const isSlideshowMode = srv.displayMode === 'slideshow' && !!(srv.photos && srv.photos.length > 1);
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => proceedWithConfirmedServiceBooking(srv)}
                            className={`w-full p-2.5 rounded-[4px] transition-all flex items-center justify-between gap-3 text-left cursor-pointer border ${
                              isSelected
                                ? isDark
                                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                                  : 'bg-emerald-50/80 border-emerald-500/50 text-slate-900'
                                : isDark
                                ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-200'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className={`text-xs font-bold leading-snug truncate ${
                                  isSelected
                                    ? isDark ? 'text-emerald-400' : 'text-emerald-800'
                                    : isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                  {srv.title}
                                </h4>
                                {isVideoMode && (
                                  <span className="shrink-0 px-1 py-0.2 rounded-[4px] bg-emerald-500 text-white text-[8px] font-black uppercase flex items-center gap-0.5">
                                    <Video className="w-2.5 h-2.5 text-white" />
                                    <span className="text-white">5s</span>
                                  </span>
                                )}
                                {isSlideshowMode && (
                                  <span className="shrink-0 px-1 py-0.2 rounded-[4px] bg-emerald-500 text-white text-[8px] font-black uppercase flex items-center gap-0.5">
                                    <Images className="w-2.5 h-2.5 text-white" />
                                    <span className="text-white">Slide</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-[10px]">
                                <span className={`inline-flex items-center gap-1 font-medium ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                  <Clock className="w-3 h-3 text-emerald-400" />
                                  <span>{srv.duration}</span>
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className={`text-sm font-extrabold ${
                                isSelected
                                  ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                                  : isDark ? 'text-slate-100' : 'text-slate-900'
                              }`}>
                                R$ {srv.price.toFixed(0)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Barra Compacta de Origem Calculada & Sugestão do Dia/Horário Mais Propício */}
        {currentStep !== 'service' && selectedService && (
          <div className={`px-2.5 py-2 rounded-[4px] flex items-center justify-between gap-2 text-xs ${
            isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setReturnToRouteModalAfterOrigin(false);
                setOriginModalMode('choice');
                setIsOriginModalOpen(true);
              }}
              className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
              title="Alterar endereço de partida"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {isCalculatingRoute ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />
              ) : (
                <span className="truncate font-bold">
                  {originType === 'home' ? 'De Casa' : resolvedAddressLabel} ({distanceKm.toFixed(1).replace('.', ',')} km)
                </span>
              )}
            </button>

            {propitiousSuggestion && (
              <button
                type="button"
                onClick={() => {
                  hapticMedium();
                  const [py, pm] = propitiousSuggestion.dateIso.split('-').map(Number);
                  setCurrentViewMonth(new Date(py, pm - 1, 1));
                  setSelectedDateIso(propitiousSuggestion.dateIso);
                  setSelectedTimeSlot(propitiousSuggestion.timeSlot);
                  setCurrentStep('professionals_and_time');
                }}
                className="px-2 py-1 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 transition cursor-pointer whitespace-nowrap"
                title="Selecionar o dia e horário mais propício para sua distância"
              >
                <Clock className="w-3 h-3 text-white shrink-0" />
                <span className="text-white">
                  Ideal: {propitiousSuggestion.shortDate} às {propitiousSuggestion.timeSlot}
                </span>
              </button>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 2: CALENDÁRIO MENSAL DE DATAS */}
        {/* ============================================================ */}
        {currentStep === 'date' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className={`space-y-3 transition-all ${
              !selectedService ? 'pointer-events-none opacity-40 select-none' : ''
            }`}>
              <div className="flex items-center justify-between px-1 py-1">
                <button
                  type="button"
                  disabled={!selectedService}
                  onClick={handlePrevMonth}
                  className={`p-2 rounded-[4px] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <h3 className={`text-sm font-black uppercase tracking-wider font-['Poppins'] ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {monthData.monthLabel}
                  </h3>
                </div>

                <button
                  type="button"
                  disabled={!selectedService}
                  onClick={handleNextMonth}
                  className={`p-2 rounded-[4px] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className={`text-[10px] font-bold py-1 uppercase ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {day}
                  </div>
                ))}

                {monthData.daysGrid.map((item, index) => {
                  if (item.dayNumber === null) {
                    return <div key={`empty-${index}`} className="h-10" />;
                  }

                  const isSelected = selectedService && selectedDateIso === item.isoString;
                  const isDayDisabled = !selectedService || item.isDisabled;

                  return (
                    <button
                      key={item.isoString || index}
                      type="button"
                      disabled={isDayDisabled}
                      onClick={() => {
                        if (item.isoString && selectedService) {
                          hapticMedium();
                          setSelectedDateIso(item.isoString);
                          setSelectedTimeSlot(null);
                          setCurrentStep('professionals_and_time');
                        }
                      }}
                      className={`h-11 rounded-[4px] font-bold text-xs transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-white font-black shadow-md z-10'
                          : isDayDisabled
                          ? isDark
                            ? 'bg-slate-950/40 text-slate-700 cursor-not-allowed border border-slate-900/50 opacity-40'
                            : 'bg-slate-100/50 text-slate-300 cursor-not-allowed border border-slate-200/40 opacity-40'
                          : isDark
                          ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-emerald-500/40'
                          : 'bg-slate-50 hover:bg-emerald-50/50 text-slate-800 border border-slate-200 hover:border-emerald-500/40'
                      }`}
                    >
                      <span className={isSelected ? 'text-white' : ''}>{item.dayNumber}</span>
                      {item.isToday && !isSelected && (
                        <span className={`text-[8px] font-black uppercase ${
                          isDark ? 'text-emerald-400' : 'text-emerald-700'
                        }`}>Hoje</span>
                      )}
                      {item.isClosed && (
                        <span className="text-[8px] text-rose-500 font-bold">Fechado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 3: PROFISSIONAIS (FOTO + 1º NOME) + TURNOS + HORÁRIOS */}
        {/* ============================================================ */}
        {currentStep === 'professionals_and_time' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Linha 1: Botões dos Profissionais que fazem o tipo do serviço (apenas Foto + Primeiro Nome, sem tumultuar com turnos) */}
            {professionalsForSelectedService.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {professionalsForSelectedService.map((prof, idx) => {
                  const isSelected = selectedProfessional === prof.name;
                  const profImg = prof.avatar || prof.avatarUrl;
                  const firstName = (prof.name || 'Profissional').trim().split(/\s+/)[0];
                  return (
                    <button
                      key={prof.id || idx}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSelectedProfessional(prof.name);
                        setSelectedTimeSlot(null);
                      }}
                      className={`flex-shrink-0 py-1.5 px-3 rounded-[4px] border text-left flex items-center gap-2 transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {profImg && !profImg.startsWith('data:image/svg+xml') ? (
                        <img
                          src={profImg}
                          alt={firstName}
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}>
                          <User className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : ''}`} />
                        </div>
                      )}
                      <span className={`text-xs font-bold whitespace-nowrap leading-none ${
                        isSelected ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {firstName}
                      </span>
                    </button>
                  );
                })}
                {isLoadingBusySlots && <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0 ml-1" />}
              </div>
            )}

            {/* Linha 2: Abas de Turnos dedicadas em largura total (Manhã | Tarde | Noite | Todos) */}
            <div className={`grid grid-cols-4 gap-1 p-1 rounded-[4px] border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              {(
                [
                  { key: 'manha', label: 'Manhã', disabled: isManhaPeriodDisabled },
                  { key: 'tarde', label: 'Tarde', disabled: isTardePeriodDisabled },
                  { key: 'noite', label: 'Noite', disabled: false },
                  { key: 'todos', label: 'Todos', disabled: false },
                ] as const
              ).map((tab) => {
                const isActive = timePeriodFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    disabled={tab.disabled}
                    onClick={() => {
                      if (!tab.disabled) {
                        hapticLight();
                        setTimePeriodFilter(tab.key);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-[4px] text-[11px] font-bold transition whitespace-nowrap text-center ${
                      tab.disabled
                        ? isDark
                          ? 'text-slate-700 line-through cursor-not-allowed opacity-50'
                          : 'text-slate-300 line-through cursor-not-allowed opacity-50'
                        : isActive
                        ? 'bg-emerald-500 text-white font-extrabold cursor-pointer shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-white cursor-pointer'
                        : 'text-slate-600 hover:text-slate-900 cursor-pointer'
                    }`}
                  >
                    <span className={isActive && !tab.disabled ? 'text-white' : ''}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Linha 3: Grade de Horários Classificada por Período (Manhã, Tarde, Noite) */}
            <div className="space-y-3">
              {(timePeriodFilter === 'manha' || timePeriodFilter === 'todos') &&
                renderPeriodSlotsBlock('manha', 'Manhã (08h às 11h30)', Sun, slotsByPeriod.manha, isManhaPeriodDisabled)}

              {(timePeriodFilter === 'tarde' || timePeriodFilter === 'todos') &&
                renderPeriodSlotsBlock('tarde', 'Tarde (12h às 17h30)', Sunset, slotsByPeriod.tarde, isTardePeriodDisabled)}

              {(timePeriodFilter === 'noite' || timePeriodFilter === 'todos') &&
                renderPeriodSlotsBlock('noite', 'Noite (18h às 20h30)', Moon, slotsByPeriod.noite, false)}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RODAPÉ FIXO DE AÇÃO (sticky bottom-0 z-20) */}
      {/* ============================================================ */}
      {currentStep === 'professionals_and_time' && Boolean(selectedTimeSlot) && (
        <div className={`px-3.5 py-2 border-t shrink-0 sticky bottom-0 z-20 transition-colors ${
          isDark ? 'bg-[#151A1E]/95 border-slate-800 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'
        }`}>
          <button
            id="btn-avancar-confirmacao"
            type="button"
            onClick={() => {
              hapticMedium();
              setIsSummaryModalOpen(true);
            }}
            className="w-full py-2 px-4 font-black text-xs uppercase tracking-wider rounded-[4px] transition flex items-center justify-center gap-1.5 font-['Poppins'] bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-98"
          >
            <span className="text-white">
              Revisar & Confirmar ({selectedTimeSlot})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MODAL COMPACTO 1: "PARA VOCÊ OU DEPENDENTE?" (Logo após escolha do serviço)
  // ============================================================================
  const beneficiaryModalNode = isBeneficiaryModalOpen && selectedService && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md my-auto border rounded-[4px] p-4 sm:p-5 shadow-2xl space-y-4 transition-colors ${
          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800/60">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold font-['Poppins'] leading-snug">
              Para quem é o agendamento?
            </h3>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-start gap-1.5 mt-1 leading-snug">
              <Scissors className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="break-words">{selectedService.title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsBeneficiaryModalOpen(false);
              if (returnToSummaryAfterBeneficiary) {
                setReturnToSummaryAfterBeneficiary(false);
                setIsSummaryModalOpen(true);
              } else {
                setReturnToRouteModalAfterOrigin(false);
                setOriginModalMode('choice');
                setIsOriginModalOpen(true);
              }
            }}
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
              isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botões Principais em Colunas: Para Você vs Dependente */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              hapticMedium();
              setIsDependentBooking(false);
              setDependentId('');
              setDependentName('');
              setIsBeneficiaryModalOpen(false);
              if (returnToSummaryAfterBeneficiary) {
                setReturnToSummaryAfterBeneficiary(false);
                setIsSummaryModalOpen(true);
              } else {
                setReturnToRouteModalAfterOrigin(false);
                setOriginModalMode('choice');
                setIsOriginModalOpen(true);
              }
              if (currentStep === 'service') {
                setCurrentStep(skipDateStep ? 'professionals_and_time' : 'date');
              }
            }}
            className={`p-3.5 rounded-[4px] border font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition cursor-pointer ${
              !isDependentBooking
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <User className={`w-5 h-5 shrink-0 ${!isDependentBooking ? 'text-white' : 'text-emerald-500'}`} />
            <span className={`leading-tight ${!isDependentBooking ? 'text-white' : ''}`}>Para Você</span>
          </button>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              setIsDependentBooking(true);
              if (registeredDependents.length === 0) {
                setIsCreatingDependentInline(true);
              }
            }}
            className={`p-3.5 rounded-[4px] border font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition cursor-pointer ${
              isDependentBooking
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <Users className={`w-5 h-5 shrink-0 ${isDependentBooking ? 'text-white' : 'text-emerald-500'}`} />
            <span className={`leading-tight ${isDependentBooking ? 'text-white' : ''}`}>Dependente</span>
          </button>
        </div>

        {/* Lista de Dependentes do Banco + Botão "+ Cadastrar Dependente" */}
        {isDependentBooking && (
          <div className="space-y-2.5 pt-2 border-t border-slate-800/60 animate-in fade-in duration-150">
            {registeredDependents.length > 0 && !isCreatingDependentInline && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Selecione o Dependente:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  {registeredDependents.map((dep) => {
                    const isSelectedDep = dependentName === dep.full_name;
                    const relLabel =
                      dep.relationship === 'son'
                        ? 'Filho(a)'
                        : dep.relationship === 'daughter'
                        ? 'Filha'
                        : dep.relationship === 'spouse'
                        ? 'Cônjuge'
                        : dep.relationship === 'parent'
                        ? 'Pai / Mãe'
                        : 'Familiar';
                    return (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => {
                          hapticMedium();
                          setDependentId(dep.id);
                          setDependentName(dep.full_name);
                          setIsBeneficiaryModalOpen(false);
                          if (returnToSummaryAfterBeneficiary) {
                            setReturnToSummaryAfterBeneficiary(false);
                            setIsSummaryModalOpen(true);
                          } else {
                            setReturnToRouteModalAfterOrigin(false);
                            setOriginModalMode('choice');
                            setIsOriginModalOpen(true);
                          }
                          if (currentStep === 'service') {
                            setCurrentStep(skipDateStep ? 'professionals_and_time' : 'date');
                          }
                        }}
                        className={`w-full p-2.5 rounded-[4px] border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                          isSelectedDep
                            ? 'bg-emerald-500 border-emerald-500 text-white font-bold'
                            : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User className={`w-4 h-4 shrink-0 ${isSelectedDep ? 'text-white' : 'text-emerald-500'}`} />
                          <span className={`text-xs font-bold break-words ${isSelectedDep ? 'text-white' : ''}`}>
                            {dep.full_name}
                          </span>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] shrink-0 ${
                          isSelectedDep
                            ? 'bg-white/20 text-white'
                            : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {relLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botão ou Formulário Inline "+ Cadastrar Dependente" */}
            {!isCreatingDependentInline ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsCreatingDependentInline(true);
                }}
                className="w-full py-2.5 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">Cadastrar Dependente</span>
              </button>
            ) : (
              <form onSubmit={handleSaveInlineDependent} className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400">Novo Dependente (Conta Família)</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingDependentInline(false)}
                    className="text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <input
                  type="text"
                  required
                  value={newDepFullName}
                  onChange={(e) => setNewDepFullName(e.target.value)}
                  placeholder="Nome completo do dependente"
                  className={`w-full px-3 py-2 text-xs rounded-[4px] border outline-hidden ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newDepRelationship}
                    onChange={(e) => setNewDepRelationship(e.target.value as any)}
                    className={`w-full px-2.5 py-2 text-xs rounded-[4px] border outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="son">Filho(a)</option>
                    <option value="spouse">Cônjuge</option>
                    <option value="parent">Pai / Mãe</option>
                    <option value="other">Familiar</option>
                  </select>

                  <input
                    type="date"
                    value={newDepBirthDate}
                    onChange={(e) => setNewDepBirthDate(e.target.value)}
                    className={`w-full px-2.5 py-2 text-xs rounded-[4px] border outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <input
                  type="text"
                  value={newDepNotes}
                  onChange={(e) => setNewDepNotes(e.target.value)}
                  placeholder="Observações (opcional)"
                  className={`w-full px-3 py-2 text-xs rounded-[4px] border outline-hidden ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />

                <button
                  type="submit"
                  disabled={isSavingInlineDependent || !newDepFullName.trim()}
                  className="w-full py-2.5 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white shrink-0" />
                  <span className="text-white">
                    {isSavingInlineDependent ? 'Salvando...' : 'Salvar e Continuar'}
                  </span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // MODAL SIMPLES 1.5: ORIGEM DO CLIENTE + MODAL DE TRANSPORTE (ANTES DO HORÁRIO)
  // ============================================================================
  const originHours = Math.floor(etaMinutes / 60);
  const originRemainderMinutes = etaMinutes % 60;
  const formattedEtaHoursAndMinutes = `${originHours} ${originHours === 1 ? 'hora' : 'horas'} e ${String(originRemainderMinutes).padStart(2, '0')} minutos`;
  const formattedDistanceComma = distanceKm.toFixed(1).replace('.', ',');

  const maxDepartureTimeFormatted = useMemo(() => {
    if (selectedTimeSlot) {
      return formatMaxDepartureTime(selectedTimeSlot, etaMinutes);
    }
    const nextSlot = generatedSlots.find((s) => s.available);
    if (nextSlot) {
      return formatMaxDepartureTime(nextSlot.time, etaMinutes);
    }
    return '--H--';
  }, [generatedSlots, selectedTimeSlot, etaMinutes]);

  const transportLinks = useMemo(() => {
    return buildTransportDeepLinks({
      originAddress: resolvedAddressLabel,
      originLat: originCoords.lat,
      originLng: originCoords.lng,
      salonName,
      salonAddress: salonAddress || salonCep,
      salonLat: resolvedSalonCoords.lat,
      salonLng: resolvedSalonCoords.lng,
      transportMode,
    });
  }, [
    resolvedAddressLabel,
    originCoords.lat,
    originCoords.lng,
    salonName,
    salonAddress,
    salonCep,
    resolvedSalonCoords.lat,
    resolvedSalonCoords.lng,
    transportMode,
  ]);

  const transportModeOptions: Array<{
    key: TransportMode;
    label: string;
    Icon: React.ElementType;
  }> = [
    { key: 'walking', label: 'A pé', Icon: Footprints },
    { key: 'bicycling', label: 'Bicicleta', Icon: Bike },
    { key: 'motorcycle', label: 'Moto', Icon: Navigation },
    { key: 'car', label: 'Carro', Icon: Car },
    { key: 'transit', label: 'Transp. Público', Icon: Bus },
    { key: 'rideshare', label: 'Aplicativo', Icon: Smartphone },
  ];

  const renderModeIcon = (mode: TransportMode, className = 'w-3.5 h-3.5 text-emerald-500 shrink-0') => {
    if (mode === 'walking') return <Footprints className={className} />;
    if (mode === 'bicycling') return <Bike className={className} />;
    if (mode === 'motorcycle') return <Navigation className={className} />;
    if (mode === 'transit') return <Bus className={className} />;
    if (mode === 'rideshare') return <Smartphone className={className} />;
    return <Car className={className} />;
  };

  // Filtra os meios de deslocamento viáveis comparando horário selecionado, tempo de chegada de cada modal e horário atual
  const feasibleTransportModeOptions = useMemo(() => {
    const nowMs = currentTimeTick.getTime();

    const filtered = transportModeOptions.filter((opt) => {
      const modeEta = computeCalibratedEtaForMode(distanceKm, null, opt.key);

      if (selectedTimeSlot && selectedDateIso) {
        const [y, m, d] = selectedDateIso.split('-').map(Number);
        const [sh, sm] = selectedTimeSlot.split(':').map(Number);
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d) && !Number.isNaN(sh) && !Number.isNaN(sm)) {
          const appointmentMs = new Date(y, m - 1, d, sh, sm, 0).getTime();
          const maxDepartureMs = appointmentMs - modeEta * 60 * 1000;
          // Não oferta o trajeto (ex: A pé) se o horário máximo de saída já tiver passado em relação ao horário atual
          return maxDepartureMs >= nowMs;
        }
      }

      if (selectedDateIso === todayIso) {
        const closingMs = new Date(
          currentTimeTick.getFullYear(),
          currentTimeTick.getMonth(),
          currentTimeTick.getDate(),
          20,
          30,
          0
        ).getTime();
        return nowMs + (modeEta + PREP_BUFFER_MINUTES) * 60 * 1000 <= closingMs;
      }

      return true;
    });

    if (filtered.length === 0) {
      return transportModeOptions.filter(
        (opt) => opt.key === 'motorcycle' || opt.key === 'car' || opt.key === 'rideshare'
      );
    }

    return filtered;
  }, [distanceKm, selectedTimeSlot, selectedDateIso, currentTimeTick, todayIso]);

  // Se o meio de deslocamento atual (ex: A pé) não for viável para o horário selecionado, alterna automaticamente para um modal viável (ex: Carro)
  useEffect(() => {
    const isCurrentFeasible = feasibleTransportModeOptions.some((opt) => opt.key === transportMode);
    if (!isCurrentFeasible && feasibleTransportModeOptions.length > 0) {
      const preferredFallback =
        feasibleTransportModeOptions.find((opt) => opt.key === 'car') ||
        feasibleTransportModeOptions[0];
      setTransportMode(preferredFallback.key);
      setIsRideAppOptionsOpen(false);
      setEtaMinutes(computeCalibratedEtaForMode(distanceKm, null, preferredFallback.key));
    }
  }, [feasibleTransportModeOptions, transportMode, distanceKm]);

  // Grade compacta com as opções viáveis do Google Maps API + Aplicativo
  const renderTransportSelectorGrid = (preserveSlot = false) => (
    <div className="space-y-1.5">
      <span className={`text-[10px] font-bold uppercase tracking-wider block leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        Meio de deslocamento (Google Maps API)
      </span>
      <div className={`grid gap-1.5 ${feasibleTransportModeOptions.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {feasibleTransportModeOptions.map((opt) => {
          const isSelectedMode = transportMode === opt.key;
          const ModeIcon = opt.Icon;
          const matrixItem = modalMatrix[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                hapticLight();
                setTransportMode(opt.key);
                setIsRideAppOptionsOpen(false);
                if (matrixItem) {
                  setDistanceKm(matrixItem.distanceKm);
                  setEtaMinutes(matrixItem.etaMinutes);
                } else {
                  setEtaMinutes(computeCalibratedEtaForMode(distanceKm, null, opt.key));
                }
                const activeOrigin =
                  originModalMode === 'custom_cep' && customCepInput.replace(/\D/g, '').length === 8
                    ? customCepInput
                    : addressQuery;
                runRouteCalculation(activeOrigin, salonDestQuery, opt.key, preserveSlot);
              }}
              className={`py-2 px-1.5 rounded-[4px] border font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                isSelectedMode
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <ModeIcon className={`w-3.5 h-3.5 shrink-0 ${isSelectedMode ? 'text-white' : 'text-emerald-500'}`} />
              <span className={`leading-tight whitespace-nowrap ${isSelectedMode ? 'text-white' : ''}`}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const handleCloseOriginModal = () => {
    setIsOriginModalOpen(false);
    if (returnToRouteModalAfterOrigin) {
      setReturnToRouteModalAfterOrigin(false);
      setIsRouteModalOpen(true);
    }
  };

  const resolvedSalonLogo = isDark
    ? salonLogoDark || salonLogo || salonLogoLight
    : salonLogoLight || salonLogo || salonLogoDark;

  const originModalNode = isOriginModalOpen && selectedService && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md my-auto border rounded-[4px] p-4 sm:p-5 shadow-2xl space-y-4 transition-colors ${
          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className={`flex items-start justify-between gap-3 pb-2.5 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {originModalMode === 'custom_cep' ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setOriginModalMode('choice');
                }}
                className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 mt-0.5 ${
                  isDark ? 'bg-slate-900 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
            ) : (
              <Navigation className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold font-['Poppins'] leading-snug">
                {originModalMode === 'choice' ? 'De onde você vai sair?' : 'Informe o local de partida'}
              </h3>
              <p className={`text-[11px] leading-snug mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {originModalMode === 'choice'
                  ? 'Calculamos a distância e oferecemos o dia e horário mais propício.'
                  : 'Digite o CEP ou Cidade/Estado para calcularmos o melhor dia e horário.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseOriginModal}
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
              isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {originModalMode === 'choice' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={async () => {
                  hapticMedium();
                  await handleDetectDeviceGpsOrigin();
                }}
                className={`p-3 rounded-[4px] border font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition cursor-pointer ${
                  originType === 'gps'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <Navigation className={`w-4 h-4 shrink-0 ${originType === 'gps' ? 'text-white' : 'text-emerald-500'}`} />
                <span className={`leading-tight whitespace-nowrap ${originType === 'gps' ? 'text-white' : ''}`}>Local Atual</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  hapticMedium();
                  setOriginType('home');
                  const savedHomeOrigin =
                    localStorage.getItem('vagou_user_cep') ||
                    localStorage.getItem('vagou_user_address') ||
                    localStorage.getItem('vagou_client_test_address') ||
                    '08235-770';
                  setAddressQuery(savedHomeOrigin);
                  await runRouteCalculation(savedHomeOrigin, salonDestQuery, transportMode, returnToRouteModalAfterOrigin);
                }}
                className={`p-3 rounded-[4px] border font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition cursor-pointer ${
                  originType === 'home'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <Home className={`w-4 h-4 shrink-0 ${originType === 'home' ? 'text-white' : 'text-emerald-500'}`} />
                <span className={`leading-tight whitespace-nowrap ${originType === 'home' ? 'text-white' : ''}`}>De Casa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setOriginType('other');
                  setOriginModalMode('custom_cep');
                }}
                className={`p-3 rounded-[4px] border font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition cursor-pointer ${
                  originType === 'other'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <MapPin className={`w-4 h-4 shrink-0 ${originType === 'other' ? 'text-white' : 'text-emerald-500'}`} />
                <span className={`leading-tight whitespace-nowrap ${originType === 'other' ? 'text-white' : ''}`}>Outro Local</span>
              </button>
            </div>

            {(originType === 'gps' || originType === 'home') && (
              <>
                <div className={`p-3 rounded-[4px] text-xs font-bold ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
                  {isCalculatingRoute ? (
                    <div className="py-4 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-500 truncate">
                        <Navigation className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{resolvedAddressLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Distância de {formattedDistanceComma} km</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {renderModeIcon(transportMode)}
                        <span>Trajeto de {formattedEtaHoursAndMinutes}</span>
                      </div>
                      {propitiousSuggestion && !returnToRouteModalAfterOrigin && (
                        <div className="flex items-center gap-1.5 text-emerald-500 pt-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>
                            Dia e horário mais propício: <strong>{propitiousSuggestion.shortDate} às {propitiousSuggestion.timeSlot}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-1 sticky bottom-0 z-20 space-y-2">
                  {!returnToRouteModalAfterOrigin && !isCalculatingRoute && propitiousSuggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        hapticMedium();
                        const [py, pm] = propitiousSuggestion.dateIso.split('-').map(Number);
                        setCurrentViewMonth(new Date(py, pm - 1, 1));
                        setSelectedDateIso(propitiousSuggestion.dateIso);
                        setSelectedTimeSlot(propitiousSuggestion.timeSlot);
                        handleCloseOriginModal();
                        setIsSummaryModalOpen(true);
                      }}
                      className="w-full py-3 px-4 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-white shrink-0" />
                      <span className="text-white uppercase font-bold tracking-wide">
                        MAIS PRÓXIMO - {propitiousSuggestion.shortDate} {propitiousSuggestion.timeSlot}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isCalculatingRoute}
                    onClick={() => {
                      hapticMedium();
                      if (!returnToRouteModalAfterOrigin && propitiousSuggestion) {
                        const [py, pm] = propitiousSuggestion.dateIso.split('-').map(Number);
                        setCurrentViewMonth(new Date(py, pm - 1, 1));
                        setSelectedDateIso(propitiousSuggestion.dateIso);
                      }
                      handleCloseOriginModal();
                      if (!returnToRouteModalAfterOrigin) {
                        setCurrentStep('date');
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-[4px] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                      !returnToRouteModalAfterOrigin && propitiousSuggestion
                        ? isDark
                          ? 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200'
                          : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    <span className={
                      !returnToRouteModalAfterOrigin && propitiousSuggestion
                        ? ''
                        : 'text-white'
                    }>
                      {returnToRouteModalAfterOrigin ? 'Confirmar Nova Origem' : 'ESCOLHER OUTRA DATA E HORÁRIO'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in duration-150">
            <form onSubmit={handleCalculateCustomCep} className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={customCepInput}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    const hasLetters = /[a-zA-ZÀ-ÿ]/.test(rawVal);
                    if (!hasLetters) {
                      const digits = rawVal.replace(/\D/g, '').slice(0, 8);
                      const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
                      setCustomCepInput(formatted);
                      if (digits.length === 8) {
                        setAddressQuery(formatted);
                        runRouteCalculation(formatted, salonDestQuery, transportMode, returnToRouteModalAfterOrigin).then(() => {
                          setHasCalculatedCustomCep(true);
                        });
                      } else {
                        setHasCalculatedCustomCep(false);
                      }
                    } else {
                      setCustomCepInput(rawVal);
                      setHasCalculatedCustomCep(false);
                    }
                  }}
                  placeholder="CEP (00000-000), Rua, Bairro ou Local"
                  className={`w-full pl-8 pr-3 py-2.5 text-xs rounded-[4px] border outline-hidden transition-colors ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isCalculatingRoute || customCepInput.trim().length < 3}
                className="py-2.5 px-3.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
              >
                {isCalculatingRoute ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white shrink-0" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-white shrink-0" />
                )}
                <span className="text-white">Calcular</span>
              </button>
            </form>

            {/* Sugestões Instantâneas do Google Places API (New v1) */}
            {placesSuggestions.length > 0 && (
              <div className={`rounded-[4px] divide-y overflow-hidden ${isDark ? 'bg-slate-900 divide-slate-800' : 'bg-slate-100 divide-slate-200'}`}>
                {placesSuggestions.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setCustomCepInput(place.formattedAddress);
                      setAddressQuery(place.formattedAddress);
                      setPlacesSuggestions([]);
                      runRouteCalculation(
                        place.formattedAddress,
                        salonDestQuery,
                        transportMode,
                        returnToRouteModalAfterOrigin
                      ).then(() => {
                        setHasCalculatedCustomCep(true);
                      });
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-start gap-2 transition cursor-pointer ${
                      isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold block truncate">{place.title}</span>
                      <span className={`text-[10.5px] block truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {place.formattedAddress}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isCalculatingRoute ? (
              <div className="py-3 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </div>
            ) : (
              <p className={`text-xs leading-relaxed font-bold break-words ${
                hasCalculatedCustomCep
                  ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                  : isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {hasCalculatedCustomCep && resolvedAddressLabel
                  ? resolvedAddressLabel
                  : 'Informe o CEP ou Cidade/Estado acima.'}
              </p>
            )}

            {hasCalculatedCustomCep && !isCalculatingRoute && (
              <div className={`p-3 rounded-[4px] space-y-1.5 text-xs font-bold ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Distância de {formattedDistanceComma} km</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {renderModeIcon(transportMode)}
                  <span>Trajeto de {formattedEtaHoursAndMinutes}</span>
                </div>
                {propitiousSuggestion && !returnToRouteModalAfterOrigin && (
                  <div className="flex items-center gap-1.5 text-emerald-500 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>
                      Dia e horário mais propício: <strong>{propitiousSuggestion.shortDate} às {propitiousSuggestion.timeSlot}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-1 sticky bottom-0 z-20 space-y-2">
              {!returnToRouteModalAfterOrigin && hasCalculatedCustomCep && !isCalculatingRoute && propitiousSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    hapticMedium();
                    const [py, pm] = propitiousSuggestion.dateIso.split('-').map(Number);
                    setCurrentViewMonth(new Date(py, pm - 1, 1));
                    setSelectedDateIso(propitiousSuggestion.dateIso);
                    setSelectedTimeSlot(propitiousSuggestion.timeSlot);
                    handleCloseOriginModal();
                    setIsSummaryModalOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white shrink-0" />
                  <span className="text-white uppercase font-bold tracking-wide">
                    MAIS PRÓXIMO - {propitiousSuggestion.shortDate} {propitiousSuggestion.timeSlot}
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={isCalculatingRoute || !hasCalculatedCustomCep}
                onClick={() => {
                  hapticMedium();
                  if (!returnToRouteModalAfterOrigin && propitiousSuggestion) {
                    const [py, pm] = propitiousSuggestion.dateIso.split('-').map(Number);
                    setCurrentViewMonth(new Date(py, pm - 1, 1));
                    setSelectedDateIso(propitiousSuggestion.dateIso);
                  }
                  handleCloseOriginModal();
                  if (!returnToRouteModalAfterOrigin) {
                    setCurrentStep('date');
                  }
                }}
                className={`w-full py-2.5 px-4 rounded-[4px] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                  !returnToRouteModalAfterOrigin && hasCalculatedCustomCep && propitiousSuggestion
                    ? isDark
                      ? 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                <span className={
                  !returnToRouteModalAfterOrigin && hasCalculatedCustomCep && propitiousSuggestion
                    ? ''
                    : 'text-white'
                }>
                  {returnToRouteModalAfterOrigin ? 'Confirmar Nova Origem' : 'ESCOLHER OUTRA DATA E HORÁRIO'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // MODAL INDEPENDENTE 2: SEÇÃO DE CONFIRMAÇÃO — RESUMO DO AGENDAMENTO
  // ============================================================================
  const summaryModalNode = isSummaryModalOpen && selectedService && selectedTimeSlot && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md my-auto border rounded-[4px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors ${
          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* 1. Cabeçalho com Logomarca do Salão */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 ${
          isDark ? 'bg-[#151A1E] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 min-w-0 flex-1 h-9">
            {resolvedSalonLogo ? (
              <img
                src={resolvedSalonLogo}
                alt={salonName}
                className="h-full w-auto max-w-[200px] object-contain object-left shrink-0"
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-[4px] bg-emerald-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                  {salonName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-extrabold truncate font-['Poppins']">
                  {salonName}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(false)}
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
              isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Cabeçalho de Título: Resumo do agendamento */}
        <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <h3 className="text-xs sm:text-sm font-extrabold font-['Poppins'] leading-snug">
            Resumo do agendamento
          </h3>
        </div>

        {/* 3. Corpo da Seção de Confirmação */}
        <div className="p-4 space-y-3.5 overflow-y-auto no-scrollbar text-xs">
          {/* Data | Hora: Ambos grandes na mesma linha ocupando 50% de largura da linha cada qual e centralizados */}
          <div className={`grid grid-cols-2 pb-3.5 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="flex flex-col items-center justify-center text-center min-w-0 px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Data</span>
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-500 leading-tight mt-0.5 font-['Poppins']">
                {shortDateFormatted}
              </span>
            </div>

            <div className={`flex flex-col items-center justify-center text-center min-w-0 px-2 border-l ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Hora</span>
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-500 leading-tight mt-0.5 font-['Poppins']">
                {selectedTimeSlot}
              </span>
            </div>
          </div>

          {/* Serviço, Beneficiário, Profissional e Total (Sem Estabelecimento e Sem Telefone) */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-start gap-2">
              <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                <Scissors className="w-3.5 h-3.5 text-emerald-500" /> Serviço:
              </span>
              <span className="font-bold text-right break-words">{selectedService.title}</span>
            </div>

            <div className="flex justify-between items-start gap-2">
              <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                {isDependentBooking ? (
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                )}
                Beneficiário:
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSummaryModalOpen(false);
                  setReturnToSummaryAfterBeneficiary(true);
                  setIsBeneficiaryModalOpen(true);
                }}
                className="font-bold text-emerald-500 hover:underline cursor-pointer text-right break-words"
              >
                {isDependentBooking && dependentName ? `${dependentName} (Dependente)` : 'Para Você (Titular)'}
              </button>
            </div>

            <div className="flex justify-between items-start gap-2">
              <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                <User className="w-3.5 h-3.5 text-emerald-500" /> Profissional:
              </span>
              <span className="font-bold text-right break-words">
                {selectedProfessional === 'any' ? resolvedProfessionalName : selectedProfessional}
              </span>
            </div>

            <div className={`pt-3 border-t space-y-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className={`grid grid-cols-2 gap-3 pb-3 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className="flex flex-col justify-start min-w-0 pr-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Home className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Saída</span>
                  </span>
                  <span className="text-[11px] font-bold leading-snug mt-1 break-words">
                    {resolvedAddressLabel && resolvedAddressLabel !== 'Endereço Residencial'
                      ? resolvedAddressLabel
                      : addressQuery || 'Endereço Residencial'}
                  </span>
                </div>

                <div className={`flex flex-col justify-start min-w-0 pl-3 border-l ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">Destino ({salonName})</span>
                  </span>
                  <span className="text-[11px] font-bold leading-snug mt-1 break-words">
                    {salonAddress || resolvedSalonAddressLabel || salonCep || salonName}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-400">Total a pagar no local:</span>
                <span className="font-black text-base text-emerald-500">
                  R$ {selectedService.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* Aviso de Erro */}
          {bookingErrorMessage && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-[4px] text-rose-400 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{bookingErrorMessage}</span>
            </div>
          )}

          {/* Feedback de Pré-Salvamento */}
          {draftSavedFeedback && (
            <div className="p-2.5 bg-emerald-500 text-white rounded-[4px] text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-white shrink-0" />
              <span className="text-white">{draftSavedFeedback}</span>
            </div>
          )}
        </div>

        {/* 4. Rodapé Fixo: Pré-Salvar, Revisar e Cancelar no topo + Confirmar Agendamento abaixo */}
        <div className={`p-3.5 border-t sticky bottom-0 z-20 space-y-2 ${
          isDark ? 'bg-[#151A1E] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleSaveAsDraft}
              className={`py-2.5 px-2 rounded-[4px] border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-amber-500/40 text-amber-400'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
              }`}
              title="Salva o rascunho para concluir depois (não trava a vaga)"
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0" />
              <span>Pré-Salvar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                setIsSummaryModalOpen(false);
              }}
              className={`py-2.5 px-2 rounded-[4px] border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Revisar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                setIsSummaryModalOpen(false);
                setSelectedTimeSlot(null);
              }}
              className={`py-2.5 px-2 rounded-[4px] border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400'
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
              }`}
            >
              <X className="w-3.5 h-3.5 shrink-0" />
              <span>Cancelar</span>
            </button>
          </div>

          <button
            id="btn-confirmar-agendamento-final"
            type="button"
            disabled={isSubmittingBooking}
            onClick={() => handleConfirmFinal(false)}
            className={`w-full py-3 px-4 font-black text-xs uppercase tracking-wider rounded-[4px] transition flex items-center justify-center gap-2 font-['Poppins'] ${
              isSubmittingBooking
                ? 'bg-slate-700 text-slate-400 cursor-wait'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span className="text-white">{isSubmittingBooking ? 'Confirmando...' : 'Confirmar Agendamento'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MODAL PÓS-CONFIRMAÇÃO 1: DIRECIONAMENTO PARA AGENDA (SEM "IR AGORA")
  // ============================================================================
  const postConfirmChoiceModalNode = isPostConfirmChoiceModalOpen && selectedService && selectedTimeSlot && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md my-auto border rounded-[4px] p-4 sm:p-5 shadow-2xl space-y-4 transition-colors ${
          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className={`flex items-start justify-between gap-3 pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[4px] bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold font-['Poppins'] leading-snug">
                Agendamento Confirmado!
              </h3>
              <p className="text-[11px] font-bold text-emerald-400 truncate mt-0.5">
                {selectedService.title} • {shortDateFormatted} às {selectedTimeSlot}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPostConfirmChoiceModalOpen(false);
              onClose?.();
            }}
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
              isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botão Único Pós-Cadastro/Confirmação: Vai exclusivamente para a Agenda (Sem "Ir Agora") */}
        <div className="pt-1 sticky bottom-0 z-20">
          <button
            type="button"
            onClick={() => {
              hapticMedium();
              setIsPostConfirmChoiceModalOpen(false);
              if (onNavigateToAgenda) {
                onNavigateToAgenda();
              } else {
                onClose?.();
              }
            }}
            className="w-full py-3 px-4 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Calendar className="w-4 h-4 text-white shrink-0" />
            <span className="text-white uppercase tracking-wider">Ir para Agenda</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MODAL PÓS-CONFIRMAÇÃO 2: MODAL PRÓPRIO DE ROTA & DESLOCAMENTO (GOOGLE MAPS API)
  // ============================================================================
  const routeModalNode = isRouteModalOpen && selectedService && selectedTimeSlot && (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs animate-in fade-in duration-150 ${
        isEmbeddedMapOpen ? 'p-0 sm:p-2 overflow-hidden' : 'p-4 overflow-y-auto'
      }`}
    >
      {isEmbeddedMapOpen ? (
        /* TELA EXPANDIDA EM TELA CHEIA COM MAPA INTEGRADO (IN-APP EMBED) */
        <div
          className={`w-full h-full sm:max-w-5xl sm:max-h-[96vh] sm:border sm:rounded-[4px] overflow-hidden shadow-2xl flex flex-col transition-colors ${
            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Cabeçalho Principal */}
          <div
            className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsEmbeddedMapOpen(false);
                }}
                className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
                  isDark ? 'bg-slate-800 text-slate-200 hover:text-white' : 'bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Voltar ao resumo da rota"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-500" />
              </button>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold font-['Poppins'] leading-snug truncate">
                  Mapa da Rota • {TRANSPORT_MODE_META[transportMode].shortLabel}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsEmbeddedMapOpen(false);
                setIsRouteModalOpen(false);
                onClose?.();
              }}
              className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
                isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-cabeçalho com o endereço de destino, somente isso */}
          <div
            className={`px-3.5 py-2 border-b flex items-center gap-1.5 shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs font-bold truncate">
              {salonAddress || resolvedSalonAddressLabel || salonName}
            </span>
          </div>

          {/* Abas de modo de visualização: "Mapa" e "Itinerário" */}
          <div
            className={`px-3.5 py-2 border-b shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-[4px] ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setEmbeddedMapTab('map');
                }}
                className={`py-2 px-2.5 rounded-[3px] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  embeddedMapTab === 'map'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 shrink-0 ${embeddedMapTab === 'map' ? 'text-white' : 'text-emerald-500'}`} />
                <span className={embeddedMapTab === 'map' ? 'text-white' : ''}>Mapa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setEmbeddedMapTab('itinerary');
                }}
                className={`py-2 px-2.5 rounded-[3px] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  embeddedMapTab === 'itinerary'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 shrink-0 ${embeddedMapTab === 'itinerary' ? 'text-white' : 'text-emerald-500'}`} />
                <span className={embeddedMapTab === 'itinerary' ? 'text-white' : ''}>Itinerário</span>
              </button>
            </div>
          </div>

          {/* Conteúdo Principal: Aba Mapa vs Aba Itinerário */}
          {embeddedMapTab === 'map' ? (
            <InteractiveGoogleRouteMap
              originLat={originCoords.lat}
              originLng={originCoords.lng}
              originLabel={resolvedAddressLabel}
              destLat={resolvedSalonCoords.lat}
              destLng={resolvedSalonCoords.lng}
              destLabel={salonName}
              routeData={liveRouteData}
              initialDistanceKm={distanceKm}
              initialEtaMinutes={etaMinutes}
              fallbackEmbedUrl={transportLinks.googleMapsEmbedUrl}
              onDestinationReachedChange={(reached) => setHasReachedDestinationInApp(reached)}
            />
          ) : (
            <div className="flex-1 w-full overflow-y-auto p-4 space-y-4">
              {/* Métricas Rápidas no Topo do Itinerário */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2.5 rounded-[4px] ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <span className={`text-[9.5px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Saída Máx.
                  </span>
                  <span className="text-sm font-mono tabular-nums font-black text-emerald-500 block mt-0.5">
                    {maxDepartureTimeFormatted}
                  </span>
                </div>

                <div className={`p-2.5 rounded-[4px] ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <span className={`text-[9.5px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Distância
                  </span>
                  <span className="text-sm font-mono tabular-nums font-bold block mt-0.5">
                    {formattedDistanceComma} km
                  </span>
                </div>

                <div className={`p-2.5 rounded-[4px] ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <span className={`text-[9.5px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Atendimento
                  </span>
                  <span className="text-sm font-mono tabular-nums font-bold text-emerald-500 block mt-0.5">
                    {selectedTimeSlot}
                  </span>
                </div>
              </div>

              {/* Etapas Sequenciais do Itinerário + Manobras Reais da Routes API v2 */}
              <div className="space-y-1 pt-1">
                {/* Etapa 1: Alerta Pré-Partida */}
                <div className="flex items-start gap-3 pb-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                      <Clock className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="w-0.5 h-8 bg-emerald-500/60 mt-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-emerald-500">
                        1. Horário Limite de Saída
                      </span>
                      <span className="text-[11px] font-mono tabular-nums font-black text-emerald-500">
                        {maxDepartureTimeFormatted}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Saia de {resolvedAddressLabel} até este horário.
                    </p>
                  </div>
                </div>

                {/* Passos Reais Rua a Rua da Routes API v2 */}
                {liveRouteData?.steps && liveRouteData.steps.length > 0 ? (
                  liveRouteData.steps.slice(0, 12).map((step, idx) => (
                    <div key={`${step.instruction}-${idx}`} className="flex items-start gap-3 pb-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-emerald-500 text-white'
                              : isDark
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Navigation className={`w-3 h-3 ${idx === 0 ? 'text-white' : ''}`} />
                        </div>
                        <div className="w-0.5 h-8 bg-emerald-500/40 mt-1" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold leading-snug">
                            {step.instruction}
                          </span>
                          <span className="text-[10.5px] font-mono tabular-nums text-emerald-500 font-bold shrink-0">
                            {step.distanceText}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start gap-3 pb-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-500/20 shrink-0">
                        {renderModeIcon(transportMode, 'w-3.5 h-3.5 text-white shrink-0')}
                      </div>
                      <div className="w-0.5 h-8 bg-emerald-500/60 mt-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold">
                          2. Deslocamento ({TRANSPORT_MODE_META[transportMode].shortLabel})
                        </span>
                        <span className="text-[11px] font-mono tabular-nums font-bold text-emerald-500">
                          {formattedDistanceComma} km
                        </span>
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Tempo estimado de trajeto: <strong>{formattedEtaHoursAndMinutes}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Etapa Final: Destino & Atendimento */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-emerald-500">
                        Destino • {salonName}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums font-black text-emerald-500">
                        {selectedTimeSlot}
                      </span>
                    </div>
                    <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {salonAddress || resolvedSalonAddressLabel || salonName}
                    </p>
                    <p className={`text-[10.5px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Procedimento: {selectedService.title}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé Fixo de Ação (sticky bottom-0 z-20): Exibe apenas o botão "Cheguei" quando o usuário chega ao destino */}
          {hasReachedDestinationInApp && (
            <div
              className={`sticky bottom-0 z-20 px-3.5 py-2.5 border-t flex items-center justify-center shrink-0 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  hapticSuccess();
                  setIsEmbeddedMapOpen(false);
                  setIsRouteModalOpen(false);
                  onClose?.();
                }}
                className="w-full py-2.5 px-4 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shadow-xs"
              >
                <Check className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
                <span className="text-white">Cheguei</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CARD COMPACTO PADRÃO: IR AGORA • ROTA & DESLOCAMENTO */
        <div
          className={`w-full max-w-md my-auto border rounded-[4px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors ${
            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Cabeçalho do Modal Próprio de Rota */}
          <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsEmbeddedMapOpen(false);
                  setIsRouteModalOpen(false);
                  setIsPostConfirmChoiceModalOpen(true);
                }}
                className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
                  isDark ? 'bg-slate-800 text-slate-200 hover:text-white' : 'bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Voltar"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-500" />
              </button>
              <h3 className="text-sm font-extrabold font-['Poppins'] leading-snug truncate">
                Ir Agora • Rota & Deslocamento
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEmbeddedMapOpen(false);
                setIsRouteModalOpen(false);
                onClose?.();
              }}
              className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition cursor-pointer shrink-0 ${
                isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Corpo do Modal Próprio de Rota */}
          <div className="p-4 space-y-3.5 overflow-y-auto no-scrollbar">
            {/* Seletor com todas as 6 opções do Google Maps API: A pé, Bicicleta, Moto, Carro, Transporte Público, Aplicativo */}
            {renderTransportSelectorGrid(true)}

            {/* Card de Rota e Horário Máx. de Saída */}
            <div className={`p-3.5 rounded-[4px] space-y-3 ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-extrabold text-emerald-500 leading-snug break-words flex-1">
                  {resolvedAddressLabel}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setIsEmbeddedMapOpen(false);
                    setIsRouteModalOpen(false);
                    setReturnToRouteModalAfterOrigin(true);
                    setIsOriginModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="text-white">Alterar origem</span>
                </button>
              </div>

              <div className="space-y-1.5 font-bold text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Distância de {formattedDistanceComma} km</span>
                </div>
                <div className="flex items-center gap-2">
                  {renderModeIcon(transportMode, 'w-4 h-4 text-emerald-500 shrink-0')}
                  <span>
                    Trajeto de {formattedEtaHoursAndMinutes} ({TRANSPORT_MODE_META[transportMode].shortLabel})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Horário Máx. de saída <strong className="text-emerald-500">{maxDepartureTimeFormatted}</strong>
                  </span>
                </div>
              </div>

              {/* Botões de Ação Integrados ao Mapa In-App / Waze / Chamar App */}
              <div className="pt-1 space-y-2">
                {(transportMode === 'walking' || transportMode === 'bicycling' || transportMode === 'transit') && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticMedium();
                      setIsEmbeddedMapOpen(true);
                    }}
                    className="w-full py-3 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer text-center shadow-xs"
                  >
                    {renderModeIcon(transportMode, 'w-4 h-4 text-white shrink-0')}
                    <span className="text-white">
                      Mapa ({TRANSPORT_MODE_META[transportMode].shortLabel})
                    </span>
                  </button>
                )}

                {(transportMode === 'car' || transportMode === 'motorcycle') && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        hapticMedium();
                        setIsEmbeddedMapOpen(true);
                      }}
                      className="py-2.5 px-2.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer text-center shadow-xs"
                    >
                      <span className="w-6 h-6 rounded-[4px] bg-white/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                      </span>
                      <span className="text-white whitespace-nowrap">Mapa</span>
                    </button>

                    <a
                      href={transportLinks.wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`py-2.5 px-2.5 rounded-[4px] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer text-center shadow-xs ${
                        isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-[4px] bg-emerald-500 flex items-center justify-center shrink-0">
                        <Navigation className="w-3.5 h-3.5 text-white shrink-0" />
                      </span>
                      <span className="text-white whitespace-nowrap">Waze</span>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />
                    </a>
                  </div>
                )}

                {transportMode === 'rideshare' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        hapticMedium();
                        setIsRideAppOptionsOpen((prev) => !prev);
                      }}
                      className="w-full py-3 px-3 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer text-center shadow-xs"
                    >
                      <Smartphone className="w-4 h-4 text-white shrink-0" />
                      <span className="text-white">Chamar App</span>
                      <ChevronRight
                        className={`w-4 h-4 text-white shrink-0 transition-transform ${
                          isRideAppOptionsOpen ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {isRideAppOptionsOpen && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Escolha o aplicativo instalado no seu dispositivo:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={transportLinks.uberUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-2.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer text-center shadow-xs"
                          >
                            <Car className="w-4 h-4 text-white shrink-0" />
                            <span className="text-white">Uber</span>
                            <ExternalLink className="w-3.5 h-3.5 text-white shrink-0" />
                          </a>

                          <a
                            href={transportLinks.app99Url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`py-2.5 px-2.5 rounded-[4px] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer text-center shadow-xs ${
                              isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400'
                                : 'bg-slate-900 hover:bg-slate-800 text-amber-400'
                            }`}
                          >
                            <Car className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>99</span>
                            <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </a>
                        </div>

                        <a
                          href={transportLinks.nativeGeoIntentUrl}
                          className={`w-full py-2.5 px-3 rounded-[4px] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Outros Apps Instalados no Dispositivo</span>
                          <ExternalLink className="w-3 h-3 text-emerald-500 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const authModalNode = (
    <SalonClientAuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      salonName={salonName}
      salonSlug={salonSlug}
      salonLogo={salonLogo}
      salonLogoLight={salonLogoLight}
      salonLogoDark={salonLogoDark}
      primaryColor={primaryColor}
      onAuthenticated={(user) => {
        setIsAuthModalOpen(false);
        if (user?.phone && !clientPhoneInput.trim()) {
          setClientPhoneInput(user.phone);
        }
        if (pendingAuthActionRef.current === 'confirm_final') {
          handleConfirmFinal(true);
        } else {
          const targetSrv = selectedService || initialService;
          if (targetSrv) {
            proceedWithConfirmedServiceBooking(targetSrv, true);
          }
        }
      }}
    />
  );

  if (inline) {
    return (
      <>
        {bookingContent}
        {beneficiaryModalNode}
        {originModalNode}
        {summaryModalNode}
        {postConfirmChoiceModalNode}
        {routeModalNode}
        {authModalNode}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
        {bookingContent}
      </div>
      {beneficiaryModalNode}
      {originModalNode}
      {summaryModalNode}
      {postConfirmChoiceModalNode}
      {routeModalNode}
      {authModalNode}
    </>
  );
};


