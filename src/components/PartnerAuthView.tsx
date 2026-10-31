import React from 'react';
import { SalonClientAuthModal } from './SalonClientAuthModal';
import { useTheme } from '../context/ThemeContext';

export interface PartnerAuthSuccessData {
  salonName: string;
  slug: string;
  phoneWhatsapp?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  category?: string;
  customCategory?: string;
  primaryColor?: string;
  legalManagerName?: string;
  legalManagerCpf?: string;
  legalManagerEmail?: string;
  legalManagerPhone?: string;
}

interface PartnerAuthViewProps {
  onSuccess: (data?: PartnerAuthSuccessData, userRole?: 'pro' | 'cliente') => void;
  onBack?: () => void;
  salonName?: string;
  salonSlug?: string;
  salonLogo?: string;
  primaryColor?: string;
}

export const PartnerAuthView: React.FC<PartnerAuthViewProps> = ({
  onSuccess,
  onBack,
  salonName = '',
  salonSlug = '',
  salonLogo = '',
  primaryColor,
}) => {
  const { isDark } = useTheme();

  return (
    <div className={`w-full h-full flex items-center justify-center font-['Poppins'] ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <SalonClientAuthModal
        isOpen={true}
        onClose={() => {
          if (onBack) onBack();
        }}
        salonName={salonName}
        salonSlug={salonSlug}
        salonLogo={salonLogo}
        primaryColor={primaryColor}
        themeMode={isDark ? 'dark' : 'light'}
        onAuthenticated={(_user, role) => {
          onSuccess(undefined, role);
        }}
      />
    </div>
  );
};

export default PartnerAuthView;
