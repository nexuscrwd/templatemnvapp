import React, { useState } from 'react';
import { 
  Plus, Calendar, AlertCircle, CheckCircle2, 
  Clock, Trash2, Tag, Building2, User,
  X, Receipt
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { FinancialExpense } from '../../../types';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';

interface ExpensesManagerProps {
  expenses: FinancialExpense[];
  onAddExpense: (expense: Omit<FinancialExpense, 'id' | 'createdAt'>) => void;
  onToggleStatus: (id: string) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({
  expenses,
  onAddExpense,
  onToggleStatus,
  onDeleteExpense,
}) => {
  const { isDark } = useTheme();

  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'fixed' | 'variable'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Estado do formulário de novo lançamento
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState<'fixed' | 'variable'>('fixed');
  const [scope, setScope] = useState<'salon' | 'personal'>('salon');
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');

  // Filtragem
  const filteredExpenses = expenses.filter((exp) => {
    if (filter === 'pending') return exp.status === 'pending' || exp.status === 'overdue';
    if (filter === 'paid') return exp.status === 'paid';
    if (filter === 'fixed') return exp.category === 'fixed';
    if (filter === 'variable') return exp.category === 'variable';
    return true;
  });

  // Totais
  const totalAmount = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const paidAmount = expenses.filter(e => e.status === 'paid').reduce((acc, exp) => acc + exp.amount, 0);
  const pendingAmount = expenses.filter(e => e.status !== 'paid').reduce((acc, exp) => acc + exp.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) return;

    hapticSuccess();
    onAddExpense({
      description: description.trim(),
      amount: numAmount,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      category,
      scope,
      status,
    });

    // Reset form
    setDescription('');
    setAmount('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Resumo do Caixa de Despesas */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`p-2.5 rounded border flex flex-col justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Total Custos</span>
          <span className="text-sm font-black font-mono text-slate-100 mt-1">
            R$ {totalAmount.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">{expenses.length} lançamentos</span>
        </div>

        <div className={`p-2.5 rounded border flex flex-col justify-between ${
          isDark ? 'bg-slate-900/90 border-emerald-500/30' : 'bg-white border-emerald-300 shadow-2xs'
        }`}>
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-400">Total Pago</span>
          <span className="text-sm font-black font-mono text-emerald-400 mt-1">
            R$ {paidAmount.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">Quitados</span>
        </div>

        <div className={`p-2.5 rounded border flex flex-col justify-between ${
          isDark ? 'bg-slate-900/90 border-amber-500/30' : 'bg-white border-amber-300 shadow-2xs'
        }`}>
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-400">A Vencer</span>
          <span className="text-sm font-black font-mono text-amber-400 mt-1">
            R$ {pendingAmount.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">Pendentes</span>
        </div>
      </div>

      {/* 2. Barra de Controle & Novo Lançamento */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Filtros Rápidos */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'paid', label: 'Pagas' },
              { id: 'fixed', label: 'Fixas' },
              { id: 'variable', label: 'Variáveis' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                hapticLight();
                setFilter(item.id);
              }}
              className={`px-2.5 py-1 rounded text-[10.5px] font-bold transition whitespace-nowrap cursor-pointer ${
                filter === item.id
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Botão Adicionar Despesa */}
        <button
          type="button"
          onClick={() => {
            hapticLight();
            setShowAddModal(true);
          }}
          className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 ml-auto"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Lançar Custo</span>
        </button>
      </div>

      {/* 3. Lista de Custos e Despesas */}
      <div className={`rounded border divide-y ${
        isDark ? 'bg-slate-900/80 border-slate-800 divide-slate-800/60' : 'bg-white border-slate-200 divide-slate-100'
      }`}>
        {filteredExpenses.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            <Receipt className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
            Nenhuma despesa encontrada neste filtro.
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const isPaid = expense.status === 'paid';
            const formattedDate = expense.dueDate 
              ? new Date(expense.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
              : '--/--/--';

            return (
              <div key={expense.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-800/20 transition">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {expense.description}
                    </h4>

                    {/* Badge Categoria */}
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${
                      expense.category === 'fixed'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    }`}>
                      {expense.category === 'fixed' ? 'Fixo' : 'Variável'}
                    </span>

                    {/* Scope */}
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 shrink-0">
                      {expense.scope === 'salon' ? (
                        <Building2 className="w-2.5 h-2.5 text-slate-400" />
                      ) : (
                        <User className="w-2.5 h-2.5 text-slate-400" />
                      )}
                      {expense.scope === 'salon' ? 'Salão' : 'Pessoal'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Vence: {formattedDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className={`text-xs font-black font-mono block ${
                      isPaid ? 'text-slate-400 line-through opacity-70' : 'text-rose-400'
                    }`}>
                      R$ {expense.amount.toFixed(2).replace('.', ',')}
                    </span>

                    {/* Button / Badge Status */}
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        onToggleStatus(expense.id);
                      }}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition uppercase tracking-wider inline-flex items-center gap-1 ${
                        isPaid
                          ? 'bg-emerald-500 text-white shadow-2xs hover:bg-emerald-600'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                      title="Clique para alternar status"
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          <span>Pago</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-2.5 h-2.5 text-amber-300" />
                          <span>A Vencer</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Excluir */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      onDeleteExpense(expense.id);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                    title="Excluir custo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Novo Lançamento */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-md rounded-lg border p-4 space-y-4 shadow-xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-['Poppins']">
                  Lançar Custo / Despesa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel do Espaço, Pomada Matte, Energia..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded border outline-none font-medium ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono rounded border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'fixed' | 'variable')}
                    className={`w-full px-2.5 py-2 text-xs rounded border outline-none font-medium ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="fixed">Fixo (Mensal)</option>
                    <option value="variable">Variável (Insumos/Outros)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Âmbito
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as 'salon' | 'personal')}
                    className={`w-full px-2.5 py-2 text-xs rounded border outline-none font-medium ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="salon">Salão Todo (Geral)</option>
                    <option value="personal">Custo Pessoal (Profissional)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Status Inicial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('pending')}
                    className={`py-1.5 rounded text-xs font-bold border transition cursor-pointer ${
                      status === 'pending'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    A Vencer
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('paid')}
                    className={`py-1.5 rounded text-xs font-bold border transition cursor-pointer ${
                      status === 'paid'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    Pago Já
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
