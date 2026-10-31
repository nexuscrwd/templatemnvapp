import React from 'react';
import {
  supabase,
  checkUserSalonMembership,
  ensureClientRow,
} from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { TriadeUserAuthCard, UserAuthMode } from './auth/TriadeUserAuthCard';
import { TriadeUserLoginPayload } from './auth/TriadeUserLoginForm';
import { TriadeUserData } from './auth/TriadeUserRegisterForm';

export interface SalonClientAuthUser {
  id?: string;
  name: string;
  phone: string;
  email: string;
}

interface SalonClientAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  salonSlug?: string;
  salonLogo?: string;
  salonLogoLight?: string;
  salonLogoDark?: string;
  primaryColor?: string;
  secondaryColor?: string;
  themeMode?: 'light' | 'dark';
  initialMode?: 'login' | 'register';
  onAuthenticated: (user: SalonClientAuthUser, role?: 'pro' | 'cliente') => void;
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const SalonClientAuthModal: React.FC<SalonClientAuthModalProps> = ({
  isOpen,
  onClose,
  salonName,
  salonSlug,
  salonLogo,
  salonLogoLight,
  salonLogoDark,
  primaryColor,
  themeMode,
  initialMode = 'login',
  onAuthenticated,
}) => {
  const { theme } = useTheme();
  const resolvedTheme: 'light' | 'dark' = themeMode || theme || 'dark';
  const isDark = resolvedTheme === 'dark';
  const pendingAuthCallbackRef = React.useRef<{
    user: SalonClientAuthUser;
    role: 'pro' | 'cliente';
  } | null>(null);

  const handleCloseModal = () => {
    hapticLight();
    try {
      sessionStorage.removeItem('vagou_client_auth_modal_open');
      sessionStorage.removeItem('vagou_client_auth_modal_mode');
      sessionStorage.removeItem('vagou_register_wizard_draft');
    } catch {}
    if (pendingAuthCallbackRef.current) {
      const pending = pendingAuthCallbackRef.current;
      pendingAuthCallbackRef.current = null;
      onAuthenticated(pending.user, pending.role);
    }
    onClose();
  };

  const resolvedPrimaryColor =
    primaryColor ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_accent_color') : null) ||
    '#20C933';

  const rawLogo = (
    salonLogo ||
    (isDark ? salonLogoDark : salonLogoLight) ||
    salonLogoDark ||
    salonLogoLight ||
    (typeof window !== 'undefined'
      ? (isDark
          ? localStorage.getItem('vagou_salon_logo_dark') || localStorage.getItem('vagou_salon_logo_light')
          : localStorage.getItem('vagou_salon_logo_light') || localStorage.getItem('vagou_salon_logo_dark')) ||
        localStorage.getItem('vagou_salon_icon') ||
        ''
      : '') ||
    ''
  ).trim();

  const resolvedSalonName =
    salonName ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_name') || '' : '') ||
    'Meu Estabelecimento';

  const currentSlug =
    salonSlug ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_slug') || '' : '');

  if (!isOpen) return null;

  const finalizeAuthentication = async (
    userId: string,
    emailOrUsername: string,
    fallbackName?: string,
    fallbackPhone?: string,
    fallbackCpf?: string,
    userMeta?: Record<string, any>,
    existingAccountRow?: any,
    keepModalOpen = false
  ) => {
    const isSuperadmin = Boolean(
      existingAccountRow?.isSuperadmin ||
      existingAccountRow?.sourceTable === 'system_admins' ||
      userMeta?.isSuperadmin ||
      String(existingAccountRow?.access_level || '').toLowerCase().includes('superadmin') ||
      String(existingAccountRow?.role || '').toLowerCase() === 'superadmin'
    );

    let clientRow: any =
      existingAccountRow?.sourceTable === 'clients' || (!existingAccountRow?.sourceTable && existingAccountRow?.id)
        ? existingAccountRow
        : null;

    if (!clientRow && supabase) {
      try {
        const candidateEmail = existingAccountRow?.email || (isValidEmailAddress(emailOrUsername) ? emailOrUsername : '');
        const candidateUsername = existingAccountRow?.username || (!isValidEmailAddress(emailOrUsername) ? emailOrUsername : '');
        if (candidateEmail) {
          const { data: cByEmail } = await (supabase.from('clients') as any)
            .select('*')
            .ilike('email', candidateEmail)
            .limit(1)
            .maybeSingle();
          if (cByEmail) clientRow = cByEmail;
        }
        if (!clientRow && candidateUsername) {
          const { data: cByUser } = await (supabase.from('clients') as any)
            .select('*')
            .ilike('username', candidateUsername)
            .limit(1)
            .maybeSingle();
          if (cByUser) clientRow = cByUser;
        }
      } catch {}
    }

    if (!clientRow) {
      const ensured = await ensureClientRow(
        userId,
        isValidEmailAddress(emailOrUsername) ? emailOrUsername : (existingAccountRow?.email || null),
        {
          full_name: fallbackName || existingAccountRow?.name || userMeta?.full_name || userMeta?.name,
          phone: fallbackPhone || existingAccountRow?.phone || userMeta?.phone,
          cpf: fallbackCpf || existingAccountRow?.cpf || userMeta?.cpf,
          username:
            existingAccountRow?.username ||
            userMeta?.username ||
            (!isValidEmailAddress(emailOrUsername) ? emailOrUsername : undefined),
          password_hash: existingAccountRow?.password_hash || userMeta?.password_hash,
        }
      );
      clientRow = ensured.client;
    }

    const effectiveUserId = String(
      userId || existingAccountRow?.id || clientRow?.user_id || clientRow?.id || ''
    ).trim();
    const effectiveClientId = String(clientRow?.id || effectiveUserId).trim();
    const cleanCpf = (
      fallbackCpf ||
      existingAccountRow?.cpf ||
      clientRow?.cpf ||
      userMeta?.cpf ||
      ''
    ).replace(/\D/g, '');
    const effectiveIdentity = (
      existingAccountRow?.email ||
      clientRow?.email ||
      emailOrUsername ||
      existingAccountRow?.username ||
      clientRow?.username ||
      ''
    ).trim();
    const effectiveUsername = (
      existingAccountRow?.username ||
      clientRow?.username ||
      effectiveIdentity
    ).trim();

    try {
      if (isSuperadmin) {
        localStorage.setItem('vagou_is_superadmin', 'true');
      } else {
        localStorage.removeItem('vagou_is_superadmin');
      }
    } catch {}

    const membership = await checkUserSalonMembership(
      effectiveUserId,
      currentSlug,
      effectiveIdentity,
      cleanCpf
    );

    const resolvedName =
      fallbackName ||
      existingAccountRow?.name ||
      clientRow?.name ||
      existingAccountRow?.username ||
      clientRow?.username ||
      userMeta?.full_name ||
      userMeta?.name ||
      (effectiveIdentity ? effectiveIdentity.split('@')[0] : 'Usuário');

    const resolvedPhone =
      fallbackPhone || existingAccountRow?.phone || clientRow?.phone || userMeta?.phone || '';

    const resolvedAvatar =
      existingAccountRow?.avatar_url || clientRow?.avatar_url || userMeta?.avatar_url || '';

    const finalIsSuperadmin =
      isSuperadmin || (membership.role === 'owner' && existingAccountRow?.sourceTable === 'system_admins');

    try {
      if (effectiveUserId) localStorage.setItem('vagou_auth_user_id', effectiveUserId);
      if (effectiveClientId) localStorage.setItem('vagou_client_id', effectiveClientId);
      if (resolvedName) localStorage.setItem('vagou_user_name', resolvedName);
      if (effectiveIdentity) {
        localStorage.setItem('vagou_user_email', effectiveIdentity);
        localStorage.setItem('vagou_active_partner', effectiveIdentity);
      }
      if (cleanCpf) localStorage.setItem('vagou_user_cpf', cleanCpf);
      if (resolvedPhone) localStorage.setItem('vagou_user_phone', resolvedPhone);
      if (resolvedAvatar && !resolvedAvatar.includes('unsplash.com')) {
        localStorage.setItem('vagou_user_avatar', resolvedAvatar);
      }
      localStorage.setItem(
        'vagou_user_role',
        finalIsSuperadmin ? 'superadmin' : membership.role
      );
      localStorage.setItem(
        'vagou_client_session',
        JSON.stringify({
          id: effectiveUserId || effectiveClientId,
          clientId: effectiveClientId || effectiveUserId,
          name: resolvedName,
          email: effectiveIdentity,
          username: effectiveUsername,
          phone: resolvedPhone,
          cpf: cleanCpf,
          role: finalIsSuperadmin ? 'superadmin' : membership.role,
          accessLevel: finalIsSuperadmin
            ? 'Superadmin Master'
            : existingAccountRow?.access_level || clientRow?.access_level || membership.role,
          isSuperadmin: finalIsSuperadmin,
        })
      );
    } catch {}

    const mappedRole: 'pro' | 'cliente' =
      finalIsSuperadmin || membership.isMember ? 'pro' : 'cliente';

    window.dispatchEvent(
      new CustomEvent('vagou:auth-updated', {
        detail: {
          userId: effectiveUserId,
          email: effectiveIdentity,
          cpf: cleanCpf,
          name: resolvedName,
          accountType: finalIsSuperadmin ? 'owner' : membership.role,
          isSuperadmin: finalIsSuperadmin,
        },
      })
    );

    hapticSuccess();
    const authUserObj: SalonClientAuthUser = {
      id: effectiveClientId || effectiveUserId,
      name: resolvedName,
      phone: resolvedPhone,
      email: effectiveIdentity,
    };

    if (keepModalOpen) {
      pendingAuthCallbackRef.current = { user: authUserObj, role: mappedRole };
    } else {
      pendingAuthCallbackRef.current = null;
      try {
        sessionStorage.removeItem('vagou_client_auth_modal_open');
        sessionStorage.removeItem('vagou_client_auth_modal_mode');
        sessionStorage.removeItem('vagou_register_wizard_draft');
      } catch {}
      onAuthenticated(authUserObj, mappedRole);
      onClose();
    }
  };

  const handleAuthSuccess = async (result: {
    mode: UserAuthMode;
    data: TriadeUserLoginPayload | TriadeUserData;
    keepModalOpen?: boolean;
  }) => {
    const payload = result.data as any;
    const userId = String(payload.id || '').trim();
    const identity = String(
      payload.email || payload.username || payload.identifier || ''
    ).trim();

    await finalizeAuthentication(
      userId,
      identity,
      payload.name,
      payload.phone,
      payload.cpf,
      {
        full_name: payload.name,
        name: payload.name,
        phone: payload.phone,
        cpf: payload.cpf,
        username: payload.username,
        avatar_url: payload.avatarUrl,
        password_hash: payload.passwordHash,
        isSuperadmin: payload.accountType === 'owner',
      },
      payload.matchedAccount,
      Boolean(result.keepModalOpen)
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 font-['Poppins']"
    >
      <div
        className="w-full max-w-md my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <TriadeUserAuthCard
          initialMode={initialMode}
          origin="establishment"
          salonName={resolvedSalonName}
          salonLogoUrl={rawLogo || undefined}
          salonAccentColor={resolvedPrimaryColor}
          onClose={handleCloseModal}
          onSuccess={handleAuthSuccess}
        />
      </div>
    </div>
  );
};
