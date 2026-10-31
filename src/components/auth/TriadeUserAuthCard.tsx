import React, { useState } from 'react';
import { TriadeUserLoginForm, TriadeUserLoginPayload } from './TriadeUserLoginForm';
import { TriadeUserRegisterForm, TriadeUserData } from './TriadeUserRegisterForm';
import { TriadeUserRecoveryModal } from './TriadeUserRecoveryModal';

export type UserAuthMode = 'login' | 'register' | 'recovery';

export interface TriadeUserAuthCardProps {
  initialMode?: UserAuthMode;
  onSuccess?: (result: {
    mode: UserAuthMode;
    data: TriadeUserLoginPayload | TriadeUserData;
    keepModalOpen?: boolean;
  }) => void;
  onClose?: () => void;
  origin?: 'portal' | 'establishment';
  salonId?: string;
  salonName?: string;
  salonLogoUrl?: string;
  salonAccentColor?: string;
  variant?: 'card' | 'flat';
}

/**
 * 🏛️ Orquestrador de Modais Independentes de Autenticação da Tríade VagouApp
 * Renderiza separadamente cada modal independente com o cabeçalho do logotipo/logomarca do salão:
 * 1. Modal "ACESSAR" (TriadeUserLoginForm)
 * 2. Modal "CADASTRO" (TriadeUserRegisterForm)
 * 3. Modal "ESQUECI USUÁRIO/SENHA" (TriadeUserRecoveryModal: opções [Usuário] e [Senha])
 */
export const TriadeUserAuthCard: React.FC<TriadeUserAuthCardProps> = ({
  initialMode = 'login',
  onSuccess,
  onClose,
  origin = 'establishment',
  salonId,
  salonName,
  salonLogoUrl,
  salonAccentColor = '#20C933',
  variant = 'card',
}) => {
  const [mode, setModeState] = useState<UserAuthMode>(() => {
    try {
      const savedMode = sessionStorage.getItem('vagou_client_auth_modal_mode');
      if (savedMode === 'login' || savedMode === 'register' || savedMode === 'recovery') {
        return savedMode;
      }
    } catch {}
    return initialMode;
  });

  const [recoveredIdentifier, setRecoveredIdentifier] = useState<string>('');

  const setMode = (nextMode: UserAuthMode) => {
    setModeState(nextMode);
    try {
      sessionStorage.setItem('vagou_client_auth_modal_mode', nextMode);
    } catch {}
  };

  if (mode === 'recovery') {
    return (
      <TriadeUserRecoveryModal
        variant={variant}
        salonName={salonName}
        salonLogoUrl={salonLogoUrl}
        onClose={onClose}
        onBackToLogin={(recoveredId) => {
          if (recoveredId) {
            setRecoveredIdentifier(recoveredId);
          }
          setMode('login');
        }}
      />
    );
  }

  if (mode === 'register') {
    return (
      <TriadeUserRegisterForm
        variant={variant}
        showHeader={true}
        showSwitchToLogin={true}
        onSwitchToLogin={() => setMode('login')}
        origin={origin}
        salonId={salonId}
        salonName={salonName}
        salonLogoUrl={salonLogoUrl}
        salonAccentColor={salonAccentColor}
        onSuccess={(data, opts) =>
          onSuccess?.({
            mode: 'register',
            data,
            keepModalOpen: opts?.keepModalOpen ?? true,
          })
        }
        onClose={onClose}
      />
    );
  }

  return (
    <TriadeUserLoginForm
      variant={variant}
      showHeader={true}
      showSwitchToRegister={true}
      salonName={salonName}
      salonLogoUrl={salonLogoUrl}
      initialIdentifier={recoveredIdentifier}
      onOpenRecovery={() => setMode('recovery')}
      onSwitchToRegister={() => setMode('register')}
      onSuccess={(data) =>
        onSuccess?.({ mode: 'login', data, keepModalOpen: false })
      }
      onClose={onClose}
    />
  );
};
