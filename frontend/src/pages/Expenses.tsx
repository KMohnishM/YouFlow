import { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  AlertCircle,
  Receipt,
  X,
  Check
} from 'lucide-react';
import Modal from '../components/Modal';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses';
import { Expense } from '../types';
import { formatINR, formatDate, currentMonth } from '../utils/format';
import { format, parse, addMonths, subMonths } from 'date-fns';
import clsx from 'clsx';

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
  'Healthcare', 'Utilities', 'Rent', 'Education', 'Travel',
  'Personal Care', 'Investments', 'Other'
];

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200/50',
  'Transportation': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200/50',
  'Shopping': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200/50',
  'Entertainment': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200/50',
  'Healthcare': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200/50',
  'Utilities': 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400 border-gray-200/50',
  'Rent': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200/50',
  'Education': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200/50',
  'Travel': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200/50',
  'Personal Care': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border-fuchsia-200/50',
  'Investments': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200/50',
  'Other': 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400 border-slate-200/50',
};

export default function Expenses() {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0]);
  const [formReason, setFormReason] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [formTags, setFormTags] = useState<string>('');

  const fetchExpensesList = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await getExpenses({ month: selectedMonth });
      const list = Array.isArray(res.data) ? res.data : (res.data?.expenses || []);
      setExpenses(list);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesList();
  }, [selectedMonth]);

  // Month navigation
  const currentDateObj = useMemo(() => {
    try {
      return parse(selectedMonth, 'yyyy-MM', new Date());
    } catch {
      return new Date();
    }
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const prev = subMonths(currentDateObj, 1);
    setSelectedMonth(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDateObj, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  // Open modal for new expense
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormAmount('');
    setFormCategory(CATEGORIES[0]);
    setFormReason('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormTags('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormAmount(expense.amount.toString());
    setFormCategory(expense.category);
    setFormReason(expense.reason);
    setFormDate(expense.date.substring(0, 10));
    setFormTags((expense.tags || []).join(', '));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          amount: amountNum,
          category: formCategory,
          reason: formReason,
          date: formDate,
          tags: tagsArray,
        });
      } else {
        await createExpense({
          amount: amountNum,
          category: formCategory,
          reason: formReason,
          date: formDate,
          tags: tagsArray,
        });
      }
      setIsModalOpen(false);
      fetchExpensesList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense(id);
      setDeleteConfirmId(null);
      fetchExpensesList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete expense');
    }
  };

  // Filtering
  const filteredExpenses = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    return list.filter(exp => {
      const matchCat = selectedCategory === 'All' || exp.category === selectedCategory;
      const matchQuery = !searchQuery.trim() ||
        exp.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [expenses, selectedCategory, searchQuery]);

  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Log, categorize, and control your spending</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Month Navigator & Summary Row */}
      <div className="glass-card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-700/60 p-1.5 rounded-xl border border-white/50 dark:border-slate-600/50 shadow-sm">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div className="px-3 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 min-w-[120px] text-center">
              {format(currentDateObj, 'MMMM yyyy')}
            </span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            title="Next Month"
          >
            <ChevronRight size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-400 text-xs block uppercase tracking-wider">Total Spent</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatINR(totalSpent)}</span>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700" />
          <div>
            <span className="text-gray-400 text-xs block uppercase tracking-wider">Transactions</span>
            <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{filteredExpenses.length}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses by reason or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border',
              selectedCategory === 'All'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                : 'glass-card text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700'
            )}
          >
            All Categories
          </button>
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={clsx(
                'px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border',
                selectedCategory === category
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'glass-card text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Expense List */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            <p className="text-xs text-gray-400">Loading expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 mb-3">
              <Receipt size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">No expenses found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your filters or search keywords.'
                : 'No expenses logged for this month. Click "Add Expense" to get started.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/80 dark:divide-slate-700/50">
            {filteredExpenses.map(expense => {
              const badgeClass = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['Other'];
              const isDeleting = deleteConfirmId === expense.id;

              return (
                <div
                  key={expense.id}
                  className="p-4 sm:px-6 hover:bg-white/40 dark:hover:bg-slate-700/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium border flex-shrink-0 mt-0.5', badgeClass)}>
                      {expense.category}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 break-words">
                        {expense.reason || 'Expense'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{formatDate(expense.date)}</span>
                        {expense.tags && expense.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Tag size={12} />
                              <span>{expense.tags.join(', ')}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      -{formatINR(expense.amount)}
                    </span>

                    {/* Action buttons or Inline Delete Confirm */}
                    {isDeleting ? (
                      <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl border border-rose-200 dark:border-rose-900 animate-fade-in">
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-medium px-2">Delete?</span>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                          title="Confirm Delete"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-1 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 transition-colors"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(expense)}
                          className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
                          title="Edit Expense"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(expense.id)}
                          className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700/50 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Amount (₹) *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="e.g. 450"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Category *</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="input-field"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Reason / Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Why did you spend this? (e.g., Grocery shopping at Supermarket)"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Tags (Optional)</label>
            <input
              type="text"
              placeholder="e.g. essential, family, dinner (comma separated)"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm"
            >
              {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
