import React, { useState, useMemo, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  X,
  MessageCircle,
  User,
  Scissors,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { SalonPixKeyItem } from '../../types';
import {
  generatePixPayload,
  getPixQrCodeUrl,
  buildWhatsAppPixChargeUrl,
} from '../../services/pixGenerator';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

export interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  salonCity?: string;
  clientName?: string;
  clientPhone?: string;
  serviceTitle?: string;
  initialAmount: number;
  protocolCode?: string;
  pixKeys?: SalonPixKeyItem[];
  fallbackPixKey?: string;
  onConfirmPaid?: (amount: number, paymentMethod: 'pix' | 'cash' | 'credit_card') => void;
}

export const PixCheckoutModal: React.FC<PixCheckoutModalProps> = ({
  isOpen,
  onClose,
  salonName,
  salonCity = 'BRASIL',
  clientName = 'Cliente',
  clientPhone = '',
  serviceTitle = 'Atendimento',
  initialAmount,
  protocolCode,
  pixKeys = [],
  fallbackPixKey = '',
  onConfirmPaid,
}) => {
  const effectiveKeys = useMemo<SalonPixKeyItem[]>(() => {
    if (Array.isArray(pixKeys) && pixKeys.length > 0) return pixKeys;
    if (fallbackPixKey && fallbackPixKey.trim()) {
      return [
        {
          id: 'primary_fallback',
          type: 'cpf',
          key: fallbackPixKey.trim(),
          holderName: salonName,
          isPrimary: true,
          verified: true,
        },
      ];
    }
    return [];
  }, [pixKeys, fallbackPixKey, salonName]);

  const [selectedKeyId, setSelectedKeyId] = useState<string>(() => {
    const primary = effectiveKeys.find((k) => k.isPrimary);
    return primary?.id || effectiveKeys[0]?.id || '';
  });

  const [amountInput, setAmountInput] = useState<string>(() =>
    Number(initialAmount || 0).toFixed(2)
  );
  const [phoneInput, setPhoneInput] = useState<string>(clientPhone || '');
  const [manualPixKey, setManualPixKey] = useState<string>(fallbackPixKey || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountInput(Number(initialAmount || 0).toFixed(2));
      setPhoneInput(clientPhone || '');
      const primary = effectiveKeys.find((k) => k.isPrimary);
      if (primary) setSelectedKeyId(primary.id);
      else if (effectiveKeys[0]) setSelectedKeyId(effectiveKeys[0].id);
    }
  }, [isOpen, initialAmount, clientPhone, effectiveKeys]);

  const activePixItem = useMemo(() => {
    if (effectiveKeys.length > 0) {
      return (
        effectiveKeys.find((k) => k.id === selectedKeyId) ||
        effectiveKeys.find((k) => k.isPrimary) ||
        effectiveKeys[0]
      );
    }
    if (manualPixKey.trim()) {
      return {
        id: 'manual_pix',
        type: 'cpf' as const,
        key: manualPixKey.trim(),
        holderName: salonName,
        isPrimary: true,
      };
    }
    return null;
  }, [effectiveKeys, selectedKeyId, manualPixKey, salonName]);

  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amountInput.replace(',', '.'));
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amountInput]);

  const pixPayload = useMemo(() => {
    if (!activePixItem?.key) return '';
    return generatePixPayload({
      pixKey: activePixItem.key,
      keyType: activePixItem.type,
      merchantName: activePixItem.holderName || salonName || 'ESTABELECIMENTO',
      merchantCity: salonCity || 'BRASIL',
      amount: numericAmount > 0 ? numericAmount : undefined,
      txid: protocolCode ? protocolCode.replace(/[^a-zA-Z0-9]/g, '') : '***',
      description: serviceTitle,
    });
  }, [activePixItem, salonName, salonCity, numericAmount, protocolCode, serviceTitle]);

  const qrCodeUrl = useMemo(() => {
    if (!pixPayload) return '';
    return getPixQrCodeUrl(pixPayload, 240);
  }, [pixPayload]);

  const whatsappChargeUrl = useMemo(() => {
    if (!activePixItem?.key || !pixPayload) return '';
    return buildWhatsAppPixChargeUrl({
      clientPhone: phoneInput,
      clientName,
      salonName,
      serviceTitle,
      amount: numericAmount,
      pixKey: activePixItem.key,
      pixPayload,
    });
  }, [activePixItem, pixPayload, phoneInput, clientName, salonName, serviceTitle, numericAmount]);

  if (!isOpen) return null;

  const handleCopyPix = async () => {
    if (!pixPayload) return;
    hapticSuccess();
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded border border-slate-800 bg-slate-950 text-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-white" />
              <span>Checkout PIX</span>
            </span>
            <h3 className="text-xs sm:text-sm font-bold font-['Poppins'] truncate">
              Acerto Pós-Serviço
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Rolável */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Resumo Cliente & Serviço */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{clientName}</span>
              </p>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <Scissors className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{serviceTitle}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Total a Receber
              </span>
              <span className="text-base font-black font-mono text-emerald-400">
                R$ {numericAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Valor do Atendimento + WhatsApp do Cliente */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Valor Final (R$)
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-2 rounded border border-slate-800 bg-slate-900 text-white text-xs font-mono font-bold outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                WhatsApp do Cliente
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-2.5 py-2 rounded border border-slate-800 bg-slate-900 text-white text-xs font-mono outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Seletor de Chave PIX (se múltiplas) ou Input Rápido */}
          {effectiveKeys.length > 1 ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Chave PIX de Recebimento
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {effectiveKeys.map((item) => {
                  const isSel = activePixItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSelectedKeyId(item.id);
                      }}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-bold border transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        isSel
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{item.type.toUpperCase()}:</span>
                      <span className="font-mono">{item.key}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : effectiveKeys.length === 0 ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                Informe sua Chave PIX para gerar o QR Code
              </label>
              <input
                type="text"
                value={manualPixKey}
                onChange={(e) => setManualPixKey(e.target.value)}
                placeholder="CPF, CNPJ, Celular ou E-mail PIX"
                className="w-full px-3 py-2 rounded border border-slate-800 bg-slate-900 text-white text-xs font-mono outline-hidden focus:border-emerald-500"
              />
            </div>
          ) : null}

          {/* QR Code BACEN na Tela + Botão Copiar */}
          {pixPayload ? (
            <div className="p-3.5 rounded bg-slate-900/90 border border-slate-800 flex flex-col items-center text-center space-y-2.5">
              <div className="p-2.5 rounded bg-white shadow-sm">
                <img
                  src={qrCodeUrl}
                  alt="QR Code PIX"
                  className="w-40 h-40 sm:w-44 sm:h-44 object-contain mx-auto"
                />
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 block">
                  Chave: <strong className="text-white">{activePixItem?.key}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer mt-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">PIX Copia e Cola Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiar PIX Copia e Cola</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
              <QrCode className="w-6 h-6 text-slate-500" />
              <span>Digite ou selecione uma chave PIX para exibir o QR Code BACEN.</span>
            </div>
          )}

          {/* Ação de 1 Toque: Enviar Cobrança PIX no WhatsApp do Cliente */}
          {whatsappChargeUrl && (
            <a
              href={whatsappChargeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticSuccess()}
              className="w-full py-2.5 px-4 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>Enviar PIX Copia e Cola no WhatsApp</span>
            </a>
          )}
        </div>

        {/* Rodapé Fixo de Ação */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/95 sticky bottom-0 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer whitespace-nowrap"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={() => {
              hapticSuccess();
              onConfirmPaid?.(numericAmount, 'pix');
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Check className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Confirmar Recebimento PIX</span>
          </button>
        </div>
      </div>
    </div>
  );
};
