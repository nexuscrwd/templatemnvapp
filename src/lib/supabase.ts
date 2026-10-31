import { createClient, User } from '@supabase/supabase-js';
import type { Database, AppointmentStatus, OfferStatus } from '../types/database.types';
import type { BookingAppointment } from '../types';

const DEFAULT_SUPABASE_URL = 'https://xemenxdhuoekytyhmgyt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbWVueGRodW9la3l0eWhtZ3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMDE2MzAsImV4cCI6MjEwNTc3NzYzMH0.P-q6bQspwuQNhub08hjWmsjLrugr3CVA1NIdznWJxuo';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env) || {};
const rawEnvUrl = (env as any).VITE_SUPABASE_URL;
const supabaseUrl = (rawEnvUrl && String(rawEnvUrl).startsWith('https://') && rawEnvUrl !== 'https://your-project-id.supabase.co')
  ? String(rawEnvUrl)
  : DEFAULT_SUPABASE_URL;
const rawEnvKey = (env as any).VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = (rawEnvKey && String(rawEnvKey).length > 20 && rawEnvKey !== 'your-anon-key-here')
  ? String(rawEnvKey)
  : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl !== 'https://your-project-id.supabase.co'
);

// Instância oficial do cliente Supabase tipado
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Cliente Supabase com privilégios de Service Role (Bypassa RLS no navegador / cliente)
const serviceRoleKey =
  (typeof process !== 'undefined' && (process.env as any)?.SUPABASE_SERVICE_ROLE_KEY) ||
  (env as any).VITE_SUPABASE_SERVICE_ROLE_KEY ||
  (env as any).service_role ||
  '';

export const supabaseAdmin = (supabaseUrl && serviceRoleKey && serviceRoleKey.length > 20)
  ? createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  : supabase;

export const getDbClient = () => supabaseAdmin || supabase;

/**
 * Autenticação via Google OAuth no Supabase (compatível com Iframe e Popup)
 */
export async function signInWithGoogle(customRedirectTo?: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  const redirectUrl = customRedirectTo || (typeof window !== 'undefined' ? window.location.origin : '');

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      return { data: null, error };
    }

    if (data?.url && typeof window !== 'undefined') {
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Se popup foi bloqueado pelo navegador, redireciona em nova aba
        window.open(data.url, '_blank');
      }
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Desconectar do Supabase
 */
export async function signOutFromSupabase() {
  if (!supabase) return { error: null };
  return await supabase.auth.signOut();
}

/**
 * Autenticação via Email/Usuário e Senha com Supabase
 */
export async function signInWithSupabase(userOrEmail: string, password: string) {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase não conectado') };
  }

  const cleanEmail = userOrEmail.trim().toLowerCase();
  if (!cleanEmail.includes('@')) {
    return { data: null, error: new Error('Informe um endereço de e-mail válido.') };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password.trim(),
    });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export interface UnifiedLoginResult {
  success: boolean;
  user?: User;
  salonData?: any;
  professionalData?: any;
  clientData?: any;
  persona: 'pro' | 'cliente';
  role: 'pro' | 'cliente' | 'admin';
  userName: string;
  userEmail: string;
  userPhone?: string;
  userAvatarUrl?: string;
  salonName?: string;
  salonSlug?: string;
  errorMessage?: string;
}

/**
 * Verificação Soberana de Papel e Vínculo com Estabelecimento (RBAC)
 * Regra Inegociável: Consulta salon_members estritamente por user_id E pelo salão do targetSalonSlug.
 * Sem usar owner_id, e-mail ou ilike. Retorna 'cliente' quando não houver vínculo naquele salão específico.
 */
export function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Verificação Soberana Multi-Camada de Papel e Vínculo com Estabelecimento (RBAC)
 * Autenticação 100% nativa local integrada ao Supabase:
 * Camada 1: Vínculo direto de Titular/Dono em public.salons (owner_id, email, owner_cpf, branding)
 * Camada 2: Vínculo formal em public.salon_members (user_id + salon_id)
 * Camada 3: Vínculo de equipe em public.professionals (salon_id + email)
 */
export async function checkUserSalonMembership(
  userId: string,
  salonIdentifier?: string,
  userEmail?: string,
  userCpf?: string
): Promise<{
  isMember: boolean;
  role: 'owner' | 'manager' | 'professional' | 'cliente';
  salonId?: string;
  salonData?: any;
}> {
  if (!supabase || !isSupabaseConfigured || (!userId && !userEmail && !userCpf)) {
    return { isMember: false, role: 'cliente' };
  }

  const cleanIdent = (salonIdentifier || '').trim().toLowerCase();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanIdent);
  const isValidSlug = /^[a-z0-9-]+$/.test(cleanIdent);

  try {
    let salonRes: any = null;

    if (cleanIdent && (isUuid || isValidSlug)) {
      let salonQuery = (supabase.from('salons') as any).select('*');
      if (isUuid) {
        salonQuery = salonQuery.eq('id', cleanIdent);
      } else {
        salonQuery = salonQuery.eq('slug', cleanIdent);
      }
      const { data } = await salonQuery.maybeSingle();
      if (data) salonRes = data;
    }

    // Fallback resiliente: busca parcial por slug/trade_name ou primeiro salão ativo (para ambiente preview/sem subdomínio)
    if (!salonRes) {
      const { data: allSalons } = await (supabase.from('salons') as any)
        .select('*')
        .order('created_at', { ascending: true })
        .limit(20);

      if (Array.isArray(allSalons) && allSalons.length > 0) {
        if (cleanIdent) {
          salonRes =
            allSalons.find((s: any) => {
              const sSlug = String(s.slug || '').toLowerCase();
              const sNameSlug = String(s.trade_name || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
              return (
                (sSlug && (cleanIdent.includes(sSlug) || sSlug.includes(cleanIdent))) ||
                (sNameSlug && (cleanIdent.includes(sNameSlug) || sNameSlug.includes(cleanIdent)))
              );
            }) || allSalons[0];
        } else {
          salonRes = allSalons.find((s: any) => s.is_active !== false) || allSalons[0];
        }
      }
    }

    const targetSalonId = salonRes?.id;
    const targetSalonData = salonRes || null;
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    // Coletar todos os IDs candidatos do usuário (auth.uid, system_admins.id, clients.user_id, clients.id, profiles.id)
    const candidateIds = new Set<string>();
    if (userId && userId.trim()) {
      candidateIds.add(userId.trim());
    }
    let userCpfDigits = (userCpf || '').replace(/\D/g, '');
    let resolvedClientEmail = cleanEmail;
    let isSuperadminMaster =
      typeof window !== 'undefined' && localStorage.getItem('vagou_is_superadmin') === 'true';

    // CAMADA 0: Soberania Absoluta do Criador do Sistema / Superadmin Master (public.system_admins)
    try {
      const { data: sysAdmins } = await (supabase.from('system_admins' as any) as any)
        .select('id, username, email, cpf, phone_whatsapp, role, access_level, is_active')
        .limit(50);

      if (Array.isArray(sysAdmins)) {
        const cleanUserNoAt = cleanEmail.replace(/^[@#&]+|[@#&]+$/g, '');
        const matchedAdmin = sysAdmins.find((sa: any) => {
          if (sa.is_active === false) return false;
          const saId = String(sa.id || '').trim();
          const saEmail = String(sa.email || '').trim().toLowerCase();
          const saUser = String(sa.username || '').trim().toLowerCase();
          const saUserNoAt = saUser.replace(/^[@#&]+|[@#&]+$/g, '');
          const saCpf = String(sa.cpf || '').replace(/\D/g, '');

          if (saId && candidateIds.has(saId)) return true;
          if (cleanEmail && (saEmail === cleanEmail || saUser === cleanEmail || (cleanUserNoAt && saUserNoAt === cleanUserNoAt))) {
            return true;
          }
          if (userCpfDigits && userCpfDigits.length === 11 && saCpf === userCpfDigits) {
            return true;
          }
          return false;
        });

        if (matchedAdmin) {
          isSuperadminMaster = true;
          if (matchedAdmin.id) candidateIds.add(String(matchedAdmin.id));
          if (matchedAdmin.email) resolvedClientEmail = String(matchedAdmin.email).trim().toLowerCase();
          if (matchedAdmin.cpf && !userCpfDigits) {
            userCpfDigits = String(matchedAdmin.cpf).replace(/\D/g, '');
          }
        }
      }
    } catch {}

    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId.trim())) {
      try {
        const { data: clientById } = await (supabase.from('clients') as any)
          .select('id, user_id, cpf, email, username, access_level')
          .or(`id.eq.${userId.trim()},user_id.eq.${userId.trim()}`)
          .limit(3);
        if (Array.isArray(clientById)) {
          for (const c of clientById) {
            if (c?.id) candidateIds.add(String(c.id));
            if (c?.user_id) candidateIds.add(String(c.user_id));
            if (c?.cpf && !userCpfDigits) userCpfDigits = String(c.cpf).replace(/\D/g, '');
            if (c?.email && (!resolvedClientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedClientEmail))) {
              resolvedClientEmail = String(c.email).trim().toLowerCase();
            }
            const cAccess = String(c?.access_level || '').toLowerCase();
            if (cAccess.includes('superadmin') || cAccess.includes('administrador master')) {
              isSuperadminMaster = true;
            }
          }
        }
      } catch {}
    }

    if (cleanEmail) {
      try {
        const isRealEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
        const { data: clientRows } = await (supabase.from('clients') as any)
          .select('id, user_id, cpf, email, username, access_level')
          .ilike(isRealEmail ? 'email' : 'username', cleanEmail)
          .limit(5);
        if (Array.isArray(clientRows)) {
          for (const c of clientRows) {
            if (c?.id) candidateIds.add(String(c.id));
            if (c?.user_id) candidateIds.add(String(c.user_id));
            if (c?.cpf && !userCpfDigits) userCpfDigits = String(c.cpf).replace(/\D/g, '');
            if (c?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedClientEmail)) {
              resolvedClientEmail = String(c.email).trim().toLowerCase();
            }
            const cAccess = String(c?.access_level || '').toLowerCase();
            if (cAccess.includes('superadmin') || cAccess.includes('administrador master')) {
              isSuperadminMaster = true;
            }
          }
        }
      } catch {}

      try {
        const { data: profileRows } = await (supabase.from('profiles') as any)
          .select('id')
          .ilike('email', resolvedClientEmail || cleanEmail)
          .limit(2);
        if (Array.isArray(profileRows)) {
          for (const p of profileRows) {
            if (p?.id) candidateIds.add(String(p.id));
          }
        }
      } catch {}
    }

    if (userCpfDigits) {
      try {
        localStorage.setItem('vagou_user_cpf', userCpfDigits);
      } catch {}
    }

    // Se o usuário é Superadmin Master (system_admins ou access_level = 'Superadmin Master'), possui soberania irrestrita ('owner') em qualquer salão do ecossistema
    if (isSuperadminMaster) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vagou_is_superadmin', 'true');
        }
      } catch {}
      return {
        isMember: true,
        role: 'owner',
        salonId: targetSalonId,
        salonData: targetSalonData,
      };
    }

    if (!targetSalonData || !targetSalonId) {
      return { isMember: false, role: 'cliente' };
    }

    // CAMADA 1: Checagem Direta de Dono em public.salons (owner_id, email, branding, owner_cpf)
    if (targetSalonData.owner_id && candidateIds.has(String(targetSalonData.owner_id))) {
      return {
        isMember: true,
        role: 'owner',
        salonId: targetSalonId,
        salonData: targetSalonData,
      };
    }

    const effectiveEmailsToCheck = Array.from(
      new Set([cleanEmail, resolvedClientEmail].filter(Boolean))
    );
    if (effectiveEmailsToCheck.length > 0) {
      const salonEmails = [
        targetSalonData.email,
        targetSalonData.branding?.ownerEmail,
        targetSalonData.branding?.legalManagerEmail,
        targetSalonData.branding?.email,
      ]
        .filter(Boolean)
        .map((e) => String(e).trim().toLowerCase());

      if (effectiveEmailsToCheck.some((em) => salonEmails.includes(em))) {
        return {
          isMember: true,
          role: 'owner',
          salonId: targetSalonId,
          salonData: targetSalonData,
        };
      }
    }

    const salonOwnerCpfDigits = String(
      targetSalonData.owner_cpf ||
      targetSalonData.branding?.ownerCpf ||
      targetSalonData.branding?.legalManagerCpf ||
      ''
    ).replace(/\D/g, '');
    if (userCpfDigits.length === 11 && salonOwnerCpfDigits.length === 11 && userCpfDigits === salonOwnerCpfDigits) {
      return {
        isMember: true,
        role: 'owner',
        salonId: targetSalonId,
        salonData: targetSalonData,
      };
    }

    // CAMADA 2: Consulta na tabela oficial salon_users (ou fallback salon_members) por user_id, email ou cpf
    try {
      const emailForUser = resolvedClientEmail || cleanEmail;
      if (emailForUser) {
        const { data: sUsersByEmail } = await (supabase
          .from('salon_users' as any)
          .select('id, salon_id, user_id, role, access_level, is_active')
          .eq('salon_id', targetSalonId)
          .ilike('email', emailForUser) as any);
        if (Array.isArray(sUsersByEmail) && sUsersByEmail.length > 0) {
          const su = sUsersByEmail[0];
          const rawRole = String(su.role || su.access_level || '').toLowerCase();
          const memberRole = rawRole.includes('owner') || rawRole.includes('dono') || rawRole.includes('propriet') ? 'owner' : 'manager';
          return {
            isMember: true,
            role: memberRole,
            salonId: targetSalonId,
            salonData: targetSalonData,
          };
        }
      }
      if (candidateIds.size > 0) {
        const { data: sUsersById } = await (supabase
          .from('salon_users' as any)
          .select('id, salon_id, user_id, role, access_level')
          .eq('salon_id', targetSalonId)
          .in('user_id', Array.from(candidateIds)) as any);
        if (Array.isArray(sUsersById) && sUsersById.length > 0) {
          return {
            isMember: true,
            role: 'owner',
            salonId: targetSalonId,
            salonData: targetSalonData,
          };
        }
      }
    } catch {}

    if (candidateIds.size > 0) {
      try {
        const { data: members } = await (supabase
          .from('salon_members')
          .select('id, salon_id, user_id, role')
          .eq('salon_id', targetSalonId)
          .in('user_id', Array.from(candidateIds)) as any);

        if (members && members.length > 0) {
          const mem = members[0];
          const memberRole = mem.role === 'owner' ? 'owner' : mem.role === 'manager' ? 'manager' : 'professional';
          return {
            isMember: true,
            role: memberRole,
            salonId: targetSalonId,
            salonData: targetSalonData,
          };
        }
      } catch {}
    }

    // CAMADA 3: Consulta na tabela professionals (Equipe do Salão) por salon_id + email
    const emailForPro = resolvedClientEmail || cleanEmail;
    if (emailForPro) {
      const { data: pros } = await (supabase
        .from('professionals')
        .select('id, role, email, is_active')
        .eq('salon_id', targetSalonId)
        .ilike('email', emailForPro) as any);

      if (pros && pros.length > 0) {
        const activePro = pros.find((p: any) => p.is_active !== false) || pros[0];
        const rawProRole = String(activePro.role || '').toLowerCase();
        const mappedProRole: 'owner' | 'manager' | 'professional' =
          rawProRole.includes('admin') || rawProRole.includes('owner') || rawProRole.includes('dono')
            ? 'owner'
            : rawProRole.includes('gerente') || rawProRole.includes('manager')
            ? 'manager'
            : 'professional';
        return {
          isMember: true,
          role: mappedProRole,
          salonId: targetSalonId,
          salonData: targetSalonData,
        };
      }
    }
  } catch (err) {
    console.warn('Erro inesperado ao consultar vínculo do salão:', err);
  }

  return { isMember: false, role: 'cliente' };
}

/**
 * Garante a linha do cliente em public.clients sem sobrescrever dados existentes.
 * Trata concorrência com retry no erro 23505 (unique constraint).
 */
export async function ensureClientRow(
  userId: string,
  userEmail?: string | null,
  userMetadata?: Record<string, any> | null
): Promise<{ client: any; error: any }> {
  if (!supabase || !isSupabaseConfigured || !userId) {
    return { client: null, error: new Error('Sessão ou Supabase indisponível') };
  }

  try {
    // 1. Verifica se já existe por user_id ou id
    const { data: existingClient } = await (supabase
      .from('clients') as any)
      .select('*')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (existingClient) {
      return { client: existingClient, error: null };
    }

    // 2. Se não existir, insere com metadados reais
    const resolvedName = userMetadata?.full_name || userMetadata?.name || (userEmail ? userEmail.split('@')[0] : 'Usuário');
    const insertPayload: Record<string, any> = {
      user_id: userId,
      name: resolvedName.trim(),
      phone: userMetadata?.phone || null,
      email: userEmail || null,
      avatar_url: userMetadata?.avatar_url || null,
      ...(userMetadata?.username ? { username: String(userMetadata.username).trim() } : {}),
      ...(userMetadata?.password_hash ? { password_hash: String(userMetadata.password_hash) } : {}),
      ...(userMetadata?.cpf ? { cpf: String(userMetadata.cpf).trim() } : {}),
    };
    const { data: insertedClient, error: insertErr } = await (supabase.from('clients') as any)
      .insert(insertPayload)
      .select()
      .single();

    // Se colidiu em corrida concorrente (23505), reconsulta e retorna a linha existente
    if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('duplicate'))) {
      const { data: reFetched } = await (supabase.from('clients') as any).select('*').eq('user_id', userId).maybeSingle();
      return { client: reFetched, error: null };
    }

    return { client: insertedClient, error: insertErr };
  } catch (err: any) {
    return { client: null, error: err };
  }
}

/**
 * Protocolo de Autenticação Unificada Global do Ecossistema Vagou
 * Integra Supabase Auth estrito + Validação de RBAC em salon_members
 */
export async function unifiedGlobalLogin(
  identifier: string, 
  pass: string,
  targetSalonSlug?: string
): Promise<UnifiedLoginResult> {
  const cleanUser = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      persona: 'cliente',
      role: 'cliente',
      userName: '',
      userEmail: '',
      errorMessage: 'Informe seu e-mail e sua senha de acesso.',
    };
  }

  if (!cleanUser.includes('@')) {
    return {
      success: false,
      persona: 'cliente',
      role: 'cliente',
      userName: '',
      userEmail: cleanUser,
      errorMessage: 'Informe um endereço de e-mail válido.',
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      persona: 'cliente',
      role: 'cliente',
      userName: '',
      userEmail: cleanUser,
      errorMessage: 'Erro: O cliente Supabase não está configurado. Conexão necessária.',
    };
  }

  // 1. Autenticação REAL exclusivamente via Supabase Auth (sem atalhos, sem PIN, sem variações)
  let supabaseAuthUser: User | null = null;
  let authError: any = null;

  try {
    const { data: authData, error: err } = await supabase.auth.signInWithPassword({
      email: cleanUser,
      password: cleanPass,
    });

    if (!err && authData?.user) {
      supabaseAuthUser = authData.user;
    } else {
      authError = err;
    }
  } catch (e: any) {
    authError = e;
  }

  // Se falhou no Supabase Auth, exibe a mensagem amigável ou o erro real do Supabase
  if (!supabaseAuthUser) {
    const message = authError?.message || 'Falha na autenticação com o Supabase.';
    let friendlyMessage = message;
    if (message.includes('Invalid login credentials')) {
      friendlyMessage = 'E-mail ou senha incorretos.';
    } else if (message.includes('Email not confirmed')) {
      friendlyMessage = 'E-mail pendente de confirmação. Verifique sua caixa de entrada.';
    }
    return {
      success: false,
      persona: 'cliente',
      role: 'cliente',
      userName: '',
      userEmail: cleanUser,
      errorMessage: friendlyMessage,
    };
  }

  // 2. Consulta o papel do usuário no banco por user_id e salon_id via salon_members
  const membership = await checkUserSalonMembership(supabaseAuthUser.id, targetSalonSlug);

  // 3. Obter dados pessoais do perfil estritamente por user_id (igualdade exata, sem ilike)
  let profileName = '';
  let profileAvatar = '';
  let profilePhone = '';

  try {
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('id', supabaseAuthUser.id)
      .maybeSingle();

    if (profile) {
      profileName = profile.full_name || profile.name || '';
      profileAvatar = (profile.avatar_url && !profile.avatar_url.includes('unsplash.com')) ? profile.avatar_url : '';
      profilePhone = profile.phone_whatsapp || profile.phone || '';
    }
  } catch {}

  // Se não encontrou em profiles, busca na tabela clients estritamente por user_id
  if (!profileName) {
    try {
      const { data: clientRow } = await (supabase.from('clients') as any)
        .select('*')
        .eq('user_id', supabaseAuthUser.id)
        .maybeSingle();

      if (clientRow) {
        profileName = clientRow.name || '';
        profilePhone = profilePhone || clientRow.phone || '';
      }
    } catch {}
  }

  const metaAvatar = supabaseAuthUser.user_metadata?.avatar_url || supabaseAuthUser.user_metadata?.avatar;
  const resolvedName = profileName || 
                       supabaseAuthUser.user_metadata?.full_name || 
                       supabaseAuthUser.user_metadata?.name || 
                       cleanUser.split('@')[0];
  const resolvedEmail = supabaseAuthUser.email || cleanUser;
  const resolvedPhone = profilePhone || supabaseAuthUser.user_metadata?.phone || '';
  const resolvedAvatar = profileAvatar || (metaAvatar && !metaAvatar.includes('unsplash.com') ? metaAvatar : '');

  const isPro = membership.isMember;
  const salon = membership.salonData;

  return {
    success: true,
    user: supabaseAuthUser,
    salonData: salon || null,
    persona: isPro ? 'pro' : 'cliente',
    role: isPro ? 'pro' : 'cliente',
    userName: resolvedName,
    userEmail: resolvedEmail,
    userPhone: resolvedPhone,
    userAvatarUrl: resolvedAvatar,
    salonName: salon?.trade_name || 'Meu Negócio',
    salonSlug: salon?.slug || targetSalonSlug || 'meu-negocio',
  };
}

/**
 * Cadastro de Usuário no Supabase Auth
 */
export async function signUpWithSupabase(email: string, password: string, metadata?: Record<string, any>) {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase não conectado') };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      options: {
        data: metadata || {},
      },
    });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Obter usuário atual autenticado
 */
export async function getSupabaseUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Buscar estabelecimento pelo slug ou pelo owner_id
 */
export async function fetchSalonData(identifier: { slug?: string; ownerUserId?: string }) {
  if (!supabase) return null;
  try {
    let query = supabase.from('salons').select('*');
    if (identifier.ownerUserId) {
      query = query.eq('owner_id', identifier.ownerUserId);
    } else if (identifier.slug) {
      query = query.eq('slug', identifier.slug);
    } else {
      return null;
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn('Erro ao buscar salão:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('Falha ao consultar salão no Supabase:', e);
    return null;
  }
}

/**
 * Sincronizar dados do estabelecimento no Supabase
 */
export async function syncSalonDataToSupabase(salonData: {
  slug: string;
  tradeName: string;
  legalName?: string;
  documentType?: string;
  documentNumber?: string;
  ownerCpf?: string;
  pixKey?: string;
  pixKeys?: any[];
  phoneWhatsapp: string;
  phoneLandline?: string;
  email: string;
  address: string;
  neighborhood: string;
  city: string;
  state?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  operatingModel: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  appIconUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  slogan?: string;
  brandFont?: string;
  bio?: string;
  instagramUrl?: string;
  ownerUserId?: string;
  homeDeliverySettings?: {
    enabled: boolean;
    areaDescription?: string;
    maxDistanceKm?: number;
    travelFee?: number;
    isFreeForCondo?: boolean;
  };
}) {
  if (!supabase || !isSupabaseConfigured) {
    return { success: true, mode: 'local' as const };
  }

  try {
    const resolvedIcon = salonData.appIconUrl || salonData.faviconUrl || salonData.logoDarkUrl || salonData.logoLightUrl || null;
    const rawDocDigits = (salonData.documentNumber || '').replace(/\D/g, '');
    const isCnpj14 = rawDocDigits.length === 14;
    const resolvedDocumentNumber = isCnpj14 ? (salonData.documentNumber || '').trim() : '';
    const resolvedLegalName = isCnpj14 ? (salonData.legalName || '').trim() : '';
    const resolvedOwnerCpf = (salonData.ownerCpf || (rawDocDigits.length === 11 ? salonData.documentNumber : '') || '').trim();
    const resolvedPixKeys = Array.isArray(salonData.pixKeys) ? salonData.pixKeys : [];
    const primaryPixFromList = resolvedPixKeys.find((k: any) => k?.isPrimary)?.key || resolvedPixKeys[0]?.key || '';
    const resolvedPixKey = (salonData.pixKey || primaryPixFromList || '').trim();

    const payload: any = {
      slug: salonData.slug,
      trade_name: salonData.tradeName,
      legal_name: resolvedLegalName,
      document_type: isCnpj14 ? 'CNPJ' : '',
      document_number: resolvedDocumentNumber,
      owner_cpf: resolvedOwnerCpf || undefined,
      pix_key: resolvedPixKey || undefined,
      pix_keys: resolvedPixKeys.length > 0 ? resolvedPixKeys : undefined,
      phone_whatsapp: salonData.phoneWhatsapp,
      email: salonData.email,
      address: salonData.address,
      neighborhood: salonData.neighborhood,
      city: salonData.city,
      state: salonData.state || 'SP',
      cep: salonData.postalCode || null,
      latitude: salonData.latitude,
      longitude: salonData.longitude,
      operating_model: salonData.operatingModel,
      logo_light_url: salonData.logoLightUrl || null,
      logo_dark_url: salonData.logoDarkUrl || null,
      favicon_url: resolvedIcon,
      slogan: salonData.slogan ?? undefined,
      brand_font: salonData.brandFont || 'Poppins',
      bio: salonData.bio ?? undefined,
      primary_color: salonData.primaryColor || '#20C933',
      secondary_color: '#0F172A',
      branding: {
        primaryColor: salonData.primaryColor || '#20C933',
        secondaryColor: '#0F172A',
        pwaName: salonData.tradeName,
        themeMode: 'dark',
        faviconUrl: resolvedIcon || '',
        salonIcon: resolvedIcon || '',
        slogan: salonData.slogan || '',
        brandFont: salonData.brandFont || 'Poppins',
        ownerCpf: resolvedOwnerCpf,
        pixKey: resolvedPixKey,
        pixKeys: resolvedPixKeys,
        ...(salonData.instagramUrl ? { instagramUrl: salonData.instagramUrl } : {}),
        ...(salonData.bio ? { bio: salonData.bio } : {}),
      },
      home_delivery_enabled: salonData.homeDeliverySettings?.enabled ?? false,
      home_delivery_area: salonData.homeDeliverySettings?.areaDescription || null,
      home_delivery_travel_fee: salonData.homeDeliverySettings?.travelFee || 0,
      is_verified: true,
      is_active: true,
    };

    if (salonData.ownerUserId) {
      payload.owner_id = salonData.ownerUserId;
    }

    const client = getDbClient() || supabase;
    let workingPayload: Record<string, any> = { ...payload };
    let data: any = null;
    let error: any = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await (client.from('salons') as any)
        .upsert(workingPayload, { onConflict: 'slug' })
        .select()
        .single();
      data = res.data;
      error = res.error;
      if (!error) break;

      const errMsg = String(error.message || error.details || '');
      const isMissingCol =
        error.code === 'PGRST204' ||
        error.code === '42703' ||
        errMsg.includes('Could not find the') ||
        errMsg.includes('column');
      if (!isMissingCol) break;

      const matchCol =
        errMsg.match(/Could not find the '([^']+)' column/i) ||
        errMsg.match(/column "([^"]+)" of relation/i) ||
        errMsg.match(/column ([a-zA-Z0-9_]+) does not exist/i);
      const offendingCol = matchCol?.[1];
      if (offendingCol && offendingCol in workingPayload) {
        delete workingPayload[offendingCol];
        continue;
      }

      delete workingPayload.favicon_url;
      delete workingPayload.slogan;
      delete workingPayload.brand_font;
      delete workingPayload.owner_cpf;
      delete workingPayload.pix_key;
      delete workingPayload.pix_keys;
      const retry = await (client.from('salons') as any)
        .upsert(workingPayload, { onConflict: 'slug' })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
      break;
    }

    if (error) {
      console.warn('Erro ao sincronizar salão no Supabase:', error.message);
      return { success: false, error: error.message, mode: 'supabase' as const };
    }

    // Propagação Cruzada de Endereço e Coordenadas GPS por CPF/E-mail (bol-024)
    const cleanCpf = resolvedOwnerCpf.replace(/\D/g, '');
    if (cleanCpf.length === 11 || salonData.email) {
      const geoSyncPayload: Record<string, any> = {
        address: salonData.address || undefined,
        neighborhood: salonData.neighborhood || undefined,
        city: salonData.city || undefined,
        state: salonData.state || 'SP',
        cep: salonData.postalCode || undefined,
        latitude: salonData.latitude,
        longitude: salonData.longitude,
        formatted_address: [
          salonData.address,
          salonData.neighborhood,
          salonData.city,
          salonData.state || 'SP',
          salonData.postalCode,
        ]
          .filter(Boolean)
          .join(', '),
      };
      const tables = ['clients', 'professionals', 'profiles', 'salon_users'];
      for (const tbl of tables) {
        try {
          if (cleanCpf.length === 11) {
            await (client.from(tbl as any) as any).update(geoSyncPayload).eq('cpf', cleanCpf);
          } else if (salonData.email) {
            await (client.from(tbl as any) as any)
              .update(geoSyncPayload)
              .ilike('email', salonData.email.trim());
          }
        } catch {}
      }
    }

    return { success: true, data, mode: 'supabase' as const };
  } catch (err: any) {
    console.warn('Falha inesperada na sincronização Supabase:', err?.message);
    return { success: false, error: err?.message, mode: 'fallback' as const };
  }
}

/**
 * Buscar membros da equipe / profissionais do salão
 */
export async function fetchSalonProfessionals(salonId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }

    // Fallback de Resiliência: Se a tabela relational professionals estiver vazia, busca do objeto JSONB
    const isSalonUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonId);
    const { data: salonRow } = await supabase
      .from('salons')
      .select('branding')
      .match(isSalonUuid ? { id: salonId } : { slug: salonId })
      .maybeSingle();

    const brandingObj = (salonRow && typeof salonRow === 'object' && 'branding' in salonRow) ? (salonRow as any).branding : null;
    const jsonbTeam = brandingObj?.teamMembers;
    if (Array.isArray(jsonbTeam) && jsonbTeam.length > 0) {
      return jsonbTeam
        .filter((p: any) => p && p.isActive !== false && p.is_active !== false)
        .map((p: any) => ({
          id: p.id,
          salon_id: salonId,
          name: p.name || 'Profissional',
          role: p.role || 'Profissional',
          avatar_url: p.avatarUrl || p.avatar || null,
          specialties: Array.isArray(p.specialties) ? p.specialties : ['Geral'],
          work_schedule: p.workSchedule || p.work_schedule || p.schedule_config || null,
          schedule_config: p.workSchedule || p.schedule_config || null,
          is_active: p.isActive !== false && p.is_active !== false,
        }));
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Buscar catálogo de serviços do salão (unificado: salon_services + services + salons.branding.catalogServices)
 */
export async function fetchSalonServices(salonId: string) {
  if (!supabase) return [];
  const client = getDbClient() || supabase;
  try {
    // 1. Tenta consultar public.salon_services (tabela relacional oficial sincronizada com admvapp)
    try {
      const { data: salonServicesData, error: ssErr } = await (client.from('salon_services' as any) as any)
        .select('*')
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (!ssErr && Array.isArray(salonServicesData) && salonServicesData.length > 0) {
        return salonServicesData.map((s: any) => ({
          ...s,
          title: s.title || s.name || 'Serviço',
          name: s.name || s.title || 'Serviço',
        }));
      }
    } catch {}

    // 2. Consulta public.services
    const { data, error } = await (client.from('services') as any)
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }

    // 3. Fallback de Resiliência: Se as tabelas relacionais estiverem vazias, busca de salons.branding.catalogServices
    const isSalonUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonId);
    const { data: salonRow } = await (client.from('salons') as any)
      .select('branding')
      .match(isSalonUuid ? { id: salonId } : { slug: salonId })
      .maybeSingle();

    const brandingObj = (salonRow && typeof salonRow === 'object' && 'branding' in salonRow) ? (salonRow as any).branding : null;
    const jsonbServices = brandingObj?.catalogServices || brandingObj?.services;
    if (Array.isArray(jsonbServices) && jsonbServices.length > 0) {
      return jsonbServices.map((s: any) => ({
        id: s.id,
        salon_id: salonId,
        name: s.name || s.title || 'Serviço',
        title: s.title || s.name || 'Serviço',
        category: s.category || 'Geral',
        price: Number(s.price) || 0,
        duration_minutes: typeof s.duration === 'string' ? parseInt(s.duration.replace(/\D/g, '')) || 40 : (s.duration_minutes || s.durationMinutes || 40),
        commission_rate: Number(s.commissionRate ?? s.commission_rate ?? 50),
        description: s.description || null,
        image_url: s.image || s.image_url || (s.photos && s.photos.length > 0 ? s.photos[0] : null),
        photos: s.photos || [],
        videos: s.videos || [],
        slides: s.slides || [],
        is_active: s.is_active !== false,
      }));
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Salvar / Criar serviço no Supabase (salon_services + services)
 */
export async function upsertSalonService(service: {
  id?: string;
  salonId: string;
  title: string;
  category: string;
  price: number;
  promotionalPrice?: number | null;
  durationMinutes: number;
  durationEstimated?: string;
  commissionRate?: number;
  description?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  photos?: string[];
  videos?: any[];
  slides?: string[];
}) {
  if (!supabase) return null;
  try {
    const isUuid = service.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(service.id));
    const serviceId = isUuid ? String(service.id) : generateUuidV4();
    const payload = {
      id: serviceId,
      salon_id: service.salonId,
      name: service.title,
      title: service.title,
      category: service.category,
      price: service.price,
      promotional_price: service.promotionalPrice ?? null,
      duration_minutes: service.durationMinutes,
      duration_estimated: service.durationEstimated || `${service.durationMinutes} min`,
      commission_rate: service.commissionRate ?? 50,
      description: service.description || null,
      image_url: service.imageUrl || null,
      video_url: service.videoUrl || null,
      photos: service.photos || [],
      videos: service.videos || [],
      slides: service.slides || [],
      is_active: true,
    };
    const client = getDbClient();

    try {
      await (client.from('salon_services' as any) as any).upsert(payload, { onConflict: 'id' });
    } catch {}

    let { data, error } = await (client.from('services') as any).upsert(payload, { onConflict: 'id' }).select().single();
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column'))) {
      const safePayload: any = { ...payload };
      delete safePayload.name;
      delete safePayload.commission_rate;
      delete safePayload.photos;
      delete safePayload.videos;
      delete safePayload.slides;
      const retry = await (client.from('services') as any).upsert(safePayload, { onConflict: 'id' }).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn('Erro ao salvar serviço:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('Falha ao salvar serviço:', e);
    return null;
  }
}

/**
 * Buscar vagas relâmpago ativas do salão
 */
export async function fetchSalonOffers(salonId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await (supabase.from('service_offers') as any)
      .select('*')
      .eq('salon_id', salonId)
      .eq('status', 'AVAILABLE')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Erro ao buscar ofertas:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Criar vaga relâmpago no Supabase
 */
export async function createSalonOffer(offer: {
  salonId: string;
  professionalId: string;
  serviceId?: string | null;
  serviceTitle: string;
  category: string;
  originalPrice: number;
  price: number;
  dateStr: string;
  startTime: string;
  endTime: string;
  mediaLevel?: number;
  videoUrl?: string | null;
  galleryImages?: string[];
  expiresAt: string;
}) {
  if (!supabase) return null;
  try {
    const payload = {
      salon_id: offer.salonId,
      professional_id: offer.professionalId,
      service_id: offer.serviceId || null,
      service_title: offer.serviceTitle,
      category: offer.category,
      original_price: offer.originalPrice,
      price: offer.price,
      date_str: offer.dateStr,
      start_time: offer.startTime,
      end_time: offer.endTime,
      media_level: offer.mediaLevel || 1,
      video_url: offer.videoUrl || null,
      gallery_images: offer.galleryImages || [],
      expires_at: offer.expiresAt,
      status: 'AVAILABLE' as OfferStatus,
    };
    const client = getDbClient();
    const { data, error } = await (client.from('service_offers') as any).insert(payload).select().single();
    if (error) {
      console.warn('Erro ao criar vaga:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('Falha ao criar vaga:', e);
    return null;
  }
}

/**
 * Mapeia registro bruto de public.appointments para a interface BookingAppointment do app
 */
export function mapDbAppointmentToBookingAppointment(dbApt: any, fallbackSalonName = ''): BookingAppointment {
  const rawProto = dbApt.protocol_code || '';
  const protocol = rawProto ? (rawProto.startsWith('#') ? rawProto : `#${rawProto}`) : `#VGA-${dbApt.id ? String(dbApt.id).slice(0, 5) : Math.floor(10000 + Math.random() * 90000)}`;
  
  // Format data e hora amigáveis
  let dateFormatted = '';
  if (dbApt.date_str) {
    const parts = String(dbApt.date_str).split('-');
    if (parts.length === 3) {
      dateFormatted = `${parts[2]}/${parts[1]}`;
    } else {
      dateFormatted = String(dbApt.date_str);
    }
  }

  const startTimeStr = dbApt.start_time ? String(dbApt.start_time).slice(0, 5) : '';
  const dateTimeFormatted = dateFormatted && startTimeStr 
    ? `${dateFormatted} às ${startTimeStr}` 
    : (dateFormatted || startTimeStr || 'Data a confirmar');

  const salonTradeName = dbApt.salons?.trade_name || dbApt.salon_name || fallbackSalonName || 'Meu Estabelecimento';
  const resolvedProName = dbApt.professionals?.name || dbApt.professional_name || dbApt.professional || 'Equipe do Salão';

  return {
    id: dbApt.id,
    protocolCode: protocol,
    serviceTitle: dbApt.service_title || 'Serviço',
    service: dbApt.service_title || 'Serviço',
    serviceName: dbApt.service_title || 'Serviço',
    professionalName: resolvedProName,
    professional: resolvedProName,
    salonName: salonTradeName,
    dateTime: dateTimeFormatted,
    time: startTimeStr,
    dateIso: dbApt.date_str,
    totalPrice: Number(dbApt.price) || 0,
    status: (dbApt.status || 'CONFIRMADO').toUpperCase(),
    clientName: dbApt.client_name || dbApt.customer_name || 'Cliente',
    customerName: dbApt.client_name || dbApt.customer_name || 'Cliente',
    clientPhone: dbApt.client_phone || dbApt.customer_phone || '',
    customerPhone: dbApt.client_phone || dbApt.customer_phone || '',
    customerEmail: dbApt.client_email || dbApt.customer_email || '',
    address: dbApt.client_address || dbApt.salons?.address || '',
    createdAt: dbApt.created_at,
    // Campos de Dependente (Conta Família) e Rastreamento Ao Vivo (bol-020)
    is_dependent: Boolean(dbApt.is_dependent),
    dependent_id: dbApt.dependent_id || undefined,
    dependent_name: dbApt.dependent_name || undefined,
    service_location_type: dbApt.service_location_type || 'in_salon',
    transport_mode: dbApt.transport_mode || 'driving',
    tracking_status: dbApt.tracking_status || 'idle',
    selected_route_summary: dbApt.selected_route_summary || undefined,
    route_polyline: dbApt.route_polyline || undefined,
    current_street_name: dbApt.current_street_name || undefined,
    route_checkpoints: Array.isArray(dbApt.route_checkpoints) ? dbApt.route_checkpoints : undefined,
    active_adversity: dbApt.active_adversity || null,
    delay_minutes: dbApt.delay_minutes != null ? Number(dbApt.delay_minutes) : 0,
    client_lat: dbApt.client_lat != null ? Number(dbApt.client_lat) : undefined,
    client_lng: dbApt.client_lng != null ? Number(dbApt.client_lng) : undefined,
    distance_km: dbApt.distance_km != null ? Number(dbApt.distance_km) : undefined,
    eta_minutes: dbApt.eta_minutes != null ? Number(dbApt.eta_minutes) : undefined,
    prep_buffer_minutes: dbApt.prep_buffer_minutes != null ? Number(dbApt.prep_buffer_minutes) : 15,
    cancellation_reason: dbApt.cancellation_reason || undefined,
    last_location_update: dbApt.last_location_update || undefined,
  };
}

/**
 * Mapeia BookingAppointment do frontend para o schema relacional oficial de public.appointments
 */
export function mapBookingAppointmentToDbPayload(apt: Partial<BookingAppointment>, salonId: string, clientId?: string): any {
  const cleanProtocol = (apt.protocolCode || `#VGA-${Math.floor(10000 + Math.random() * 90000)}`).trim();
  const rawPrice = Number(apt.totalPrice) || 0;
  
  let dateStr = apt.dateIso || '';
  let startTime = apt.time || '10:00:00';
  if (!dateStr && apt.dateTime) {
    const match = apt.dateTime.match(/(\d{2})\/(\d{2})\s+às\s+(\d{2}):(\d{2})/);
    if (match) {
      const year = new Date().getFullYear();
      dateStr = `${year}-${match[2]}-${match[1]}`;
      startTime = `${match[3]}:${match[4]}:00`;
    }
  }
  if (!dateStr) {
    dateStr = new Date().toISOString().split('T')[0];
  }
  if (startTime.length === 5) {
    startTime = `${startTime}:00`;
  }

  const [sh, sm] = startTime.split(':').map(Number);
  const totalM = (sh * 60 + sm) + 45;
  const eh = Math.floor(totalM / 60) % 24;
  const em = totalM % 60;
  const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;

  const isUuid = apt.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apt.id);

  return {
    ...(isUuid ? { id: apt.id } : {}),
    protocol_code: cleanProtocol,
    salon_id: salonId,
    client_id: clientId || null,
    client_name: apt.clientName || apt.customerName || 'Cliente',
    client_phone: apt.clientPhone || apt.customerPhone || '',
    client_email: (apt as any).clientEmail || apt.customerEmail || null,
    service_title: apt.serviceTitle || apt.service || 'Serviço',
    price: rawPrice,
    date_str: dateStr,
    start_time: startTime,
    end_time: endTime,
    status: (apt.status || 'CONFIRMADO').toUpperCase(),
    notes: (apt as any).notes || (apt.is_dependent && apt.dependent_name ? `Dependente: ${apt.dependent_name}` : null),
    ...(apt.is_dependent !== undefined ? { is_dependent: apt.is_dependent } : {}),
    ...((apt as any).dependent_id !== undefined ? { dependent_id: (apt as any).dependent_id } : {}),
    ...(apt.dependent_name !== undefined ? { dependent_name: apt.dependent_name } : {}),
    ...(apt.service_location_type !== undefined ? { service_location_type: apt.service_location_type } : {}),
    ...(apt.transport_mode !== undefined ? { transport_mode: apt.transport_mode } : {}),
    ...(apt.tracking_status !== undefined ? { tracking_status: apt.tracking_status } : {}),
    ...(apt.selected_route_summary !== undefined ? { selected_route_summary: apt.selected_route_summary } : {}),
    ...(apt.route_polyline !== undefined ? { route_polyline: apt.route_polyline } : {}),
    ...(apt.current_street_name !== undefined ? { current_street_name: apt.current_street_name } : {}),
    ...(apt.route_checkpoints !== undefined ? { route_checkpoints: apt.route_checkpoints } : {}),
    ...(apt.active_adversity !== undefined ? { active_adversity: apt.active_adversity } : {}),
    ...(apt.delay_minutes !== undefined ? { delay_minutes: apt.delay_minutes } : {}),
    ...(apt.client_lat !== undefined ? { client_lat: apt.client_lat } : {}),
    ...(apt.client_lng !== undefined ? { client_lng: apt.client_lng } : {}),
    ...(apt.distance_km !== undefined ? { distance_km: apt.distance_km } : {}),
    ...(apt.eta_minutes !== undefined ? { eta_minutes: apt.eta_minutes } : {}),
    ...(apt.prep_buffer_minutes !== undefined ? { prep_buffer_minutes: apt.prep_buffer_minutes } : {}),
    ...(apt.cancellation_reason !== undefined ? { cancellation_reason: apt.cancellation_reason } : {}),
    ...(apt.last_location_update !== undefined ? { last_location_update: apt.last_location_update } : {}),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Buscar agendamentos do salão (com suporte a fallback relacional e hidratação)
 */
export async function fetchSalonAppointments(salonId: string): Promise<any[]> {
  if (!supabase || !isSupabaseConfigured || !salonId) return [];
  const client = getDbClient() || supabase;
  try {
    let resolvedSalonId = salonId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonId)) {
      const { data: sRow } = await (client.from('salons') as any).select('id').eq('slug', salonId).maybeSingle();
      if (sRow?.id) resolvedSalonId = sRow.id;
    }

    const { data, error } = await (client.from('appointments') as any)
      .select('*, salons(trade_name, address, slug), professionals(name, avatar_url)')
      .eq('salon_id', resolvedSalonId)
      .order('date_str', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar agendamentos do salão:', error.message);
      // Fallback sem joins caso a tabela professionals não tenha FK
      const { data: rawList } = await (client.from('appointments') as any)
        .select('*')
        .eq('salon_id', resolvedSalonId)
        .order('date_str', { ascending: false });
      return rawList || [];
    }
    return data || [];
  } catch (err) {
    console.warn('Falha em fetchSalonAppointments:', err);
    return [];
  }
}

/**
 * Buscar agendamentos do cliente/usuário autenticado ou identificado por email/telefone
 */
export async function fetchUserAppointments(userParams: {
  clientId?: string;
  email?: string;
  phone?: string;
  userId?: string;
}): Promise<any[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  const client = getDbClient() || supabase;

  try {
    const cleanEmail = (userParams.email || (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_email') || localStorage.getItem('vagou_active_partner') || '' : '')).trim().toLowerCase();
    const cleanPhone = (userParams.phone || (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_phone') || '' : '')).trim();
    const cleanClientId = userParams.clientId || '';

    let query = (client.from('appointments') as any)
      .select('*, salons(trade_name, address, slug)')
      .order('date_str', { ascending: false });

    const filters: string[] = [];
    if (cleanClientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanClientId)) {
      filters.push(`client_id.eq.${cleanClientId}`);
    }
    if (cleanEmail && cleanEmail.includes('@')) {
      filters.push(`client_email.ilike.${cleanEmail}`);
    }
    if (cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, '');
      if (digits.length >= 8) {
        filters.push(`client_phone.ilike.%${digits.slice(-8)}%`);
      }
    }

    if (filters.length > 0) {
      query = query.or(filters.join(','));
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        query = query.ilike('client_email', session.user.email);
      } else {
        return [];
      }
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Erro ao consultar agendamentos do cliente:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Falha em fetchUserAppointments:', err);
    return [];
  }
}

/**
 * Upsert em tempo real de agendamento no Supabase com resiliência total
 */
export async function upsertAppointmentInDb(appointmentData: any): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase não conectado' };
  }
  const client = getDbClient() || supabase;

  try {
    let resolvedSalonId = appointmentData.salon_id;
    if (!resolvedSalonId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedSalonId)) {
      const activeSlug = typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_slug') || '' : '';
      const activeDbId = typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_db_id') || '' : '';
      if (activeDbId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeDbId)) {
        resolvedSalonId = activeDbId;
      } else if (activeSlug) {
        const { data: sRow } = await (client.from('salons') as any).select('id').eq('slug', activeSlug).maybeSingle();
        if (sRow?.id) resolvedSalonId = sRow.id;
      }
    }

    if (!resolvedSalonId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedSalonId)) {
      const { data: firstSalon } = await (client.from('salons') as any).select('id').eq('is_active', true).limit(1).maybeSingle();
      if (firstSalon?.id) resolvedSalonId = firstSalon.id;
    }

    const payload = {
      ...appointmentData,
      salon_id: resolvedSalonId,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await (client.from('appointments') as any)
      .upsert(payload, { onConflict: 'protocol_code' })
      .select()
      .maybeSingle();

    // Fallback resiliente caso as colunas bol-020 ainda não tenham sido aplicadas no banco remoto
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column'))) {
      const safePayload: any = { ...payload };
      delete safePayload.is_dependent;
      delete safePayload.dependent_id;
      delete safePayload.dependent_name;
      delete safePayload.service_location_type;
      delete safePayload.transport_mode;
      delete safePayload.tracking_status;
      delete safePayload.selected_route_summary;
      delete safePayload.route_polyline;
      delete safePayload.current_street_name;
      delete safePayload.route_checkpoints;
      delete safePayload.active_adversity;
      delete safePayload.delay_minutes;
      delete safePayload.client_lat;
      delete safePayload.client_lng;
      delete safePayload.distance_km;
      delete safePayload.eta_minutes;
      delete safePayload.prep_buffer_minutes;
      delete safePayload.cancellation_reason;
      delete safePayload.last_location_update;
      const retry = await (client.from('appointments') as any)
        .upsert(safePayload, { onConflict: 'protocol_code' })
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn('Erro ao realizar upsert de appointment no Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Falha em upsertAppointmentInDb:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza telemetria e status de deslocamento ao vivo (bol-020) em public.appointments a cada 10s
 */
export async function updateAppointmentLiveTrackingInDb(
  appointmentIdOrProtocol: string,
  livePayload: Partial<BookingAppointment>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured || !appointmentIdOrProtocol) {
    return { success: false, error: 'Supabase não conectado' };
  }
  const client = getDbClient() || supabase;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentIdOrProtocol);
    const cleanCode = appointmentIdOrProtocol.startsWith('#') ? appointmentIdOrProtocol : `#${appointmentIdOrProtocol}`;
    const nowIso = new Date().toISOString();

    const dbFields: Record<string, any> = {
      updated_at: nowIso,
      last_location_update: livePayload.last_location_update || nowIso,
    };
    if (livePayload.status !== undefined) dbFields.status = livePayload.status;
    if (livePayload.service_location_type !== undefined) dbFields.service_location_type = livePayload.service_location_type;
    if (livePayload.transport_mode !== undefined) dbFields.transport_mode = livePayload.transport_mode;
    if (livePayload.tracking_status !== undefined) dbFields.tracking_status = livePayload.tracking_status;
    if (livePayload.selected_route_summary !== undefined) dbFields.selected_route_summary = livePayload.selected_route_summary;
    if (livePayload.route_polyline !== undefined) dbFields.route_polyline = livePayload.route_polyline;
    if (livePayload.current_street_name !== undefined) dbFields.current_street_name = livePayload.current_street_name;
    if (livePayload.route_checkpoints !== undefined) dbFields.route_checkpoints = livePayload.route_checkpoints;
    if (livePayload.active_adversity !== undefined) dbFields.active_adversity = livePayload.active_adversity;
    if (livePayload.delay_minutes !== undefined) dbFields.delay_minutes = livePayload.delay_minutes;
    if (livePayload.client_lat !== undefined) dbFields.client_lat = livePayload.client_lat;
    if (livePayload.client_lng !== undefined) dbFields.client_lng = livePayload.client_lng;
    if (livePayload.distance_km !== undefined) dbFields.distance_km = livePayload.distance_km;
    if (livePayload.eta_minutes !== undefined) dbFields.eta_minutes = livePayload.eta_minutes;
    if (livePayload.prep_buffer_minutes !== undefined) dbFields.prep_buffer_minutes = livePayload.prep_buffer_minutes;
    if (livePayload.cancellation_reason !== undefined) dbFields.cancellation_reason = livePayload.cancellation_reason;

    let query = (client.from('appointments') as any).update(dbFields);
    const { error } = isUuid
      ? await query.eq('id', appointmentIdOrProtocol)
      : await query.eq('protocol_code', cleanCode);

    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column'))) {
      if (livePayload.status) {
        const fallbackQuery = (client.from('appointments') as any).update({
          status: livePayload.status,
          updated_at: nowIso,
        });
        if (isUuid) {
          await fallbackQuery.eq('id', appointmentIdOrProtocol);
        } else {
          await fallbackQuery.eq('protocol_code', cleanCode);
        }
      }
      return { success: true };
    }

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Atualizar status do agendamento (ex: CONFIRMADO, CONCLUIDO, CANCELADO)
 */
export async function updateAppointmentStatusInDb(appointmentIdOrProtocol: string, status: AppointmentStatus | string) {
  if (!supabase || !isSupabaseConfigured) return false;
  const client = getDbClient() || supabase;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentIdOrProtocol);
    const upperStatus = String(status).toUpperCase();

    const query = (client.from('appointments') as any)
      .update({ status: upperStatus, updated_at: new Date().toISOString() });

    const { error } = isUuid 
      ? await query.eq('id', appointmentIdOrProtocol)
      : await query.eq('protocol_code', appointmentIdOrProtocol.startsWith('#') ? appointmentIdOrProtocol : `#${appointmentIdOrProtocol}`);

    if (error) {
      console.warn('Erro ao atualizar status do agendamento:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Cancelar agendamento no Supabase pelo código do protocolo (com motivo opcional — bol-020)
 */
export async function cancelAppointmentInDb(protocolCode: string, cancellationReason?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Supabase não conectado' };
  const client = getDbClient() || supabase;
  try {
    const cleanCode = protocolCode.startsWith('#') ? protocolCode : `#${protocolCode}`;
    const payload: Record<string, any> = {
      status: 'CANCELADO',
      tracking_status: 'cancelled',
      ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
      updated_at: new Date().toISOString(),
    };
    let { error } = await (client.from('appointments') as any)
      .update(payload)
      .eq('protocol_code', cleanCode);

    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column'))) {
      const retry = await (client.from('appointments') as any)
        .update({ status: 'CANCELADO', updated_at: new Date().toISOString() })
        .eq('protocol_code', cleanCode);
      error = retry.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Escuta eventos em tempo real na tabela public.appointments via canais Postgres Changes
 */
export function subscribeToAppointments(
  filter: { salonId?: string; clientEmail?: string; clientPhone?: string },
  onChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; newRow: any; oldRow: any }) => void
) {
  if (!supabase || !isSupabaseConfigured) return () => {};

  const channelKey = `rt-appointments-${filter.salonId || 'all'}-${Date.now()}`;
  const channel = supabase
    .channel(channelKey)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
      },
      (payload) => {
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;

        // Filtrar no cliente se for específico de um salão
        if (filter.salonId && newRecord?.salon_id && newRecord.salon_id !== filter.salonId) {
          return;
        }

        onChange({
          eventType: payload.eventType as any,
          newRow: newRecord,
          oldRow: oldRecord,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Vagou Family: Buscar dependentes de um cliente responsável (prioriza public.dependents do Master Rebuild v3.0)
 */
export async function fetchClientFamilyMembers(guardianClientId: string) {
  if (!supabase) return [];
  const client = getDbClient() || supabase;
  try {
    let depMembers: any[] = [];
    try {
      const { data: deps } = await (client.from('dependents' as any) as any)
        .select('*')
        .eq('parent_client_id', guardianClientId)
        .eq('is_unlinked', false)
        .order('created_at', { ascending: true });
      if (Array.isArray(deps)) {
        depMembers = deps.map((d: any) => ({
          id: d.id,
          guardian_client_id: d.parent_client_id,
          parent_client_id: d.parent_client_id,
          name: d.full_name || d.name || 'Dependente',
          full_name: d.full_name || d.name || 'Dependente',
          relationship: d.relationship || 'other',
          birth_date: d.birth_date || null,
          notes: d.notes || null,
          is_unlinked: Boolean(d.is_unlinked),
          created_at: d.created_at,
        }));
      }
    } catch {}

    let cfMembers: any[] = [];
    try {
      const { data: cfm } = await (client.from('client_family_members') as any)
        .select('*')
        .eq('guardian_client_id', guardianClientId)
        .order('created_at', { ascending: true });
      if (Array.isArray(cfm)) cfMembers = cfm;
    } catch {}

    const combinedMap = new Map<string, any>();
    depMembers.forEach((d: any) => {
      combinedMap.set(d.id, d);
    });
    cfMembers.forEach((m: any) => {
      if (!combinedMap.has(m.id)) {
        combinedMap.set(m.id, {
          ...m,
          full_name: m.full_name || m.name,
        });
      }
    });

    return Array.from(combinedMap.values());
  } catch {
    return [];
  }
}

/**
 * Vagou Family: Adicionar ou Atualizar Dependente (grava em public.dependents com suporte ao Trigger trg_sync_client_dependents_counter)
 */
export async function saveClientFamilyMember(member: {
  id?: string;
  guardianClientId: string;
  name: string;
  relationship: string;
  birthDate?: string | null;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  gender?: string | null;
  notes?: string | null;
  autonomyLevel?: string;
  phone?: string | null;
  email?: string | null;
}) {
  if (!supabase) return null;
  const client = getDbClient();
  try {
    const isUuid = member.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(member.id));
    const depId = isUuid ? String(member.id) : generateUuidV4();
    const nowIso = new Date().toISOString();
    const validRel = ['son', 'daughter', 'child', 'spouse', 'parent', 'sibling', 'other'].includes(member.relationship)
      ? member.relationship
      : 'other';
    const cleanBirthDate = member.birthDate && String(member.birthDate).trim() !== '' ? member.birthDate : null;

    // 1. Gravar na tabela oficial public.dependents
    let depRow: any = null;
    try {
      const { data } = await (client.from('dependents' as any) as any)
        .upsert(
          {
            id: depId,
            parent_client_id: member.guardianClientId,
            full_name: member.name,
            name: member.name,
            relationship: validRel,
            birth_date: cleanBirthDate,
            gender: member.gender || null,
            phone: member.phone || null,
            notes: member.notes || null,
            is_unlinked: false,
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        )
        .select()
        .maybeSingle();
      depRow = data;
    } catch {}

    // 2. Fallback opcional em public.client_family_members se a tabela legada existir
    try {
      await (client.from('client_family_members') as any).upsert(
        {
          id: depId,
          guardian_client_id: member.guardianClientId,
          name: member.name,
          relationship: validRel,
          birth_date: cleanBirthDate,
          avatar_url: member.avatarUrl || null,
          avatar_emoji: member.avatarEmoji || null,
          gender: member.gender || null,
          notes: member.notes || null,
          autonomy_level: member.autonomyLevel || 'parent_controlled',
          phone: member.phone || null,
          email: member.email || null,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } catch {}

    return depRow || { id: depId, guardian_client_id: member.guardianClientId, full_name: member.name, name: member.name, relationship: validRel };
  } catch (err: any) {
    console.warn('Erro ao salvar dependente:', err.message);
    return null;
  }
}

/**
 * Vagou Family: Emancipar dependente para conta própria (Migração de Histórico)
 */
export async function emancipateFamilyMemberToUser(memberId: string, newUserId: string) {
  if (!supabase) return false;
  try {
    // 1. Atualiza o status do dependente para emancipado
    const { error: memberError } = await (supabase.from('client_family_members') as any)
      .update({
        autonomy_level: 'emancipated',
        emancipated_user_id: newUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (memberError) throw memberError;

    // 2. Transfere os agendamentos históricos desse dependente para o novo perfil
    const { error: aptError } = await (supabase.from('appointments') as any)
      .update({
        client_id: newUserId,
        is_dependent: false,
        updated_at: new Date().toISOString(),
      })
      .eq('dependent_id', memberId);

    if (aptError) {
      console.warn('Aviso: Alguns agendamentos não puderam ser migrados automaticamente:', aptError.message);
    }

    return true;
  } catch (err: any) {
    console.error('Erro na emancipação digital do dependente:', err);
    return false;
  }
}

/**
 * Valida se o valor do avatar é uma URL ou DataURI de imagem válida
 * (Evita objetos vazios, 'undefined', 'null', placeholders do Unsplash ou SVGs genéricos)
 */
export function isValidAvatarUrlString(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === '[object Object]' ||
    trimmed === '{}' ||
    trimmed.includes('unsplash.com') ||
    trimmed.includes('images.unsplash') ||
    trimmed.startsWith('data:image/svg+xml')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  );
}

/**
 * Consulta e identifica dados de perfil do usuário diretamente no banco Supabase
 * Suporta profissionais, salões, clientes e histórico de agendamentos com fallback automático para foto gravada
 */
export async function fetchUserProfileFromDb(identifier?: {
  email?: string;
  name?: string;
  cpf?: string;
  clientId?: string;
  userId?: string;
}) {
  if (!supabase || !isSupabaseConfigured) return null;

  const client = getDbClient() || supabase;
  const rawEmail = (
    identifier?.email ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_email') || localStorage.getItem('vagou_active_partner') : '') ||
    ''
  ).trim();
  const rawName = (
    identifier?.name ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_name') : '') ||
    ''
  ).trim();
  const rawCpf = (
    identifier?.cpf ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_cpf') : '') ||
    ''
  ).replace(/\D/g, '');
  const rawClientId = (
    identifier?.clientId ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_client_id') : '') ||
    ''
  ).trim();
  const rawUserId = (
    identifier?.userId ||
    (typeof window !== 'undefined' ? localStorage.getItem('vagou_auth_user_id') : '') ||
    ''
  ).trim();

  const term = rawEmail || rawName;
  const isGenericName = !rawName || rawName === 'Profissional' || rawName === 'Usuário' || rawName === 'Visitante' || rawName === 'Cliente';
  const isRealEmailTerm = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

  let resolvedId = rawClientId || rawUserId || '';
  let resolvedName = !isGenericName ? rawName : '';
  let resolvedEmail = isRealEmailTerm ? rawEmail : '';
  let resolvedPhone = '';
  let resolvedAddress = '';
  let resolvedRole: 'client' | 'professional' = 'client';

  let clientAvatar = '';
  let proAvatar = '';
  let profileAvatar = '';
  let authMetaAvatar = '';

  try {
    // 0. Procurar na tabela system_admins (Administradores Master / Superadmin Master)
    try {
      const { data: sysAdmins } = await (client.from('system_admins' as any) as any)
        .select('*')
        .limit(50);
      if (Array.isArray(sysAdmins)) {
        const cleanTermLower = (rawEmail || rawName || '').trim().toLowerCase();
        const cleanTermNoAt = cleanTermLower.replace(/^[@#&]+|[@#&]+$/g, '');
        const matchedAdmin = sysAdmins.find((sa: any) => {
          const saId = String(sa.id || '').trim();
          const saEmail = String(sa.email || '').trim().toLowerCase();
          const saUser = String(sa.username || '').trim().toLowerCase();
          const saUserNoAt = saUser.replace(/^[@#&]+|[@#&]+$/g, '');
          const saName = String(sa.full_name || '').trim().toLowerCase();
          const saCpf = String(sa.cpf || '').replace(/\D/g, '');
          if (rawUserId && saId === rawUserId) return true;
          if (rawClientId && saId === rawClientId) return true;
          if (rawCpf && rawCpf.length === 11 && saCpf === rawCpf) return true;
          if (cleanTermLower && (saEmail === cleanTermLower || saUser === cleanTermLower || saName === cleanTermLower || (cleanTermNoAt && saUserNoAt === cleanTermNoAt))) {
            return true;
          }
          return false;
        });
        if (matchedAdmin) {
          resolvedRole = 'professional';
          resolvedId = matchedAdmin.id || resolvedId;
          resolvedName = matchedAdmin.full_name || matchedAdmin.username || resolvedName;
          resolvedEmail = matchedAdmin.email || resolvedEmail;
          resolvedPhone = matchedAdmin.phone_whatsapp || matchedAdmin.phone_secondary || resolvedPhone;
          if (isValidAvatarUrlString(matchedAdmin.avatar_url)) {
            proAvatar = matchedAdmin.avatar_url.trim();
          }
        }
      }
    } catch {}

    // 1. Procurar na tabela clients (Fonte Soberana de Clientes e Fotos no Painel Admin / App)
    try {
      let matchedClients: any[] = [];

      if (rawClientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawClientId)) {
        const { data } = await (client.from('clients') as any).select('*').eq('id', rawClientId).limit(5);
        if (data?.length) matchedClients.push(...data);
      }

      if (rawCpf && rawCpf.length >= 11) {
        const { data } = await (client.from('clients') as any).select('*').eq('cpf', rawCpf).limit(5);
        if (data?.length) matchedClients.push(...data);
      }

      if (isRealEmailTerm) {
        const { data } = await (client.from('clients') as any).select('*').ilike('email', rawEmail).limit(10);
        if (data?.length) matchedClients.push(...data);
      }

      if (!isGenericName) {
        const { data: byName } = await (client.from('clients') as any).select('*').ilike('name', rawName).limit(10);
        if (byName?.length) matchedClients.push(...byName);

        const { data: byUsername } = await (client.from('clients') as any).select('*').ilike('username', rawName).limit(10);
        if (byUsername?.length) matchedClients.push(...byUsername);
      }

      if (matchedClients.length > 0) {
        // Prioriza o registro que possui avatar_url válido
        const bestClient =
          matchedClients.find((c) => isValidAvatarUrlString(c?.avatar_url)) ||
          matchedClients[0];

        if (bestClient) {
          resolvedId = bestClient.id || resolvedId;
          resolvedName = bestClient.name || bestClient.username || resolvedName;
          resolvedEmail = bestClient.email || resolvedEmail;
          resolvedPhone = bestClient.phone || resolvedPhone;
          resolvedAddress = bestClient.default_address || resolvedAddress;
          if (isValidAvatarUrlString(bestClient.avatar_url)) {
            clientAvatar = bestClient.avatar_url.trim();
          }
        }
      }
    } catch {}

    // 2. Procurar em professionals
    try {
      let matchedPros: any[] = [];
      if (isRealEmailTerm) {
        const { data } = await (client.from('professionals') as any).select('*').ilike('email', rawEmail).limit(5);
        if (data?.length) matchedPros.push(...data);
      }
      if (!isGenericName) {
        const { data } = await (client.from('professionals') as any).select('*').ilike('name', rawName).limit(5);
        if (data?.length) matchedPros.push(...data);
      }
      if (matchedPros.length > 0) {
        const bestPro =
          matchedPros.find((p) => isValidAvatarUrlString(p?.avatar_url)) ||
          matchedPros[0];
        if (bestPro) {
          resolvedRole = 'professional';
          resolvedId = resolvedId || bestPro.id;
          resolvedName = resolvedName || bestPro.name;
          resolvedEmail = resolvedEmail || bestPro.email || '';
          resolvedPhone = resolvedPhone || bestPro.phone || '';
          if (isValidAvatarUrlString(bestPro.avatar_url)) {
            proAvatar = bestPro.avatar_url.trim();
          }
        }
      }
    } catch {}

    // 3. Procurar no usuário autenticado ativo no Supabase Auth e tabela profiles
    try {
      const { data: authUserResp } = await supabase.auth.getUser();
      const authUser = authUserResp?.user;
      if (authUser) {
        const metaAv = authUser.user_metadata?.avatar_url || authUser.user_metadata?.avatar || '';
        if (isValidAvatarUrlString(metaAv)) {
          authMetaAvatar = metaAv.trim();
        }
        const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || '';
        resolvedId = resolvedId || authUser.id;
        resolvedName = resolvedName || metaName || authUser.email?.split('@')[0] || '';
        resolvedEmail = resolvedEmail || authUser.email || '';
        resolvedPhone = resolvedPhone || authUser.user_metadata?.phone || '';

        const { data: prof } = await (client.from('profiles') as any)
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (prof) {
          resolvedName = resolvedName || prof.full_name || prof.name || '';
          resolvedPhone = resolvedPhone || prof.phone_whatsapp || prof.phone || '';
          if (isValidAvatarUrlString(prof.avatar_url)) {
            profileAvatar = prof.avatar_url.trim();
          }
        }
      }
    } catch {}

    // 4. Procurar em profiles por email ou nome caso ainda não tenha avatar
    if (!clientAvatar && !proAvatar && !profileAvatar && term) {
      try {
        let query = client.from('profiles').select('*');
        if (isRealEmailTerm) {
          query = query.ilike('email', rawEmail);
        } else if (!isGenericName) {
          query = query.ilike('full_name', rawName);
        }
        const { data: profiles } = await (query as any).limit(5);
        if (profiles && profiles.length > 0) {
          const bestProf =
            profiles.find((p: any) => isValidAvatarUrlString(p?.avatar_url)) ||
            profiles[0];
          if (bestProf) {
            resolvedId = resolvedId || bestProf.id;
            resolvedName = resolvedName || bestProf.full_name || bestProf.name || '';
            resolvedEmail = resolvedEmail || bestProf.email || '';
            resolvedPhone = resolvedPhone || bestProf.phone_whatsapp || bestProf.phone || '';
            if (isValidAvatarUrlString(bestProf.avatar_url)) {
              profileAvatar = bestProf.avatar_url.trim();
            }
          }
        }
      } catch {}
    }

    const finalAvatar = clientAvatar || proAvatar || profileAvatar || authMetaAvatar || '';

    if (resolvedId || resolvedName || resolvedEmail || finalAvatar) {
      return {
        type: resolvedRole,
        id: resolvedId,
        name: resolvedName || term || 'Usuário',
        email: resolvedEmail,
        phone: resolvedPhone,
        address: resolvedAddress,
        avatarUrl: finalAvatar,
      };
    }
  } catch (err) {
    console.warn('Erro ao consultar perfil no Supabase:', err);
  }

  return null;
}

/**
 * Resolução universal e canônica de foto de perfil na Tríade VagouApp
 * Homologada pela Engenharia da Tríade (pvapp ⇄ mnvapp ⇄ admvapp)
 */
export function resolveTriadeAvatar(params: {
  professionalAvatar?: string | null;
  clientAvatar?: string | null;
  authMetadataAvatar?: string | null;
  salonLogo?: string | null;
  isBusinessContext?: boolean; // true apenas em cards institucionais do salão
}): string {
  // 1. Prioridade absoluta: Foto real da pessoa física (aceita qualquer URL válida ou Base64)
  const candidates = [
    params.clientAvatar,
    params.professionalAvatar,
    params.authMetadataAvatar,
  ];

  for (const candidate of candidates) {
    if (isValidAvatarUrlString(candidate)) {
      return candidate.trim();
    }
  }

  // 2. Se e somente se o contexto for institucional do salão (ex: logo do espaço)
  if (params.isBusinessContext && isValidAvatarUrlString(params.salonLogo)) {
    return params.salonLogo.trim();
  }

  // 3. Fallback neutro: Retorna string vazia para renderizar o ícone oficial User da lucide-react
  return '';
}

/**
 * Resolução universal de avatar do usuário no Supabase (Tríade Sync — Fonte Única da Verdade)
 * Boletim Técnico: bol-008-mobile-avatar-sync-storage-resolution
 */
export async function getUniversalUserAvatar(userEmail: string, authMetadataAvatar?: string): Promise<string | null> {
  if (isValidAvatarUrlString(authMetadataAvatar)) {
    return authMetadataAvatar.trim();
  }

  if (!supabase || !isSupabaseConfigured || !userEmail) {
    return null;
  }

  try {
    const cleanEmail = userEmail.trim().toLowerCase();
    const client = getDbClient() || supabase;

    // 1. Busca na tabela clients
    const { data: clientRows } = await (client.from('clients') as any)
      .select('avatar_url')
      .ilike('email', `%${cleanEmail}%`)
      .limit(10);

    const validClientRow = clientRows?.find((r: any) => isValidAvatarUrlString(r?.avatar_url));
    if (validClientRow?.avatar_url) {
      return validClientRow.avatar_url.trim();
    }

    // 2. Fallback inteligente: se não achou em clients, busca em professionals
    const { data: profRows } = await (client.from('professionals') as any)
      .select('avatar_url')
      .ilike('email', `%${cleanEmail}%`)
      .limit(10);

    const validProfRow = profRows?.find((r: any) => isValidAvatarUrlString(r?.avatar_url));
    if (validProfRow?.avatar_url) {
      return validProfRow.avatar_url.trim();
    }
  } catch (err) {
    console.warn('Erro em getUniversalUserAvatar:', err);
  }

  return null;
}

/**
 * Atualiza ou sincroniza dados de perfil do usuário diretamente no banco Supabase
 * Atualiza tabela relacional (clients/professionals/profiles) e espelha em auth.users.user_metadata
 */
export async function updateUserProfileInDb(profile: {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  address?: string;
  avatarUrl?: string;
  clientId?: string;
  userId?: string;
  type?: 'client' | 'pro' | 'admin';
}) {
  if (!supabase || !isSupabaseConfigured) {
    return { success: true, localOnly: true, avatarUrl: isValidAvatarUrlString(profile.avatarUrl) ? profile.avatarUrl.trim() : '' };
  }

  try {
    const cleanEmail = (profile.email || '').trim().toLowerCase();
    const cleanName = (profile.name || '').trim();
    const cleanPhone = (profile.phone || '').trim();
    const cleanCpf = (
      profile.cpf ||
      (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_cpf') : '') ||
      ''
    ).replace(/\D/g, '');
    const storedClientId =
      profile.clientId ||
      (typeof window !== 'undefined' ? localStorage.getItem('vagou_client_id') || '' : '');
    const storedUserId =
      profile.userId ||
      (typeof window !== 'undefined' ? localStorage.getItem('vagou_auth_user_id') || '' : '');

    // Validação estrita da string de avatar antes de persistir no Supabase
    const hasValidAvatar = isValidAvatarUrlString(profile.avatarUrl);
    const cleanAvatar = hasValidAvatar ? profile.avatarUrl!.trim() : '';

    // 1. Espelhar metadados globais no auth.users (apenas se avatar for URL curta para não estourar limite JWT)
    try {
      const isShortUrl = cleanAvatar.startsWith('http://') || cleanAvatar.startsWith('https://');
      await supabase.auth.updateUser({
        data: {
          ...(cleanName ? { full_name: cleanName } : {}),
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          ...(cleanCpf ? { cpf: cleanCpf } : {}),
          ...(isShortUrl ? { avatar_url: cleanAvatar } : {}),
        },
      });
    } catch (authErr) {
      console.warn('Aviso: Não foi possível atualizar auth.users.user_metadata:', authErr);
    }

    const client = getDbClient() || supabase;

    // 1.5 Atualizar tabela system_admins caso o usuário seja Administrador Master / Superadmin
    try {
      const adminUpdatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (cleanName) adminUpdatePayload.full_name = cleanName;
      if (cleanPhone) adminUpdatePayload.phone_whatsapp = cleanPhone;
      if (cleanCpf) adminUpdatePayload.cpf = cleanCpf;
      if (hasValidAvatar) adminUpdatePayload.avatar_url = cleanAvatar;

      if (storedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedUserId)) {
        await (client.from('system_admins' as any) as any).update(adminUpdatePayload).eq('id', storedUserId);
      } else if (cleanEmail) {
        await (client.from('system_admins' as any) as any).update(adminUpdatePayload).ilike('email', cleanEmail);
      }
    } catch {}

    // 2. Atualizar tabela professionals (Unificada para Single Source of Truth)
    if (cleanEmail || cleanName) {
      const proUpdatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (cleanName) proUpdatePayload.name = cleanName;
      if (cleanPhone) proUpdatePayload.phone = cleanPhone;
      if (hasValidAvatar) proUpdatePayload.avatar_url = cleanAvatar;

      if (cleanEmail) {
        await (client.from('professionals') as any)
          .update(proUpdatePayload)
          .ilike('email', cleanEmail);
      } else if (cleanName && cleanName !== 'Usuário' && cleanName !== 'Profissional') {
        await (client.from('professionals') as any)
          .update(proUpdatePayload)
          .ilike('name', cleanName);
      }
    }

    // 3. Atualizar tabela profiles (caso exista registro espelhado)
    try {
      const profileUpdatePayload: Record<string, any> = {};
      if (cleanName) profileUpdatePayload.full_name = cleanName;
      if (cleanPhone) profileUpdatePayload.phone_whatsapp = cleanPhone;
      if (hasValidAvatar) profileUpdatePayload.avatar_url = cleanAvatar;

      if (Object.keys(profileUpdatePayload).length > 0) {
        if (storedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedUserId)) {
          await (client.from('profiles') as any).update(profileUpdatePayload).eq('id', storedUserId);
        }
        if (cleanEmail) {
          await (client.from('profiles') as any).update(profileUpdatePayload).ilike('email', cleanEmail);
        }
      }
    } catch {}

    // 4. Atualizar ou inserir na tabela clients (Garantindo que avatar_url seja gravado em todos os identificadores do cliente)
    const matchedClientIds = new Set<string>();

    if (storedClientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedClientId)) {
      const { data } = await (client.from('clients') as any).select('id').eq('id', storedClientId).limit(5);
      data?.forEach((r: any) => r?.id && matchedClientIds.add(String(r.id)));
    }

    if (cleanCpf && cleanCpf.length >= 11) {
      const { data } = await (client.from('clients') as any).select('id').eq('cpf', cleanCpf).limit(10);
      data?.forEach((r: any) => r?.id && matchedClientIds.add(String(r.id)));
    }

    if (cleanEmail) {
      const { data } = await (client.from('clients') as any).select('id').ilike('email', cleanEmail).limit(10);
      data?.forEach((r: any) => r?.id && matchedClientIds.add(String(r.id)));
    }

    if (matchedClientIds.size === 0 && cleanName && cleanName !== 'Usuário' && cleanName !== 'Cliente') {
      const { data } = await (client.from('clients') as any).select('id').ilike('name', cleanName).limit(10);
      data?.forEach((r: any) => r?.id && matchedClientIds.add(String(r.id)));
    }

    const clientUpdatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (cleanName) clientUpdatePayload.name = cleanName;
    if (cleanEmail) clientUpdatePayload.email = cleanEmail;
    if (cleanPhone) clientUpdatePayload.phone = cleanPhone;
    if (cleanCpf) clientUpdatePayload.cpf = cleanCpf;
    if (profile.address !== undefined) clientUpdatePayload.default_address = profile.address || null;
    if (hasValidAvatar) clientUpdatePayload.avatar_url = cleanAvatar;

    if (matchedClientIds.size > 0) {
      const idsArray = Array.from(matchedClientIds);
      const { error: updateErr } = await (client.from('clients') as any)
        .update(clientUpdatePayload)
        .in('id', idsArray);

      if (updateErr) {
        console.warn('Aviso ao atualizar clients por IDs:', updateErr);
      }
      if (typeof window !== 'undefined' && idsArray[0]) {
        try {
          localStorage.setItem('vagou_client_id', idsArray[0]);
        } catch {}
      }
    } else if (cleanEmail || cleanName || cleanCpf) {
      const { data: insertedClient, error: insertErr } = await (client.from('clients') as any)
        .insert({
          name: cleanName || 'Cliente',
          email: cleanEmail || null,
          phone: cleanPhone || null,
          ...(cleanCpf ? { cpf: cleanCpf } : {}),
          avatar_url: hasValidAvatar ? cleanAvatar : null,
          default_address: profile.address || null,
        })
        .select('id')
        .maybeSingle();

      if (insertErr) {
        console.warn('Aviso ao inserir novo cliente em clients:', insertErr);
      } else if (insertedClient?.id && typeof window !== 'undefined') {
        try {
          localStorage.setItem('vagou_client_id', String(insertedClient.id));
        } catch {}
      }
    }

    return { success: true, avatarUrl: cleanAvatar };
  } catch (err: any) {
    console.error('Erro ao salvar perfil unificado no Supabase:', err);
    return { success: false, error: err.message };
  }
}

export const updateUserProfile = updateUserProfileInDb;


/**
 * Assegura que um registro de salão exista no Supabase com UUID válido e pronto para CRUD
 */
export async function ensureSalonRow(params: {
  id?: string;
  slug?: string;
  tradeName?: string;
  name?: string;
  ownerId?: string;
  email?: string;
  phoneWhatsapp?: string;
  primaryColor?: string;
}): Promise<any> {
  if (!supabase || !isSupabaseConfigured) return null;
  const client = getDbClient() || supabase;

  try {
    // 1. Checa por ID (se for UUID válido)
    if (params.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
      const { data: byId } = await (client.from('salons') as any).select('*').eq('id', params.id).maybeSingle();
      if (byId) return byId;
    }

    // 2. Checa por slug
    const targetSlug = (params.slug || (params.tradeName || params.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || '').trim();
    if (targetSlug && targetSlug !== 'meu-estabelecimento') {
      const { data: bySlug } = await (client.from('salons') as any).select('*').eq('slug', targetSlug).maybeSingle();
      if (bySlug) return bySlug;
    }

    // 3. Checa por owner_id
    if (params.ownerId) {
      const { data: byOwner } = await (client.from('salons') as any).select('*').eq('owner_id', params.ownerId).maybeSingle();
      if (byOwner) return byOwner;
    }

    // 4. Checa por e-mail
    if (params.email) {
      const { data: byEmail } = await (client.from('salons') as any).select('*').ilike('email', params.email.trim()).maybeSingle();
      if (byEmail) return byEmail;
    }

    // 4.1 Checa pelo nome do estabelecimento (se fornecido)
    const searchName = params.tradeName || params.name;
    if (searchName && searchName !== 'Meu Estabelecimento') {
      const { data: byName } = await (client.from('salons') as any)
        .select('*')
        .ilike('trade_name', `%${searchName.trim()}%`)
        .maybeSingle();
      if (byName) return byName;
    }

    // 4.2 Checa por salão salvo em cache local no navegador
    if (typeof window !== 'undefined') {
      const cachedId = localStorage.getItem('vagou_salon_db_id');
      if (cachedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cachedId)) {
        const { data: byCachedId } = await (client.from('salons') as any).select('*').eq('id', cachedId).maybeSingle();
        if (byCachedId) return byCachedId;
      }
    }

    // 5. Se ainda não encontrado e o usuário não especificou um nome próprio, usa o primeiro salão ativo como fallback
    if (!searchName || searchName === 'Meu Estabelecimento') {
      const { data: firstActive } = await (client.from('salons') as any).select('*').eq('is_active', true).order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (firstActive) {
        return firstActive;
      }
    }

    // 6. Caso não exista, cria e persiste um novo registro de salão
    const newId = (params.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id))
      ? params.id
      : generateUuidV4();
    const finalTradeName = params.tradeName || params.name || 'Meu Estabelecimento';
    const finalSlug = targetSlug || `salao-${newId.slice(0, 8)}`;

    const newSalonPayload = {
      id: newId,
      slug: finalSlug,
      trade_name: finalTradeName,
      legal_name: finalTradeName,
      email: params.email || null,
      phone_whatsapp: params.phoneWhatsapp || null,
      owner_id: params.ownerId || null,
      is_active: true,
      primary_color: params.primaryColor || '#20C933',
      branding: {
        primaryColor: params.primaryColor || '#20C933',
        secondaryColor: '#0F172A',
        themeMode: 'dark',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insErr } = await (client.from('salons') as any)
      .upsert(newSalonPayload, { onConflict: 'slug' })
      .select()
      .maybeSingle();

    if (insErr) {
      console.warn('Erro ao auto-criar salão no Supabase:', insErr.message);
      const { data: fallback } = await (client.from('salons') as any).select('*').eq('slug', finalSlug).maybeSingle();
      return fallback || null;
    }

    return inserted;
  } catch (err) {
    console.warn('Falha em ensureSalonRow:', err);
    return null;
  }
}

/**
 * Busca completa de dados do Salão pelo slug, nome, email ou owner_id
 */
export async function fetchCompleteSalonData(identifier: { slug?: string; name?: string; email?: string; ownerId?: string }) {
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    let query = (supabase.from('salons') as any).select('*');
    if (identifier.ownerId) {
      query = query.eq('owner_id', identifier.ownerId);
    } else if (identifier.slug) {
      query = query.eq('slug', identifier.slug);
    } else if (identifier.email) {
      query = query.ilike('email', `%${identifier.email}%`);
    } else if (identifier.name) {
      query = query.or(`trade_name.ilike.%${identifier.name}%,slug.ilike.%${identifier.name.toLowerCase().replace(/\s+/g, '-')}%`);
    } else {
      return null;
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn('Erro ao carregar dados completos do salão:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Falha ao consultar salão no Supabase:', err);
    return null;
  }
}

/**
 * Atualiza configurações, identidade visual e dados cadastrais do Salão no Supabase
 */
export async function updateSalonSettingsInDb(salonIdOrSlug: string, settings: any) {
  if (!supabase || !isSupabaseConfigured || !salonIdOrSlug) {
    return { success: false, error: 'Supabase não configurado ou identificador vazio' };
  }
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonIdOrSlug);

    // Obter registro atual para preservar o objeto JSONB branding existente sem perda de chaves
    let existingRow: any = null;
    try {
      const { data: currentSalon } = await (supabase.from('salons') as any)
        .select('owner_id, branding, primary_color, trade_name, logo_url, logo_dark_url, logo_light_url')
        .match(isUuid ? { id: salonIdOrSlug } : { slug: salonIdOrSlug })
        .maybeSingle();
      existingRow = currentSalon;
    } catch {}

    const existingBranding = (existingRow?.branding && typeof existingRow.branding === 'object') ? existingRow.branding : {};

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (settings.salonName || settings.tradeName) payload.trade_name = settings.salonName || settings.tradeName;

    // Separação Comercial vs Fiscal (CNPJ 14 dígitos): Quando Autônomo (sem CNPJ), document_number e legal_name permanecem ''
    if (settings.cnpj !== undefined || settings.documentNumber !== undefined || settings.razaoSocial !== undefined || settings.legalName !== undefined) {
      const rawDoc = (settings.cnpj ?? settings.documentNumber ?? '').replace(/\D/g, '');
      const isCnpj14 = rawDoc.length === 14;
      payload.document_number = isCnpj14 ? (settings.cnpj ?? settings.documentNumber ?? '').trim() : '';
      payload.legal_name = isCnpj14 ? (settings.razaoSocial ?? settings.legalName ?? '').trim() : '';
      payload.document_type = isCnpj14 ? 'CNPJ' : '';
    }

    // Isolamento do CPF Pessoal do Titular (salons.owner_cpf + espelho em clients.cpf)
    const rawOwnerCpf = settings.ownerCpf ?? settings.legalManagerCpf;
    if (rawOwnerCpf !== undefined) {
      const cleanOwnerCpf = String(rawOwnerCpf).trim();
      payload.owner_cpf = cleanOwnerCpf || null;
      // Espelha o CPF na tabela public.clients do proprietário/titular
      try {
        const ownerUserId = existingRow?.owner_id;
        const ownerEmail = settings.legalManagerEmail || settings.email;
        if (cleanOwnerCpf) {
          if (ownerUserId) {
            await (supabase.from('clients') as any)
              .update({ cpf: cleanOwnerCpf, updated_at: new Date().toISOString() })
              .eq('user_id', ownerUserId);
          } else if (ownerEmail) {
            await (supabase.from('clients') as any)
              .update({ cpf: cleanOwnerCpf, updated_at: new Date().toISOString() })
              .ilike('email', ownerEmail.trim().toLowerCase());
          }
        }
      } catch {}
    }

    // Suporte a Múltiplas Chaves PIX (pix_keys JSONB) e Chave PIX Principal (pix_key text)
    if (settings.pixKeys !== undefined || settings.pixKey !== undefined) {
      const pixKeysList = Array.isArray(settings.pixKeys)
        ? settings.pixKeys
        : (Array.isArray(existingBranding.pixKeys) ? existingBranding.pixKeys : []);
      const primaryFromArray = pixKeysList.find((k: any) => k?.isPrimary)?.key || pixKeysList[0]?.key || '';
      const resolvedPrimaryPix = settings.pixKey !== undefined
        ? (settings.pixKey || primaryFromArray || '')
        : primaryFromArray;

      payload.pix_key = resolvedPrimaryPix;
      if (settings.pixKeys !== undefined) {
        payload.pix_keys = pixKeysList;
      }
    }

    if (settings.salonPhone || settings.phoneWhatsapp || settings.legalManagerPhone) {
      payload.phone_whatsapp = settings.salonPhone || settings.phoneWhatsapp || settings.legalManagerPhone;
    }
    if (settings.phoneLandline !== undefined || settings.phone_landline !== undefined) {
      payload.phone_landline = settings.phoneLandline ?? settings.phone_landline ?? '';
    }
    if (settings.category !== undefined) {
      payload.category = settings.category;
    }
    if (settings.email !== undefined || settings.legalManagerEmail !== undefined) {
      payload.email = settings.email || settings.legalManagerEmail || '';
    }
    if (settings.salonAddress !== undefined || settings.address !== undefined || settings.logradouro !== undefined) {
      payload.address = settings.salonAddress ?? settings.address ?? settings.logradouro ?? '';
    }
    if (settings.numero !== undefined || settings.streetNumber !== undefined) {
      payload.street_number = settings.numero ?? settings.streetNumber ?? '';
    }
    if (settings.complemento !== undefined || settings.complement !== undefined) {
      payload.complement = settings.complemento ?? settings.complement ?? '';
    }
    if (settings.bairro !== undefined || settings.neighborhood !== undefined) {
      payload.neighborhood = settings.bairro ?? settings.neighborhood ?? '';
    }
    if (settings.cidade !== undefined || settings.city !== undefined) {
      payload.city = settings.cidade ?? settings.city ?? '';
    }
    if (settings.uf !== undefined || settings.state !== undefined) {
      payload.state = settings.uf ?? settings.state ?? '';
    }
    if (settings.cep !== undefined || settings.postalCode !== undefined) {
      payload.cep = settings.cep ?? settings.postalCode ?? '';
    }
    if (settings.operatingHoursJson !== undefined) {
      payload.operating_hours = settings.operatingHoursJson;
    }
    if (settings.salonLogoLight !== undefined) payload.logo_light_url = settings.salonLogoLight || null;
    if (settings.salonLogoDark !== undefined) payload.logo_dark_url = settings.salonLogoDark || null;
    if (settings.salonLogo !== undefined || settings.logoUrl !== undefined) {
      payload.logo_url = settings.salonLogo || settings.logoUrl || settings.salonLogoDark || settings.salonLogoLight || null;
    }

    // Colunas sincronizadas pelo Boletim bol-017 (favicon_url, slogan, brand_font)
    if (settings.salonIcon !== undefined || settings.faviconUrl !== undefined) {
      payload.favicon_url = settings.salonIcon || settings.faviconUrl || settings.salonLogo || null;
    }
    if (settings.slogan !== undefined) {
      payload.slogan = settings.slogan ?? undefined;
    }
    if (settings.brandFont !== undefined) {
      payload.brand_font = settings.brandFont || 'Poppins';
    }
    if (settings.accentColor || settings.primaryColor) {
      payload.primary_color = settings.accentColor || settings.primaryColor;
    }
    if (settings.secondaryColor !== undefined) {
      payload.secondary_color = settings.secondaryColor;
    }

    // Tema Camaleão (theme_preset_id) e Fotos do Espaço (facade_photo_url / interior_photo_url)
    const effectiveHex = (settings.accentColor || settings.primaryColor || existingBranding.primaryColor || existingRow?.primary_color || '#20C933').toLowerCase();
    const resolvedThemePreset =
      settings.themePresetId ||
      (effectiveHex === '#f59e0b' || effectiveHex === '#d97706'
        ? 'gold-luxury'
        : effectiveHex === '#ef4444' || effectiveHex === '#ec4899' || effectiveHex === '#f43f5e'
        ? 'rose-glam'
        : effectiveHex === '#8b5cf6' || effectiveHex === '#a855f7'
        ? 'purple-neon'
        : effectiveHex === '#3b82f6' || effectiveHex === '#0ea5e9'
        ? 'clean-light'
        : 'emerald-dark');
    payload.theme_preset_id = resolvedThemePreset;

    const firstSpacePhoto = Array.isArray(settings.spacePhotos) && settings.spacePhotos.length > 0 ? settings.spacePhotos[0]?.url : undefined;
    const secondSpacePhoto = Array.isArray(settings.spacePhotos) && settings.spacePhotos.length > 1 ? settings.spacePhotos[1]?.url : undefined;
    if (settings.facadePhotoUrl !== undefined || firstSpacePhoto !== undefined) {
      payload.facade_photo_url = settings.facadePhotoUrl ?? firstSpacePhoto ?? null;
    }
    if (settings.interiorPhotoUrl !== undefined || secondSpacePhoto !== undefined) {
      payload.interior_photo_url = settings.interiorPhotoUrl ?? secondSpacePhoto ?? null;
    }

    if (settings.bio !== undefined) payload.bio = settings.bio;

    // Colunas de Layout, Cores de Seção e Barra de Navegação Inferior
    if (settings.defaultTheme !== undefined) payload.default_theme = settings.defaultTheme;
    if (settings.pwaName !== undefined) payload.pwa_name = settings.pwaName;
    if (settings.showSlogan !== undefined) payload.show_slogan = settings.showSlogan;
    if (settings.logoTextFallback !== undefined) payload.logo_text_fallback = settings.logoTextFallback;
    if (settings.logoTextColor !== undefined) payload.logo_text_color = settings.logoTextColor;
    if (settings.showHeroSlides !== undefined) payload.show_hero_slides = settings.showHeroSlides;
    if (settings.welcomeStyle !== undefined) payload.welcome_style = settings.welcomeStyle;

    if (settings.sectionHeaderBgColor !== undefined) payload.section_header_bg_color = settings.sectionHeaderBgColor;
    if (settings.sectionHeaderTextColor !== undefined) payload.section_header_text_color = settings.sectionHeaderTextColor;
    if (settings.sectionHeaderIconColor !== undefined) payload.section_header_icon_color = settings.sectionHeaderIconColor;
    if (settings.sectionHeaderBgStyle !== undefined) payload.section_header_bg_style = settings.sectionHeaderBgStyle;
    if (settings.sectionHeaderBorder !== undefined) payload.section_header_border = settings.sectionHeaderBorder;
    if (settings.sectionHeaderBtnBgColor !== undefined) payload.section_header_btn_bg_color = settings.sectionHeaderBtnBgColor;
    if (settings.sectionHeaderBtnActiveBgColor !== undefined) payload.section_header_btn_active_bg_color = settings.sectionHeaderBtnActiveBgColor;
    if (settings.sectionHeaderBtnBorder !== undefined) payload.section_header_btn_border = settings.sectionHeaderBtnBorder;
    if (settings.sectionHeaderBtnShadow !== undefined) payload.section_header_btn_shadow = settings.sectionHeaderBtnShadow;
    if (settings.sectionHeaderBtnBlur !== undefined) payload.section_header_btn_blur = settings.sectionHeaderBtnBlur;
    if (settings.sectionHeaderBtnFont !== undefined) payload.section_header_btn_font = settings.sectionHeaderBtnFont;

    if (settings.navStyle !== undefined) payload.nav_style = settings.navStyle;
    if (settings.navShape !== undefined) payload.nav_shape = settings.navShape;
    if (settings.navBorder !== undefined) payload.nav_border = settings.navBorder;
    if (settings.navIconBorder !== undefined) payload.nav_icon_border = settings.navIconBorder;
    if (settings.navBgStyle !== undefined) payload.nav_bg_style = settings.navBgStyle;
    if (settings.navBgColor !== undefined) payload.nav_bg_color = settings.navBgColor;
    if (settings.navBtnBgColor !== undefined) payload.nav_btn_bg_color = settings.navBtnBgColor;
    if (settings.navBtnActiveBgColor !== undefined) payload.nav_btn_active_bg_color = settings.navBtnActiveBgColor;
    if (settings.navActiveColor !== undefined) payload.nav_active_color = settings.navActiveColor;
    if (settings.navTextColor !== undefined) payload.nav_text_color = settings.navTextColor;
    if (settings.navBtnShadow !== undefined) payload.nav_btn_shadow = settings.navBtnShadow;
    if (settings.navBtnBlur !== undefined) payload.nav_btn_blur = settings.navBtnBlur;
    if (settings.navBtnFont !== undefined) payload.nav_btn_font = settings.navBtnFont;

    const resolvedIcon =
      settings.salonIcon !== undefined
        ? (settings.salonIcon || settings.salonLogo || '')
        : (settings.faviconUrl !== undefined
            ? settings.faviconUrl
            : (existingBranding.salonIcon || existingBranding.faviconUrl || existingRow?.logo_url || ''));

    payload.branding = {
      ...existingBranding,
      themePresetId: resolvedThemePreset,
      primaryColor: settings.accentColor || settings.primaryColor || existingBranding.primaryColor || existingRow?.primary_color || '#20C933',
      ...(settings.secondaryColor !== undefined ? { secondaryColor: settings.secondaryColor } : {}),
      ...(payload.facade_photo_url !== undefined ? { facadePhotoUrl: payload.facade_photo_url } : {}),
      ...(payload.interior_photo_url !== undefined ? { interiorPhotoUrl: payload.interior_photo_url } : {}),
      pwaName: settings.pwaName || settings.salonName || existingBranding.pwaName || existingRow?.trade_name,
      defaultTheme: settings.defaultTheme || existingBranding.defaultTheme || 'dark',
      themeMode: settings.defaultTheme || existingBranding.defaultTheme || 'dark',
      showSlogan: settings.showSlogan !== undefined ? settings.showSlogan : (existingBranding.showSlogan !== false),
      logoTextFallback: settings.logoTextFallback !== undefined ? settings.logoTextFallback : (existingBranding.logoTextFallback || ''),
      logoTextColor: settings.logoTextColor !== undefined ? settings.logoTextColor : (existingBranding.logoTextColor || settings.accentColor || '#20C933'),
      showHeroSlides: settings.showHeroSlides !== undefined ? settings.showHeroSlides : (existingBranding.showHeroSlides !== false),
      faviconUrl: resolvedIcon,
      salonIcon: resolvedIcon,
      slogan: settings.slogan !== undefined ? (settings.slogan || '') : (existingBranding.slogan || ''),
      brandFont: settings.brandFont || existingBranding.brandFont || 'Poppins',
      welcomeStyle: settings.welcomeStyle || existingBranding.welcomeStyle || 'atmospheric',

      // Barra de Títulos das Seções (Section Header)
      sectionHeaderBgColor: settings.sectionHeaderBgColor !== undefined ? settings.sectionHeaderBgColor : existingBranding.sectionHeaderBgColor,
      sectionHeaderTextColor: settings.sectionHeaderTextColor !== undefined ? settings.sectionHeaderTextColor : existingBranding.sectionHeaderTextColor,
      sectionHeaderIconColor: settings.sectionHeaderIconColor !== undefined ? settings.sectionHeaderIconColor : existingBranding.sectionHeaderIconColor,
      sectionHeaderBgStyle: settings.sectionHeaderBgStyle || existingBranding.sectionHeaderBgStyle || 'glass',
      sectionHeaderBorder: settings.sectionHeaderBorder || existingBranding.sectionHeaderBorder || 'bordered',
      sectionHeaderBtnBgColor: settings.sectionHeaderBtnBgColor !== undefined ? settings.sectionHeaderBtnBgColor : existingBranding.sectionHeaderBtnBgColor,
      sectionHeaderBtnActiveBgColor: settings.sectionHeaderBtnActiveBgColor !== undefined ? settings.sectionHeaderBtnActiveBgColor : existingBranding.sectionHeaderBtnActiveBgColor,
      sectionHeaderBtnBorder: settings.sectionHeaderBtnBorder !== undefined ? settings.sectionHeaderBtnBorder : existingBranding.sectionHeaderBtnBorder,
      sectionHeaderBtnShadow: settings.sectionHeaderBtnShadow !== undefined ? settings.sectionHeaderBtnShadow : existingBranding.sectionHeaderBtnShadow,
      sectionHeaderBtnBlur: settings.sectionHeaderBtnBlur !== undefined ? settings.sectionHeaderBtnBlur : existingBranding.sectionHeaderBtnBlur,
      sectionHeaderBtnFont: settings.sectionHeaderBtnFont !== undefined ? settings.sectionHeaderBtnFont : existingBranding.sectionHeaderBtnFont,

      // Barra de Navegação Inferior (BottomNav)
      navStyle: settings.navStyle || existingBranding.navStyle || 'minimal',
      navShape: settings.navShape || existingBranding.navShape || 'square',
      navBorder: settings.navBorder || existingBranding.navBorder || 'bordered',
      navIconBorder: settings.navIconBorder || existingBranding.navIconBorder || 'none',
      navBgStyle: settings.navBgStyle || existingBranding.navBgStyle || 'glass',
      navBgColor: settings.navBgColor !== undefined ? settings.navBgColor : existingBranding.navBgColor,
      navBtnBgColor: settings.navBtnBgColor !== undefined ? settings.navBtnBgColor : existingBranding.navBtnBgColor,
      navBtnActiveBgColor: settings.navBtnActiveBgColor !== undefined ? settings.navBtnActiveBgColor : existingBranding.navBtnActiveBgColor,
      navActiveColor: settings.navActiveColor || settings.accentColor || existingBranding.navActiveColor || existingBranding.primaryColor || '#20C933',
      navTextColor: settings.navTextColor !== undefined ? settings.navTextColor : existingBranding.navTextColor,
      navBtnShadow: settings.navBtnShadow !== undefined ? settings.navBtnShadow : existingBranding.navBtnShadow,
      navBtnBlur: settings.navBtnBlur !== undefined ? settings.navBtnBlur : existingBranding.navBtnBlur,
      navBtnFont: settings.navBtnFont !== undefined ? settings.navBtnFont : existingBranding.navBtnFont,

      ...(rawOwnerCpf !== undefined ? { ownerCpf: String(rawOwnerCpf).trim() } : {}),
      ...(payload.pix_key !== undefined ? { pixKey: payload.pix_key } : {}),
      ...(payload.pix_keys !== undefined ? { pixKeys: payload.pix_keys } : {}),
      ...(settings.category !== undefined ? { category: settings.category } : {}),
      ...(settings.email !== undefined || settings.legalManagerEmail !== undefined
        ? { email: settings.email || settings.legalManagerEmail || '', ownerEmail: settings.email || settings.legalManagerEmail || '' }
        : {}),
      ...(settings.phoneLandline !== undefined ? { phoneLandline: settings.phoneLandline } : {}),
      ...(settings.cep !== undefined ? { cep: settings.cep } : {}),
      ...(settings.numero !== undefined ? { numero: settings.numero } : {}),
      ...(settings.complemento !== undefined ? { complemento: settings.complemento } : {}),
      ...(settings.openingHours !== undefined ? { openingHours: settings.openingHours } : {}),
      ...(settings.operatingSchedule !== undefined ? { operatingSchedule: settings.operatingSchedule } : {}),
      ...(settings.operatingHoursJson !== undefined ? { operatingHoursJson: settings.operatingHoursJson } : {}),
      ...(settings.holidays !== undefined ? { holidays: settings.holidays } : {}),
      ...(settings.cancellationPolicy !== undefined ? { cancellationPolicy: settings.cancellationPolicy } : {}),
      ...(settings.spacePhotos !== undefined ? { spacePhotos: settings.spacePhotos } : {}),
      ...(settings.websiteUrl !== undefined ? { websiteUrl: settings.websiteUrl || '' } : {}),
      ...(settings.instagramUrl !== undefined ? { instagramUrl: settings.instagramUrl || '' } : {}),
      ...(settings.facebookUrl !== undefined ? { facebookUrl: settings.facebookUrl || '' } : {}),
      ...(settings.mapsUrl !== undefined ? { mapsUrl: settings.mapsUrl || '' } : {}),
      ...(settings.bio !== undefined ? { bio: settings.bio || '' } : {}),
    };

    let { data, error } = await (supabaseAdmin.from('salons') as any)
      .update(payload)
      .match(isUuid ? { id: salonIdOrSlug } : { slug: salonIdOrSlug })
      .select()
      .maybeSingle();

    // Fallback resiliente caso alguma coluna física ainda não exista no banco remoto (preserva branding)
    if (error && (error.message?.includes('column') || error.code === '42703' || error.code === 'PGRST204')) {
      const fallbackPayload: Record<string, any> = {
        trade_name: payload.trade_name,
        legal_name: payload.legal_name,
        phone_whatsapp: payload.phone_whatsapp,
        address: payload.address,
        neighborhood: payload.neighborhood,
        city: payload.city,
        state: payload.state,
        primary_color: payload.primary_color,
        secondary_color: payload.secondary_color,
        logo_url: payload.logo_url,
        logo_light_url: payload.logo_light_url,
        logo_dark_url: payload.logo_dark_url,
        branding: payload.branding,
        updated_at: new Date().toISOString(),
      };
      const retry = await (supabaseAdmin.from('salons') as any)
        .update(fallbackPayload)
        .match(isUuid ? { id: salonIdOrSlug } : { slug: salonIdOrSlug })
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    const resolvedSalonUuid = data?.id || (isUuid ? salonIdOrSlug : null);

    // Espelhar na tabela dedicada public.salon_ui_settings para persistência estruturada
    if (resolvedSalonUuid) {
      try {
        await (supabaseAdmin.from('salon_ui_settings' as any) as any).upsert({
          salon_id: resolvedSalonUuid,
          default_theme: settings.defaultTheme || 'dark',
          primary_color: settings.accentColor || settings.primaryColor || '#20C933',
          secondary_color: settings.secondaryColor || '#0F172A',
          brand_font: settings.brandFont || 'Poppins',
          pwa_name: settings.pwaName || settings.salonName || null,
          slogan: settings.slogan || null,
          show_slogan: settings.showSlogan !== false,
          logo_text_fallback: settings.logoTextFallback || null,
          logo_text_color: settings.logoTextColor || null,
          show_hero_slides: settings.showHeroSlides !== false,
          welcome_style: settings.welcomeStyle || 'atmospheric',
          section_header_bg_color: settings.sectionHeaderBgColor || null,
          section_header_text_color: settings.sectionHeaderTextColor || null,
          section_header_icon_color: settings.sectionHeaderIconColor || null,
          section_header_bg_style: settings.sectionHeaderBgStyle || 'glass',
          section_header_border: settings.sectionHeaderBorder || 'bordered',
          section_header_btn_bg_color: settings.sectionHeaderBtnBgColor || null,
          section_header_btn_active_bg_color: settings.sectionHeaderBtnActiveBgColor || null,
          section_header_btn_border: settings.sectionHeaderBtnBorder || null,
          section_header_btn_shadow: settings.sectionHeaderBtnShadow || null,
          section_header_btn_blur: settings.sectionHeaderBtnBlur || null,
          section_header_btn_font: settings.sectionHeaderBtnFont || null,
          nav_style: settings.navStyle || 'minimal',
          nav_shape: settings.navShape || 'square',
          nav_border: settings.navBorder || 'bordered',
          nav_bg_style: settings.navBgStyle || 'glass',
          nav_bg_color: settings.navBgColor || null,
          nav_btn_bg_color: settings.navBtnBgColor || null,
          nav_btn_active_bg_color: settings.navBtnActiveBgColor || null,
          nav_active_color: settings.navActiveColor || settings.accentColor || '#20C933',
          nav_text_color: settings.navTextColor || null,
          nav_btn_shadow: settings.navBtnShadow || null,
          nav_btn_blur: settings.navBtnBlur || null,
          nav_btn_font: settings.navBtnFont || null,
          branding_snapshot: payload.branding,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'salon_id' });
      } catch (uiSyncErr) {
        console.warn('Aviso: Sincronização salon_ui_settings (não bloqueante):', uiSyncErr);
      }
    }

    // Sincronizar logotipo e fotos do espaço em public.salon_media_items
    if (resolvedSalonUuid) {
      try {
        if (payload.logo_url) {
          const { data: existingLogoMedia } = await (supabaseAdmin.from('salon_media_items' as any) as any)
            .select('id')
            .eq('salon_id', resolvedSalonUuid)
            .eq('category', 'logotipo')
            .limit(1)
            .maybeSingle();

          await (supabaseAdmin.from('salon_media_items' as any) as any).upsert({
            id: existingLogoMedia?.id || generateUuidV4(),
            salon_id: resolvedSalonUuid,
            title: 'Logotipo Oficial',
            url: payload.logo_url,
            type: 'image',
            media_group: 'imagens',
            category: 'logotipo',
            duration_seconds: 5,
            is_cover: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        }
        if (Array.isArray(settings.spacePhotos)) {
          for (const sp of settings.spacePhotos) {
            if (sp?.url) {
              const spUuid = sp.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(sp.id)) ? sp.id : generateUuidV4();
              await (supabaseAdmin.from('salon_media_items' as any) as any).upsert({
                id: spUuid,
                salon_id: resolvedSalonUuid,
                title: sp.caption || 'Foto do Espaço',
                url: sp.url,
                type: 'image',
                media_group: 'fotos',
                category: 'espaco',
                duration_seconds: 5,
                is_cover: false,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' });
            }
          }
        }
      } catch {}
    }

    // Auto-healing se nenhuma linha foi afetada devido ao RLS
    if (!data) {
      try {
        const { data: upsertData, error: upsertErr } = await (supabaseAdmin.from('salons') as any)
          .upsert({
            ...(isUuid ? { id: salonIdOrSlug } : { slug: salonIdOrSlug }),
            ...payload
          }, { onConflict: isUuid ? 'id' : 'slug' })
          .select()
          .maybeSingle();

        if (!upsertErr && upsertData) {
          return { success: true, data: upsertData };
        }
      } catch {}

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: false,
        error: 'O banco recusou a gravação por permissão (RLS). Apenas o proprietário do estabelecimento pode salvar estas alterações.',
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Falha ao atualizar salão no Supabase:', err);
    return { success: false, error: err.message || 'Erro inesperado ao salvar no Supabase' };
  }
}

/**
 * Upload universal de mídia para Supabase Storage com fallback comprimido automático
 */
export async function uploadSalonMediaToStorage(
  file: File,
  bucket = 'salon-media',
  pathPrefix = 'media'
): Promise<string> {
  const ext = file.name?.split('.').pop() || 'jpg';
  const fileName = `${pathPrefix}/${generateUuidV4()}.${ext}`;

  if (isSupabaseConfigured && supabase) {
    try {
      const client = getDbClient() || supabase;
      const { data, error } = await client.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (!error && data?.path) {
        const { data: publicUrlData } = client.storage
          .from(bucket)
          .getPublicUrl(data.path);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn('Aviso: Falha ao subir imagem no Storage, aplicando fallback comprimido:', storageErr);
    }
  }

  // Fallback: compressão no canvas e retorno de data URI otimizada
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target?.result as string;
      if (!rawUrl || !file.type.startsWith('image/')) {
        resolve(rawUrl || '');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        if (img.width > maxDim || img.height > maxDim) {
          const canvas = document.createElement('canvas');
          const scale = Math.min(maxDim / img.width, maxDim / img.height);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
            return;
          }
        }
        resolve(rawUrl);
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Sincroniza a lista completa de serviços do Salão com o Supabase (CRUD Total: salon_services + services + salons.branding.catalogServices)
 */
export async function syncAllServicesToDb(salonId: string, services: any[]): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!supabase || !isSupabaseConfigured || !salonId) return { success: false, error: 'Identificador do salão não fornecido' };
  const client = getDbClient() || supabase;
  try {
    // 0. Resolver salonId para UUID caso tenha sido passado slug ou identificador textual
    let resolvedSalonUuid = salonId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonId)) {
      const { data: sRow } = await (client.from('salons') as any).select('id').eq('slug', salonId).maybeSingle();
      if (sRow?.id) {
        resolvedSalonUuid = sRow.id;
      } else {
        const cachedDbId = typeof window !== 'undefined' ? localStorage.getItem('vagou_salon_db_id') : null;
        if (cachedDbId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cachedDbId)) {
          resolvedSalonUuid = cachedDbId;
        } else {
          const ensured = await ensureSalonRow({ slug: salonId });
          if (ensured?.id) resolvedSalonUuid = ensured.id;
        }
      }
    }

    if (!resolvedSalonUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedSalonUuid)) {
      console.warn('Aviso: Não foi possível resolver salon_id para UUID válido em syncAllServicesToDb:', salonId);
      return { success: false, error: 'Salão não possui UUID válido' };
    }

    // 1. Buscar serviços atualmente ativos deste salão no banco para detectar exclusões
    const { data: existingRows } = await (client.from('services') as any)
      .select('id')
      .eq('salon_id', resolvedSalonUuid);

    const activeServiceIds: string[] = [];

    // 2. Para cada serviço fornecido, garante UUID v4 e realiza upsert em salon_services e services
    for (const s of services) {
      const durationMinutes = typeof s.duration === 'string'
        ? parseInt(s.duration.replace(/\D/g, '')) || 40
        : (s.duration_minutes || s.durationMinutes || 40);

      const isUuid = s.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s.id));
      const serviceUuid = isUuid ? String(s.id) : generateUuidV4();
      s.id = serviceUuid;
      activeServiceIds.push(serviceUuid);

      const serviceName = s.title || s.name || 'Serviço';
      const firstPhoto = s.image || s.image_url || (s.photos && s.photos.length > 0 ? s.photos[0] : null);

      const fullPayload: any = {
        id: serviceUuid,
        salon_id: resolvedSalonUuid,
        name: serviceName,
        title: serviceName,
        category: s.category || 'Geral',
        price: Number(s.price) || 0,
        duration_minutes: durationMinutes,
        commission_rate: Number(s.commissionRate ?? s.commission_rate ?? 50),
        description: s.description || null,
        image_url: firstPhoto,
        photos: Array.isArray(s.photos) ? s.photos : (firstPhoto ? [firstPhoto] : []),
        videos: Array.isArray(s.videos) ? s.videos : (s.videoUrl ? [{ id: `vid_${serviceUuid}`, url: s.videoUrl, title: serviceName, duration_seconds: 5 }] : []),
        slides: Array.isArray(s.slides) ? s.slides : (Array.isArray(s.photos) ? s.photos : []),
        is_active: s.isActive !== false && s.is_active !== false,
        updated_at: new Date().toISOString(),
      };

      // 2A. Upsert em public.salon_services
      try {
        await (client.from('salon_services' as any) as any).upsert(fullPayload, { onConflict: 'id' });
      } catch {}

      // 2B. Upsert em public.services (com fallback seguro se colunas extras não existirem)
      const { error: srvErr } = await (client.from('services') as any).upsert(fullPayload, { onConflict: 'id' });
      if (srvErr && (srvErr.code === 'PGRST204' || srvErr.code === '42703' || srvErr.message?.includes('column'))) {
        await (client.from('services') as any).upsert(
          {
            id: serviceUuid,
            salon_id: resolvedSalonUuid,
            title: serviceName,
            category: s.category || 'Geral',
            price: Number(s.price) || 0,
            duration_minutes: durationMinutes,
            description: s.description || null,
            image_url: firstPhoto,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    }

    // 3. Remover/desativar no banco os serviços que foram excluídos pelo proprietário
    const activeSet = new Set(activeServiceIds);
    const removedIds = (existingRows || [])
      .map((r: any) => r.id)
      .filter((id: string) => id && !activeSet.has(id));

    if (removedIds.length > 0) {
      try {
        await (client.from('salon_services' as any) as any)
          .delete()
          .eq('salon_id', resolvedSalonUuid)
          .in('id', removedIds);
      } catch {}

      const { error: delError } = await (client.from('services') as any)
        .delete()
        .eq('salon_id', resolvedSalonUuid)
        .in('id', removedIds);

      if (delError) {
        // Fallback seguro (soft-delete) caso o serviço já tenha agendamentos históricos vinculados por FK
        await (client.from('services') as any)
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('salon_id', resolvedSalonUuid)
          .in('id', removedIds);
      }
    }

    // 4. Espelhamento de Resiliência no JSONB do Salão (Double Single Source of Truth)
    try {
      const { data: currentSalon } = await (client.from('salons') as any)
        .select('branding')
        .eq('id', resolvedSalonUuid)
        .maybeSingle();

      const existingBranding = (currentSalon?.branding && typeof currentSalon.branding === 'object') ? currentSalon.branding : {};
      await (client.from('salons') as any)
        .update({
          branding: {
            ...existingBranding,
            catalogServices: services,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedSalonUuid);
    } catch {}

    return { success: true, count: services.length };
  } catch (err: any) {
    console.error('Falha ao sincronizar catálogo de serviços no Supabase:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Sincroniza a lista de profissionais da equipe no Supabase (public.professionals + espelho em salons.branding.teamMembers)
 */
export async function syncAllProfessionalsToDb(salonId: string, professionals: any[]) {
  if (!supabase || !isSupabaseConfigured || !salonId) return { success: false };
  const client = getDbClient();
  try {
    const { data: existingPros } = await (client.from('professionals') as any)
      .select('id')
      .eq('salon_id', salonId);

    const activeProIds: string[] = [];

    for (const p of professionals) {
      const isUuid = p.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(p.id));
      const proUuid = isUuid ? String(p.id) : generateUuidV4();
      p.id = proUuid;
      activeProIds.push(proUuid);

      const accessLevel =
        p.accessLevel ||
        (p.systemRole === 'admin' || p.role === 'admin'
          ? 'admin'
          : p.role?.toLowerCase().includes('recep')
          ? 'receptionist'
          : 'professional');

      const payload: any = {
        id: proUuid,
        salon_id: salonId,
        name: p.name || 'Profissional',
        full_name: p.name || 'Profissional',
        role: p.role || 'Profissional',
        access_level: accessLevel,
        avatar_url: p.avatarUrl || p.avatar || null,
        phone: p.phone || null,
        phone_whatsapp: p.phone || null,
        email: p.email || null,
        commission_rate: Number(p.commissionRate ?? p.commission_rate ?? (accessLevel === 'admin' ? 100 : 50)),
        product_commission_rate: Number(p.productCommissionRate ?? p.product_commission_rate ?? 10),
        specialties: Array.isArray(p.specialties) ? p.specialties : ['Geral'],
        schedule_config: p.workSchedule || p.schedule_config || null,
        use_custom_schedule: Boolean(p.workSchedule || p.schedule_config),
        is_active: p.isActive !== false,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await (client.from('professionals') as any).upsert(payload, { onConflict: 'id' });
      if (upsertErr) {
        // Fallback resiliente caso alguma coluna opcional não exista na tabela professionals
        await (client.from('professionals') as any).upsert(
          {
            id: proUuid,
            salon_id: salonId,
            name: p.name || 'Profissional',
            role: p.role || 'Profissional',
            avatar_url: p.avatarUrl || p.avatar || null,
            phone: p.phone || null,
            email: p.email || null,
            specialties: Array.isArray(p.specialties) ? p.specialties : ['Geral'],
            schedule_config: p.workSchedule || p.schedule_config || null,
            is_active: p.isActive !== false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    }

    const activeProSet = new Set(activeProIds);
    const removedProIds = (existingPros || [])
      .map((r: any) => r.id)
      .filter((id: string) => id && !activeProSet.has(id));

    if (removedProIds.length > 0) {
      const { error: delErr } = await (client.from('professionals') as any)
        .delete()
        .eq('salon_id', salonId)
        .in('id', removedProIds);
      if (delErr) {
        await (client.from('professionals') as any)
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('salon_id', salonId)
          .in('id', removedProIds);
      }
    }

    // Espelhar metadados completos da equipe (comissões, turnos, especialidades) em salons.branding.teamMembers
    try {
      const isSalonUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonId);
      const { data: currentSalon } = await (client.from('salons') as any)
        .select('branding')
        .match(isSalonUuid ? { id: salonId } : { slug: salonId })
        .maybeSingle();

      const existingBranding = (currentSalon?.branding && typeof currentSalon.branding === 'object') ? currentSalon.branding : {};
      await (client.from('salons') as any)
        .update({
          branding: {
            ...existingBranding,
            teamMembers: professionals,
          },
          updated_at: new Date().toISOString(),
        })
        .match(isSalonUuid ? { id: salonId } : { slug: salonId });
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Falha ao sincronizar profissionais no Supabase:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Persiste as configurações de Espaço, Horário de Funcionamento (operating_hours), Feriados, Regras e Galeria no Supabase
 */
export async function updateSalonSpaceConfigInDb(
  salonIdOrSlug: string,
  spaceConfig: {
    operatingHours?: Record<string, any>;
    openingHoursSummary?: string;
    holidays?: any[];
    cancellationPolicy?: any;
    spacePhotos?: any[];
  }
) {
  if (!supabase || !isSupabaseConfigured || !salonIdOrSlug) {
    return { success: false, error: 'Supabase não configurado ou identificador vazio' };
  }
  const client = getDbClient();
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonIdOrSlug);
    const { data: currentSalon } = await (client.from('salons') as any)
      .select('id, branding, operating_hours')
      .match(isUuid ? { id: salonIdOrSlug } : { slug: salonIdOrSlug })
      .maybeSingle();

    const existingBranding = (currentSalon?.branding && typeof currentSalon.branding === 'object') ? currentSalon.branding : {};

    const firstSpacePhoto = Array.isArray(spaceConfig.spacePhotos) && spaceConfig.spacePhotos.length > 0 ? spaceConfig.spacePhotos[0]?.url : undefined;
    const secondSpacePhoto = Array.isArray(spaceConfig.spacePhotos) && spaceConfig.spacePhotos.length > 1 ? spaceConfig.spacePhotos[1]?.url : undefined;

    const nextBranding: Record<string, any> = {
      ...existingBranding,
      ...(spaceConfig.operatingHours !== undefined ? { operatingHoursJson: spaceConfig.operatingHours } : {}),
      ...(spaceConfig.openingHoursSummary !== undefined ? { openingHours: spaceConfig.openingHoursSummary } : {}),
      ...(spaceConfig.holidays !== undefined ? { holidays: spaceConfig.holidays } : {}),
      ...(spaceConfig.cancellationPolicy !== undefined ? { cancellationPolicy: spaceConfig.cancellationPolicy } : {}),
      ...(spaceConfig.spacePhotos !== undefined ? { spacePhotos: spaceConfig.spacePhotos } : {}),
      ...(firstSpacePhoto !== undefined ? { facadePhotoUrl: firstSpacePhoto } : {}),
      ...(secondSpacePhoto !== undefined ? { interiorPhotoUrl: secondSpacePhoto } : {}),
    };

    const payload: Record<string, any> = {
      branding: nextBranding,
      updated_at: new Date().toISOString(),
      ...(spaceConfig.operatingHours !== undefined ? { operating_hours: spaceConfig.operatingHours } : {}),
      ...(firstSpacePhoto !== undefined ? { facade_photo_url: firstSpacePhoto } : {}),
      ...(secondSpacePhoto !== undefined ? { interior_photo_url: secondSpacePhoto } : {}),
    };

    let { error } = await (client.from('salons') as any)
      .update(payload)
      .match(isUuid ? { id: salonIdOrSlug } : { slug: salonIdOrSlug });

    if (error && (error.message?.includes('column') || error.code === '42703' || error.code === 'PGRST204')) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.operating_hours;
      delete fallbackPayload.facade_photo_url;
      delete fallbackPayload.interior_photo_url;
      const retry = await (client.from('salons') as any)
        .update(fallbackPayload)
        .match(isUuid ? { id: salonIdOrSlug } : { slug: salonIdOrSlug });
      error = retry.error;
    }

    // Sincronizar fotos do espaço em public.salon_media_items
    const resolvedSalonUuid = currentSalon?.id || (isUuid ? salonIdOrSlug : null);
    if (resolvedSalonUuid && Array.isArray(spaceConfig.spacePhotos)) {
      try {
        for (const sp of spaceConfig.spacePhotos) {
          if (sp?.url) {
            const spUuid = sp.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(sp.id)) ? sp.id : generateUuidV4();
            await (client.from('salon_media_items' as any) as any).upsert({
              id: spUuid,
              salon_id: resolvedSalonUuid,
              title: sp.caption || 'Foto do Espaço',
              url: sp.url,
              type: 'image',
              media_group: 'fotos',
              category: 'espaco',
              duration_seconds: 5,
              is_cover: false,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
        }
      } catch {}
    }

    if (error) {
      console.warn('Erro ao salvar configurações do espaço no Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Falha ao salvar espaço no Supabase:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Converte DataURL Base64 para Blob para upload eficiente no Supabase Storage
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return { blob: new Blob([array], { type: mimeType }), mimeType };
  } catch {
    return null;
  }
}

/**
 * Faz upload de imagem de avatar diretamente para o Supabase Storage (Tríade Sync)
 * Suporta File, Blob ou DataURL Base64, com fallback de baldes (avatars -> salon-media) e privilégio de service_role
 */
export async function uploadAvatarToSupabaseStorage(
  fileOrBase64: File | Blob | string,
  userIdOrEmail: string
): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    const client = getDbClient() || supabase;
    const cleanId = (userIdOrEmail || 'user').replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = Date.now();

    let uploadBlob: Blob;
    let mimeType = 'image/jpeg';
    let fileExt = 'jpg';

    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://')) {
        return fileOrBase64;
      }
      const converted = dataUrlToBlob(fileOrBase64);
      if (!converted) return null;
      uploadBlob = converted.blob;
      mimeType = converted.mimeType;
      fileExt = mimeType.split('/')[1] || 'jpg';
    } else {
      uploadBlob = fileOrBase64;
      mimeType = fileOrBase64.type || 'image/jpeg';
      if ('name' in fileOrBase64 && typeof (fileOrBase64 as any).name === 'string') {
        fileExt = (fileOrBase64 as any).name.split('.').pop() || 'jpg';
      } else {
        fileExt = mimeType.split('/')[1] || 'jpg';
      }
    }

    const fileName = `${cleanId}-${timestamp}.${fileExt}`;

    // Tentativa 1: Bucket 'avatars'
    try {
      const { data, error } = await client.storage
        .from('avatars')
        .upload(fileName, uploadBlob, { contentType: mimeType, upsert: true });

      if (!error && data?.path) {
        const { data: publicData } = client.storage.from('avatars').getPublicUrl(data.path);
        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      }
    } catch (bucket1Err) {
      console.warn('Aviso: Falha no bucket avatars:', bucket1Err);
    }

    // Tentativa 2: Fallback no Bucket 'salon-media' (pasta avatars)
    try {
      const fallbackPath = `avatars/${fileName}`;
      const { data, error } = await client.storage
        .from('salon-media')
        .upload(fallbackPath, uploadBlob, { contentType: mimeType, upsert: true });

      if (!error && data?.path) {
        const { data: publicData } = client.storage.from('salon-media').getPublicUrl(data.path);
        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      }
    } catch (bucket2Err) {
      console.warn('Aviso: Falha no bucket salon-media:', bucket2Err);
    }

    return null;
  } catch (err) {
    console.warn('Erro no upload de avatar para o Storage:', err);
    return null;
  }
}

/**
 * Salva e sincroniza de ponta a ponta a foto de perfil do usuário no Supabase (Tríade Sync)
 * 1. Chama a API do Backend POST /api/user/avatar (com privilégios de service_role e upload em bucket)
 * 2. Fallback direto no client-side caso a rota esteja offline
 * 3. Persiste em clients, system_admins, profiles e professionals simultaneamente
 */
export async function saveUserAvatarToSupabase(params: {
  fileOrBase64: File | Blob | string;
  email?: string;
  cpf?: string;
  name?: string;
  phone?: string;
  clientId?: string;
  userId?: string;
  type?: 'client' | 'pro' | 'admin';
}): Promise<{ success: boolean; avatarUrl: string; source: 'server' | 'client_direct' | 'local_fallback' }> {
  const cleanEmail = (params.email || (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_email') || '' : '')).trim().toLowerCase();
  const cleanName = (params.name || (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_name') || '' : '')).trim();
  const cleanPhone = (params.phone || (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_phone') || '' : '')).trim();
  const cleanCpf = (params.cpf || (typeof window !== 'undefined' ? localStorage.getItem('vagou_user_cpf') || '' : '')).replace(/\D/g, '');
  const storedClientId = (params.clientId || (typeof window !== 'undefined' ? localStorage.getItem('vagou_client_id') || '' : '')).trim();
  const storedUserId = (params.userId || (typeof window !== 'undefined' ? localStorage.getItem('vagou_auth_user_id') || '' : '')).trim();

  let base64String = '';
  if (typeof params.fileOrBase64 === 'string') {
    base64String = params.fileOrBase64;
  }

  // Tentativa 1: POST /api/user/avatar (Service Role Server-Side Proxy)
  if (base64String) {
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarData: base64String,
          email: cleanEmail,
          cpf: cleanCpf,
          name: cleanName,
          phone: cleanPhone,
          clientId: storedClientId,
          userId: storedUserId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.avatarUrl) {
          return { success: true, avatarUrl: data.avatarUrl, source: 'server' };
        }
      }
    } catch (apiErr) {
      console.warn('Aviso: Falha na API /api/user/avatar, tentando gravação direta no cliente:', apiErr);
    }
  }

  // Tentativa 2: Gravação direta no Supabase Client-Side
  try {
    let resolvedUrl = base64String;
    const identifier = cleanEmail || cleanCpf || storedClientId || cleanName || 'user';
    const storageUrl = await uploadAvatarToSupabaseStorage(params.fileOrBase64, identifier);
    if (isValidAvatarUrlString(storageUrl)) {
      resolvedUrl = storageUrl.trim();
    }

    if (isValidAvatarUrlString(resolvedUrl)) {
      await updateUserProfileInDb({
        name: cleanName || 'Usuário',
        email: cleanEmail,
        phone: cleanPhone,
        cpf: cleanCpf,
        avatarUrl: resolvedUrl,
        clientId: storedClientId,
        userId: storedUserId,
        type: params.type || 'client',
      });
      return { success: true, avatarUrl: resolvedUrl, source: 'client_direct' };
    }
  } catch (clientErr) {
    console.error('Erro na gravação client-side do avatar:', clientErr);
  }

  return { success: false, avatarUrl: base64String || '', source: 'local_fallback' };
}
