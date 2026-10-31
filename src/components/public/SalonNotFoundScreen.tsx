import React, { useState } from 'react';
import { Building2, ArrowRight, ShieldAlert } from 'lucide-react';
import { PartnerRegistrationWizard } from '../../portal-export/PartnerRegistrationWizard';

interface SalonNotFoundScreenProps {
  subdomain: string;
}

export const SalonNotFoundScreen: React.FC<SalonNotFoundScreenProps> = ({ subdomain }) => {
  const [showLocalRegister, setShowLocalRegister] = useState(false);

  if (showLocalRegister) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 overflow-y-auto p-4">
        <PartnerRegistrationWizard
          onSuccess={() => {
            window.location.reload();
          }}
          onCancel={() => setShowLocalRegister(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      {/* Luz sutil de fundo */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[4px] p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-fadeIn">
        
        {/* Ícone de Destaque */}
        <div className="w-16 h-16 bg-slate-800/80 border border-slate-700/60 rounded-[4px] flex items-center justify-center text-amber-400 mb-5 shadow-inner">
          <Building2 className="w-8 h-8" />
        </div>

        {/* Identificador do Subdomínio */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-slate-800/90 border border-slate-700/80 text-slate-300 text-xs font-mono mb-4">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>{subdomain}.vagouapp.com</span>
        </div>

        {/* Título Resumido */}
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          Negócio Não Encontrado
        </h1>

        {/* Mensagem Orientativa Sem Poluição */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
          Não encontramos o endereço <strong className="text-white font-semibold">"{subdomain}"</strong> na nossa base de dados. Quer cadastrar seu estabelecimento com este nome?
        </p>

        {/* Botão Principal de Cadastro Nativo (Fundo Verde = Texto Branco Obrigatório) */}
        <button
          type="button"
          onClick={() => setShowLocalRegister(true)}
          className="w-full py-3.5 px-5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-sm rounded-[4px] shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-white">Cadastrar meu Negócio</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>

        {/* Rodapé com Link Secundário para o Portal */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 w-full flex items-center justify-between text-xs text-slate-400">
          <span>Já tem uma conta?</span>
          <a
            href="https://portal.vagouapp.com"
            className="text-emerald-400 hover:underline font-medium"
          >
            Ir para o Portal
          </a>
        </div>

      </div>
    </div>
  );
};
