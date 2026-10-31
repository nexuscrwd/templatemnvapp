import React, { useState, useMemo } from 'react';
import { QrCode, Printer, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { SalonPixKeyItem } from '../../types';
import { generatePixPayload, getPixQrCodeUrl } from '../../services/pixGenerator';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

export interface SalonPixPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  salonCity?: string;
  salonLogo?: string;
  slogan?: string;
  pixKeys: SalonPixKeyItem[];
  fallbackPixKey?: string;
  initialKeyId?: string;
}

export const SalonPixPrintModal: React.FC<SalonPixPrintModalProps> = ({
  isOpen,
  onClose,
  salonName,
  salonCity = 'BRASIL',
  salonLogo,
  slogan,
  pixKeys = [],
  fallbackPixKey = '',
  initialKeyId,
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
    if (initialKeyId) return initialKeyId;
    const primary = effectiveKeys.find((k) => k.isPrimary);
    return primary?.id || effectiveKeys[0]?.id || '';
  });

  const [copied, setCopied] = useState(false);

  const activePixItem = useMemo(() => {
    return (
      effectiveKeys.find((k) => k.id === selectedKeyId) ||
      effectiveKeys.find((k) => k.isPrimary) ||
      effectiveKeys[0] ||
      null
    );
  }, [effectiveKeys, selectedKeyId]);

  const pixPayload = useMemo(() => {
    if (!activePixItem?.key) return '';
    return generatePixPayload({
      pixKey: activePixItem.key,
      keyType: activePixItem.type,
      merchantName: activePixItem.holderName || salonName || 'ESTABELECIMENTO',
      merchantCity: salonCity || 'BRASIL',
    });
  }, [activePixItem, salonName, salonCity]);

  const qrCodeUrl = useMemo(() => {
    if (!pixPayload) return '';
    return getPixQrCodeUrl(pixPayload, 300);
  }, [pixPayload]);

  if (!isOpen) return null;

  const handleCopyPayload = async () => {
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

  const handlePrint = () => {
    hapticLight();
    window.print();
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
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold font-['Poppins'] truncate">
              Plaquinha PIX de Balcão (BACEN)
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
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Seletor de Chave PIX caso existam múltiplas */}
          {effectiveKeys.length > 1 && (
            <div className="space-y-1.5 print:hidden">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Selecionar Chave PIX para a Placa
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
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
                      className={`px-2.5 py-1.5 rounded text-xs font-bold border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{item.type.toUpperCase()}</span>
                      <span className="font-mono text-[11px]">{item.key}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Placa para Display Acrílico (Área Imprimível) */}
          {activePixItem ? (
            <div
              id="salon-pix-acrylic-plate"
              className="p-5 rounded bg-slate-900 border border-slate-800 flex flex-col items-center text-center space-y-3.5 print:bg-white print:text-slate-900 print:border-slate-300"
            >
              {/* Nome do Estabelecimento */}
              <div className="space-y-0.5">
                {salonLogo && (
                  <img
                    src={salonLogo}
                    alt={salonName}
                    className="h-8 w-auto mx-auto mb-1.5 object-contain"
                  />
                )}
                <h4 className="text-base font-extrabold font-['Poppins'] tracking-tight text-white print:text-slate-900">
                  {salonName}
                </h4>
                {slogan && (
                  <p className="text-[11px] text-slate-400 print:text-slate-600">{slogan}</p>
                )}
              </div>

              {/* Selo Pagamento Instantâneo PIX */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider">
                <QrCode className="w-3.5 h-3.5 text-white" />
                <span>Pagamento via PIX</span>
              </div>

              {/* QR Code Oficial BACEN */}
              <div className="p-3 rounded bg-white shadow-md">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code PIX ${salonName}`}
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto"
                />
              </div>

              {/* Dados da Chave */}
              <div className="w-full pt-2 border-t border-slate-800/80 print:border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-700 block">
                  Chave PIX ({activePixItem.type.toUpperCase()})
                </span>
                <p className="text-sm font-mono font-bold text-white print:text-slate-900 break-all">
                  {activePixItem.key}
                </p>
                {(activePixItem.holderName || activePixItem.institution) && (
                  <p className="text-[11px] text-slate-400 print:text-slate-600">
                    {[activePixItem.holderName, activePixItem.institution]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>

              {/* Assinatura Vagou */}
              <div className="pt-1 flex items-center justify-center gap-1 text-[10px] text-slate-400 print:text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-600" />
                <span>Padrão Oficial BR Code • BACEN</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Cadastre ao menos uma chave PIX para gerar a plaquinha de balcão.
            </div>
          )}
        </div>

        {/* Rodapé Fixo de Ação */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/95 sticky bottom-0 z-20 flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleCopyPayload}
            disabled={!pixPayload}
            className="flex-1 py-2.5 px-3 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>PIX Copia e Cola</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!pixPayload}
            className="flex-1 py-2.5 px-3 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-40"
          >
            <Printer className="w-3.5 h-3.5 text-white" />
            <span>Imprimir Placa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
