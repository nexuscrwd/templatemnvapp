import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Check, 
  Heart, 
  Calendar,
  Upload,
  Database as DatabaseIcon,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { compressImageFile } from '../utils/imageCompressor';
import { 
  fetchUserProfileFromDb, 
  updateUserProfile, 
  isSupabaseConfigured, 
  uploadAvatarToSupabaseStorage,
  isValidAvatarUrlString
} from '../lib/supabase';

interface UserDashboardProps {
  onBack: () => void;
  onUpdateProfile?: (name: string, avatarUrl: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ 
  onBack,
  onUpdateProfile
}) => {
  const { isDark } = useTheme();
  
  // Carregar dados iniciais do localStorage ou usar fallbacks
  const [name, setName] = useState(() => {
    return localStorage.getItem('vagou_user_name') || 'Usuário';
  });
  
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>(() => {
    const saved = localStorage.getItem('vagou_user_avatar');
    if (saved && (saved.includes('unsplash.com') || saved.includes('images.unsplash'))) {
      localStorage.removeItem('vagou_user_avatar');
      return '';
    }
    return isValidAvatarUrlString(saved) ? saved.trim() : '';
  });

  // Alias compatível com referências de template
  const avatarUrl = userAvatarUrl;
  const setAvatarUrl = setUserAvatarUrl;

  // Monitoramento de mudanças em userAvatarUrl para diagnóstico de estado e persistência
  useEffect(() => {
    console.log(
      '[UserDashboard] Estado userAvatarUrl alterado:',
      userAvatarUrl ? `${userAvatarUrl.slice(0, 80)}... (len=${userAvatarUrl.length})` : '(vazio)'
    );
  }, [userAvatarUrl]);

  const [email, setEmail] = useState(() => {
    const fromProfile = (() => {
      try {
        const p = localStorage.getItem('vagou_user_profile');
        if (p) return JSON.parse(p).email;
      } catch {}
      return '';
    })();
    return localStorage.getItem('vagou_user_email') || fromProfile || localStorage.getItem('vagou_active_partner') || '';
  });

  const [phone, setPhone] = useState(() => {
    const fromProfile = (() => {
      try {
        const p = localStorage.getItem('vagou_user_profile');
        if (p) return JSON.parse(p).phone;
      } catch {}
      return '';
    })();
    return localStorage.getItem('vagou_user_phone') || fromProfile || '';
  });

  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [, setIsSavingDb] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar e identificar dados do usuário diretamente no banco Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadDataFromSupabase() {
      const currentName = localStorage.getItem('vagou_user_name') || '';
      const currentEmail = localStorage.getItem('vagou_user_email') || localStorage.getItem('vagou_active_partner') || '';
      const currentCpf = localStorage.getItem('vagou_user_cpf') || '';

      setIsSyncingDb(true);
      try {
        const dbProfile = await fetchUserProfileFromDb({
          name: currentName,
          email: currentEmail,
          cpf: currentCpf,
        });

        if (isMounted && dbProfile) {
          if (dbProfile.name) {
            setName(dbProfile.name);
            localStorage.setItem('vagou_user_name', dbProfile.name);
          }
          if (dbProfile.email) {
            setEmail(dbProfile.email);
            localStorage.setItem('vagou_user_email', dbProfile.email);
          }
          if (dbProfile.phone) {
            const formatted = formatPhone(dbProfile.phone);
            setPhone(formatted);
            localStorage.setItem('vagou_user_phone', formatted);
          }
          const localAvatar = localStorage.getItem('vagou_user_avatar') || '';
          const validDbAvatar = isValidAvatarUrlString(dbProfile.avatarUrl) ? dbProfile.avatarUrl.trim() : '';
          const validLocalAvatar = isValidAvatarUrlString(localAvatar) ? localAvatar.trim() : '';
          const finalAvatar = validDbAvatar || validLocalAvatar;

          if (finalAvatar) {
            setUserAvatarUrl(finalAvatar);
            localStorage.setItem('vagou_user_avatar', finalAvatar);
            if (onUpdateProfile) {
              onUpdateProfile(dbProfile.name || currentName || 'Usuário', finalAvatar);
            }
          }

          try {
            const existing = JSON.parse(localStorage.getItem('vagou_user_profile') || '{}');
            localStorage.setItem('vagou_user_profile', JSON.stringify({
              ...existing,
              name: dbProfile.name || currentName,
              email: dbProfile.email || currentEmail,
              phone: dbProfile.phone || existing.phone || '',
              avatarUrl: finalAvatar || existing.avatarUrl || '',
            }));
          } catch {}
        }
      } catch (err) {
        console.warn('Erro ao sincronizar do banco:', err);
      } finally {
        if (isMounted) setIsSyncingDb(false);
      }
    }

    loadDataFromSupabase();
    return () => { isMounted = false; };
  }, []);

  // Contadores dinâmicos para a seção de estatísticas do cliente
  const [stats, setStats] = useState({
    activeCount: 0,
    concludedCount: 0
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vagou_user_appointments');
      if (saved) {
        const list = JSON.parse(saved);
        const active = list.filter((apt: any) => apt.status === 'CONFIRMADO' || apt.status === 'AGENDADO' || apt.status === 'PENDENTE').length;
        const concluded = list.filter((apt: any) => apt.status === 'CONCLUÍDO' || apt.status === 'concluido').length;
        setStats({ activeCount: active, concludedCount: concluded });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Formatar telefone no padrão brasileiro
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length > 6) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
      } else if (numbers.length > 2) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      }
      return numbers;
    }
    return value;
  };

  // Processamento de arquivos para troca de avatar (suporta drag-and-drop e input clássico)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    try {
      let resolvedAvatar = '';

      // 1. Tenta enviar para o Supabase Storage (retorna URL pública leve)
      if (isSupabaseConfigured) {
        const identifier = email || localStorage.getItem('vagou_client_id') || name || 'user';
        const uploadedUrl = await uploadAvatarToSupabaseStorage(file, identifier);
        if (isValidAvatarUrlString(uploadedUrl)) {
          resolvedAvatar = uploadedUrl.trim();
        }
      }

      // 2. Fallback: comprimir a imagem em DataURI leve (320x320 JPEG/PNG) para caber no LocalStorage e no banco
      if (!resolvedAvatar) {
        const compressed = await compressImageFile(file, {
          maxWidth: 320,
          maxHeight: 320,
          quality: 0.85,
        });
        if (isValidAvatarUrlString(compressed)) {
          resolvedAvatar = compressed.trim();
        }
      }

      if (isValidAvatarUrlString(resolvedAvatar)) {
        setUserAvatarUrl(resolvedAvatar);
        try {
          localStorage.setItem('vagou_user_avatar', resolvedAvatar);
        } catch {}
        if (onUpdateProfile) {
          onUpdateProfile(name, resolvedAvatar);
        }
        window.dispatchEvent(
          new CustomEvent('vagou:profile-updated', {
            detail: { name, avatarUrl: resolvedAvatar },
          })
        );
        hapticLight();
      }
    } catch (err) {
      console.error('[UserDashboard] Erro ao processar imagem de avatar:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDb(true);

    const storedAvatarFallback = localStorage.getItem('vagou_user_avatar') || '';
    // Validação estrita de URL/DataURI antes de salvar no Supabase e LocalStorage
    const validatedAvatarUrl = isValidAvatarUrlString(userAvatarUrl)
      ? userAvatarUrl.trim()
      : isValidAvatarUrlString(storedAvatarFallback)
        ? storedAvatarFallback.trim()
        : '';

    console.log(
      '[UserDashboard] Antes de salvar - userAvatarUrl:',
      userAvatarUrl ? `${userAvatarUrl.slice(0, 80)}...` : '(vazio)',
      '| validatedAvatarUrl:',
      validatedAvatarUrl ? `${validatedAvatarUrl.slice(0, 80)}...` : '(vazio)'
    );
    
    try {
      localStorage.setItem('vagou_user_name', name.trim());
      if (validatedAvatarUrl) {
        localStorage.setItem('vagou_user_avatar', validatedAvatarUrl);
      } else {
        localStorage.removeItem('vagou_user_avatar');
      }
      localStorage.setItem('vagou_user_email', email.trim());
      localStorage.setItem('vagou_user_phone', phone.trim());

      const updatedProfile = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatarUrl: validatedAvatarUrl,
      };
      localStorage.setItem('vagou_user_profile', JSON.stringify(updatedProfile));

      // Sincronizar em tempo real com a tabela 'clients' (e 'professionals'/'profiles') no Supabase via updateUserProfile
      const dbResult = await updateUserProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cpf: localStorage.getItem('vagou_user_cpf') || undefined,
        avatarUrl: validatedAvatarUrl,
      });

      const finalSyncedAvatar = isValidAvatarUrlString(dbResult?.avatarUrl)
        ? dbResult.avatarUrl.trim()
        : validatedAvatarUrl;

      // Garante sincronização do estado local userAvatarUrl após escrita bem-sucedida
      setUserAvatarUrl(finalSyncedAvatar);
      if (finalSyncedAvatar) {
        localStorage.setItem('vagou_user_avatar', finalSyncedAvatar);
      }

      console.log(
        '[UserDashboard] Depois de salvar - userAvatarUrl sincronizado:',
        finalSyncedAvatar ? `${finalSyncedAvatar.slice(0, 80)}...` : '(vazio)',
        '| Resposta updateUserProfile:',
        dbResult
      );
      
      // Chamar callback global para propagar atualizações no resto do App
      if (onUpdateProfile) {
        onUpdateProfile(name.trim(), finalSyncedAvatar);
      }
      
      hapticSuccess();
      setIsSavedSuccessfully(true);
      try {
        window.dispatchEvent(
          new CustomEvent('vagou:profile-updated', {
            detail: { name: name.trim(), avatarUrl: finalSyncedAvatar },
          })
        );
        window.dispatchEvent(new Event('storage'));
      } catch {}
      setTimeout(() => {
        setIsSavedSuccessfully(false);
        onBack();
      }, 600);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setIsSavingDb(false);
    }
  };

  return (
    <div className="w-full h-dvh max-h-dvh flex flex-col min-h-0 bg-transparent overflow-hidden">
      {/* CABEÇALHO UNIFICADO COM INDICADOR DE CONEXÃO AO BANCO */}
      <header className={`sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between border-b ${
        isDark ? 'bg-slate-950/95 border-slate-900/60' : 'bg-white border-slate-200'
      } backdrop-blur-md shrink-0`}>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onBack();
          }}
          className={`p-1.5 rounded-[4px] transition active:scale-95 cursor-pointer ${
            isDark ? 'hover:bg-slate-900 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center">
          <h1 className="text-sm font-black uppercase tracking-wider font-['Poppins'] text-emerald-400">
            Meus Dados Pessoais
          </h1>
          {isSupabaseConfigured && (
            <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-emerald-400">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isSyncingDb ? 'animate-ping' : ''}`} />
              <span>{isSyncingDb ? 'Sincronizando banco...' : 'Banco Conectado'}</span>
            </div>
          )}
        </div>

        <div className="w-8 h-8 flex items-center justify-end">
          {isSyncingDb ? (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : (
            <DatabaseIcon className="w-4 h-4 text-emerald-500/50" />
          )}
        </div>
      </header>

      {/* CONTEÚDO ROLANTE */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-28 space-y-5 no-scrollbar">
        
        {/* EDITAR FOTO / AVATAR (ÁREA DE UPLOAD E PRESETS) */}
        <div className={`p-4 rounded-[4px] border ${
          isDark ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200'
        } space-y-4`}>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-emerald-400">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Foto do Perfil</span>
          </div>

          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
            
            {/* Imagem do Perfil Ativa + Upload trigger */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative w-24 h-24 rounded-full border-2 cursor-pointer group flex items-center justify-center overflow-hidden transition-all shrink-0 ${
                isDragging 
                  ? 'border-emerald-400 bg-emerald-500/10 scale-105' 
                  : isDark 
                    ? 'border-slate-800 hover:border-emerald-500 bg-slate-950' 
                    : 'border-slate-300 hover:border-emerald-500 bg-slate-100 shadow-2xs'
              }`}
            >
              {avatarUrl && !avatarUrl.includes('unsplash.com') && !avatarUrl.startsWith('data:image/svg+xml') ? (
                <img 
                  src={avatarUrl} 
                  alt="Foto do Perfil" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className={`w-10 h-10 stroke-[1.8] ${isDark ? 'text-slate-300 group-hover:text-emerald-400' : 'text-slate-700 group-hover:text-emerald-600'} transition-colors`} />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white">
                <Upload className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[9px] font-bold text-slate-300 uppercase">Enviar</span>
              </div>
              
              {/* Botão flutuante para indicar editabilidade */}
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <Camera className="w-3 h-3 text-white" />
              </div>
            </div>

            {/* Input escondido */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Informações de Drag-and-Drop */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="space-y-0.5">
                <p className={`text-xs font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Arraste uma foto ou clique para escolher
                </p>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Suporta arquivos PNG, JPG ou GIF. Máximo de 2MB.
                </p>
              </div>

              {/* Ações de Foto */}
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Escolher Foto</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setAvatarUrl('');
                      localStorage.removeItem('vagou_user_avatar');
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition active:scale-95 cursor-pointer border ${
                      isDark 
                        ? 'border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400' 
                        : 'border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600'
                    }`}
                  >
                    Remover Foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* METRICAS / DASHBOARD ESTATÍSTICO */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-[4px] border ${
            isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Ativos</span>
            </div>
            <div className="text-xl font-black text-emerald-400 leading-none">
              {stats.activeCount}
            </div>
            <div className="text-[9px] text-slate-400 mt-1">
              Agendamentos agendados
            </div>
          </div>

          <div className={`p-3 rounded-[4px] border ${
            isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Concluídos</span>
            </div>
            <div className="text-xl font-black text-emerald-400 leading-none">
              {stats.concludedCount}
            </div>
            <div className="text-[9px] text-slate-400 mt-1">
              Visitas concluídas no estabelecimento
            </div>
          </div>
        </div>

        {/* FORMULÁRIO DE DADOS PESSOAIS */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className={`p-4 rounded-[4px] border ${
            isDark ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200'
          } space-y-3`}>
            
            {/* Campo: Nome Completo */}
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nome Completo</span>
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Insira seu nome completo"
                className={`w-full px-3 py-2.5 rounded-[4px] text-xs border outline-hidden transition font-semibold ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-slate-100' 
                    : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-950 focus:ring-1 focus:ring-emerald-500 shadow-2xs'
                }`}
              />
            </div>

            {/* Campo: E-mail */}
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>E-mail</span>
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="exemplo@email.com"
                className={`w-full px-3 py-2.5 rounded-[4px] text-xs border outline-hidden transition font-semibold ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-slate-100' 
                    : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-950 focus:ring-1 focus:ring-emerald-500 shadow-2xs'
                }`}
              />
            </div>

            {/* Campo: Telefone */}
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Telefone Celular</span>
              </label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required
                placeholder="(11) 99999-9999"
                className={`w-full px-3 py-2.5 rounded-[4px] text-xs border outline-hidden transition font-semibold ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-slate-100' 
                    : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-950 focus:ring-1 focus:ring-emerald-500 shadow-2xs'
                }`}
              />
            </div>
          </div>

          {/* Banner de Salvo com sucesso */}
          {isSavedSuccessfully && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-2 px-3 rounded-[4px] font-bold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Perfil salvo com sucesso! Seus dados foram sincronizados.</span>
            </div>
          )}

          {/* Botão de Envio Unificado */}
          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-black text-xs rounded-[4px] transition uppercase tracking-widest font-['Poppins'] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Check className="w-4 h-4 text-white" />
            <span className="text-white">Salvar Alterações</span>
          </button>
        </form>
      </div>
    </div>
  );
};
