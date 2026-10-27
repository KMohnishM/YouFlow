import { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  Landmark,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  X,
  Calendar,
  Clock,
  Percent,
  AlertTriangle
} from 'lucide-react';
import Modal from '../components/Modal';
import { getFDs, addFD, updateFD, deleteFD } from '../api/fd';
import { FD } from '../types';
import { formatINR, formatDate } from '../utils/format';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function FDs() {
  const [fds, setFds] = useState<FD[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFd, setEditingFd] = useState<FD | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields
  const [formBank, setFormBank] = useState('');
  const [formFdNumber, setFormFdNumber] = useState('');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formTenureMonths, setFormTenureMonths] = useState('');
  const [formStartDate, setFormStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [formNotes, setFormNotes] = useState('');

  const fetchFdList = async () => {
    try {
      setErrorMessage(null);
      const res = await getFDs();
      const list = Array.isArray(res.data) ? res.data : (res.data?.fds || []);
      setFds(list);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to fetch fixed deposits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFdList();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFdList();
  };

  const handleOpenAdd = () => {
    setEditingFd(null);
    setFormBank('');
    setFormFdNumber('');
    setFormPrincipal('');
    setFormRate('');
    setFormTenureMonths('12');
    setFormStartDate(format(new Date(), 'yyyy-MM-dd'));
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fd: FD) => {
    setEditingFd(fd);
    setFormBank(fd.bank);
    setFormFdNumber(fd.fd_number || '');
    setFormPrincipal(fd.principal.toString());
    setFormRate(fd.rate.toString());
    setFormTenureMonths(fd.tenure_months.toString());
    setFormStartDate(fd.start_date ? fd.start_date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'));
    setFormNotes(fd.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const principalNum = parseFloat(formPrincipal);
    const rateNum = parseFloat(formRate);
    const tenureNum = parseInt(formTenureMonths, 10);

    if (isNaN(principalNum) || principalNum <= 0) {
      alert('Please enter a valid principal amount.');
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('Please enter a valid interest rate.');
      return;
    }
    if (isNaN(tenureNum) || tenureNum <= 0) {
      alert('Please enter a valid tenure in months.');
      return;
    }

    const payload = {
      bank: formBank.trim(),
      fd_number: formFdNumber.trim(),
      principal: principalNum,
      rate: rateNum,
      tenure_months: tenureNum,
      start_date: formStartDate,
      notes: formNotes.trim(),
    };

    setSubmitting(true);
    try {
      if (editingFd) {
        await updateFD(editingFd.id, payload);
      } else {
        await addFD(payload);
      }
      setIsModalOpen(false);
      fetchFdList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save fixed deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteFD(id);
      setDeleteConfirmId(null);
      fetchFdList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete fixed deposit');
    }
  };

  // Portfolio Totals
  const totals = useMemo(() => {
    const list = Array.isArray(fds) ? fds : [];
    const totalPrincipal = list.reduce((sum, fd) => sum + (fd.principal || 0), 0);
    const totalMaturity = list.reduce((sum, fd) => sum + (fd.maturity_amount || (fd.principal + (fd.total_interest || 0))), 0);
    const totalInterest = list.reduce((sum, fd) => sum + (fd.total_interest || (fd.maturity_amount - fd.principal) || 0), 0);
    return { totalPrincipal, totalMaturity, totalInterest };
  }, [fds]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Fixed Deposits</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Guaranteed yield, tenure schedules, and interest maturity</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            <span>Add Fixed Deposit</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Principal</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">
            {formatINR(totals.totalPrincipal)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Across {fds.length} active deposits</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Maturity Value</p>
          <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
            {formatINR(totals.totalMaturity)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Principal + Total Interest</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Guaranteed Interest</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatINR(totals.totalInterest)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Yield over full tenures</p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Card Grid */}
      {loading ? (
        <div className="glass-card flex flex-col items-center justify-center p-12 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          <p className="text-xs text-gray-400">Loading deposits...</p>
        </div>
      ) : fds.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 mb-3">
            <Landmark size={24} />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">No fixed deposits found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Add your bank fixed deposits to monitor interest accruals and upcoming maturity dates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {fds.map((fd) => {
            const isMatured = fd.is_matured || (typeof fd.days_to_maturity === 'number' && fd.days_to_maturity <= 0);
            const isMaturingSoon = !isMatured && typeof fd.days_to_maturity === 'number' && fd.days_to_maturity <= 30;

            // Calculate progress %
            let progress = 0;
            if (isMatured) {
              progress = 100;
            } else if (fd.start_date && fd.maturity_date) {
              const start = new Date(fd.start_date).getTime();
              const end = new Date(fd.maturity_date).getTime();
              const now = Date.now();
              if (end > start) {
                progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
              }
            }

            const isDeleting = deleteConfirmId === fd.id;

            return (
              <div
                key={fd.id}
                className={clsx(
                  'glass-card p-5 flex flex-col justify-between transition-all duration-300 relative',
                  isMaturingSoon
                    ? 'border-amber-400 dark:border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'hover:shadow-2xl'
                )}
              >
                {/* Header: Bank & Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                        <Landmark size={18} className="text-indigo-500" />
                        <span>{fd.bank}</span>
                      </h3>
                      {fd.fd_number && (
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">FD #{fd.fd_number}</p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isMatured ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                          Matured
                        </span>
                      ) : isMaturingSoon ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Maturing Soon
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-white/40 dark:bg-slate-700/30 border border-white/50 dark:border-slate-700/50 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Principal</p>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                        {formatINR(fd.principal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Rate p.a.</p>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center justify-center gap-0.5">
                        {fd.rate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Tenure</p>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                        {fd.tenure_months} mo
                      </p>
                    </div>
                  </div>

                  {/* Dates & Timeline */}
                  <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-gray-400" />
                        <span>Started:</span>
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(fd.start_date)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-gray-400" />
                        <span>Maturity:</span>
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(fd.maturity_date)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-gray-400">Tenure progress</span>
                      <span className="font-semibold text-gray-600 dark:text-gray-300">
                        {isMatured ? '100%' : `${Math.round(progress)}%`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200/70 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          isMatured
                            ? 'bg-gray-400'
                            : isMaturingSoon
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Results: Interest & Maturity Amount */}
                  <div className="pt-3 border-t border-gray-100/60 dark:border-slate-700/60 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Interest Earned</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        +{formatINR(fd.interest_earned ?? fd.total_interest ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Maturity Amount</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                        {formatINR(fd.maturity_amount || (fd.principal + (fd.total_interest || 0)))}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 pt-1">
                      {isMatured ? (
                        <span className="text-gray-400">Term completed</span>
                      ) : (
                        <span className={clsx(isMaturingSoon ? 'text-amber-500 font-semibold' : 'text-gray-400')}>
                          {fd.days_to_maturity ?? 0} days remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Actions or Inline Delete Confirm */}
                <div className="mt-4 pt-3 border-t border-gray-100/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 truncate max-w-[140px]" title={fd.notes}>
                    {fd.notes || ''}
                  </span>

                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl border border-rose-200 dark:border-rose-900 animate-fade-in">
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium px-1">Delete?</span>
                      <button
                        onClick={() => handleDelete(fd.id)}
                        className="p-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                        title="Confirm Delete"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 transition-colors"
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(fd)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
                        title="Edit FD"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(fd.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700/50 transition-colors"
                        title="Delete FD"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit FD */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFd ? 'Edit Fixed Deposit' : 'Add Fixed Deposit'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Bank Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Bank, ICICI, State Bank of India"
              value={formBank}
              onChange={(e) => setFormBank(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="label">FD / Certificate Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. FD99201824"
              value={formFdNumber}
              onChange={(e) => setFormFdNumber(e.target.value)}
              className="input-field font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Principal (₹) *</label>
              <input
                type="number"
                step="any"
                min="1"
                required
                placeholder="e.g. 100000"
                value={formPrincipal}
                onChange={(e) => setFormPrincipal(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Rate (% p.a.) *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="e.g. 7.25"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tenure (Months) *</label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 12"
                value={formTenureMonths}
                onChange={(e) => setFormTenureMonths(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input
                type="date"
                required
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Notes / Instructions (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Auto-renew on maturity, compounding quarterly"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="input-field resize-none"
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
              {submitting ? 'Saving...' : editingFd ? 'Update Deposit' : 'Add Deposit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
