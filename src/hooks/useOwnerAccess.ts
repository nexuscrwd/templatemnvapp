import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, checkUserSalonMembership } from '../lib/supabase';
import { SalonAdminSettings } from '../types';

export interface OwnerAccessParams {
  salonId?: string;
  salonSlug?: string;
  initialSalonData?: any;
  adminSettings?: SalonAdminSettings;
  userRoleProp?: string;
}

export interface OwnerAccessResult {
  isOwner: boolean;
  isManagerOrPro: boolean;
  role: 'owner' | 'manager' | 'professional' | 'cliente' | 'guest' | 'loading';
  isLoading: boolean;
  matchedBy: 'email' | 'owner_cpf' | 'owner_id' | 'salon_members' | 'role_prop' | null;
  userEmail: string;
  userCpf: string;
  refreshOwnerAccess: () => Promise<void>;
}

function cleanCpfDigits(val?: string | null): string {
  return (val || '').replace(/\D/g, '');
}

function readLocalAuthState(): { userId: string; email: string; cpf: string; isSuperadmin: boolean } {
  if (typeof window === 'undefined') {
    return { userId: '', email: '', cpf: '', isSuperadmin: false };
  }
  try {
    let clientSession: any = null;
    const rawClientSession = localStorage.getItem('vagou_client_session');
    if (rawClientSession) {
      try {
        clientSession = JSON.parse(rawClientSession);
      } catch {}
    }

    const isSuperadmin =
      localStorage.getItem('vagou_is_superadmin') === 'true' ||
      Boolean(clientSession?.isSuperadmin) ||
      String(clientSession?.accessLevel || '').toLowerCase().includes('superadmin') ||
      String(clientSession?.role || '').toLowerCase() === 'superadmin';

    const userId = (
      localStorage.getItem('vagou_auth_user_id') ||
      clientSession?.id ||
      clientSession?.userId ||
      ''
    ).trim();

    const email = (
      localStorage.getItem('vagou_user_email') ||
      localStorage.getItem('vagou_active_partner') ||
      clientSession?.email ||
      clientSession?.username ||
      ''
    ).trim().toLowerCase();

    const cpf = cleanCpfDigits(
      localStorage.getItem('vagou_user_cpf') ||
      clientSession?.cpf ||
      ''
    );

    return { userId, email, cpf, isSuperadmin };
  } catch {
    return { userId: '', email: '', cpf: '', isSuperadmin: false };
  }
}

export function useOwnerAccess({
  salonId,
  salonSlug,
  initialSalonData,
  adminSettings,
  userRoleProp,
}: OwnerAccessParams): OwnerAccessResult {
  const [isOwner, setIsOwner] = useState<boolean>(() => {
    const local = readLocalAuthState();
    return local.isSuperadmin || userRoleProp === 'owner' || userRoleProp === 'admin';
  });
  const [isManagerOrPro, setIsManagerOrPro] = useState<boolean>(() => {
    const local = readLocalAuthState();
    return (
      local.isSuperadmin ||
      userRoleProp === 'owner' ||
      userRoleProp === 'admin' ||
      userRoleProp === 'manager' ||
      userRoleProp === 'professional'
    );
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [matchedBy, setMatchedBy] = useState<OwnerAccessResult['matchedBy']>(
    userRoleProp === 'owner' || userRoleProp === 'admin' ? 'role_prop' : null
  );
  const [userEmail, setUserEmail] = useState<string>(() => readLocalAuthState().email);
  const [userCpf, setUserCpf] = useState<string>(() => readLocalAuthState().cpf);

  const verifyAccess = useCallback(async () => {
    try {
      const localAuth = readLocalAuthState();
      let resolvedId = localAuth.userId;
      let resolvedEmail = localAuth.email;
      let resolvedCpf = localAuth.cpf;

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            if (session.user.id) resolvedId = session.user.id;
            if (session.user.email) resolvedEmail = session.user.email.trim().toLowerCase();
            const metaCpf = cleanCpfDigits(
              session.user.user_metadata?.cpf || session.user.user_metadata?.document_number
            );
            if (metaCpf.length === 11) resolvedCpf = metaCpf;
          }
        } catch {}
      }

      setUserEmail(resolvedEmail);
      setUserCpf(resolvedCpf);

      // 0. Soberania Absoluta para Superadmin Master (Criador do Sistema / Admin Master)
      if (localAuth.isSuperadmin) {
        setIsOwner(true);
        setIsManagerOrPro(true);
        setMatchedBy('salon_members');
        setIsLoading(false);
        return;
      }

      if (!resolvedEmail && !resolvedId && !resolvedCpf) {
        setIsOwner(false);
        setIsManagerOrPro(false);
        setMatchedBy(null);
        setIsLoading(false);
        return;
      }

      // 1. Verificação síncrona contra os dados do salão já carregados em memória (initialSalonData / adminSettings)
      const knownSalonEmails = [
        initialSalonData?.email,
        initialSalonData?.branding?.ownerEmail,
        initialSalonData?.branding?.legalManagerEmail,
        initialSalonData?.branding?.email,
        adminSettings?.email,
        adminSettings?.legalManagerEmail,
      ]
        .filter(Boolean)
        .map((e: string) => String(e).trim().toLowerCase());

      const knownSalonOwnerCpfs = [
        initialSalonData?.owner_cpf,
        initialSalonData?.branding?.ownerCpf,
        initialSalonData?.branding?.legalManagerCpf,
        adminSettings?.ownerCpf,
        adminSettings?.legalManagerCpf,
      ]
        .map((c) => cleanCpfDigits(c))
        .filter((c) => c.length === 11);

      const knownSalonOwnerId = initialSalonData?.owner_id ? String(initialSalonData.owner_id).trim() : '';

      if (resolvedId && knownSalonOwnerId && resolvedId === knownSalonOwnerId) {
        setIsOwner(true);
        setIsManagerOrPro(true);
        setMatchedBy('owner_id');
        setIsLoading(false);
        return;
      }

      if (resolvedEmail && knownSalonEmails.includes(resolvedEmail)) {
        setIsOwner(true);
        setIsManagerOrPro(true);
        setMatchedBy('email');
        setIsLoading(false);
        return;
      }

      if (resolvedCpf && resolvedCpf.length === 11 && knownSalonOwnerCpfs.includes(resolvedCpf)) {
        setIsOwner(true);
        setIsManagerOrPro(true);
        setMatchedBy('owner_cpf');
        setIsLoading(false);
        return;
      }

      // 2. Verificação profunda no Supabase (public.salons, public.clients.cpf e public.salon_members)
      const targetIdentifier =
        salonId ||
        initialSalonData?.id ||
        salonSlug ||
        initialSalonData?.slug ||
        adminSettings?.salonSlug ||
        (typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_slug') || localStorage.getItem('vagou_salon_db_id') || '' : '');

      if (isSupabaseConfigured && supabase && targetIdentifier) {
        const membership = await checkUserSalonMembership(
          resolvedId,
          targetIdentifier,
          resolvedEmail,
          resolvedCpf
        );

        const dbRole = typeof membership === 'object' ? membership?.role : membership;

        if (dbRole === 'owner') {
          setIsOwner(true);
          setIsManagerOrPro(true);
          setMatchedBy('salon_members');
          setIsLoading(false);
          return;
        }

        if (dbRole === 'manager' || dbRole === 'professional') {
          setIsOwner(false);
          setIsManagerOrPro(true);
          setMatchedBy('salon_members');
          setIsLoading(false);
          return;
        }
      }

      // 3. Fallback pela prop userRole caso validada pelo useSalonRole no App.tsx
      if (userRoleProp === 'owner' || userRoleProp === 'admin') {
        setIsOwner(true);
        setIsManagerOrPro(true);
        setMatchedBy('role_prop');
        setIsLoading(false);
        return;
      }

      if (userRoleProp === 'manager' || userRoleProp === 'professional') {
        setIsOwner(false);
        setIsManagerOrPro(true);
        setMatchedBy('role_prop');
        setIsLoading(false);
        return;
      }

      setIsOwner(false);
      setIsManagerOrPro(false);
      setMatchedBy(null);
    } catch (err) {
      console.warn('Erro em useOwnerAccess:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    salonId,
    salonSlug,
    initialSalonData,
    adminSettings?.email,
    adminSettings?.legalManagerEmail,
    adminSettings?.ownerCpf,
    adminSettings?.legalManagerCpf,
    adminSettings?.salonSlug,
    userRoleProp,
  ]);

  useEffect(() => {
    verifyAccess();

    const handleAuthUpdated = () => {
      verifyAccess();
    };

    window.addEventListener('vagou:auth-updated', handleAuthUpdated);
    window.addEventListener('storage', handleAuthUpdated);

    let sub: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(() => {
        verifyAccess();
      });
      sub = data.subscription;
    }

    return () => {
      window.removeEventListener('vagou:auth-updated', handleAuthUpdated);
      window.removeEventListener('storage', handleAuthUpdated);
      sub?.unsubscribe();
    };
  }, [verifyAccess]);

  const resolvedRole: OwnerAccessResult['role'] = isLoading
    ? 'loading'
    : isOwner
    ? 'owner'
    : isManagerOrPro
    ? 'manager'
    : userEmail || userCpf
    ? 'cliente'
    : 'guest';

  return {
    isOwner,
    isManagerOrPro,
    role: resolvedRole,
    isLoading,
    matchedBy,
    userEmail,
    userCpf,
    refreshOwnerAccess: verifyAccess,
  };
}
