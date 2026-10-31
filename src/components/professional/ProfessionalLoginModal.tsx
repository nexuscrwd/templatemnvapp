import React, { useState } from 'react';
import { KeyRound, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { hapticLight, hapticSuccess, hapticMedium } from '../../utils/haptics';

interface ProfessionalLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (pin: string) => boolean;
  onSuccess?: () => void;
  savedPin?: string;
  salonName?: string;
  title?: string;
  description?: string;
}

export const ProfessionalLoginModal: React.FC<ProfessionalLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onSuccess,
  savedPin = '1234',
  salonName,
  title = 'Acesso do Profissional',
  description = 'Digite seu PIN de 4 dígitos para gerenciar serviços, agenda e espaço.',
}) => {
  const { isDark } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    let success = false;
    if (typeof onLogin === 'function') {
      success = onLogin(pin);
    } else {
      const expectedPin = (savedPin || '1234').trim();
      success = pin.trim() === expectedPin;
    }

    if (success) {
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      hapticSuccess();
      setError(false);
      setPin('');
      onClose();
    } else {
      hapticMedium();
      setError(true);
    }
  };

  const handleDigitClick = (digit: string) => {
    hapticLight();
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError(false);
    }
  };

  const handleDeleteDigit = () => {
    hapticLight();
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-xs rounded-xl border shadow-2xl p-5 flex flex-col items-center text-center transition-all ${
          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícone de Escudo */}
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
          <KeyRound className="w-6 h-6 stroke-[2.2]" />
        </div>

        <h3 className="text-base font-bold font-['Poppins']">
          {title}
        </h3>
        {salonName && (
          <p className="text-[11px] font-semibold text-emerald-500 -mt-0.5 mb-1">
            {salonName}
          </p>
        )}
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 mb-4`}>
          {description}
        </p>

        {/* Display do PIN */}
        <div className="flex items-center justify-center gap-3 my-2">
          {[0, 1, 2, 3].map((i) => {
            const hasChar = pin.length > i;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  hasChar
                    ? 'bg-emerald-500 border-emerald-500 scale-110'
                    : isDark
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-300 bg-slate-100'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center gap-1 text-rose-500 text-xs font-bold my-2 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>PIN incorreto. Dica: {savedPin || '1234'}</span>
          </div>
        )}

        {/* Teclado Numérico Touch */}
        <div className="grid grid-cols-3 gap-2 w-full mt-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigitClick(d)}
              className={`py-2.5 rounded text-sm font-bold font-mono transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDeleteDigit}
            className={`py-2.5 rounded text-xs font-bold transition active:scale-95 cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
            }`}
          >
            DEL
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className={`py-2.5 rounded text-sm font-bold font-mono transition active:scale-95 cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
            }`}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pin.length === 0}
            className="py-2.5 rounded text-xs font-black bg-[#20C933] hover:bg-[#1bb32d] active:scale-95 text-white transition disabled:opacity-40 cursor-pointer flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-white stroke-[2.5]" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between w-full pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
          <span>Dica: PIN inicial <strong>{savedPin || '1234'}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
