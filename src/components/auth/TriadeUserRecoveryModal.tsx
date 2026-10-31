import React, { useState } from 'react';
import {
  User,
  Lock,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { SalonAuthHeader } from './SalonAuthHeader';
import { findMatchingTriadeAccounts } from './TriadeUserLoginForm';

export interface SecurityQuestionItem {
  id: string;
  code: string;
  categoryLabel: string;
  questionText: string;
}

export const OFFICIAL_SECURITY_QUESTIONS: SecurityQuestionItem[] = [
  {
    id: 'sq-pet',
    code: 'first_pet',
    categoryLabel: 'Animal de estimação',
    questionText: 'Qual o nome do meu animal de estimação?',
  },
  {
    id: 'sq-age10',
    code: 'city_at_10',
    categoryLabel: 'Moradia aos 10 anos',
    questionText: 'Onde vc morou aos 10 anos?',
  },
  {
    id: 'sq-friend',
    code: 'childhood_friend',
    categoryLabel: 'Amigo de infância',
    questionText: 'Nome do seu amigo de infância?',
  },
];

function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export interface TriadeUserRecoveryModalProps {
  salonName?: string;
  salonLogoUrl?: string;
  onClose?: () => void;
  onBackToLogin: (recoveredIdentifier?: string) => void;
  variant?: 'card' | 'flat';
}

export type RecoveryModalView = 'choose' | 'user' | 'password';

/**
 * 🏛️ Modal Independente de Recuperação ("Esqueci Usuário/Senha")
 * - Possui cabeçalho obrigatório com logotipo/logomarca do salão e botão "X"
 * - Oferece 2 botões principais: [Usuário] e [Senha]
 * - Quando selecionado [Usuário], sorteia pergunta secreta aleatória do sistema e consulta a resposta
 * - Quando selecionado [Senha], permite redefinir a senha com validação e confirmação
 */
export const TriadeUserRecoveryModal: React.FC<TriadeUserRecoveryModalProps> = ({
  salonName,
  salonLogoUrl,
  onClose,
  onBackToLogin,
  variant = 'card',
}) => {
  const [view, setView] = useState<RecoveryModalView>('choose');
  const [questions] = useState<SecurityQuestionItem[]>(OFFICIAL_SECURITY_QUESTIONS);
  const [selectedQuestion, setSelectedQuestion] = useState<SecurityQuestionItem>(() => {
    const randomIndex = Math.floor(Math.random() * OFFICIAL_SECURITY_QUESTIONS.length);
    return OFFICIAL_SECURITY_QUESTIONS[randomIndex];
  });
  const [isQuestionListOpen, setIsQuestionListOpen] = useState(false);

  // Estados de Recuperação de Usuário (Pergunta Secreta)
  const [secretAnswer, setSecretAnswer] = useState('');
  const [contactHint, setContactHint] = useState('');
  const [recoveredUsername, setRecoveredUsername] = useState<string | null>(null);
  const [recoveredFullName, setRecoveredFullName] = useState<string | null>(null);

  // Estados de Recuperação de Senha
  const [passwordStep, setPasswordStep] = useState<'identify' | 'reset'>('identify');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [matchedAccounts, setMatchedAccounts] = useState<any[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const pickRandomQuestion = () => {
    setFeedback(null);
    setRecoveredUsername(null);
    setIsQuestionListOpen(false);
    if (questions.length <= 1) return;
    const others = questions.filter((q) => q.code !== selectedQuestion.code);
    const next = others[Math.floor(Math.random() * others.length)] || questions[0];
    setSelectedQuestion(next);
  };

  // Consulta da resposta da pergunta secreta para recuperar Nome de Usuário
  const handleRecoverUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setRecoveredUsername(null);

    const cleanAns = normalizeAnswer(secretAnswer);
    if (cleanAns.length < 2) {
      setFeedback({
        type: 'error',
        message: 'Digite a resposta da pergunta secreta para localizar seu usuário.',
      });
      return;
    }

    setIsLoading(true);
    try {
      let foundUser: { username: string; name: string } | null = null;

      if (isSupabaseConfigured && supabase) {
        // 1. Tenta via RPC oficial public.recover_username_by_security_answer
        try {
          const { data: rpcData } = await (supabase as any).rpc(
            'recover_username_by_security_answer',
            {
              p_question_code: selectedQuestion.code,
              p_answer: cleanAns,
              p_contact_hint: contactHint.trim() || null,
            }
          );

          if (Array.isArray(rpcData) && rpcData.length > 0 && rpcData[0]?.username) {
            foundUser = {
              username: String(rpcData[0].username),
              name: String(rpcData[0].full_name || rpcData[0].name || rpcData[0].username),
            };
          }
        } catch {}

        // 2. Consulta direta em public.user_security_answers + public.clients
        if (!foundUser) {
          try {
            const { data: ansRows } = await (supabase.from('user_security_answers' as any) as any)
              .select('user_id, client_id, question_code, answer_normalized')
              .eq('question_code', selectedQuestion.code)
              .eq('answer_normalized', cleanAns)
              .limit(10);

            if (Array.isArray(ansRows) && ansRows.length > 0) {
              const targetClientId = ansRows[0].client_id || ansRows[0].user_id;
              if (targetClientId) {
                const { data: clientData } = await (supabase.from('clients') as any)
                  .select('id, name, username, email, phone')
                  .or(`id.eq.${targetClientId},user_id.eq.${targetClientId}`)
                  .limit(1)
                  .maybeSingle();

                if (clientData?.username) {
                  foundUser = {
                    username: String(clientData.username),
                    name: String(clientData.name || clientData.username),
                  };
                }
              }
            }
          } catch {}
        }

        // 3. Consulta nas colunas de pergunta secreta da tabela public.clients
        if (!foundUser) {
          try {
            const { data: clientRows } = await (supabase.from('clients') as any)
              .select('id, name, username, email, phone, security_question_code, security_answer_normalized')
              .limit(400);

            if (Array.isArray(clientRows)) {
              const matchedBySecret = clientRows.find((c: any) => {
                const cAns = normalizeAnswer(String(c.security_answer_normalized || ''));
                const cCode = String(c.security_question_code || '');
                return (
                  cAns === cleanAns &&
                  (!cCode || cCode === selectedQuestion.code) &&
                  Boolean(c.username)
                );
              });

              if (matchedBySecret) {
                foundUser = {
                  username: String(matchedBySecret.username),
                  name: String(matchedBySecret.name || matchedBySecret.username),
                };
              }
            }
          } catch {}
        }

        // 4. Caso o usuário tenha informado Celular ou E-mail complementar, localiza a conta e vincula a resposta secreta
        if (!foundUser && contactHint.trim().length >= 3) {
          const matchedByHint = await findMatchingTriadeAccounts(contactHint.trim());
          if (matchedByHint.length > 0) {
            const target = matchedByHint[0];
            const resolvedUser =
              target.username ||
              (target.email ? `@${String(target.email).split('@')[0]}` : target.name);

            if (resolvedUser) {
              foundUser = {
                username: String(resolvedUser),
                name: String(target.name || resolvedUser),
              };

              // Salva a resposta secreta para futuras consultas
              try {
                await (supabase.from('user_security_answers' as any) as any).upsert(
                  {
                    client_id: target.id,
                    question_code: selectedQuestion.code,
                    question_text: selectedQuestion.questionText,
                    answer_normalized: cleanAns,
                  },
                  { onConflict: 'client_id,question_code' }
                );
              } catch {}
            }
          }
        }
      }

      // 5. Fallback no cache local caso cadastrado na sessão atual
      if (!foundUser) {
        try {
          const localAnswers = JSON.parse(
            localStorage.getItem('vagou_user_security_answers') || '[]'
          );
          if (Array.isArray(localAnswers)) {
            const localMatch = localAnswers.find(
              (item: any) =>
                item.questionCode === selectedQuestion.code &&
                normalizeAnswer(String(item.answer || '')) === cleanAns
            );
            if (localMatch?.username) {
              foundUser = {
                username: String(localMatch.username),
                name: String(localMatch.name || localMatch.username),
              };
            }
          }
        } catch {}
      }

      if (!foundUser) {
        setFeedback({
          type: 'error',
          message:
            'Resposta não localizada para esta pergunta secreta. Verifique a resposta ou informe também seu celular/e-mail abaixo.',
        });
        setIsLoading(false);
        return;
      }

      setRecoveredUsername(foundUser.username);
      setRecoveredFullName(foundUser.name);
      setFeedback({
        type: 'success',
        message: 'Usuário localizado com sucesso!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao consultar pergunta secreta.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validação de Senha Forte (1 Maiúscula + 1 Caractere Especial + Confirmação)
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9\s]/.test(newPassword);
  const passwordsMatch =
    newPassword.trim().length > 0 && newPassword.trim() === confirmNewPassword.trim();
  const isNewPasswordValid = hasUpperCase && hasSpecialChar && passwordsMatch;

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (passwordStep === 'identify') {
      const cleanId = recoveryIdentifier.trim();
      if (!cleanId) {
        setFeedback({
          type: 'error',
          message: 'Informe seu Usuário, Celular ou E-mail.',
        });
        return;
      }

      setIsLoading(true);
      try {
        const matched = await findMatchingTriadeAccounts(cleanId);
        if (matched.length === 0) {
          setFeedback({
            type: 'error',
            message: 'Conta não localizada com este Usuário, Celular ou E-mail.',
          });
          setIsLoading(false);
          return;
        }
        setMatchedAccounts(matched);
        setPasswordStep('reset');
        setFeedback({
          type: 'success',
          message: `Conta localizada (${matched[0].name || matched[0].username}). Defina sua nova senha.`,
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: err?.message || 'Erro ao localizar conta.',
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!isNewPasswordValid) {
      setFeedback({
        type: 'error',
        message:
          'A nova senha deve ter ao menos 1 letra maiúscula, 1 caractere especial e confirmação idêntica.',
      });
      return;
    }

    const cleanNewPass = newPassword.trim();
    setIsLoading(true);
    try {
      if (supabase) {
        for (const acc of matchedAccounts) {
          const table = acc.sourceTable || 'clients';
          try {
            await (supabase.from(table as any) as any)
              .update({
                password_hash: cleanNewPass,
                updated_at: new Date().toISOString(),
              })
              .eq('id', acc.id);
          } catch {}
          if (acc.email) {
            try {
              await (supabase.from('clients') as any)
                .update({ password_hash: cleanNewPass })
                .ilike('email', acc.email);
            } catch {}
          }
        }
      }

      onBackToLogin(recoveryIdentifier.trim());
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao atualizar a senha.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subtitleByView: Record<RecoveryModalView, string> = {
    choose: 'ESQUECI USUÁRIO / SENHA',
    user: 'RECUPERAR USUÁRIO',
    password: 'RECUPERAR SENHA',
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
      <SalonAuthHeader
        salonName={salonName}
        salonLogoUrl={salonLogoUrl}
        subtitle={subtitleByView[view]}
        onClose={onClose}
      />

      <div className="p-4 space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-[4px] text-xs font-semibold flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TELA 1: ESCOLHA ENTRE [USUÁRIO] E [SENHA] */}
        {view === 'choose' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 text-center font-medium">
              Selecione qual informação deseja recuperar:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  pickRandomQuestion();
                  setView('user');
                }}
                className="py-4 px-3 rounded-[4px] bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs flex flex-col items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <User className="w-5 h-5 text-white" />
                <span className="text-white uppercase tracking-wide">Usuário</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setPasswordStep('identify');
                  setView('password');
                }}
                className="py-4 px-3 rounded-[4px] bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs flex flex-col items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <KeyRound className="w-5 h-5 text-white" />
                <span className="text-white uppercase tracking-wide">Senha</span>
              </button>
            </div>

            <div className="sticky bottom-0 z-20 pt-2 bg-slate-900">
              <button
                type="button"
                onClick={() => onBackToLogin()}
                className="w-full py-2.5 px-4 rounded-[4px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Voltar para ACESSAR</span>
              </button>
            </div>
          </div>
        )}

        {/* TELA 2A: RECUPERAÇÃO DE USUÁRIO VIA PERGUNTA SECRETA ALEATÓRIA */}
        {view === 'user' && (
          <form onSubmit={handleRecoverUsername} className="space-y-3.5">
            {/* Seleção rápida de pergunta secreta com quebra de linha */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-300">
                  Pergunta Secreta
                </label>
                <button
                  type="button"
                  onClick={pickRandomQuestion}
                  className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                  <span>Sortear outra</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsQuestionListOpen((prev) => !prev)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-emerald-500/60 rounded-[4px] px-3 py-2.5 text-xs text-white text-left flex items-center justify-between gap-2 transition cursor-pointer"
              >
                <span className="whitespace-normal break-words leading-snug">
                  {selectedQuestion.questionText}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    isQuestionListOpen ? 'rotate-180 text-emerald-400' : ''
                  }`}
                />
              </button>

              {isQuestionListOpen && (
                <div className="mt-1 bg-slate-950 border border-slate-700 rounded-[4px] overflow-hidden divide-y divide-slate-800/80 shadow-xl">
                  {questions.map((q) => {
                    const isSelected = q.code === selectedQuestion.code;
                    return (
                      <button
                        key={q.code}
                        type="button"
                        onClick={() => {
                          setSelectedQuestion(q);
                          setIsQuestionListOpen(false);
                          setFeedback(null);
                          setRecoveredUsername(null);
                        }}
                        className={`w-full px-3 py-2.5 text-xs text-left whitespace-normal break-words leading-snug transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#20C933] text-white font-bold'
                            : 'text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {q.questionText}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pergunta Secreta Destacada */}
            <div className="p-3 rounded-[4px] bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <HelpCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{selectedQuestion.questionText}</span>
              </div>

              <input
                type="text"
                required
                value={secretAnswer}
                onChange={(e) => setSecretAnswer(e.target.value)}
                placeholder="Digite sua resposta secreta"
                className="w-full bg-slate-900 border border-slate-800 rounded-[4px] px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition placeholder:text-slate-500"
              />
            </div>

            {/* Campo complementar opcional de Celular ou E-mail */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Celular ou E-mail (opcional para confirmação rápida)
              </label>
              <input
                type="text"
                value={contactHint}
                onChange={(e) => setContactHint(e.target.value)}
                placeholder="(11) 99999-9999 ou seu@email.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-[4px] px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition placeholder:text-slate-500"
              />
            </div>

            {recoveredUsername && (
              <div className="p-3 rounded-[4px] bg-slate-950 border border-emerald-500/40 space-y-2">
                <p className="text-[11px] text-slate-400">
                  Nome Completo: <strong className="text-white">{recoveredFullName}</strong>
                </p>
                <p className="text-xs text-slate-300">
                  Seu Nome de Usuário:{' '}
                  <strong className="text-emerald-400 text-sm">{recoveredUsername}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => onBackToLogin(recoveredUsername)}
                  className="w-full py-2.5 px-3 rounded-[4px] bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span className="text-white">Usar Usuário em ACESSAR</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            <div className="sticky bottom-0 z-20 pt-2 bg-slate-900 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setRecoveredUsername(null);
                  setView('choose');
                }}
                className="py-2.5 px-3 rounded-[4px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="submit"
                disabled={isLoading || secretAnswer.trim().length < 2}
                className="py-2.5 px-3 rounded-[4px] bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer whitespace-nowrap"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span className="text-white">Consultar</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TELA 2B: RECUPERAÇÃO DE SENHA */}
        {view === 'password' && (
          <form onSubmit={handleRecoverPassword} className="space-y-3.5">
            {passwordStep === 'identify' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Usuário, Celular ou E-mail
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-[4px] px-3 py-2.5 focus-within:border-emerald-500 transition">
                  <User className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="@usuario, (11) 99999-9999 ou e-mail"
                    className="bg-transparent text-xs sm:text-sm text-white outline-none w-full placeholder:text-slate-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nova Senha (1 maiúscula e 1 caractere especial)
                  </label>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-[4px] px-3 py-2.5 focus-within:border-emerald-500 transition">
                    <Lock className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nova senha"
                      className="bg-transparent text-xs sm:text-sm text-white outline-none w-full placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-slate-400 hover:text-white ml-2 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirme a Nova Senha
                  </label>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-[4px] px-3 py-2.5 focus-within:border-emerald-500 transition">
                    <Lock className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="bg-transparent text-xs sm:text-sm text-white outline-none w-full placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="text-slate-400 hover:text-white ml-2 cursor-pointer"
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="sticky bottom-0 z-20 pt-2 bg-slate-900 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  if (passwordStep === 'reset') {
                    setPasswordStep('identify');
                  } else {
                    setView('choose');
                  }
                }}
                className="py-2.5 px-3 rounded-[4px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="submit"
                disabled={isLoading || (passwordStep === 'reset' && !isNewPasswordValid)}
                className="py-2.5 px-3 rounded-[4px] bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer whitespace-nowrap"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span className="text-white">
                      {passwordStep === 'identify' ? 'Localizar' : 'Salvar Senha'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
