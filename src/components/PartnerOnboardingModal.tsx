import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Building2,
  Users,
  Home,
  Layers,
  Upload,
  Image as ImageIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  MapPin,
  Sparkle
} from 'lucide-react';
import {
  SalonAdminSettings,
  CatalogServiceItem,
  SalonProfessionalItem,
  hapticSuccess,
  hapticLight,
  hapticMedium
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { syncSalonDataToSupabase } from '../lib/supabase';

export interface PartnerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingResultData) => void;
  initialData: {
    salonName: string;
    slug: string;
    category: string;
    primaryColor: string;
    legalManagerName: string;
    legalManagerPhone: string;
    cidade: string;
    uf: string;
  };
}

export interface OnboardingResultData {
  operatingModel: 'solo' | 'team' | 'home_delivery' | 'hybrid';
  homeDeliverySettings?: {
    enabled: boolean;
    areaDescription: string;
    maxDistanceKm: number;
    travelFee: number;
    isFreeForCondo: boolean;
  };
  salonLogoLight?: string;
  salonLogoDark?: string;
  salonIcon?: string;
  professionals: SalonProfessionalItem[];
  services: CatalogServiceItem[];
}

export const PartnerOnboardingModal: React.FC<PartnerOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialData,
}) => {
  const { isDark } = useTheme();

  // Etapas: 1 (Boas-vindas & Modelo), 2 (Identidade Visual), 3 (Profissional/Equipe), 4 (Serviços), 5 (Conclusão)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;

  // Touch Swipe Handlers
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (diff > minSwipeDistance && currentStep < totalSteps) {
      // Swipe para esquerda -> avança
      handleNextStep();
    } else if (diff < -minSwipeDistance && currentStep > 1) {
      // Swipe para direita -> volta
      handlePrevStep();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // ----------------------------------------------------
  // ETAPA 1: MODELO OPERACIONAL E PÚBLICO-ALVO
  // ----------------------------------------------------
  const [operatingModel, setOperatingModel] = useState<'solo' | 'team' | 'home_delivery' | 'hybrid'>('solo');
  const [condoAreaDescription, setCondoAreaDescription] = useState('Condomínio e bairros vizinhos');
  const [travelFee, setTravelFee] = useState<number>(0);
  const [isFreeForCondo, setIsFreeForCondo] = useState(true);
  const [targetAudiences, setTargetAudiences] = useState<string[]>(['Feminino', 'Masculino', 'Unissex', 'Infantil']);

  const toggleTargetAudience = (aud: string) => {
    hapticLight();
    setTargetAudiences((prev) =>
      prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud]
    );
  };

  // ----------------------------------------------------
  // ETAPA 2: BIO / APRESENTAÇÃO DO ESPAÇO, REDES SOCIAIS & HORÁRIOS (Boletim bol-017)
  // ----------------------------------------------------
  const [logoLight] = useState<string>(() => localStorage.getItem('vagou_salon_logo_light') || '');
  const [logoDark] = useState<string>(() => localStorage.getItem('vagou_salon_logo_dark') || '');
  const [appIcon] = useState<string>(() => localStorage.getItem('vagou_salon_icon') || '');
  const [salonBio, setSalonBio] = useState<string>('');
  const [instagramUrl, setInstagramUrl] = useState<string>('');
  const [openingHoursText, setOpeningHoursText] = useState<string>('Seg a Sáb: 09:00 às 20:00');

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    hapticLight();
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setter(result);
        hapticSuccess();
      }
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // ETAPA 3: PROFISSIONAL OU EQUIPE
  // ----------------------------------------------------
  // Para modelo solo ou domicílio:
  const [soloName, setSoloName] = useState(() => {
    const raw = initialData.legalManagerName || '';
    if (raw.toLowerCase().includes('nexus')) return '';
    return raw;
  });
  const [soloRole, setSoloRole] = useState(() => {
    const cat = initialData.category.toLowerCase();
    if (cat.includes('unha') || cat.includes('esmalte')) return 'Nail Designer & Manicure';
    if (cat.includes('barba')) return 'Barbeiro Visagista';
    if (cat.includes('cabelo') || cat.includes('salão')) return 'Cabeleireira Especialista';
    if (cat.includes('cílio') || cat.includes('sobrancelha')) return 'Lash & Brow Designer';
    if (cat.includes('estética')) return 'Esteticista Facial e Corporal';
    return 'Profissional Titular';
  });
  const [soloAvatar, setSoloAvatar] = useState<string>('');

  // Para modelo equipe:
  const [teamMemberName, setTeamMemberName] = useState('');
  const [teamMemberRole, setTeamMemberRole] = useState('Profissional');
  const [teamMemberPhone, setTeamMemberPhone] = useState('');
  const [teamMembers, setTeamMembers] = useState<SalonProfessionalItem[]>([]);

  const handleAddTeamMember = () => {
    if (!teamMemberName.trim()) return;
    hapticSuccess();
    const newMember: SalonProfessionalItem = {
      id: `pro_${Date.now()}`,
      name: teamMemberName.trim(),
      role: teamMemberRole.trim() || 'Profissional',
      systemRole: 'member',
      rating: 5.0,
    };
    setTeamMembers((prev) => [...prev, newMember]);
    setTeamMemberName('');
    setTeamMemberRole('Profissional');
    setTeamMemberPhone('');
  };

  const handleRemoveTeamMember = (id?: string) => {
    if (!id) return;
    hapticMedium();
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // ----------------------------------------------------
  // ETAPA 4: PRIMEIROS SERVIÇOS (CAIXAS DE TEXTO DIRETAS)
  // ----------------------------------------------------
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [servicesList, setServicesList] = useState<CatalogServiceItem[]>([]);

  const handleAddService = () => {
    if (!serviceTitle.trim()) return;
    hapticSuccess();
    const parsedPrice = parseFloat(servicePrice.replace(',', '.')) || 0;
    const newService: CatalogServiceItem = {
      id: `srv_${Date.now()}`,
      title: serviceTitle.trim(),
      description: serviceDescription.trim() || `Serviço oferecido por ${initialData.salonName}.`,
      duration: serviceDuration.trim() || '30 min',
      price: parsedPrice,
      category: 'Geral',
    };
    setServicesList((prev) => [...prev, newService]);
    setServiceTitle('');
    setServiceDescription('');
    setServiceDuration('');
    setServicePrice('');
  };

  const handleRemoveService = (id: string) => {
    hapticMedium();
    setServicesList((prev) => prev.filter((s) => s.id !== id));
  };

  // ----------------------------------------------------
  // NAVEGAÇÃO ENTRE PASSOS
  // ----------------------------------------------------
  const handleNextStep = () => {
    hapticLight();
    if (currentStep === 4) {
      if (serviceTitle.trim()) {
        const parsedPrice = parseFloat(servicePrice.replace(',', '.')) || 0;
        const autoService: CatalogServiceItem = {
          id: `srv_${Date.now()}`,
          title: serviceTitle.trim(),
          description: serviceDescription.trim() || `Serviço oferecido por ${initialData.salonName}.`,
          duration: serviceDuration.trim() || '30 min',
          price: parsedPrice,
          category: 'Geral',
        };
        setServicesList((prev) => [...prev, autoService]);
        setServiceTitle('');
        setServiceDescription('');
        setServiceDuration('');
        setServicePrice('');
        setCurrentStep((prev) => prev + 1);
        return;
      }
      if (servicesList.length === 0) {
        // Permite pular a criação de serviços
        setCurrentStep((prev) => prev + 1);
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    hapticLight();
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    hapticSuccess();

    // Montar lista de profissionais
    const cleanDefaultName = initialData.legalManagerName?.toLowerCase().includes('nexus') ? '' : initialData.legalManagerName;
    const finalOwnerName = soloName.trim() || cleanDefaultName || initialData.salonName;
    const finalProfessionals: SalonProfessionalItem[] = [];
    if (operatingModel === 'solo' || operatingModel === 'home_delivery') {
      finalProfessionals.push({
        id: `pro_owner_${Date.now()}`,
        name: finalOwnerName,
        role: soloRole || 'Profissional Titular',
        systemRole: 'admin',
        avatarUrl: soloAvatar || undefined,
        avatar: soloAvatar || undefined,
        rating: 5.0,
      });
    } else {
      if (teamMembers.length > 0) {
        finalProfessionals.push(...teamMembers);
      } else {
        // Fallback pro próprio gestor se não inseriu equipe
        finalProfessionals.push({
          id: `pro_owner_${Date.now()}`,
          name: finalOwnerName,
          role: 'Dono / Gerente',
          systemRole: 'admin',
          rating: 5.0,
        });
      }
    }

    // Salvar em localStorage
    try {
      if (logoLight) localStorage.setItem('vagou_salon_logo_light', logoLight);
      if (logoDark) localStorage.setItem('vagou_salon_logo_dark', logoDark);
      if (appIcon) localStorage.setItem('vagou_salon_icon', appIcon);

      const finalServices = [...servicesList];
      if (finalServices.length === 0 && serviceTitle.trim()) {
        const parsedPrice = parseFloat(servicePrice.replace(',', '.')) || 0;
        finalServices.push({
          id: `srv_${Date.now()}`,
          title: serviceTitle.trim(),
          description: serviceDescription.trim() || `Serviço oferecido por ${initialData.salonName}.`,
          duration: serviceDuration.trim() || '30 min',
          price: parsedPrice,
          category: 'Geral',
        });
      }

      localStorage.setItem('vagou_custom_catalog_services', JSON.stringify(finalServices));
      localStorage.setItem('vagou_team_members', JSON.stringify(finalProfessionals));
      localStorage.setItem('vagou_custom_professionals', JSON.stringify(finalProfessionals));
      localStorage.setItem('vagou_salon_team_members', JSON.stringify(finalProfessionals.map(p => ({
        id: p.id,
        name: p.name,
        role: p.systemRole === 'admin' ? 'admin' : 'professional',
        phone: initialData.legalManagerPhone || '',
        commissionRate: 100,
        specialties: [initialData.category || 'Geral'],
        avatarUrl: p.avatarUrl || p.avatar || '',
        isActive: true,
        joinedAt: new Date().toISOString()
      }))));

      // Atualizar configurações do salão
      const currentSettings: Partial<SalonAdminSettings> = JSON.parse(
        localStorage.getItem('vagou_salon_admin_settings') || '{}'
      );
      const updatedSettings: Partial<SalonAdminSettings> = {
        ...currentSettings,
        salonName: initialData.salonName,
        salonLogoLight: logoLight || currentSettings.salonLogoLight,
        salonLogoDark: logoDark || currentSettings.salonLogoDark,
        salonLogo: logoDark || logoLight || currentSettings.salonLogo,
        salonIcon: appIcon || currentSettings.salonIcon,
        bio: salonBio.trim() || currentSettings.bio,
        instagramUrl: instagramUrl.trim() || currentSettings.instagramUrl,
        openingHours: openingHoursText.trim() || currentSettings.openingHours || 'Seg a Sáb: 09:00 às 20:00',
        operatingModel: operatingModel,
        homeDeliverySettings: {
          enabled: operatingModel === 'home_delivery' || operatingModel === 'hybrid',
          areaDescription: condoAreaDescription,
          maxDistanceKm: 15,
          travelFee: travelFee,
          isFreeForCondo: isFreeForCondo,
        },
      };
      localStorage.setItem('vagou_salon_admin_settings', JSON.stringify(updatedSettings));

      // Sincronização remota via Supabase se configurado
      syncSalonDataToSupabase({
        slug: initialData.slug || `salao-${Date.now()}`,
        tradeName: initialData.salonName,
        phoneWhatsapp: initialData.legalManagerPhone || '11999999999',
        email: `${initialData.slug || 'contato'}@vagou.app`,
        address: `${initialData.cidade || 'São Paulo'} - ${initialData.uf || 'SP'}`,
        neighborhood: 'Centro',
        city: initialData.cidade || 'São Paulo',
        latitude: -23.55052,
        longitude: -46.633308,
        operatingModel,
        logoLightUrl: logoLight || currentSettings.salonLogoLight || undefined,
        logoDarkUrl: logoDark || currentSettings.salonLogoDark || undefined,
        appIconUrl: appIcon || currentSettings.salonIcon || undefined,
        slogan: currentSettings.slogan,
        brandFont: currentSettings.brandFont || 'Poppins',
        bio: salonBio.trim() || currentSettings.bio || undefined,
        instagramUrl: instagramUrl.trim() || currentSettings.instagramUrl || undefined,
        homeDeliverySettings: {
          enabled: operatingModel === 'home_delivery' || operatingModel === 'hybrid',
          areaDescription: condoAreaDescription,
          maxDistanceKm: 15,
          travelFee,
          isFreeForCondo,
        },
      }).catch(() => {});
    } catch {}

    onComplete({
      operatingModel,
      homeDeliverySettings: {
        enabled: operatingModel === 'home_delivery' || operatingModel === 'hybrid',
        areaDescription: condoAreaDescription,
        maxDistanceKm: 15,
        travelFee,
        isFreeForCondo,
      },
      salonLogoLight: logoLight || undefined,
      salonLogoDark: logoDark || undefined,
      salonIcon: appIcon || undefined,
      professionals: finalProfessionals,
      services: servicesList.length > 0 ? servicesList : (serviceTitle.trim() ? [{
        id: `srv_${Date.now()}`,
        title: serviceTitle.trim(),
        description: serviceDescription.trim() || `Serviço oferecido por ${initialData.salonName}.`,
        duration: serviceDuration.trim() || '30 min',
        price: parseFloat(servicePrice.replace(',', '.')) || 0,
        category: 'Geral',
      }] : []),
    });
  };

  const [copiedLink, setCopiedLink] = useState(false);
  const handleCopyLink = () => {
    hapticSuccess();
    const appUrl = `https://vagou.app/${initialData.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] rounded-[8px] border border-slate-200 bg-white text-slate-900 flex flex-col shadow-2xl overflow-hidden transition-all"
      >
        {/* Cabeçalho do Modal com Indicador de Etapas */}
        <header className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 font-['Poppins']">
                {initialData.salonName || 'Nome Fantasia'}
              </h2>
              <p className="text-[10px] text-slate-500">
                Passo {currentStep} de {totalSteps} • {
                  currentStep === 1 ? 'Modelo Operacional' :
                  currentStep === 2 ? 'Apresentação, Instagram & Horários' :
                  currentStep === 3 ? (operatingModel === 'team' ? 'Primeiro Profissional da Equipe' : 'Perfil do Profissional') :
                  currentStep === 4 ? 'Criação dos Primeiros Serviços' :
                  'Seu Aplicativo Está Pronto!'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Indicadores de bolinhas */}
            <div className="flex items-center gap-1 mr-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    s === currentStep
                      ? 'w-4 bg-emerald-500'
                      : s < currentStep
                      ? 'bg-emerald-500/50'
                      : isDark
                      ? 'bg-slate-800'
                      : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[4px] text-slate-400 hover:text-white transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Corpo com Rolagem Interna */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* ======================================================== */}
          {/* ETAPA 1: BOAS-VINDAS & MODELO OPERACIONAL                */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center py-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                  <Sparkle className="w-3 h-3" /> Parabéns, {initialData.salonName}!
                </span>
                <h3 className="text-base font-black font-['Poppins'] mt-2">
                  Como funciona o seu atendimento?
                </h3>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                  Personalizamos a interface e a agenda do cliente de acordo com o seu formato de trabalho.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Solo */}
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setOperatingModel('solo');
                  }}
                  className={`p-3 rounded-[6px] border text-left transition cursor-pointer flex flex-col justify-between ${
                    operatingModel === 'solo'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    {operatingModel === 'solo' && (
                      <span className="w-4 h-4 rounded-full bg-[#20C933] text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Dono Solitário (Solo)</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Eu atendo sozinho no meu salão/espaço. Abro, atendo e fecho.
                    </p>
                  </div>
                </button>

                {/* 2. Equipe */}
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setOperatingModel('team');
                  }}
                  className={`p-3 rounded-[6px] border text-left transition cursor-pointer flex flex-col justify-between ${
                    operatingModel === 'team'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    {operatingModel === 'team' && (
                      <span className="w-4 h-4 rounded-full bg-[#20C933] text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Salão com Equipe</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Tenho múltiplos profissionais e especialistas atendendo comigo.
                    </p>
                  </div>
                </button>

                {/* 3. Domicílio / Condomínio */}
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setOperatingModel('home_delivery');
                  }}
                  className={`p-3 rounded-[6px] border text-left transition cursor-pointer flex flex-col justify-between ${
                    operatingModel === 'home_delivery'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Home className="w-4 h-4" />
                    </div>
                    {operatingModel === 'home_delivery' && (
                      <span className="w-4 h-4 rounded-full bg-[#20C933] text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Atende em Domicílio</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Vou até as clientes para realizar o atendimento.
                    </p>
                  </div>
                </button>

                {/* 4. Híbrido */}
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setOperatingModel('hybrid');
                  }}
                  className={`p-3 rounded-[6px] border text-left transition cursor-pointer flex flex-col justify-between ${
                    operatingModel === 'hybrid'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    {operatingModel === 'hybrid' && (
                      <span className="w-4 h-4 rounded-full bg-[#20C933] text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Modelo Híbrido</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Atendo no meu espaço próprio e também vou até as clientes.
                    </p>
                  </div>
                </button>
              </div>

              {/* Ajustes específicos para quem atende a domicílio / condomínio */}
              {(operatingModel === 'home_delivery' || operatingModel === 'hybrid') && (
                <div className={`p-3 rounded-[6px] border space-y-2.5 animate-in fade-in duration-150 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Área e Condições de Atendimento em Domicílio</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      Condomínio ou Região Principal de Atuação
                    </label>
                    <input
                      type="text"
                      value={condoAreaDescription}
                      onChange={(e) => setCondoAreaDescription(e.target.value)}
                      placeholder="Ex: Condomínio Jardim das Flores e região"
                      className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] border outline-hidden ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFreeForCondo}
                        onChange={(e) => setIsFreeForCondo(e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-slate-300">
                        Deslocamento grátis para moradores do meu condomínio
                      </span>
                    </label>

                    {!isFreeForCondo && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Taxa R$:</span>
                        <input
                          type="number"
                          value={travelFee}
                          onChange={(e) => setTravelFee(Math.max(0, Number(e.target.value)))}
                          className="w-16 px-2 py-1 text-xs text-center rounded border bg-slate-950 border-slate-800 text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seleção do Público-Alvo Atendido (Checkboxes) */}
              <div className={`p-3 rounded-[6px] border space-y-2 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="block text-[11px] font-bold text-slate-300">
                  Público-Alvo Atendido (Marque com checkbox)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {['Feminino', 'Masculino', 'Unissex', 'Infantil'].map((aud) => {
                    const isChecked = targetAudiences.includes(aud);
                    return (
                      <button
                        key={aud}
                        type="button"
                        onClick={() => toggleTargetAudience(aud)}
                        className={`py-2 px-3 rounded border text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/20 border-[#20C933] text-emerald-400'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        <span>{aud}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-[#20C933] border-[#20C933] text-white' : 'border-slate-600'
                        }`}>
                          {isChecked && '✓'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 2: BIO / APRESENTAÇÃO, INSTAGRAM & HORÁRIOS        */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center py-1">
                <h3 className="text-sm font-black font-['Poppins']">
                  Apresentação do Espaço & Redes Sociais
                </h3>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-0.5">
                  Sua identidade visual já foi sincronizada no Cadastro Soberano. Complete agora sua Bio, @instagram e horário de atendimento.
                </p>
              </div>

              <div className={`p-3.5 rounded-[6px] border space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Bio / Apresentação do Salão
                  </label>
                  <textarea
                    rows={3}
                    maxLength={280}
                    value={salonBio}
                    onChange={(e) => setSalonBio(e.target.value)}
                    placeholder={`Conte brevemente sobre o diferencial de ${initialData.salonName}...`}
                    className={`w-full px-3 py-2 text-xs rounded-[4px] border outline-hidden resize-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Instagram Oficial (@perfil)
                    </label>
                    <input
                      type="text"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="Ex: @meusalaooficial"
                      className={`w-full px-3 py-2 text-xs rounded-[4px] border outline-hidden ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Horário de Funcionamento
                    </label>
                    <input
                      type="text"
                      value={openingHoursText}
                      onChange={(e) => setOpeningHoursText(e.target.value)}
                      placeholder="Ex: Ter a Sáb: 09:00 às 19:00"
                      className={`w-full px-3 py-2 text-xs rounded-[4px] border outline-hidden ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 3: PROFISSIONAIS / EQUIPE                         */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {operatingModel === 'solo' || operatingModel === 'home_delivery' ? (
                /* Perfil do Dono Solitário ou Atendimento em Domicílio */
                <div className="space-y-3">
                  <div className="text-center py-1">
                    <h3 className="text-sm font-black font-['Poppins']">
                      Seu Perfil Profissional
                    </h3>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                      Você é o profissional titular que aparecerá nas reservas e avaliações dos clientes.
                    </p>
                  </div>

                  <div className={`p-4 rounded-[6px] border flex items-center gap-3.5 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="relative group shrink-0">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center overflow-hidden text-emerald-400 font-black text-base">
                        {soloAvatar ? (
                          <img src={soloAvatar} alt={soloName || initialData.salonName} className="w-full h-full object-cover" />
                        ) : (
                          ((soloName || initialData.salonName || 'VG').replace(/nexus/gi, '').trim().slice(0, 2) || 'VG').toUpperCase()
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-1 rounded-full bg-[#20C933] text-white cursor-pointer shadow-sm hover:scale-105 transition">
                        <Upload className="w-2.5 h-2.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setSoloAvatar)}
                        />
                      </label>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
                          Nome do Profissional
                        </label>
                        <input
                          type="text"
                          value={soloName}
                          onChange={(e) => setSoloName(e.target.value)}
                          placeholder="Ex: Seu nome ou apelido profissional"
                          className={`w-full px-2.5 py-1 text-xs rounded-[4px] border outline-hidden ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
                          Especialidade / Título Profissional
                        </label>
                        <input
                          type="text"
                          value={soloRole}
                          onChange={(e) => setSoloRole(e.target.value)}
                          placeholder="Ex: Nail Designer, Barbeiro Visagista..."
                          className={`w-full px-2.5 py-1 text-xs rounded-[4px] border outline-hidden ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Cadastro do(s) primeiro(s) profissional(is) para salão com equipe */
                <div className="space-y-3">
                  <div className="text-center py-1">
                    <h3 className="text-sm font-black font-['Poppins']">
                      Cadastre o Primeiro Profissional da Equipe
                    </h3>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                      Adicione quem atende no salão. Você poderá adicionar mais membros depois.
                    </p>
                  </div>

                  {/* Formulário rápido */}
                  <div className={`p-3 rounded-[6px] border space-y-2.5 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          Nome do Profissional *
                        </label>
                        <input
                          type="text"
                          value={teamMemberName}
                          onChange={(e) => setTeamMemberName(e.target.value)}
                          placeholder="Ex: Lucas Silva"
                          className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] border outline-hidden ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          Cargo / Especialidade
                        </label>
                        <input
                          type="text"
                          value={teamMemberRole}
                          onChange={(e) => setTeamMemberRole(e.target.value)}
                          placeholder="Ex: Cabeleireiro, Barbeiro"
                          className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] border outline-hidden ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500">
                        Opcional: Você pode pular e gerenciar a equipe no painel.
                      </span>
                      <button
                        type="button"
                        onClick={handleAddTeamMember}
                        disabled={!teamMemberName.trim()}
                        className="py-1.5 px-3 rounded-[4px] bg-[#20C933] hover:bg-[#1db82e] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar Profissional</span>
                      </button>
                    </div>
                  </div>

                  {/* Lista de membros adicionados */}
                  {teamMembers.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Profissionais Adicionados ({teamMembers.length})
                      </span>
                      <div className="space-y-1">
                        {teamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded border bg-slate-900 border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                                {member.name.slice(0, 1)}
                              </div>
                              <div>
                                <p className="font-bold text-white text-[11px]">{member.name}</p>
                                <p className="text-[9px] text-slate-400">{member.role}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamMember(member.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 4: CRIAÇÃO DOS PRIMEIROS SERVIÇOS                 */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="text-center py-1">
                <h3 className="text-sm font-black font-['Poppins']">
                  Criação dos Primeiros Serviços
                </h3>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-0.5">
                  Cadastre os serviços do seu estabelecimento (opcional - pode pular e cadastrar depois).
                </p>
              </div>

              {/* Caixa de Texto de Entrada dos Serviços */}
              <div className={`p-3 rounded-[6px] border space-y-2.5 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* 1. Serviço */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Serviço *
                  </label>
                  <input
                    type="text"
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder="Ex: Manicure, Corte, Barba, Massagem"
                    className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] border outline-hidden ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* 2. Descrição */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Ex: Cutilagem e esmaltação completa"
                    className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] border outline-hidden ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* 3. T. Estimado (opcional) | Valor | Botão "+" */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      T. Estimado (opcional)
                    </label>
                    <input
                      type="text"
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(e.target.value)}
                      placeholder="Ex: 40 min"
                      className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] border outline-hidden ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      Valor (R$) *
                    </label>
                    <input
                      type="text"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="Ex: 45,00"
                      className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] border outline-hidden font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="col-span-3">
                    <button
                      type="button"
                      onClick={handleAddService}
                      disabled={!serviceTitle.trim()}
                      title="Adicionar serviço"
                      className="w-full h-[32px] rounded-[4px] bg-[#20C933] hover:bg-[#1db82e] active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow-xs disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span className="text-[11px]">Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Serviços Adicionados */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Serviços Cadastrados ({servicesList.length})
                  </span>
                  {servicesList.length === 0 && (
                    <span className="text-[10px] text-emerald-400 font-medium">
                      Opcional
                    </span>
                  )}
                </div>

                {servicesList.length === 0 ? (
                  <div className={`p-4 rounded-[6px] border border-dashed text-center ${
                    isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <p className="text-xs font-semibold text-slate-300">Nenhum serviço cadastrado ainda.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Você pode avançar agora e cadastrar seus serviços a qualquer momento na aba 'Serviços' do painel.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {servicesList.map((srv) => (
                      <div
                        key={srv.id}
                        className={`flex items-center justify-between p-2 rounded-[4px] border ${
                          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <h4 className="font-bold text-white text-xs truncate">{srv.title}</h4>
                          {srv.description && (
                            <p className="text-[10px] text-slate-400 truncate">{srv.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                            <span className="text-emerald-400 font-bold">
                              R$ {Number(srv.price).toFixed(2).replace('.', ',')}
                            </span>
                            {srv.duration && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-400">{srv.duration}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveService(srv.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer transition shrink-0"
                          title="Remover serviço"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 5: CONCLUSÃO & LANÇAMENTO                          */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-4 text-center py-3 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-base font-black font-['Poppins']">
                  Tudo Pronto para o Sucesso!
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  O aplicativo exclusivo de <strong className="text-white">{initialData.salonName}</strong> está configurado e pronto para receber clientes.
                </p>
              </div>

              {/* Card de Resumo do App */}
              <div className={`p-3 rounded-[6px] border text-left space-y-2 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Modelo Operacional:</span>
                  <span className="font-bold text-white capitalize">
                    {operatingModel === 'solo' && 'Dono Solitário (Solo)'}
                    {operatingModel === 'team' && 'Salão com Equipe'}
                    {operatingModel === 'home_delivery' && 'Atendimento a Domicílio'}
                    {operatingModel === 'hybrid' && 'Modelo Híbrido'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Serviços Ativos:</span>
                  <span className="font-bold text-emerald-400">{servicesList.length} serviços</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Link Exclusivo do App:</span>
                  <span className="font-mono text-emerald-400">vagou.app/{initialData.slug}</span>
                </div>
              </div>

              {/* Botão de Copiar Link */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-1.5 px-3 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link do App'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo de Ação */}
        <footer className={`p-3 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="py-2 px-3 rounded-[4px] text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {/* Botão Pular (visível nos passos 2 e 3) */}
            {(currentStep === 2 || currentStep === 3) && (
              <button
                type="button"
                onClick={handleNextStep}
                className="py-2 px-3 rounded-[4px] text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Pular Etapa
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={currentStep === 4 && servicesList.length === 0 && !serviceTitle.trim()}
                className="py-2 px-4 rounded-[4px] bg-[#20C933] hover:bg-[#1db82e] active:scale-[0.99] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-sm disabled:opacity-50"
              >
                <span>Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="py-2 px-5 rounded-[4px] bg-[#20C933] hover:bg-[#1db82e] active:scale-[0.99] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Acessar Meu Painel</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
