import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SalonProfileView } from './components/SalonProfileView';
import { UserAppointmentsView } from './components/UserAppointmentsView';
import { UserDashboard } from './components/UserDashboard';
import { PartnerAuthView, PartnerAuthSuccessData } from './components/PartnerAuthView';
import { SalonNotFoundScreen } from './components/public/SalonNotFoundScreen';
import { useSalonRole } from './hooks/useSalonRole';
import { ServiceOffer, BookingAppointment } from './types';
import { initializeStoredPwaAssets } from './utils/pwaAssets';
import { 
  supabase, 
  isSupabaseConfigured, 
  fetchUserProfileFromDb, 
  isValidAvatarUrlString,
  ensureClientRow,
  fetchUserAppointments,
  mapDbAppointmentToBookingAppointment,
  subscribeToAppointments,
  cancelAppointmentInDb,
  ensureSalonRow
} from './lib/supabase';
import { 
  ThemeContext, 
  ThemeProvider, 
  useTheme, 
  applyAccentColorToDom, 
  type ThemeContextType 
} from './context/ThemeContext';

export { ThemeContext, ThemeProvider, useTheme, applyAccentColorToDom, type ThemeContextType };

// Subdomínios do sistema que NÃO são salões de beleza
const RESERVED_SUBDOMAINS = [
  'adm', 'admin', 'admvapp', 'portal', 'pvapp', 'meunegocio', 'mnvapp',
  'www', 'api', 'suporte', 'ajuda', 'vagou', 'vagouapp', 'localhost',
  'app', 'dashboard', 'status', 'auth', 'login', 'signup', 'checkout', 'pay', 'billing'
];

function detectActiveSubdomain(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const isDevOrPreview =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('run.app') ||
    hostname.includes('webcontainer') ||
    hostname.includes('stackblitz');

  const parts = hostname.split('.');
  if (parts.length >= 3 && !isDevOrPreview) {
    const sub = parts[0].toLowerCase().trim();
    if (!RESERVED_SUBDOMAINS.includes(sub) && !sub.startsWith('ais-')) {
      return sub;
    }
  }
  return '';
}

// Lista de ofertas padrão (vazio, carregado do banco)
const EMPTY_OFFERS: ServiceOffer[] = [];

export const App: React.FC = () => {
  const { isDark, accentColor } = useTheme();

  // Validação do Subdomínio Wildcard (*.vagouapp.com)
  const [isNotFound, setIsNotFound] = useState(false);
  const [currentSubdomain, setCurrentSubdomain] = useState<string>(() => detectActiveSubdomain());
  const [isValidatingSubdomain, setIsValidatingSubdomain] = useState<boolean>(true);
  const [initialSalonData, setInitialSalonData] = useState<any>(null);

  // Início padrão na vitrine do estabelecimento ('salon')
  const [viewMode, setViewMode] = useState<'auth' | 'salon' | 'agenda' | 'dashboard'>('salon');
  const [salonName, setSalonName] = useState(() => {
    const activeSub = detectActiveSubdomain();
    if (activeSub) {
      const cachedSlug = localStorage.getItem('vagou_salon_slug');
      if (cachedSlug === activeSub) {
        return localStorage.getItem('vagou_salon_name') || '';
      }
      return '';
    }
    try {
      const saved = localStorage.getItem('vagou_partner_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.salonName) return parsed.salonName;
      }
    } catch {}
    return '';
  });

  // Slug de desenvolvimento em DEV (configurado nos Secrets do AI Studio: VITE_DEV_SALON_SLUG)
  const devSlug = import.meta.env.DEV ? (import.meta.env.VITE_DEV_SALON_SLUG as string | undefined) : undefined;
  const activeSalonIdentifier =
    devSlug ||
    currentSubdomain ||
    initialSalonData?.slug ||
    initialSalonData?.id ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_slug') || '' : '');
  const { role: currentRole } = useSalonRole(activeSalonIdentifier);

  // Trava anti-expulsão: enquanto valida o subdomínio, passa 'loading' para o SalonProfileView
  const effectiveRole = isValidatingSubdomain ? 'loading' : currentRole;
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('vagou_user_name') || '';
  });
  const [userAvatarUrl, setUserAvatarUrl] = useState(() => {
    try {
      const saved = localStorage.getItem('vagou_user_avatar');
      if (saved && (saved.includes('unsplash.com') || saved.includes('images.unsplash'))) {
        localStorage.removeItem('vagou_user_avatar');
        return '';
      }
      if (isValidAvatarUrlString(saved)) return saved.trim();
    } catch {}
    return '';
  });
  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [offers, setOffers] = useState<ServiceOffer[]>(EMPTY_OFFERS);

  interface AppToast {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'error';
  }
  const [activeToast, setActiveToast] = useState<AppToast | null>(null);

  const loadAppointments = () => {
    try {
      const saved = localStorage.getItem('vagou_user_appointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAppointments((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
          return parsed;
        });
      } else {
        setAppointments((prev) => (prev.length === 0 ? prev : []));
      }

      const savedName = localStorage.getItem('vagou_user_name');
      if (savedName) {
        setUserName((prev) => (prev === savedName ? prev : savedName));
      }
      const savedAvatar = localStorage.getItem('vagou_user_avatar');
      if (savedAvatar && (savedAvatar.includes('unsplash.com') || savedAvatar.includes('images.unsplash'))) {
        localStorage.removeItem('vagou_user_avatar');
        setUserAvatarUrl((prev) => (prev === '' ? prev : ''));
      } else if (isValidAvatarUrlString(savedAvatar)) {
        const trimmedAvatar = savedAvatar.trim();
        setUserAvatarUrl((prev) => (prev === trimmedAvatar ? prev : trimmedAvatar));
      }
    } catch {}

    // Sincronizar em tempo real com public.appointments no Supabase
    if (isSupabaseConfigured) {
      const userEmail = localStorage.getItem('vagou_user_email') || localStorage.getItem('vagou_active_partner') || '';
      const userPhone = localStorage.getItem('vagou_user_phone') || '';
      const clientId = localStorage.getItem('vagou_client_id') || '';

      if (userEmail || userPhone || clientId) {
        fetchUserAppointments({ email: userEmail, phone: userPhone, clientId })
          .then((dbRows) => {
            if (Array.isArray(dbRows) && dbRows.length > 0) {
              const mappedDb = dbRows.map((r) => mapDbAppointmentToBookingAppointment(r));
              setAppointments((currentLocal: BookingAppointment[]) => {
                const localMap = new Map<string, BookingAppointment>(
                  currentLocal.map((l) => [String(l.protocolCode || '').replace(/^#/, ''), l])
                );
                const merged = mappedDb.map((dbApt) => {
                  const cleanKey = String(dbApt.protocolCode || '').replace(/^#/, '');
                  const loc = localMap.get(cleanKey);
                  return loc ? { ...loc, ...dbApt } : dbApt;
                });
                const dbSet = new Set(
                  mappedDb.map((a) => String(a.protocolCode || '').replace(/^#/, ''))
                );
                currentLocal.forEach((loc) => {
                  const cleanKey = String(loc.protocolCode || '').replace(/^#/, '');
                  if (!dbSet.has(cleanKey)) {
                    merged.push(loc);
                  }
                });
                if (JSON.stringify(currentLocal) === JSON.stringify(merged)) {
                  return currentLocal;
                }
                try {
                  localStorage.setItem('vagou_user_appointments', JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          })
          .catch((err) => console.warn('Aviso: Sincronização de agendamentos no banco:', err));
      }
    }
  };

  const triggerLocalNotification = (apt: BookingAppointment, oldStatus: string, newStatus: string) => {
    const service = apt.serviceTitle || apt.service || 'Serviço';
    const time = apt.dateTime || '';
    
    let title = 'Status Atualizado! 🔔';
    let message = `Seu agendamento para "${service}" foi atualizado de "${oldStatus.toLowerCase()}" para "${newStatus.toLowerCase()}".`;

    if (newStatus === 'CONFIRMADO') {
      title = 'Agendamento Confirmado! 🎉';
      message = `Seu horário para "${service}" (${time}) foi confirmado com sucesso pelo estabelecimento!`;
    } else if (newStatus === 'CANCELADO') {
      title = 'Agendamento Cancelado ⚠️';
      message = `Infelizmente seu agendamento para "${service}" (${time}) foi cancelado.`;
    } else if (newStatus === 'CONCLUÍDO' || newStatus === 'CONCLUIDO') {
      title = 'Atendimento Concluído! ✨';
      message = `Obrigado! Seu atendimento de "${service}" foi concluído.`;
    }

    // 1. Mostrar o Toast interno no app
    setActiveToast({
      id: Date.now().toString(),
      title,
      message,
      type: newStatus === 'CONFIRMADO' ? 'success' : newStatus === 'CANCELADO' ? 'error' : 'info'
    });

    // Auto fechar o Toast após 5 segundos
    setTimeout(() => {
      setActiveToast((current) => {
        if (current && Date.now() - parseInt(current.id) >= 4900) {
          return null;
        }
        return current;
      });
    }, 5000);

    // 2. Chamar a API de Notificação Nativa do navegador (se disponível e autorizada)
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body: message,
          });
        } catch (e) {
          console.error('Falha ao instanciar notificação nativa:', e);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            try {
              new Notification(title, {
                body: message,
              });
            } catch (e) {
              console.error('Falha ao instanciar notificação nativa:', e);
            }
          }
        });
      }
    }

    // 3. Feedback tátil/vibratório suave
    try {
      window.navigator.vibrate?.([100, 50, 100]);
    } catch {}
  };

  // Detector de mudança de status para notificações locais
  useEffect(() => {
    if (!appointments || appointments.length === 0) return;

    try {
      // Obter o mapa de status já salvos anteriormente para comparar
      const notifiedStr = localStorage.getItem('vagou_notified_status_map') || '{}';
      const notifiedMap = JSON.parse(notifiedStr) as Record<string, string>;
      let hasChanges = false;

      appointments.forEach((apt) => {
        if (!apt.protocolCode) return;
        
        const currentStatus = apt.status || 'PENDENTE';
        const previousStatus = notifiedMap[apt.protocolCode];

        // Se o agendamento já estava registrado e o status mudou!
        if (previousStatus && previousStatus !== currentStatus) {
          triggerLocalNotification(apt, previousStatus, currentStatus);
          notifiedMap[apt.protocolCode] = currentStatus;
          hasChanges = true;
        } else if (!previousStatus) {
          // Primeira vez que vemos esse agendamento, guardamos o status silenciosamente
          notifiedMap[apt.protocolCode] = currentStatus;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem('vagou_notified_status_map', JSON.stringify(notifiedMap));
      }
    } catch (e) {
      console.error('Erro no detector de status:', e);
    }
  }, [appointments]);

  useEffect(() => {
    loadAppointments();
    initializeStoredPwaAssets();
    
    // Sincronizar perfil do usuário com o Supabase em segundo plano (Tríade Sync) sem apagar avatar local válido
    const syncUserFromSupabase = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const savedEmail = localStorage.getItem('vagou_user_email') || localStorage.getItem('vagou_active_partner') || '';
        const savedName = localStorage.getItem('vagou_user_name') || '';
        const savedCpf = localStorage.getItem('vagou_user_cpf') || '';

        if (!savedEmail && !savedName && !savedCpf) return;

        // 1. fetchUserProfileFromDb (Clients, Professionals, Auth, Profiles)
        const profile = await fetchUserProfileFromDb({ email: savedEmail, name: savedName, cpf: savedCpf });
        if (profile) {
          if (profile.name && profile.name.trim() !== '' && profile.name !== 'Profissional' && profile.name !== 'Usuário') {
            setUserName(profile.name);
            localStorage.setItem('vagou_user_name', profile.name);
          }
          if (profile.email) {
            localStorage.setItem('vagou_user_email', profile.email);
          }
          const localAvatar = localStorage.getItem('vagou_user_avatar');
          const resolvedAvatar = isValidAvatarUrlString(profile.avatarUrl)
            ? profile.avatarUrl.trim()
            : isValidAvatarUrlString(localAvatar)
              ? localAvatar.trim()
              : '';
          if (resolvedAvatar) {
            setUserAvatarUrl(resolvedAvatar);
            localStorage.setItem('vagou_user_avatar', resolvedAvatar);
          }
        }
      } catch {}
    };

    const handleProfileUpdatedEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ name?: string; avatarUrl?: string }>;
      if (customEvt?.detail) {
        if (customEvt.detail.name) {
          setUserName(customEvt.detail.name);
        }
        if (isValidAvatarUrlString(customEvt.detail.avatarUrl)) {
          setUserAvatarUrl(customEvt.detail.avatarUrl.trim());
          return;
        }
      }
      const savedAvatar = localStorage.getItem('vagou_user_avatar');
      if (isValidAvatarUrlString(savedAvatar)) {
        setUserAvatarUrl(savedAvatar.trim());
      }
      const savedName = localStorage.getItem('vagou_user_name');
      if (savedName) {
        setUserName(savedName);
      }
    };

    syncUserFromSupabase();

    // Solicitar permissão para notificações nativas no carregamento inicial
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Recarregar agendamentos quando a aba ou janela ganha foco para manter dados sincronizados
    window.addEventListener('focus', loadAppointments);
    window.addEventListener('vagou:profile-updated', handleProfileUpdatedEvent);
    window.addEventListener('storage', handleProfileUpdatedEvent);

    // Inscrição em tempo real para escutar atualizações de agendamento na nuvem Supabase
    let unsubscribeRealtime = () => {};
    if (isSupabaseConfigured) {
      const userEmail = localStorage.getItem('vagou_user_email') || '';
      unsubscribeRealtime = subscribeToAppointments({ clientEmail: userEmail }, ({ eventType, newRow }) => {
        if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
          const mapped = mapDbAppointmentToBookingAppointment(newRow);
          setAppointments((prev) => {
            const index = prev.findIndex((a) => a.protocolCode === mapped.protocolCode || (a.id && a.id === mapped.id));
            let nextList: BookingAppointment[];
            if (index >= 0) {
              const old = prev[index];
              nextList = [...prev];
              nextList[index] = mapped;
              if (old.status !== mapped.status) {
                triggerLocalNotification(mapped, old.status, mapped.status);
              }
            } else {
              nextList = [mapped, ...prev];
              triggerLocalNotification(mapped, 'PENDENTE', mapped.status);
            }
            try {
              localStorage.setItem('vagou_user_appointments', JSON.stringify(nextList));
            } catch {}
            return nextList;
          });
        }
      });
    }

    // Poll localstorage a cada 3 segundos
    const interval = setInterval(loadAppointments, 3000);

    return () => {
      window.removeEventListener('focus', loadAppointments);
      window.removeEventListener('vagou:profile-updated', handleProfileUpdatedEvent);
      window.removeEventListener('storage', handleProfileUpdatedEvent);
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, []);

  // Ponto ÚNICO soberano de garantia da linha do cliente em public.clients no login e controle de sessão
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Verificar sessão inicial no carregamento preservando login SSO via admvapp
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const uMeta = session.user.user_metadata;
          const uEmail = session.user.email;
          const nameToSet = uMeta?.full_name || uMeta?.name || uEmail?.split('@')[0] || 'Usuário';
          setUserName(nameToSet);
          localStorage.setItem('vagou_user_name', nameToSet);
          if (session.user.id) localStorage.setItem('vagou_auth_user_id', session.user.id);
          if (uEmail) {
            localStorage.setItem('vagou_user_email', uEmail);
            localStorage.setItem('vagou_active_partner', uEmail);
          }
          if (uMeta?.cpf) {
            localStorage.setItem('vagou_user_cpf', String(uMeta.cpf).replace(/\D/g, ''));
          }
          const savedAvatar = localStorage.getItem('vagou_user_avatar');
          if (isValidAvatarUrlString(savedAvatar)) {
            setUserAvatarUrl(savedAvatar.trim());
          }
        } else {
          // Se não há token no domínio local, verifica se há login SSO ou perfil local ativo
          const ssoEmail = localStorage.getItem('vagou_user_email') || localStorage.getItem('vagou_active_partner');
          const ssoName = localStorage.getItem('vagou_user_name');
          const ssoCpf = localStorage.getItem('vagou_user_cpf');
          const ssoAvatar = localStorage.getItem('vagou_user_avatar');
          if (ssoEmail || ssoName || ssoCpf || isValidAvatarUrlString(ssoAvatar)) {
            if (ssoName) setUserName(ssoName);
            if (isValidAvatarUrlString(ssoAvatar)) setUserAvatarUrl(ssoAvatar.trim());
          } else {
            setUserName('');
            setUserAvatarUrl('');
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar sessão inicial:', err);
      }
    };

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const uid = session.user.id;
        const uEmail = session.user.email;
        const uMeta = session.user.user_metadata;
        const nameToSet = uMeta?.full_name || uMeta?.name || uEmail?.split('@')[0] || 'Usuário';

        setUserName(nameToSet);
        localStorage.setItem('vagou_auth_user_id', uid);
        localStorage.setItem('vagou_user_name', nameToSet);
        if (uEmail) {
          localStorage.setItem('vagou_user_email', uEmail);
          localStorage.setItem('vagou_active_partner', uEmail);
        }
        if (uMeta?.cpf) {
          localStorage.setItem('vagou_user_cpf', String(uMeta.cpf).replace(/\D/g, ''));
        }

        setTimeout(() => {
          ensureClientRow(uid, uEmail, uMeta).catch((e) => console.warn('Erro em ensureClientRow:', e));
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUserName('');
        setUserAvatarUrl('');
        try {
          localStorage.removeItem('vagou_auth_user_id');
          localStorage.removeItem('vagou_client_id');
          localStorage.removeItem('vagou_client_session');
          localStorage.removeItem('vagou_user_name');
          localStorage.removeItem('vagou_user_email');
          localStorage.removeItem('vagou_user_cpf');
          localStorage.removeItem('vagou_user_phone');
          localStorage.removeItem('vagou_user_avatar');
          localStorage.removeItem('vagou_active_partner');
          localStorage.removeItem('vagou_user_appointments');
        } catch {}
      }
    });

    const handleCustomAuthUpdated = () => {
      try {
        const savedName = localStorage.getItem('vagou_user_name') || '';
        const savedAvatar = localStorage.getItem('vagou_user_avatar') || '';
        setUserName(savedName);
        setUserAvatarUrl(isValidAvatarUrlString(savedAvatar) ? savedAvatar.trim() : '');
      } catch {
        setUserName('');
        setUserAvatarUrl('');
      }
    };
    window.addEventListener('vagou:auth-updated', handleCustomAuthUpdated);

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener('vagou:auth-updated', handleCustomAuthUpdated);
    };
  }, []);

  useEffect(() => {
    const handleLiveAptUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ appointment?: BookingAppointment }>;
      const updated = customEvt.detail?.appointment;
      if (!updated) return;
      setAppointments((prev) =>
        prev.map((a) =>
          a.protocolCode === updated.protocolCode || (a.id && a.id === updated.id)
            ? { ...a, ...updated }
            : a
        )
      );
    };
    window.addEventListener('vagou:appointments-updated', handleLiveAptUpdate);
    return () => window.removeEventListener('vagou:appointments-updated', handleLiveAptUpdate);
  }, []);

  const handleNavigateToAgenda = () => {
    loadAppointments();
    setViewMode('agenda');
  };

  const handleCancelAppointment = async (protocolCode: string, reason?: string) => {
    try {
      if (isSupabaseConfigured) {
        const res = await cancelAppointmentInDb(protocolCode, reason);
        if (!res.success && res.error) {
          console.warn('Aviso: Cancelamento no banco de dados:', res.error);
        }
      }

      const saved = localStorage.getItem('vagou_user_appointments');
      if (saved) {
        const list: BookingAppointment[] = JSON.parse(saved);
        const updated = list.map((apt) => {
          if (apt.protocolCode === protocolCode) {
            return {
              ...apt,
              status: 'CANCELADO',
              tracking_status: 'cancelled' as const,
              ...(reason ? { cancellation_reason: reason } : {}),
            };
          }
          return apt;
        });
        localStorage.setItem('vagou_user_appointments', JSON.stringify(updated));
        setAppointments(updated);
      }

      setActiveToast({
        id: String(Date.now()),
        title: 'Agendamento Cancelado',
        message: reason
          ? `O agendamento ${protocolCode} foi cancelado (Motivo: ${reason}).`
          : `O agendamento ${protocolCode} foi cancelado com sucesso.`,
        type: 'info',
      });
    } catch (e) {
      console.error('Erro ao cancelar agendamento:', e);
      setActiveToast({
        id: String(Date.now()),
        title: 'Falha no Cancelamento',
        message: 'Não foi possível cancelar o agendamento no momento.',
        type: 'error',
      });
    }
  };

  useEffect(() => {
    applyAccentColorToDom(accentColor);
  }, [accentColor]);

  // Validação Inicial de Subdomínio Wildcard (*.vagouapp.com) e Validação Soberana de Papel (RBAC)
  useEffect(() => {
    async function validateSubdomainAndSession() {
      try {
        const sub = detectActiveSubdomain();

        if (sub) {
          setCurrentSubdomain(sub);
          if (isSupabaseConfigured && supabase) {
            const { data: salon, error: salonErr } = await (supabase.from('salons') as any)
              .select('*')
              .eq('slug', sub)
              .eq('is_active', true)
              .maybeSingle();

            if (salonErr || !salon) {
              if (salonErr) console.warn('Erro ao validar subdomínio:', salonErr.message);
              setIsNotFound(true);
              setIsValidatingSubdomain(false);
              return;
            }

            // ✅ ENCONTRADO: Armazena os dados iniciais completos e define o nome do salão ativo
            setInitialSalonData(salon);
            const displayName = salon.trade_name || sub;
            setSalonName(displayName);
            localStorage.setItem('vagou_salon_db_id', salon.id);
            localStorage.setItem('vagou_salon_name', displayName);
            localStorage.setItem('vagou_salon_slug', salon.slug || sub);

            const resolvedColor = salon.primary_color || salon.branding?.primaryColor;
            if (resolvedColor) {
              localStorage.setItem('vagou_accent_color', resolvedColor);
              applyAccentColorToDom(resolvedColor);
            }
          }
        } else {
          // Ambiente sem subdomínio wildcard (Preview / Localhost / Dev): resolve salão ativo para garantir persistência de CRUD
          if (isSupabaseConfigured) {
            const cachedSlug = localStorage.getItem('vagou_salon_slug') || '';
            const cachedDbId = localStorage.getItem('vagou_salon_db_id') || '';
            const userEmail = localStorage.getItem('vagou_user_email') || '';

            const resolvedSalon = await ensureSalonRow({
              id: cachedDbId || undefined,
              slug: cachedSlug || undefined,
              email: userEmail || undefined,
              tradeName: salonName || 'Meu Estabelecimento',
            });

            if (resolvedSalon) {
              setInitialSalonData(resolvedSalon);
              const displayName = resolvedSalon.trade_name || salonName || 'Meu Estabelecimento';
              setSalonName(displayName);
              localStorage.setItem('vagou_salon_db_id', resolvedSalon.id);
              localStorage.setItem('vagou_salon_name', displayName);
              localStorage.setItem('vagou_salon_slug', resolvedSalon.slug);

              const resolvedColor = resolvedSalon.primary_color || resolvedSalon.branding?.primaryColor;
              if (resolvedColor) {
                localStorage.setItem('vagou_accent_color', resolvedColor);
                applyAccentColorToDom(resolvedColor);
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro ao validar subdomínio:', err);
      } finally {
        setIsValidatingSubdomain(false);
      }
    }

    validateSubdomainAndSession();
  }, []);

  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vagou_is_favorite') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleFavorite = () => {
    setIsFavorite((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vagou_is_favorite', String(next));
      } catch {}
      return next;
    });
  };

  // ⏳ Enquanto valida o subdomínio no Supabase, exibe tela limpa Dark Theme com spinner sutil em #20C933 (Zero FOUC)
  if (isValidatingSubdomain) {
    return (
      <div className="w-full h-dvh flex items-center justify-center bg-slate-950 font-['Poppins']">
        <Loader2 className="w-7 h-7 animate-spin text-[#20C933]" />
      </div>
    );
  }

  // 🛑 Se o subdomínio não foi encontrado no Supabase (status !== 'active')
  if (isNotFound) {
    return <SalonNotFoundScreen subdomain={currentSubdomain} />;
  }

  return (
    <div className={`w-full h-full h-dvh flex items-center justify-center overflow-hidden font-['Poppins'] ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-200/80 text-slate-900'
    }`}>
      {/* Contêiner Mobile do Aplicativo (Enquadramento PWA Nativo Mobile-First no Desktop) */}
      <section 
        aria-label="Aplicativo Vagou"
        className={`w-full max-w-md h-full flex flex-col relative overflow-hidden sm:shadow-2xl sm:border-x ${
          isDark ? 'bg-[#151A1E] sm:border-slate-800/80' : 'bg-slate-50 sm:border-slate-200'
        }`}
      >
        {/* Toast Notificação de Status */}
        {activeToast && (
          <aside 
            role="status" 
            aria-live="polite"
            className={`absolute top-4 left-4 right-4 z-[9999] pointer-events-auto p-3.5 rounded-[4px] border shadow-2xl flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-top-4 duration-300 ${
              activeToast.type === 'success'
                ? isDark ? 'bg-emerald-950/95 border-emerald-500/40 text-white shadow-emerald-900/10' : 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : activeToast.type === 'error'
                  ? isDark ? 'bg-rose-950/95 border-rose-500/40 text-white shadow-rose-900/10' : 'bg-rose-50/95 border-rose-200 text-rose-900'
                  : isDark ? 'bg-slate-900/95 border-slate-700/50 text-white' : 'bg-slate-100/95 border-slate-200 text-slate-900'
            }`}
          >
            <article className="flex-1 min-w-0">
              <header className="text-xs font-black tracking-tight font-['Poppins'] flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                  activeToast.type === 'success' ? 'bg-emerald-400' : activeToast.type === 'error' ? 'bg-rose-400' : 'bg-amber-400'
                }`} />
                {activeToast.title}
              </header>
              <p className="text-[11px] leading-snug mt-1 opacity-90 font-medium">
                {activeToast.message}
              </p>
            </article>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className={`text-[10px] uppercase font-bold shrink-0 cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Fechar
            </button>
          </aside>
        )}

        {/* Contêiner Principal da Página do Estabelecimento */}
        <main className="flex-1 w-full min-h-0 overflow-hidden relative flex flex-col">
          {viewMode === 'auth' ? (
            <PartnerAuthView
              salonName={initialSalonData?.trade_name || salonName}
              salonSlug={initialSalonData?.slug || currentSubdomain || ''}
              salonLogo={
                isDark
                  ? initialSalonData?.logo_dark_url || initialSalonData?.logo_url || ''
                  : initialSalonData?.logo_light_url || initialSalonData?.logo_url || ''
              }
              primaryColor={initialSalonData?.primary_color || initialSalonData?.branding?.primaryColor || '#20C933'}
              onSuccess={(partnerData?: PartnerAuthSuccessData) => {
                if (partnerData?.salonName) {
                  setSalonName(partnerData.salonName);
                }
                const currentName = localStorage.getItem('vagou_user_name');
                if (currentName) {
                  setUserName(currentName);
                }
                setViewMode('salon');
              }}
              onBack={() => setViewMode('salon')}
            />
          ) : viewMode === 'salon' ? (
            <SalonProfileView
              key={currentSubdomain || 'salon-profile'}
              salonName={salonName}
              activeSubdomain={currentSubdomain}
              initialSalonData={initialSalonData}
              userRole={effectiveRole}
              offers={offers}
              onDirectBook={(_offer) => {
                // Booking callback
              }}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              userName={userName}
              userAvatarUrl={userAvatarUrl}
              onNavigateToUserAppointments={handleNavigateToAgenda}
              onNavigateToUserDashboard={() => setViewMode('dashboard')}
              onBackToAuth={() => setViewMode('auth')}
            />
          ) : viewMode === 'agenda' ? (
            <UserAppointmentsView
              appointments={appointments}
              onBack={() => setViewMode('salon')}
              onCancelAppointment={handleCancelAppointment}
              onUpdateAppointments={(updatedList) => {
                setAppointments(updatedList);
                try {
                  localStorage.setItem('vagou_user_appointments', JSON.stringify(updatedList));
                } catch {}
              }}
              onRescheduleAppointment={() => {
                setViewMode('salon');
                setActiveToast({
                  id: String(Date.now()),
                  title: 'Remanejamento de Horário',
                  message: 'Escolha o novo horário desejado na grade de vagas do estabelecimento.',
                  type: 'info',
                });
              }}
            />
          ) : (
            <UserDashboard
              onBack={() => setViewMode('salon')}
              onUpdateProfile={(newName, newAvatar) => {
                if (newName) setUserName(newName);
                if (isValidAvatarUrlString(newAvatar)) {
                  setUserAvatarUrl(newAvatar.trim());
                  try {
                    localStorage.setItem('vagou_user_avatar', newAvatar.trim());
                  } catch {}
                } else if (newAvatar === '') {
                  setUserAvatarUrl('');
                }
              }}
            />
          )}
        </main>
      </section>
    </div>
  );
};

export default App;
