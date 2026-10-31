/**
 * ============================================================================
 * EXPORTAÇÃO EXCLUSIVA PARA O PORTAL DO PARCEIRO (PORTAL WEB VAGOU)
 * ============================================================================
 * 
 * Este componente contém o fluxo completo de cadastro em 3 passos para novos
 * estabelecimentos, isolado e pronto para ser integrado no repositório do
 * Portal Web do Parceiro (meunegocio.vagouapp.com).
 * 
 * Funcionalidades inclusas:
 * - Passo 1: Informações do Estabelecimento com busca automática de CEP (ViaCEP).
 * - Passo 2: Dados do Representante Legal (CPF, E-mail, Telefone e Senha estrita).
 * - Passo 3: Segmento do negócio (Barbearia, Salão, Unhas, etc.), paleta de cores e slug do app.
 * - Integração nativa com Supabase Auth e tabela 'salons'.
 * - Modal de Onboarding em 5 etapas pós-cadastro (PartnerOnboardingModal).
 */

import React, { useState } from 'react';
import { 
  Building2, ArrowLeft, ArrowRight, UserCheck, Palette, 
  Check, Eye, EyeOff, Sparkles, AlertCircle, Loader2 
} from 'lucide-react';
import { PartnerOnboardingModal } from '../components/PartnerOnboardingModal';
import { 
  signUpWithSupabase, 
  syncSalonDataToSupabase,
  supabase,
  isSupabaseConfigured 
} from '../lib/supabase';

export interface PartnerRegistrationData {
  salonName: string;
  slug: string;
  phoneWhatsapp: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  category: string;
  customCategory?: string;
  primaryColor: string;
  legalManagerName: string;
  legalManagerCpf: string;
  legalManagerEmail: string;
  legalManagerPhone: string;
}

interface PartnerRegistrationWizardProps {
  onSuccess?: (data: PartnerRegistrationData) => void;
  onCancel?: () => void;
}

const BRAND_COLOR_PALETTES = [
  { id: 'emerald', name: 'Verde Vagou', hex: '#20C933', description: 'Vibrante & Oficial', badge: 'bg-emerald-500 text-white' },
  { id: 'amber', name: 'Dourado Imperial', hex: '#F59E0B', description: 'Barbearia & Clássico', badge: 'bg-amber-500 text-white' },
  { id: 'violet', name: 'Roxo Glamour', hex: '#8B5CF6', description: 'Beleza & Sofisticação', badge: 'bg-purple-500 text-white' },
  { id: 'blue', name: 'Azul Safira', hex: '#3B82F6', description: 'Moderno & Confiável', badge: 'bg-blue-500 text-white' },
  { id: 'pink', name: 'Rosa Elegance', hex: '#EC4899', description: 'Estética & Unhas', badge: 'bg-pink-500 text-white' },
  { id: 'slate', name: 'Preto & Grafite', hex: '#64748B', description: 'Minimalista Dark', badge: 'bg-slate-600 text-white' },
];

const PREDEFINED_CATEGORIES = [
  { id: 'barbearia', label: 'Barbearia & Cabelo Masculino', icon: '💈' },
  { id: 'salao', label: 'Salão de Beleza & Cabelo Feminino', icon: '💇‍♀️' },
  { id: 'unhas', label: 'Esmalteria & Designer de Unhas', icon: '💅' },
  { id: 'cilios', label: 'Cílios & Sobrancelhas', icon: '👁️' },
  { id: 'estetica', label: 'Estética, Depilação & Spa', icon: '✨' },
  { id: 'outros', label: 'Outros Segmentos', icon: '➕' },
];

export const PartnerRegistrationWizard: React.FC<PartnerRegistrationWizardProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [registeredPartnerData, setRegisteredPartnerData] = useState<PartnerRegistrationData | null>(null);

  // Passo 1: Estabelecimento
  const [salonName, setSalonName] = useState('');
  const [salonWhatsapp, setSalonWhatsapp] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  // Passo 2: Representante Legal & Senha
  const [legalName, setLegalName] = useState('');
  const [legalCpf, setLegalCpf] = useState('');
  const [legalEmail, setLegalEmail] = useState('');
  const [legalPhone, setLegalPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Passo 3: Segmento & Cores
  const [selectedCategory, setSelectedCategory] = useState('barbearia');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState('#20C933');
  const [salonSlug, setSalonSlug] = useState('');
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  // Máscaras de entrada
  const formatPhone = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      return raw.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return raw.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const formatCpf = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 11);
    return raw
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  };

  const formatCep = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 8);
    return raw.replace(/^(\d{5})(\d)/, '$1-$2');
  };

  // Busca de CEP automática via ViaCEP
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = formatCep(e.target.value);
    setCep(masked);
    setCepError('');

    const cleanCep = masked.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (data.erro) {
          setCepError('CEP não encontrado. Preencha o endereço manualmente.');
        } else {
          setLogradouro(data.logradouro || '');
          if (data.complemento) setComplemento(data.complemento);
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setUf(data.uf || '');
        }
      } catch {
        setCepError('Não foi possível consultar o CEP automaticamente.');
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const isLengthValid = password.length >= 8 && password.length <= 10;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password);
  const isPasswordValid = isLengthValid && hasUpperCase && hasSpecialChar;

  const handleSalonNameChange = (val: string) => {
    setSalonName(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSalonSlug(generatedSlug);
  };

  const handleNextStep1 = () => {
    const errs: string[] = [];
    if (!salonName.trim()) errs.push('Nome Fantasia do Estabelecimento é obrigatório.');
    if (salonWhatsapp.replace(/\D/g, '').length < 10) errs.push('WhatsApp comercial válido é obrigatório.');
    if (cep.replace(/\D/g, '').length < 8) errs.push('CEP completo é obrigatório.');
    if (!logradouro.trim()) errs.push('Logradouro / Rua é obrigatório.');
    if (!numero.trim()) errs.push('Número do endereço é obrigatório.');
    if (!cidade.trim()) errs.push('Cidade é obrigatória.');

    if (errs.length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors([]);
    setStep(2);
  };

  const handleNextStep2 = () => {
    const errs: string[] = [];
    if (!legalName.trim()) errs.push('Nome Completo do Responsável Legal é obrigatório.');
    const cleanCpfDigits = legalCpf.replace(/\D/g, '');
    if (cleanCpfDigits.length > 0 && cleanCpfDigits.length < 11) {
      errs.push('Se informado, o CPF deve possuir 11 dígitos válidos.');
    }
    if (!legalEmail.includes('@') || !legalEmail.includes('.')) errs.push('E-mail válido é obrigatório.');
    if (!isLengthValid) errs.push('A senha deve ter entre 8 e 10 caracteres (limite máximo de 10 dígitos).');
    if (!hasUpperCase) errs.push('A senha deve conter pelo menos uma letra maiúscula.');
    if (!hasSpecialChar) errs.push('A senha deve conter pelo menos um caractere especial (@, #, $, etc.).');
    if (password !== confirmPassword) errs.push('As senhas digitadas não coincidem.');

    if (errs.length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors([]);
    setStep(3);
  };

  const handleFinishRegister = async () => {
    const errs: string[] = [];
    if (!selectedCategory) errs.push('Selecione o segmento principal do seu estabelecimento.');
    if (selectedCategory === 'outros' && !customCategory.trim()) {
      errs.push('Por favor, especifique o segmento do seu estabelecimento no campo Outros.');
    }
    if (!salonSlug.trim()) errs.push('O link exclusivo do seu app é obrigatório.');

    if (errs.length > 0) {
      setStepErrors(errs);
      return;
    }

    const partnerData: PartnerRegistrationData = {
      salonName,
      slug: salonSlug,
      phoneWhatsapp: salonWhatsapp,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      category: selectedCategory === 'outros' ? customCategory : selectedCategory,
      customCategory: selectedCategory === 'outros' ? customCategory : undefined,
      primaryColor: selectedColor,
      legalManagerName: legalName,
      legalManagerCpf: legalCpf,
      legalManagerEmail: legalEmail,
      legalManagerPhone: legalPhone || salonWhatsapp,
    };

    const fullAddress = `${logradouro}, ${numero}${complemento ? ' - ' + complemento : ''} - ${bairro}, ${cidade}/${uf}`;

    // Sincronização com Supabase (se configurado)
    if (isSupabaseConfigured && supabase) {
      try {
        await signUpWithSupabase(legalEmail, password, {
          name: legalName,
          phone: legalPhone || salonWhatsapp,
          salon_name: salonName,
          role: 'owner',
        });

        await syncSalonDataToSupabase({
          slug: salonSlug,
          tradeName: salonName,
          phoneWhatsapp: salonWhatsapp,
          email: legalEmail,
          address: fullAddress,
          neighborhood: bairro,
          city: cidade,
          state: uf,
          latitude: -23.55052,
          longitude: -46.633308,
          operatingModel: 'team',
          primaryColor: selectedColor,
        });
      } catch (e) {
        console.error('Erro na sincronização Supabase:', e);
      }
    }

    setRegisteredPartnerData(partnerData);
    setShowOnboardingModal(true);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 text-slate-900">
      {/* Botão de Retorno */}
      {onCancel && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Início</span>
          </button>
        </div>
      )}

      {/* Barra de Progresso dos 3 Passos */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-[11px] font-bold mb-2">
          <span className={step >= 1 ? 'text-[#20C933]' : 'text-slate-500'}>1. Estabelecimento</span>
          <span className={step >= 2 ? 'text-[#20C933]' : 'text-slate-500'}>2. Responsável</span>
          <span className={step >= 3 ? 'text-[#20C933]' : 'text-slate-500'}>3. Segmento & Cores</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden flex">
          <div className="bg-[#20C933] transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {/* Feedback de Erros */}
      {stepErrors.length > 0 && (
        <div className="mb-4 p-3 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
          {stepErrors.map((err, idx) => (
            <p key={idx} className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>{err}</span>
            </p>
          ))}
        </div>
      )}

      {/* PASSO 1: DADOS DO ESTABELECIMENTO */}
      {step === 1 && (
        <div className="space-y-3.5 animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Dados do Estabelecimento</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Informações comerciais básicas para operação</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome Fantasia do Salão / Barbearia *</label>
            <input
              type="text"
              value={salonName}
              onChange={(e) => handleSalonNameChange(e.target.value)}
              placeholder="Ex: Studio Bella, Espaço VIP..."
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Comercial (com DDD) *</label>
            <input
              type="tel"
              value={salonWhatsapp}
              onChange={(e) => setSalonWhatsapp(formatPhone(e.target.value))}
              placeholder="(41) 99882-1140"
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
            />
          </div>

          <div className="flex gap-2">
            <div className="w-32 shrink-0">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                <span>CEP *</span>
                {isSearchingCep && <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-600" />}
              </label>
              <input
                type="text"
                value={cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                className="w-full h-8 px-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden font-mono"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Rua / Logradouro *</label>
              <input
                type="text"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                placeholder="Rua, Avenida..."
                className="w-full h-8 px-2.5 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
              />
            </div>
          </div>
          {cepError && <p className="text-[10px] text-amber-600 font-semibold">{cepError}</p>}

          <div className="flex gap-2">
            <div className="w-20 shrink-0">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Nº *</label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="123"
                className="w-full h-8 px-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden font-semibold"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Complemento</label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Sala 2, Loja..."
                className="w-full h-8 px-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Bairro</label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
                className="w-full h-8 px-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Cidade *</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
                className="w-full h-8 px-2.5 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
              />
            </div>
            <div className="w-16 shrink-0">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5 text-center">UF *</label>
              <input
                type="text"
                value={uf}
                maxLength={2}
                onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="UF"
                className="w-full h-8 px-1 text-xs text-center font-bold uppercase rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextStep1}
            className="w-full mt-4 py-2.5 px-4 rounded bg-[#20C933] hover:bg-[#1db82e] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
          >
            <span>Avançar para Dados do Responsável</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* PASSO 2: DADOS DO REPRESENTANTE LEGAL */}
      {step === 2 && (
        <div className="space-y-3.5 animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Dados do Representante Legal</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Responsável pelo salão e credenciais de acesso</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo do Responsável *</label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Ex: Anderson Pires"
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">CPF do Responsável (Opcional)</label>
              <input
                type="text"
                value={legalCpf}
                onChange={(e) => setLegalCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Pessoal</label>
              <input
                type="tel"
                value={legalPhone}
                onChange={(e) => setLegalPhone(formatPhone(e.target.value))}
                placeholder="(41) 99882-1140"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">E-mail de Acesso *</label>
            <input
              type="email"
              value={legalEmail}
              onChange={(e) => setLegalEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Senha de Acesso (8 a 10 dígitos) *</label>
              <span className={`text-[10px] font-mono font-bold ${isLengthValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                {password.length}/10
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                maxLength={10}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha (8 a 10 dígitos)"
                className="w-full px-3 py-2 pr-10 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-2 p-2 rounded bg-slate-100 border border-slate-200 space-y-1 text-[10px]">
              <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                <Check className={`w-3 h-3 ${isLengthValid ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Entre 8 e 10 caracteres (limite máximo: 10 dígitos)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                <Check className={`w-3 h-3 ${hasUpperCase ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Pelo menos uma letra maiúscula</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                <Check className={`w-3 h-3 ${hasSpecialChar ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Pelo menos um caractere especial (@, #, $, etc.)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Confirme a Senha *</label>
            <input
              type="password"
              value={confirmPassword}
              maxLength={10}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a senha novamente"
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-2 px-3 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={handleNextStep2}
              className="flex-2 py-2.5 px-4 rounded bg-[#20C933] hover:bg-[#1db82e] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Avançar para Segmento</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3: SEGMENTO & PALETA DE CORES */}
      {step === 3 && (
        <div className="space-y-3.5 animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-emerald-600" />
              <span>Segmento & Identidade Visual</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Personalize a aparência do seu aplicativo</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Segmento de Atuação *</label>
            <div className="grid grid-cols-2 gap-2">
              {PREDEFINED_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-2.5 rounded border text-left text-xs transition cursor-pointer flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedCategory === 'outros' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Especifique o seu Segmento *</label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Ex: Tatuagem, Piercing, Massoterapia..."
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Cor Predominante da Sua Marca *</label>
            <div className="grid grid-cols-3 gap-2">
              {BRAND_COLOR_PALETTES.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.hex)}
                  className={`p-2 rounded border text-left text-xs transition cursor-pointer flex items-center gap-2 ${
                    selectedColor === color.hex
                      ? 'border-slate-900 bg-slate-50 font-bold ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color.hex }} />
                  <span className="text-[11px] truncate">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Link Exclusivo do Seu App *</label>
            <div className="flex items-center rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
              <span className="font-mono text-slate-400 select-none">vagou.app/</span>
              <input
                type="text"
                value={salonSlug}
                onChange={(e) => setSalonSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="nome-do-seu-salao"
                className="flex-1 bg-transparent font-mono font-bold text-slate-900 outline-hidden ml-0.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-2 px-3 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={handleFinishRegister}
              className="flex-2 py-2.5 px-4 rounded bg-[#20C933] hover:bg-[#1db82e] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Cadastrar & Criar App</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Onboarding Pós-Cadastro */}
      {showOnboardingModal && registeredPartnerData && (
        <PartnerOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => {
            setShowOnboardingModal(false);
            if (onSuccess) onSuccess(registeredPartnerData);
          }}
          onComplete={(_onboardingResult) => {
            setShowOnboardingModal(false);
            if (onSuccess) onSuccess(registeredPartnerData);
          }}
          initialData={{
            salonName: registeredPartnerData.salonName,
            slug: registeredPartnerData.slug,
            category: registeredPartnerData.category,
            primaryColor: registeredPartnerData.primaryColor,
            legalManagerName: registeredPartnerData.legalManagerName,
            legalManagerPhone: registeredPartnerData.legalManagerPhone,
            cidade: registeredPartnerData.cidade,
            uf: registeredPartnerData.uf,
          }}
        />
      )}
    </div>
  );
};
export default PartnerRegistrationWizard;
