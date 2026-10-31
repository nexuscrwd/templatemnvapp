import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Chrome,
} from 'lucide-react';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { SalonAuthHeader } from './SalonAuthHeader';

export interface TriadeUserLoginPayload {
  identifier: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  avatarUrl?: string;
  passwordHash?: string;
  matchedAccount?: any;
  accountType?: 'client' | 'professional' | 'owner';
  session?: {
    access_token: string;
    refresh_token: string;
  };
}

export type UserLoginPhase = 'credentials' | 'recovery';

export interface TriadeUserLoginFormProps {
  onSuccess?: (data: TriadeUserLoginPayload) => void;
  onSwitchToRegister?: () => void;
  onOpenRecovery?: () => void;
  onClose?: () => void;
  showHeader?: boolean;
  variant?: 'card' | 'flat';
  title?: string;
  subtitle?: string;
  submitButtonText?: string;
  activePhase?: UserLoginPhase;
  onPhaseChange?: (phase: UserLoginPhase) => void;
  showSwitchToRegister?: boolean;
  salonName?: string;
  salonLogoUrl?: string;
  initialIdentifier?: string;
}

export async function findMatchingTriadeAccounts(rawInput: string): Promise<any[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  const cleanLower = trimmed.toLowerCase();
  const cleanNoSymbols = cleanLower.replace(/^[@#&]+|[@#&]+$/g, '');
  const digits = trimmed.replace(/\D/g, '');
  const results: any[] = [];
  const seenKeys = new Set<string>();

  const matchesRecord = (
    r: any,
    table: 'system_admins' | 'clients' | 'salon_users' | 'professionals'
  ): boolean => {
    if (!r || r.is_active === false) return false;

    const rUser = String(r.username || '').trim().toLowerCase();
    const rUserNoSymbols = rUser.replace(/^[@#&]+|[@#&]+$/g, '');
    const rEmail = String(r.email || '').trim().toLowerCase();
    const rName = String(r.full_name || r.name || '').trim().toLowerCase();
    const rPhone1 = String(r.phone_whatsapp || r.phone || '').replace(/\D/g, '');
    const rPhone2 = String(r.phone_secondary || '').replace(/\D/g, '');
    const rCpf = String(r.cpf || '').replace(/\D/g, '');

    const matchesText =
      (rUser &&
        (rUser === cleanLower ||
          (cleanNoSymbols.length >= 3 && rUserNoSymbols === cleanNoSymbols))) ||
      (rEmail && rEmail === cleanLower) ||
      (rName && rName === cleanLower);

    const matchesDigits =
      digits.length >= 8 &&
      ((digits.length === 11 && rCpf && rCpf === digits) ||
        (rPhone1 &&
          (rPhone1 === digits ||
            rPhone1.endsWith(digits.slice(-8)) ||
            digits.endsWith(rPhone1.slice(-8)))) ||
        (rPhone2 &&
          (rPhone2 === digits ||
            rPhone2.endsWith(digits.slice(-8)) ||
            digits.endsWith(rPhone2.slice(-8)))));

    if (!matchesText && !matchesDigits) return false;

    const key = `${table}::${r.id}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  };

  const normalizeRecord = (
    r: any,
    table: 'system_admins' | 'clients' | 'salon_users' | 'professionals'
  ) => {
    const rawRole = String(r.role || '').toLowerCase();
    const rawAccess = String(r.access_level || '').toLowerCase();
    const isSuperadmin =
      table === 'system_admins' ||
      rawRole === 'superadmin' ||
      rawAccess.includes('superadmin') ||
      rawAccess.includes('administrador master');

    return {
      ...r,
      id: String(r.id),
      user_id: r.user_id || null,
      sourceTable: table,
      name: r.full_name || r.name || r.username || '',
      username: r.username || '',
      email: r.email || '',
      phone: r.phone_whatsapp || r.phone || r.phone_secondary || '',
      cpf: r.cpf || '',
      password_hash: r.password_hash ?? null,
      avatar_url: r.avatar_url || '',
      isSuperadmin,
    };
  };

  try {
    const [sysAdminsRes, clientsRes, salonUsersRes, prosRes] = await Promise.all([
      (supabase.from('system_admins' as any) as any).select('*').limit(100),
      (supabase.from('clients') as any).select('*').limit(400),
      (supabase.from('salon_users' as any) as any).select('*').limit(200),
      (supabase.from('professionals') as any).select('*').limit(200),
    ]);

    if (Array.isArray(sysAdminsRes?.data)) {
      for (const r of sysAdminsRes.data) {
        if (matchesRecord(r, 'system_admins'))
          results.push(normalizeRecord(r, 'system_admins'));
      }
    }
    if (Array.isArray(clientsRes?.data)) {
      for (const r of clientsRes.data) {
        if (matchesRecord(r, 'clients')) results.push(normalizeRecord(r, 'clients'));
      }
    }
    if (Array.isArray(salonUsersRes?.data)) {
      for (const r of salonUsersRes.data) {
        if (matchesRecord(r, 'salon_users'))
          results.push(normalizeRecord(r, 'salon_users'));
      }
    }
    if (Array.isArray(prosRes?.data)) {
      for (const r of prosRes.data) {
        if (matchesRecord(r, 'professionals'))
          results.push(normalizeRecord(r, 'professionals'));
      }
    }
  } catch {}

  return results;
}

/**
 * 🏛️ Formulário Independente "ACESSAR" (Login Unificado VagouApp)
 * - Cabeçalho obrigatório com logotipo/logomarca do estabelecimento e botão "X"
 * - Ao pé do formulário contém a opção "Esqueci Usuário/Senha" e botão para abrir o modal "CADASTRO"
 */
export const TriadeUserLoginForm: React.FC<TriadeUserLoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onOpenRecovery,
  onClose,
  showHeader = true,
  variant = 'card',
  subtitle = 'ACESSAR',
  submitButtonText = 'ACESSAR',
  showSwitchToRegister = true,
  salonName,
  salonLogoUrl,
  initialIdentifier = '',
}) => {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialIdentifier) {
      setIdentifier(initialIdentifier);
    }
  }, [initialIdentifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const rawId = identifier.trim();
    const cleanPass = password.trim();

    if (!rawId) {
      setFeedback({
        type: 'error',
        message: 'Informe seu usuário, e-mail ou celular.',
      });
      return;
    }
    if (!cleanPass) {
      setFeedback({ type: 'error', message: 'Informe sua senha de acesso.' });
      return;
    }

    setIsLoading(true);

    try {
      const cleanUsername = rawId.replace(/^@+/, '').toLowerCase();
      const matchedList = await findMatchingTriadeAccounts(rawId);

      // 1. Verifica correspondência direta na base unificada da Tríade (username, e-mail ou celular + senha)
      if (matchedList.length > 0) {
        const matchedByHash = matchedList.find(
          (c: any) =>
            c.password_hash !== null &&
            c.password_hash !== undefined &&
            String(c.password_hash).trim() === cleanPass
        );

        if (matchedByHash) {
          const resolvedPayload: TriadeUserLoginPayload = {
            identifier: rawId,
            id: String(matchedByHash.user_id || matchedByHash.id),
            name: matchedByHash.name || matchedByHash.username || cleanUsername,
            username: matchedByHash.username || cleanUsername,
            email: matchedByHash.email || rawId,
            phone: matchedByHash.phone || '',
            cpf: matchedByHash.cpf || '',
            avatarUrl: matchedByHash.avatar_url || '',
            passwordHash: cleanPass,
            matchedAccount: matchedByHash,
            accountType: matchedByHash.isSuperadmin ? 'owner' : 'client',
          };
          setFeedback({ type: 'success', message: 'Acesso validado com sucesso!' });
          setIsLoading(false);
          onSuccess?.(resolvedPayload);
          return;
        }

        // Se todas as contas localizadas têm password_hash diferente da digitada, barra com erro de senha
        const allHaveDifferentHash = matchedList.every(
          (c: any) =>
            c.password_hash !== null &&
            c.password_hash !== undefined &&
            String(c.password_hash).trim().length > 0 &&
            String(c.password_hash).trim() !== cleanPass
        );

        if (allHaveDifferentHash) {
          setIsLoading(false);
          setFeedback({
            type: 'error',
            message: 'Senha incorreta. Verifique e tente novamente.',
          });
          return;
        }
      }

      const matchedClient = matchedList[0] || null;
      const resolvedEmail = (
        matchedClient?.email ||
        (rawId.includes('@') && rawId.includes('.')
          ? rawId
          : `${cleanUsername.replace(/[^a-z0-9]/g, '')}@vagouapp.com`)
      ).toLowerCase();

      // 2. Autentica no Supabase Auth caso aplicável
      let authSession: any = undefined;
      let authUserId = matchedClient?.user_id || matchedClient?.id;

      if (supabase) {
        try {
          const { data: signInData, error: signInErr } =
            await supabase.auth.signInWithPassword({
              email: resolvedEmail,
              password: cleanPass,
            });

          if (!signInErr && signInData?.session) {
            authUserId = signInData.user?.id || authUserId;
            authSession = {
              access_token: signInData.session.access_token,
              refresh_token: signInData.session.refresh_token,
            };
          } else if (!matchedClient) {
            setIsLoading(false);
            setFeedback({
              type: 'error',
              message:
                'Conta ou senha inválida. Verifique seu usuário, celular ou e-mail.',
            });
            return;
          }
        } catch {
          if (!matchedClient) {
            setIsLoading(false);
            setFeedback({
              type: 'error',
              message: 'Não foi possível validar suas credenciais.',
            });
            return;
          }
        }
      }

      // Se encontrou conta em clients sem password_hash gravado, salva a senha atual
      if (
        matchedClient?.id &&
        matchedClient?.sourceTable === 'clients' &&
        !matchedClient.password_hash &&
        supabase
      ) {
        try {
          await (supabase.from('clients') as any)
            .update({ password_hash: cleanPass })
            .eq('id', matchedClient.id);
        } catch {}
      }

      const resolvedPayload: TriadeUserLoginPayload = {
        identifier: rawId,
        id: authUserId,
        name: matchedClient?.name || cleanUsername,
        username: matchedClient?.username || cleanUsername,
        email: matchedClient?.email || resolvedEmail,
        phone: matchedClient?.phone || '',
        cpf: matchedClient?.cpf || '',
        avatarUrl: matchedClient?.avatar_url || '',
        passwordHash: cleanPass,
        matchedAccount: matchedClient,
        accountType: 'client',
        session: authSession,
      };

      setFeedback({ type: 'success', message: 'Acesso validado com sucesso!' });
      setIsLoading(false);
      onSuccess?.(resolvedPayload);
    } catch (err: any) {
      setIsLoading(false);
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao processar acesso.',
      });
    }
  };

  // Login Direto com Conta Google (Sem expor URL do Supabase)
  const handleGoogleAccountLogin = async () => {
    setFeedback(null);
    setIsGoogleLoading(true);
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;
      const email = (gUser.email || '').trim().toLowerCase();
      const displayName =
        gUser.displayName || (email ? email.split('@')[0] : 'Usuário Google');
      const photoUrl = gUser.photoURL || '';

      const matchedList = email ? await findMatchingTriadeAccounts(email) : [];
      const matchedAccount = matchedList[0] || undefined;

      const resolvedPayload: TriadeUserLoginPayload = {
        identifier: email || gUser.uid,
        id: matchedAccount?.user_id || matchedAccount?.id || gUser.uid,
        name: matchedAccount?.name || displayName,
        username:
          matchedAccount?.username || (email ? email.split('@')[0] : displayName),
        email,
        phone: matchedAccount?.phone || gUser.phoneNumber || '',
        cpf: matchedAccount?.cpf || '',
        avatarUrl: matchedAccount?.avatar_url || photoUrl,
        matchedAccount,
        accountType: matchedAccount?.isSuperadmin ? 'owner' : 'client',
      };

      setFeedback({ type: 'success', message: 'Conectado com Conta Google!' });
      setIsGoogleLoading(false);
      onSuccess?.(resolvedPayload);
    } catch (err: any) {
      setIsGoogleLoading(false);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setFeedback({
          type: 'error',
          message: 'Não foi possível autenticar com sua Conta Google.',
        });
      }
    }
  };

  return (
    <div
      className={`w-full max-w-md mx-auto ${
        variant === 'card'
          ? 'bg-slate-900 border border-slate-800 rounded-[4px] shadow-2xl overflow-hidden'
          : ''
      }`}
    >
      {/* Cabeçalho Obrigatório com Logotipo/Logomarca do Salão */}
      {showHeader && (
        <SalonAuthHeader
          salonName={salonName}
          salonLogoUrl={salonLogoUrl}
          subtitle={subtitle}
          onClose={onClose}
        />
      )}

      <div className="p-4">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-[4px] mb-4 text-xs font-semibold flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuário, Celular ou E-mail
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-[4px] px-3 py-2.5 focus-within:border-emerald-500 transition">
              <User className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="@usuario, (11) 99999-9999 ou e-mail"
                className="bg-transparent text-sm text-white outline-none w-full placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Senha de Acesso
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-[4px] px-3 py-2.5 focus-within:border-emerald-500 transition">
              <Lock className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                className="bg-transparent text-sm text-white outline-none w-full placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-white transition ml-2 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 px-4 rounded-[4px] bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer whitespace-nowrap"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="text-white uppercase tracking-wide">{submitButtonText}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>

          {/* Divisor + Botão Conta Google */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] uppercase font-bold text-slate-500">ou</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleAccountLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full py-2.5 px-4 rounded-[4px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Chrome className="w-4 h-4 text-emerald-400" />
            )}
            <span>Conta Google</span>
          </button>

          {/* Rodapé Discreto do Formulário ACESSAR: "Esqueci Usuário/Senha" + "CADASTRO" */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-4 px-1">
            {onOpenRecovery && (
              <button
                type="button"
                onClick={onOpenRecovery}
                className="bg-transparent border-0 p-0 text-slate-400 hover:text-emerald-400 font-thin text-xs tracking-wide underline-offset-4 hover:underline transition cursor-pointer whitespace-nowrap"
              >
                Esqueci Usuário/Senha
              </button>
            )}

            {showSwitchToRegister && onSwitchToRegister && (
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="bg-transparent border-0 p-0 text-slate-400 hover:text-emerald-400 font-thin text-xs tracking-wide underline-offset-4 hover:underline transition cursor-pointer whitespace-nowrap ml-auto"
              >
                CADASTRO
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
