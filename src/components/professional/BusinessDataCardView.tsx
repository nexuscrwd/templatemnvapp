import React, { useState, useMemo } from 'react';
import { 
  Building2, MapPin, Clock, UserCheck, 
  Save, Check, Search, Loader2, Sparkles, 
  ArrowLeft, AlertCircle, QrCode, Plus, Trash2, Printer, FileText,
  Copy, ExternalLink, Phone, Mail, Tag, X,
  Globe, Instagram, Facebook, Users
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { 
  SalonAdminSettings, DayOperatingHours, OperatingSchedule, 
  SalonProfessionalItem 
} from '../../types';
import { hapticSuccess, hapticLight, hapticMedium } from '../../utils/haptics';
import { getSectionHeaderStyleData } from '../../utils/sectionHeaderStyle';

export type BusinessDataTabId = 'comercial' | 'horarios' | 'endereco' | 'contato';

export interface BusinessDataCardViewProps {
  adminSettings: SalonAdminSettings;
  onUpdateSettings: (settings: Partial<SalonAdminSettings>) => Promise<any> | void;
  professionals?: SalonProfessionalItem[];
  onUpdateProfessionals?: (professionals: SalonProfessionalItem[]) => void;
  onOpenVisualIdentity?: () => void;
  onBack: () => void;
  initialTab?: BusinessDataTabId;
}

const SALON_CATEGORIES = [
  'Barbearia',
  'Salão de Beleza',
  'Clínica de Estética',
  'Studio de Unhas / Nail Designer',
  'Lash & Sobrancelhas',
  'Spa & Massoterapia',
  'Multi-Serviços',
];

// Validador Matemático Oficial de CPF (Receita Federal — Módulo 11)
export function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean.charAt(10), 10);
}

// Validador Matemático Oficial de CNPJ (Receita Federal — Módulo 11)
export function isValidCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14 || /^(\d)\1{13}$/.test(clean)) return false;
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;
  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1), 10);
}

const createDefaultDays = (open = '09:00', close = '20:00', withBreak = true): DayOperatingHours[] => [
  { dayKey: 'seg', dayLabel: 'Seg', isOpen: true, openTime: open, closeTime: close, hasBreak: withBreak, breakStart: '12:00', breakEnd: '13:00' },
  { dayKey: 'ter', dayLabel: 'Ter', isOpen: true, openTime: open, closeTime: close, hasBreak: withBreak, breakStart: '12:00', breakEnd: '13:00' },
  { dayKey: 'qua', dayLabel: 'Qua', isOpen: true, openTime: open, closeTime: close, hasBreak: withBreak, breakStart: '12:00', breakEnd: '13:00' },
  { dayKey: 'qui', dayLabel: 'Qui', isOpen: true, openTime: open, closeTime: close, hasBreak: withBreak, breakStart: '12:00', breakEnd: '13:00' },
  { dayKey: 'sex', dayLabel: 'Sex', isOpen: true, openTime: open, closeTime: close, hasBreak: withBreak, breakStart: '12:00', breakEnd: '13:00' },
  { dayKey: 'sab', dayLabel: 'Sáb', isOpen: true, openTime: open, closeTime: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  { dayKey: 'dom', dayLabel: 'Dom', isOpen: false, openTime: '09:00', closeTime: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
];

function timeToMinutes(t: string): number {
  const [h, m] = (t || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calcula a união matemática dos horários de todos os profissionais para a aba "Geral".
 * Exemplo: Se Profissional 1 trabalha das 09:00 às 12:00 e Profissional 2 trabalha das 12:00 às 20:00,
 * a união resulta em 09:00 às 20:00 contínuo na aba Geral.
 */
function computeUnionGeneralSchedule(
  proIds: string[],
  schedulesByPro: Record<string, DayOperatingHours[]>,
  fallbackGeneralDays: DayOperatingHours[]
): DayOperatingHours[] {
  if (proIds.length === 0) return fallbackGeneralDays;

  const baseKeys: Array<{ key: DayOperatingHours['dayKey']; label: string }> = [
    { key: 'seg', label: 'Seg' },
    { key: 'ter', label: 'Ter' },
    { key: 'qua', label: 'Qua' },
    { key: 'qui', label: 'Qui' },
    { key: 'sex', label: 'Sex' },
    { key: 'sab', label: 'Sáb' },
    { key: 'dom', label: 'Dom' },
  ];

  return baseKeys.map(({ key, label }) => {
    const intervals: Array<[number, number]> = [];

    for (const pid of proIds) {
      const proDays = schedulesByPro[pid];
      if (!Array.isArray(proDays)) continue;
      const d = proDays.find((item) => item.dayKey === key);
      if (!d || !d.isOpen) continue;

      const start = timeToMinutes(d.openTime || '09:00');
      const end = timeToMinutes(d.closeTime || '20:00');
      if (end <= start) continue;

      if (d.hasBreak && d.breakStart && d.breakEnd) {
        const bStart = timeToMinutes(d.breakStart);
        const bEnd = timeToMinutes(d.breakEnd);
        if (bStart > start && bEnd > bStart && bEnd < end) {
          intervals.push([start, bStart]);
          intervals.push([bEnd, end]);
        } else {
          intervals.push([start, end]);
        }
      } else {
        intervals.push([start, end]);
      }
    }

    if (intervals.length === 0) {
      return {
        dayKey: key,
        dayLabel: label,
        isOpen: false,
        openTime: '09:00',
        closeTime: '18:00',
        hasBreak: false,
        breakStart: '12:00',
        breakEnd: '13:00',
      };
    }

    // Ordenar e mesclar intervalos sobrepostos ou adjacentes (ex: [09:00, 12:00] + [12:00, 20:00] => [09:00, 20:00])
    intervals.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = intervals[i];
      if (curr[0] <= prev[1]) {
        prev[1] = Math.max(prev[1], curr[1]);
      } else {
        merged.push(curr);
      }
    }

    const minOpen = merged[0][0];
    const maxClose = merged[merged.length - 1][1];

    if (merged.length === 1) {
      return {
        dayKey: key,
        dayLabel: label,
        isOpen: true,
        openTime: minutesToTime(minOpen),
        closeTime: minutesToTime(maxClose),
        hasBreak: false,
        breakStart: '12:00',
        breakEnd: '13:00',
      };
    }

    return {
      dayKey: key,
      dayLabel: label,
      isOpen: true,
      openTime: minutesToTime(minOpen),
      closeTime: minutesToTime(maxClose),
      hasBreak: true,
      breakStart: minutesToTime(merged[0][1]),
      breakEnd: minutesToTime(merged[1][0]),
    };
  });
}

export const BusinessDataCardView: React.FC<BusinessDataCardViewProps> = ({
  adminSettings,
  onUpdateSettings,
  professionals = [],
  onUpdateProfessionals,
  onBack,
  initialTab = 'comercial',
}) => {
  const { isDark } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<BusinessDataTabId>(initialTab);
  const [isStorefrontQrModalOpen, setIsStorefrontQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. INFORMAÇÕES COMERCIAIS
  const [salonName, setSalonName] = useState(adminSettings.salonName || '');
  const [category, setCategory] = useState(adminSettings.category || 'Barbearia');

  // 2. LOCALIZAÇÃO & ENDEREÇO + MAPS
  const [cep, setCep] = useState(adminSettings.cep || '');
  const [logradouro, setLogradouro] = useState(adminSettings.logradouro || adminSettings.salonAddress || '');
  const [numero, setNumero] = useState(adminSettings.numero || '');
  const [complemento, setComplemento] = useState(adminSettings.complemento || '');
  const [bairro, setBairro] = useState(adminSettings.bairro || '');
  const [cidade, setCidade] = useState(adminSettings.cidade || '');
  const [uf, setUf] = useState(adminSettings.uf || '');
  const mapsUrl = adminSettings.mapsUrl || '';
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  // 3. HORÁRIOS DE ATENDIMENTO (Aba "Geral" + Abas por Profissional + 2 Turnos / Pausas de Urgência)
  const [localProfessionals, setLocalProfessionals] = useState<SalonProfessionalItem[]>(() => {
    if (Array.isArray(professionals) && professionals.length > 0) {
      return professionals;
    }
    return [
      {
        id: 'pro-1',
        name: adminSettings.salonName || 'Profissional 1',
        role: 'Titular',
        systemRole: 'admin',
      },
    ];
  });
  const [newProNameInput, setNewProNameInput] = useState('');
  const [isAddingQuickPro, setIsAddingQuickPro] = useState(false);

  const [days, setDays] = useState<DayOperatingHours[]>(() => {
    if (adminSettings.operatingSchedule?.days && adminSettings.operatingSchedule.days.length > 0) {
      return adminSettings.operatingSchedule.days.map((d) => ({
        ...d,
        hasBreak: d.hasBreak ?? false,
        breakStart: d.breakStart || '12:00',
        breakEnd: d.breakEnd || '13:00',
      }));
    }
    return createDefaultDays('09:00', '20:00', true);
  });

  const [professionalSchedules, setProfessionalSchedules] = useState<Record<string, DayOperatingHours[]>>(() => {
    const savedMap = adminSettings.operatingSchedule?.professionalSchedules || {};
    const initialMap: Record<string, DayOperatingHours[]> = { ...savedMap };
    const proList = Array.isArray(professionals) && professionals.length > 0 ? professionals : localProfessionals;

    proList.forEach((p, idx) => {
      const pid = p.id || `pro-${idx + 1}`;
      if (!initialMap[pid]) {
        if (p.workSchedule?.startTime && p.workSchedule?.endTime) {
          initialMap[pid] = createDefaultDays(p.workSchedule.startTime, p.workSchedule.endTime, false);
        } else if (proList.length > 1 && idx === 0) {
          initialMap[pid] = createDefaultDays('09:00', '12:00', false);
        } else if (proList.length > 1 && idx === 1) {
          initialMap[pid] = createDefaultDays('12:00', '20:00', false);
        } else {
          initialMap[pid] = createDefaultDays('09:00', '20:00', true);
        }
      }
    });
    return initialMap;
  });

  const [activeScheduleTab, setActiveScheduleTab] = useState<'geral' | string>('geral');

  const proIds = useMemo(
    () => localProfessionals.map((p, idx) => p.id || `pro-${idx + 1}`),
    [localProfessionals]
  );

  const hasMultipleProfessionals = localProfessionals.length > 1;

  // Quando há mais de 1 profissional, a aba "Geral" calcula automaticamente a união dos turnos da equipe
  const computedGeneralDays = useMemo(() => {
    if (!hasMultipleProfessionals) return days;
    return computeUnionGeneralSchedule(proIds, professionalSchedules, days);
  }, [hasMultipleProfessionals, proIds, professionalSchedules, days]);

  const activeDaysList: DayOperatingHours[] =
    activeScheduleTab === 'geral'
      ? computedGeneralDays
      : (professionalSchedules[activeScheduleTab] || createDefaultDays('09:00', '20:00', false));

  // 4. CONTATO (Link Exclusivo & QR Code, WhatsApp, Tel. Fixo, E-mail, Site, Instagram, Facebook)
  const [salonPhone, setSalonPhone] = useState(adminSettings.salonPhone || adminSettings.legalManagerPhone || '');
  const [phoneLandline, setPhoneLandline] = useState(adminSettings.phoneLandline || '');
  const [commercialEmail, setCommercialEmail] = useState(
    adminSettings.email || adminSettings.legalManagerEmail || (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_email') || '' : '')
  );
  const [websiteUrl, setWebsiteUrl] = useState(adminSettings.websiteUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(adminSettings.instagramUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(adminSettings.facebookUrl || '');

  // 5. FISCAL (Autônomo vs CNPJ + BrasilAPI + Responsável Legal CPF)
  const initialCnpjDigits = (adminSettings.cnpj || '').replace(/\D/g, '');
  const [hasCnpj, setHasCnpj] = useState<boolean>(initialCnpjDigits.length === 14);
  const [razaoSocial, setRazaoSocial] = useState(initialCnpjDigits.length === 14 ? (adminSettings.razaoSocial || '') : '');
  const [cnpj, setCnpj] = useState(initialCnpjDigits.length === 14 ? (adminSettings.cnpj || '') : '');
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [cnpjFeedback, setCnpjFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [cpfError, setCpfError] = useState('');

  const [legalManagerName, setLegalManagerName] = useState(adminSettings.legalManagerName || '');
  const [legalManagerCpf, setLegalManagerCpf] = useState(adminSettings.ownerCpf || adminSettings.legalManagerCpf || '');
  const [legalManagerPhone, setLegalManagerPhone] = useState(adminSettings.legalManagerPhone || adminSettings.salonPhone || '');
  const [legalManagerEmail, setLegalManagerEmail] = useState(
    adminSettings.legalManagerEmail || adminSettings.email || (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_email') || '' : '')
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Máscaras de entrada
  const formatCpf = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 11);
    return raw
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  };

  const formatCnpj = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 14);
    return raw
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatPhone = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      return raw
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return raw
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  const formatLandline = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 10);
    return raw
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatCep = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 8);
    return raw.replace(/^(\d{5})(\d)/, '$1-$2');
  };

  // Consulta Automática de CNPJ via BrasilAPI
  const searchCnpjBrasilApi = async (cnpjValue: string) => {
    const clean = cnpjValue.replace(/\D/g, '');
    if (clean.length !== 14) return;

    if (!isValidCNPJ(clean)) {
      setCnpjFeedback({ type: 'error', message: 'CNPJ inválido (dígitos verificadores incorretos).' });
      hapticMedium();
      return;
    }

    setIsSearchingCnpj(true);
    setCnpjFeedback(null);

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!res.ok) {
        setCnpjFeedback({ type: 'error', message: 'CNPJ não localizado na base da Receita Federal.' });
        return;
      }
      const data = await res.json();
      if (data.razao_social) setRazaoSocial(data.razao_social);
      if (data.nome_fantasia && (!salonName || salonName === 'Meu Estabelecimento')) setSalonName(data.nome_fantasia);
      if (data.cep && !cep) setCep(formatCep(String(data.cep)));
      if (data.logradouro && !logradouro) setLogradouro(data.logradouro);
      if (data.numero && !numero) setNumero(String(data.numero));
      if (data.complemento && !complemento) setComplemento(data.complemento);
      if (data.bairro && !bairro) setBairro(data.bairro);
      if (data.municipio && !cidade) setCidade(data.municipio);
      if (data.uf && !uf) setUf(data.uf);
      setCnpjFeedback({ type: 'success', message: 'Dados sincronizados da Receita Federal (BrasilAPI).' });
      hapticSuccess();
    } catch {
      setCnpjFeedback({ type: 'error', message: 'Não foi possível consultar a BrasilAPI no momento.' });
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleCnpjChange = (val: string) => {
    const masked = formatCnpj(val);
    setCnpj(masked);
    const raw = masked.replace(/\D/g, '');
    if (raw.length === 14) {
      searchCnpjBrasilApi(masked);
    } else {
      setCnpjFeedback(null);
    }
  };

  const handleCpfChange = (val: string) => {
    const masked = formatCpf(val);
    setLegalManagerCpf(masked);
    const raw = masked.replace(/\D/g, '');
    if (raw.length === 11 && !isValidCPF(raw)) {
      setCpfError('CPF inválido (verifique os dígitos).');
    } else {
      setCpfError('');
    }
  };

  // Busca automática por CEP via ViaCEP
  const searchCepAddress = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    setCepError('');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError('CEP não encontrado. Verifique o número digitado.');
        hapticMedium();
      } else {
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setUf(data.uf || '');
        if (data.complemento && !complemento) {
          setComplemento(data.complemento);
        }
        hapticSuccess();
      }
    } catch {
      setCepError('Erro ao buscar o CEP. Preencha os campos manualmente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = formatCep(e.target.value);
    setCep(masked);
    const raw = masked.replace(/\D/g, '');
    if (raw.length === 8) {
      searchCepAddress(masked);
    } else {
      setCepError('');
    }
  };

  // Atualização de Dias e Horários (Geral ou por Profissional)
  const mutateActiveSchedule = (updater: (prev: DayOperatingHours[]) => DayOperatingHours[]) => {
    if (activeScheduleTab === 'geral') {
      if (hasMultipleProfessionals) {
        // Se o salão tem múltiplos profissionais e o usuário clica para abrir/fechar um dia na aba Geral, propaga para a equipe
        setProfessionalSchedules((prevMap) => {
          const nextMap: Record<string, DayOperatingHours[]> = {};
          proIds.forEach((pid) => {
            const currentProDays = prevMap[pid] || createDefaultDays('09:00', '20:00', false);
            nextMap[pid] = updater(currentProDays);
          });
          return nextMap;
        });
      } else {
        setDays((prev) => {
          const next = updater(prev);
          if (proIds[0]) {
            setProfessionalSchedules((m) => ({ ...m, [proIds[0]]: next }));
          }
          return next;
        });
      }
    } else {
      setProfessionalSchedules((prevMap) => {
        const currentList = prevMap[activeScheduleTab] || createDefaultDays('09:00', '20:00', false);
        const updatedList = updater(currentList);
        const nextMap = { ...prevMap, [activeScheduleTab]: updatedList };
        if (!hasMultipleProfessionals) {
          setDays(updatedList);
        }
        return nextMap;
      });
    }
  };

  const toggleDay = (dayKey: string) => {
    hapticLight();
    mutateActiveSchedule((prev) =>
      prev.map((d) => (d.dayKey === dayKey ? { ...d, isOpen: !d.isOpen } : d))
    );
  };

  const updateDayField = (
    dayKey: string,
    field: 'openTime' | 'closeTime' | 'hasBreak' | 'breakStart' | 'breakEnd',
    value: any
  ) => {
    mutateActiveSchedule((prev) =>
      prev.map((d) => (d.dayKey === dayKey ? { ...d, [field]: value } : d))
    );
  };

  const handleAddQuickProfessional = () => {
    const clean = newProNameInput.trim();
    if (!clean) return;
    hapticSuccess();
    const newId = `pro-${Date.now()}`;
    const newPro: SalonProfessionalItem = {
      id: newId,
      name: clean,
      role: 'Profissional',
      systemRole: 'member',
    };
    const nextPros = [...localProfessionals, newPro];
    setLocalProfessionals(nextPros);
    setProfessionalSchedules((prev) => ({
      ...prev,
      [newId]: createDefaultDays('12:00', '20:00', false),
    }));
    if (onUpdateProfessionals) {
      onUpdateProfessionals(nextPros);
    }
    setNewProNameInput('');
    setIsAddingQuickPro(false);
    setActiveScheduleTab(newId);
  };

  // Gerar string descritiva sintética de horários para a vitrine a partir da aba Geral consolidada
  const generateOpeningHoursSummary = (): string => {
    const effectiveDays = computedGeneralDays;
    const openDays = effectiveDays.filter((d) => d.isOpen);
    if (openDays.length === 0) return 'Fechado temporariamente';
    const firstOpen = openDays[0];
    const hoursLabel = firstOpen.hasBreak && firstOpen.breakStart && firstOpen.breakEnd
      ? `${firstOpen.openTime} às ${firstOpen.breakStart} • ${firstOpen.breakEnd} às ${firstOpen.closeTime}`
      : `${firstOpen.openTime} às ${firstOpen.closeTime}`;

    if (openDays.length === 7) return `Seg a Dom • ${hoursLabel}`;
    const hasSegToSex = ['seg', 'ter', 'qua', 'qui', 'sex'].every((k) =>
      effectiveDays.find((d) => d.dayKey === k)?.isOpen
    );
    const sab = effectiveDays.find((d) => d.dayKey === 'sab');
    if (hasSegToSex && sab?.isOpen) {
      return `Seg a Sáb • ${hoursLabel}`;
    }
    if (hasSegToSex && !sab?.isOpen) {
      return `Seg a Sex • ${hoursLabel}`;
    }
    return `${openDays.map((d) => d.dayLabel).join(', ')} • ${hoursLabel}`;
  };

  const resolvedSlug =
    adminSettings.salonSlug ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_slug') || '' : '') ||
    salonName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

  const storefrontUrl = resolvedSlug
    ? `https://${resolvedSlug}.vagouapp.com`
    : (typeof window !== 'undefined' ? window.location.origin : 'https://vagouapp.com');

  const storefrontQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(storefrontUrl)}`;

  const handleCopyStorefrontLink = async () => {
    hapticSuccess();
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {}
  };

  // Salvar Dados
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const rawCpfDigits = legalManagerCpf.replace(/\D/g, '');
    if (rawCpfDigits.length > 0 && !isValidCPF(rawCpfDigits)) {
      setActiveSubTab('comercial');
      setCpfError('Informe um CPF válido (11 dígitos verificados pela Receita Federal).');
      hapticMedium();
      return;
    }

    const rawCnpjDigits = cnpj.replace(/\D/g, '');
    if (hasCnpj && rawCnpjDigits.length > 0 && !isValidCNPJ(rawCnpjDigits)) {
      setActiveSubTab('comercial');
      setCnpjFeedback({ type: 'error', message: 'CNPJ inválido. Confira os 14 dígitos informados.' });
      hapticMedium();
      return;
    }

    hapticSuccess();

    const fullAddress = [
      logradouro,
      numero ? `Nº ${numero}` : '',
      complemento,
      bairro,
      cidade && uf ? `${cidade} - ${uf}` : cidade || uf,
      cep ? `CEP: ${cep}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const finalGeneralDays = computedGeneralDays;

    const operatingSchedule: OperatingSchedule = {
      preset: 'personalizado',
      days: finalGeneralDays,
      defaultOpenTime: finalGeneralDays[0]?.openTime || '09:00',
      defaultCloseTime: finalGeneralDays[0]?.closeTime || '20:00',
      professionalSchedules,
    };

    const isValidCnpj = hasCnpj && rawCnpjDigits.length === 14;
    const finalCnpj = isValidCnpj ? cnpj.trim() : '';
    const finalRazaoSocial = isValidCnpj ? razaoSocial.trim() : '';
    const resolvedEmail = (commercialEmail.trim() || legalManagerEmail.trim()).toLowerCase();
    const resolvedWhatsapp = salonPhone.trim() || legalManagerPhone.trim();

    onUpdateSettings({
      salonName: salonName.trim() || 'Meu Estabelecimento',
      category: category.trim() || 'Barbearia',
      email: resolvedEmail,
      salonPhone: resolvedWhatsapp,
      phoneLandline: phoneLandline.trim(),
      websiteUrl: websiteUrl.trim(),
      instagramUrl: instagramUrl.trim(),
      facebookUrl: facebookUrl.trim(),
      mapsUrl: mapsUrl.trim(),
      razaoSocial: finalRazaoSocial,
      cnpj: finalCnpj,
      ownerCpf: legalManagerCpf.trim(),
      cep: cep.trim(),
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: complemento.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim(),
      salonAddress: fullAddress || adminSettings.salonAddress,
      operatingSchedule,
      operatingHoursJson: operatingSchedule as any,
      openingHours: generateOpeningHoursSummary(),
      legalManagerName: legalManagerName.trim(),
      legalManagerCpf: legalManagerCpf.trim(),
      legalManagerPhone: resolvedWhatsapp,
      legalManagerEmail: resolvedEmail,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const showComercial = activeSubTab === 'comercial';
  const showHorarios = activeSubTab === 'horarios';
  const showEndereco = activeSubTab === 'endereco';
  const showContato = activeSubTab === 'contato';

  const sectionHeaderStyleData = useMemo(() => {
    return getSectionHeaderStyleData(adminSettings, isDark);
  }, [adminSettings, isDark]);

  return (
    <div className={`w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Barra de Topo Fixa */}
      <div 
        className={`${sectionHeaderStyleData.containerClass} flex-col gap-2`}
        style={sectionHeaderStyleData.containerStyle}
      >
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onBack();
              }}
              className={`p-1.5 rounded-[4px] transition cursor-pointer active:scale-95 ${
                isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" style={sectionHeaderStyleData.iconStyle} />
            </button>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 shrink-0" style={sectionHeaderStyleData.iconStyle} />
              <h2 className="text-xs sm:text-sm font-bold font-['Poppins']" style={sectionHeaderStyleData.titleStyle}>
                Dados do Negócio
              </h2>
            </div>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-[4px] shadow-xs animate-in fade-in">
              <Check className="w-3 h-3 text-white" />
              Salvo
            </span>
          )}
        </div>

        {/* 4 Abas Dedicadas na Nova Ordem: Informações | Atendimento | Endereço | Contato */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'comercial' as BusinessDataTabId, label: 'Informações', icon: Building2 },
            { id: 'horarios' as BusinessDataTabId, label: 'Atendimento', icon: Clock },
            { id: 'endereco' as BusinessDataTabId, label: 'Endereço', icon: MapPin },
            { id: 'contato' as BusinessDataTabId, label: 'Contato', icon: Phone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveSubTab(tab.id);
                }}
                className={`py-2 px-2.5 rounded-[4px] text-[11px] font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isSel
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-emerald-500/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSel ? 'text-white' : 'text-emerald-400'}`} />
                <span className={isSel ? 'text-white' : ''}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulário Principal */}
      <form onSubmit={handleSave} className="p-3.5 space-y-4 pb-24 flex-1">
        {/* ============================================================== */}
        {/* 1. INFORMAÇÕES (Identificação Comercial: Nome Fantasia, Categoria + Fiscal: CNPJ/CPF e Titular) */}
        {/* ============================================================== */}
        {showComercial && (
          <>
            <div className={`p-3.5 rounded-[4px] border space-y-3.5 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                  Identificação Comercial
                </h3>
              </div>

              {/* Nome Fantasia & Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Nome Fantasia <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={salonName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSalonName(val);
                      onUpdateSettings({ salonName: val });
                    }}
                    placeholder="Ex: Rota 99 Barbearia"
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Tag className="w-3 h-3 text-emerald-400" />
                    <span>Categoria</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategory(val);
                      onUpdateSettings({ category: val });
                    }}
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs font-semibold outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  >
                    {SALON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* FISCAL • TRIBUTAÇÃO & REGIME (CNPJ / CPF) */}
            <div className={`p-3.5 rounded-[4px] border space-y-3 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                  Fiscal • Tributação & Regime (CNPJ / CPF)
                </h3>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Modalidade Fiscal do Estabelecimento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setHasCnpj(false);
                      setCnpj('');
                      setRazaoSocial('');
                    }}
                    className={`py-2 px-3 rounded-[4px] text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                      !hasCnpj
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/50'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-emerald-500/50'
                    }`}
                  >
                    Autônomo (Sem CNPJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setHasCnpj(true);
                    }}
                    className={`py-2 px-3 rounded-[4px] text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                      hasCnpj
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/50'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-emerald-500/50'
                    }`}
                  >
                    Pessoa Jurídica (CNPJ)
                  </button>
                </div>
              </div>

              {hasCnpj ? (
                <div className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>CNPJ (14 dígitos) <span className="text-rose-400">*</span></span>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          BrasilAPI
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cnpj}
                          onChange={(e) => handleCnpjChange(e.target.value)}
                          placeholder="00.000.000/0000-00"
                          className={`w-full pl-3 pr-9 py-2 rounded-[4px] border text-xs font-mono outline-hidden transition ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                          }`}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                          {isSearchingCnpj ? (
                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => searchCnpjBrasilApi(cnpj)}
                              className="text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                              title="Consultar CNPJ na Receita Federal (BrasilAPI)"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Razão Social <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={razaoSocial}
                        onChange={(e) => setRazaoSocial(e.target.value)}
                        placeholder="Ex: Empresa de Beleza LTDA"
                        className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                          isDark 
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {cnpjFeedback && (
                    <p className={`text-[11px] flex items-center gap-1 font-medium ${
                      cnpjFeedback.type === 'error' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {cnpjFeedback.type === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{cnpjFeedback.message}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Atuação como profissional autônomo (Pessoa Física). Os campos fiscais de CNPJ e Razão Social permanecem isentos.
                </p>
              )}
            </div>

            {/* TITULAR & RESPONSÁVEL LEGAL (CPF Pessoal) */}
            <div className={`p-3.5 rounded-[4px] border space-y-3 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                  Titular & Responsável Legal (CPF Pessoal)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Nome Completo do Titular <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={legalManagerName}
                    onChange={(e) => setLegalManagerName(e.target.value)}
                    placeholder="Ex: Anderson Henrique Pires"
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    CPF Pessoal do Titular <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={legalManagerCpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs font-mono outline-hidden transition ${
                      cpfError
                        ? 'border-rose-500 bg-rose-950/20 text-rose-200'
                        : isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                  {cpfError && (
                    <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{cpfError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Telefone / WhatsApp <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={legalManagerPhone}
                    onChange={(e) => setLegalManagerPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs font-mono outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    E-mail de Contato <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={legalManagerEmail}
                    onChange={(e) => setLegalManagerEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* 2. LOCALIZAÇÃO & ENDEREÇO (CEP, Endereço, Número, Compl., Bairro, Cidade, UF, Maps) */}
        {/* ============================================================== */}
        {showEndereco && (
            <div className={`p-3.5 rounded-[4px] border space-y-3 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                    Localização & Endereço
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  ViaCEP + Maps
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    CEP <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={cep}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      className={`w-full pl-2.5 pr-8 py-2 rounded-[4px] border text-xs font-mono outline-hidden transition ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {isSearchingCep ? (
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Endereço <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Rua, Avenida, Alameda..."
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {cepError && (
                <p className="text-[11px] text-rose-400 font-medium">{cepError}</p>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Número <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Compl.
                  </label>
                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Sala 2, Loja B, Galeria..."
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2.5">
                <div className="col-span-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Bairro <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Centro"
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cidade <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo"
                    className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    UF <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className={`w-full px-2 py-2 rounded-[4px] border text-xs font-mono text-center uppercase outline-hidden transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

            </div>
        )}

        {/* ============================================================== */}
        {/* 3. HORÁRIOS DE ATENDIMENTO (Abas Geral + Profissionais, Dias e Turnos com Intervalo/Pausa) */}
        {/* ============================================================== */}
        {showHorarios && (
            <div className={`p-3.5 rounded-[4px] border space-y-3.5 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                    Horários de Atendimento
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  {generateOpeningHoursSummary()}
                </span>
              </div>

              {/* CABEÇALHO DE ESCALAS: ABA "GERAL" + ABAS COM NOMES DOS PROFISSIONAIS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Escala por Profissional & Geral do Salão</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setIsAddingQuickPro((prev) => !prev);
                    }}
                    className="px-2 py-1 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3 text-white" />
                    <span className="text-white">Profissional</span>
                  </button>
                </div>

                {isAddingQuickPro && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newProNameInput}
                      onChange={(e) => setNewProNameInput(e.target.value)}
                      placeholder="Nome do profissional (ex: Lucas)"
                      className={`flex-1 px-2.5 py-1.5 rounded-[4px] border text-xs outline-hidden ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddQuickProfessional}
                      className="px-3 py-1.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      Adicionar
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setActiveScheduleTab('geral');
                    }}
                    className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeScheduleTab === 'geral'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-slate-950 text-slate-300 hover:text-white'
                        : 'bg-slate-100 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${activeScheduleTab === 'geral' ? 'text-white' : 'text-emerald-400'}`} />
                    <span className={activeScheduleTab === 'geral' ? 'text-white' : ''}>Geral</span>
                  </button>

                  {localProfessionals.map((pro, idx) => {
                    const pid = pro.id || `pro-${idx + 1}`;
                    const isSel = activeScheduleTab === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setActiveScheduleTab(pid);
                        }}
                        className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          isSel
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : isDark
                            ? 'bg-slate-950 text-slate-300 hover:text-white'
                            : 'bg-slate-100 text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <span className={isSel ? 'text-white' : ''}>{pro.name}</span>
                      </button>
                    );
                  })}
                </div>

                {hasMultipleProfessionals && activeScheduleTab === 'geral' && (
                  <p className="text-[10px] text-emerald-400 font-medium">
                    Aba Geral consolida automaticamente a união dos turnos de todos os profissionais (ex: 09:00 às 12:00 + 12:00 às 20:00 = 09:00 às 20:00). Selecione a aba de um profissional para ajustar seu turno individual.
                  </p>
                )}
              </div>

              {/* DIAS DE FUNCIONAMENTO */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Dias de Funcionamento {activeScheduleTab !== 'geral' ? `(${localProfessionals.find((p, i) => (p.id || `pro-${i + 1}`) === activeScheduleTab)?.name || 'Profissional'})` : '(Salão)'}
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {activeDaysList.map((d) => (
                    <button
                      key={d.dayKey}
                      type="button"
                      onClick={() => toggleDay(d.dayKey)}
                      className={`py-2 rounded-[4px] text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                        d.isOpen
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isDark
                          ? 'bg-slate-950 text-slate-500'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <span className={d.isOpen ? 'text-white' : ''}>{d.dayLabel}</span>
                      <span className={`text-[9px] mt-0.5 ${d.isOpen ? 'text-white font-semibold' : 'text-slate-500'}`}>
                        {d.isOpen ? 'Aberto' : 'Off'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* HORÁRIOS DE ATENDIMENTO (Ajuste Específico por Dia: 09:00 às 12:00 - 13:00 às 20:00) */}
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Horários de Atendimento (Ajuste por Dia • Intervalo / Pausa)
                </label>

                <div className="divide-y divide-slate-800/60">
                  {activeDaysList.map((d) => {
                    const isReadOnlyUnion = hasMultipleProfessionals && activeScheduleTab === 'geral';
                    return (
                      <div
                        key={d.dayKey}
                        className={`py-2.5 flex flex-col gap-2 text-xs transition ${
                          !d.isOpen ? 'opacity-45' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold w-9">{d.dayLabel}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-bold ${
                              d.isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {d.isOpen ? 'Aberto' : 'Fechado'}
                            </span>
                          </div>

                          {d.isOpen ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {d.hasBreak ? (
                                /* Formato 2 Turnos: 09:00 às 12:00 - 13:00 às 20:00 */
                                <>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="time"
                                      disabled={isReadOnlyUnion}
                                      value={d.openTime}
                                      onChange={(e) => updateDayField(d.dayKey, 'openTime', e.target.value)}
                                      className={`px-1.5 py-1 rounded-[4px] border text-[11px] font-mono outline-hidden ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                      }`}
                                    />
                                    <span className="text-[10px] text-slate-400">às</span>
                                    <input
                                      type="time"
                                      disabled={isReadOnlyUnion}
                                      value={d.breakStart || '12:00'}
                                      onChange={(e) => updateDayField(d.dayKey, 'breakStart', e.target.value)}
                                      className={`px-1.5 py-1 rounded-[4px] border text-[11px] font-mono outline-hidden ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                      }`}
                                    />
                                  </div>

                                  <span className="text-xs font-bold text-emerald-400">-</span>

                                  <div className="flex items-center gap-1">
                                    <input
                                      type="time"
                                      disabled={isReadOnlyUnion}
                                      value={d.breakEnd || '13:00'}
                                      onChange={(e) => updateDayField(d.dayKey, 'breakEnd', e.target.value)}
                                      className={`px-1.5 py-1 rounded-[4px] border text-[11px] font-mono outline-hidden ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                      }`}
                                    />
                                    <span className="text-[10px] text-slate-400">às</span>
                                    <input
                                      type="time"
                                      disabled={isReadOnlyUnion}
                                      value={d.closeTime}
                                      onChange={(e) => updateDayField(d.dayKey, 'closeTime', e.target.value)}
                                      className={`px-1.5 py-1 rounded-[4px] border text-[11px] font-mono outline-hidden ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                      }`}
                                    />
                                  </div>

                                  {!isReadOnlyUnion && (
                                    <button
                                      type="button"
                                      onClick={() => updateDayField(d.dayKey, 'hasBreak', false)}
                                      className="p-1 rounded-[4px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                      title="Remover intervalo / pausa"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                /* Turno Contínuo + Botão de Inserir Intervalo/Pausa */
                                <>
                                  <input
                                    type="time"
                                    disabled={isReadOnlyUnion}
                                    value={d.openTime}
                                    onChange={(e) => updateDayField(d.dayKey, 'openTime', e.target.value)}
                                    className={`px-1.5 py-1 rounded-[4px] border text-[11px] font-mono outline-hidden ${
                                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                  />
                                  <span className="text-[10px] text-slate-400">às</span>
                                  <input
                                    type="time"
                                    disabled={isReadOnlyUnion}
                                    value={d.closeTime}
                                    onChange={(e) => updateDayField(d.dayKey, 'closeTime', e.target.value)}
                                    className={`px-1.5 py-1 rounded-[4px] border text-[11px] font-mono outline-hidden ${
                                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                  />
                                  {!isReadOnlyUnion && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        hapticLight();
                                        updateDayField(d.dayKey, 'hasBreak', true);
                                      }}
                                      className="px-2 py-1 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                                    >
                                      <Plus className="w-3 h-3 text-white" />
                                      <span className="text-white">Pausa</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Sem expediente</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
        )}

        {/* ============================================================== */}
        {/* 4. CONTATO (Link Exclusivo & QR Code, WhatsApp, Tel. Fixo, E-mail, Site, Instagram e Facebook) */}
        {/* ============================================================== */}
        {showContato && (
          <div className={`p-3.5 rounded-[4px] border space-y-3.5 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <Phone className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                Contato & Canais Digitais
              </h3>
            </div>

            {/* Link Exclusivo & QR Code da Vitrine */}
            <div className="space-y-2 pb-3 border-b border-slate-800/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Link Exclusivo & QR Code da Vitrine</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setIsStorefrontQrModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-[4px] bg-[#20C933] hover:bg-[#1bb32d] text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Printer className="w-3 h-3 text-white" />
                  <span className="text-white">Placa QR Code</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-bold text-emerald-400 truncate">
                    {storefrontUrl}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyStorefrontLink}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span className="text-white">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-white" />
                        <span className="text-white">Copiar Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-2.5 py-1.5 rounded-[4px] border text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
                      isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Abrir</span>
                  </a>
                </div>
              </div>
            </div>

            {/* WhatsApp, Tel. Fixo, E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>WhatsApp <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={salonPhone}
                  onChange={(e) => setSalonPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs font-mono outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tel. Fixo
                </label>
                <input
                  type="text"
                  value={phoneLandline}
                  onChange={(e) => setPhoneLandline(formatLandline(e.target.value))}
                  placeholder="(00) 0000-0000"
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs font-mono outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Mail className="w-3 h-3 text-emerald-400" />
                  <span>E-mail</span>
                </label>
                <input
                  type="email"
                  value={commercialEmail}
                  onChange={(e) => setCommercialEmail(e.target.value)}
                  placeholder="contato@salao.com"
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Site, Instagram e Facebook */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  <span>Site</span>
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="www.meusalao.com.br"
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Instagram className="w-3 h-3 text-emerald-400" />
                  <span>Instagram</span>
                </label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="@meusalao"
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Facebook className="w-3 h-3 text-emerald-400" />
                  <span>Facebook</span>
                </label>
                <input
                  type="text"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="facebook.com/meusalao"
                  className={`w-full px-3 py-2 rounded-[4px] border text-xs outline-hidden transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Modal de Impressão da Placa QR Code de Agendamento da Vitrine */}
      {isStorefrontQrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsStorefrontQrModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[4px] overflow-hidden flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Placa QR Code da Vitrine
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStorefrontQrModalOpen(false)}
                className="p-1 rounded-[4px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center text-center space-y-3 overflow-y-auto">
              <span className="px-2.5 py-0.5 rounded-[4px] bg-[#20C933] text-white text-[10px] font-bold uppercase tracking-wider">
                Agende Seu Horário Online
              </span>
              <h4 className="text-base font-black text-white">
                {salonName || adminSettings.salonName || 'Meu Estabelecimento'}
              </h4>
              {adminSettings.slogan && (
                <p className="text-[11px] text-slate-400">{adminSettings.slogan}</p>
              )}
              <div className="p-3 bg-white rounded-[4px] shadow-md">
                <img
                  src={storefrontQrUrl}
                  alt={`QR Code Vitrine ${salonName}`}
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-[11px] font-mono font-bold text-emerald-400 break-all">
                {storefrontUrl}
              </p>
              <p className="text-[10px] text-slate-400">
                Aponte a câmera do celular para ver os serviços e agendar sem fila.
              </p>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 sticky bottom-0 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyStorefrontLink}
                className="flex-1 py-2.5 px-3 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5 text-white" />
                <span className="text-white">{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-3 rounded-[4px] bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Imprimir Placa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RODAPÉ FIXO DE AÇÃO */}
      <div className={`p-3 border-t shrink-0 sticky bottom-0 z-20 flex items-center justify-between gap-3 ${
        isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-lg'
      }`}>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onBack();
          }}
          className={`px-4 py-2.5 rounded-[4px] border text-xs font-bold transition cursor-pointer ${
            isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-900' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={() => handleSave()}
          className="flex-1 py-2.5 px-4 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
        >
          <Save className="w-4 h-4 text-white" />
          <span className="text-white">Salvar Dados do Negócio</span>
        </button>
      </div>
    </div>
  );
};
