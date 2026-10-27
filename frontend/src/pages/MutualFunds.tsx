import { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  PieChart,
  Search,
  Loader2
} from 'lucide-react';
import Modal from '../components/Modal';
import { getMF, addMF, updateMF, deleteMF, searchFunds } from '../api/mf';
import { MFHolding } from '../types';
import { formatINR, formatDate, formatPercent } from '../utils/format';
import { format } from 'date-fns';
import clsx from 'clsx';

interface SearchResult {
  scheme_code?: string;
  schemeCode?: string;
  scheme_name?: string;
  schemeName?: string;
}

export default function MutualFunds() {
  const [funds, setFunds] = useState<MFHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<MFHolding | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields
  const [formSchemeCode, setFormSchemeCode] = useState('');
  const [formSchemeName, setFormSchemeName] = useState('');
  const [formBuyNav, setFormBuyNav] = useState('');
  const [formUnits, setFormUnits] = useState('');
  const [formBuyDate, setFormBuyDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Search & Typeahead
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchFundList = async () => {
    try {
      setErrorMessage(null);
      const res = await getMF();
      const list = Array.isArray(res.data) ? res.data : (res.data?.holdings || []);
      setFunds(list);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to fetch mutual fund holdings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFundList();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFundList();
  };

  // Search typeahead with 500ms debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await searchFunds(searchQuery.trim());
        const list = Array.isArray(res.data) ? res.data : (res.data?.funds || []);
        setSearchResults(list);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search funds error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectFund = (result: SearchResult) => {
    const code = (result.scheme_code || result.schemeCode || '').toString();
    const name = result.scheme_name || result.schemeName || '';
    setFormSchemeCode(code);
    setFormSchemeName(name);
    setSearchQuery(name);
    setShowDropdown(false);
  };

  const handleOpenAdd = () => {
    setEditingFund(null);
    setFormSchemeCode('');
    setFormSchemeName('');
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setFormBuyNav('');
    setFormUnits('');
    setFormBuyDate(format(new Date(), 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fund: MFHolding) => {
    setEditingFund(fund);
    setFormSchemeCode(fund.scheme_code);
    setFormSchemeName(fund.scheme_name);
    setSearchQuery(fund.scheme_name);
    setSearchResults([]);
    setShowDropdown(false);
    setFormBuyNav(fund.buy_nav.toString());
    setFormUnits(fund.units.toString());
    setFormBuyDate(fund.buy_date ? fund.buy_date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const buyNavNum = parseFloat(formBuyNav);
    const unitsNum = parseFloat(formUnits);

    if (!formSchemeCode.trim()) {
      alert('Scheme code is required. Please select a fund from search or type the scheme code.');
      return;
    }
    if (isNaN(buyNavNum) || buyNavNum <= 0) {
      alert('Please enter a valid Buy NAV.');
      return;
    }
    if (isNaN(unitsNum) || unitsNum <= 0) {
      alert('Please enter a valid number of units.');
      return;
    }

    const payload = {
      scheme_code: formSchemeCode.trim(),
      scheme_name: formSchemeName.trim() || formSchemeCode.trim(),
      buy_nav: buyNavNum,
      units: unitsNum,
      buy_date: formBuyDate,
    };

    setSubmitting(true);
    try {
      if (editingFund) {
        await updateMF(editingFund.id, payload);
      } else {
        await addMF(payload);
      }
      setIsModalOpen(false);
      fetchFundList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save mutual fund');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMF(id);
      setDeleteConfirmId(null);
      fetchFundList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete mutual fund');
    }
  };

  // Portfolio Totals
  const totals = useMemo(() => {
    const list = Array.isArray(funds) ? funds : [];
    const totalInvested = list.reduce((sum, f) => sum + (f.invested || (f.buy_nav * f.units)), 0);
    const totalCurrentValue = list.reduce((sum, f) => sum + (f.current_value || ((f.current_nav || f.buy_nav) * f.units)), 0);
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    
    // Average XIRR
    const validXirrFunds = list.filter(f => typeof f.xirr === 'number' && !isNaN(f.xirr));
    const avgXirr = validXirrFunds.length > 0
      ? validXirrFunds.reduce((sum, f) => sum + f.xirr, 0) / validXirrFunds.length
      : 0;

    return { totalInvested, totalCurrentValue, totalPnl, totalPnlPercent, avgXirr };
  }, [funds]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mutual Funds</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track SIPs, lump sums, NAVs, and XIRR performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating NAVs...' : 'Refresh NAVs'}
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            <span>Add Mutual Fund</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Invested Capital</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">
            {formatINR(totals.totalInvested)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Current Value</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">
            {formatINR(totals.totalCurrentValue)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Profit / Loss</p>
          <div className="flex items-center gap-1.5 mt-1">
            {totals.totalPnl >= 0 ? (
              <TrendingUp size={20} className="text-emerald-500" />
            ) : (
              <TrendingDown size={20} className="text-rose-500" />
            )}
            <p className={clsx('text-xl font-bold', totals.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {totals.totalPnl >= 0 ? '+' : '-'}{formatINR(totals.totalPnl)}
            </p>
          </div>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg XIRR</p>
          <div className="flex items-center gap-1.5 mt-1">
            {totals.avgXirr >= 0 ? (
              <ArrowUpRight size={20} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={20} className="text-rose-500" />
            )}
            <p className={clsx('text-xl font-bold', totals.avgXirr >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {formatPercent(totals.avgXirr)}
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Holdings Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            <p className="text-xs text-gray-400">Loading mutual funds...</p>
          </div>
        ) : funds.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 mb-3">
              <PieChart size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">No mutual fund holdings</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              You haven't added any mutual funds yet. Click "Add Mutual Fund" to search and track your holdings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/40 dark:bg-slate-800/40 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100/60 dark:border-slate-700/60">
                <tr>
                  <th className="py-3.5 px-4">Fund Name</th>
                  <th className="py-3.5 px-3 text-right">Units</th>
                  <th className="py-3.5 px-3 text-right">Buy NAV</th>
                  <th className="py-3.5 px-3 text-right">Current NAV</th>
                  <th className="py-3.5 px-3 text-right">Invested</th>
                  <th className="py-3.5 px-3 text-right">Current Value</th>
                  <th className="py-3.5 px-3 text-right">Return %</th>
                  <th className="py-3.5 px-3 text-right">XIRR %</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80 dark:divide-slate-700/50">
                {funds.map((fund) => {
                  const invested = fund.invested || (fund.buy_nav * fund.units);
                  const currentVal = fund.current_value || ((fund.current_nav || fund.buy_nav) * fund.units);
                  const pnl = fund.pnl ?? (currentVal - invested);
                  const pnlPercent = fund.pnl_percent ?? (invested > 0 ? (pnl / invested) * 100 : 0);
                  const isPositive = pnl >= 0;
                  const isDeleting = deleteConfirmId === fund.id;

                  return (
                    <tr
                      key={fund.id}
                      className="hover:bg-white/50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Fund Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-100 max-w-xs truncate" title={fund.scheme_name}>
                          {fund.scheme_name || fund.scheme_code}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                          Code: {fund.scheme_code}
                        </div>
                      </td>

                      {/* Units */}
                      <td className="py-3.5 px-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {fund.units.toFixed(3)}
                      </td>

                      {/* Buy NAV */}
                      <td className="py-3.5 px-3 text-right text-gray-600 dark:text-gray-400">
                        {formatINR(fund.buy_nav)}
                      </td>

                      {/* Current NAV */}
                      <td className="py-3.5 px-3 text-right font-medium text-gray-800 dark:text-gray-100">
                        {formatINR(fund.current_nav || fund.buy_nav)}
                      </td>

                      {/* Invested */}
                      <td className="py-3.5 px-3 text-right text-gray-600 dark:text-gray-400">
                        {formatINR(invested)}
                      </td>

                      {/* Current Value */}
                      <td className="py-3.5 px-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                        {formatINR(currentVal)}
                      </td>

                      {/* Return % */}
                      <td className="py-3.5 px-3 text-right font-semibold">
                        <span className={clsx('inline-flex items-center gap-0.5', isPositive ? 'text-emerald-500' : 'text-rose-500')}>
                          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {formatPercent(pnlPercent)}
                        </span>
                      </td>

                      {/* XIRR % */}
                      <td className="py-3.5 px-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                        {typeof fund.xirr === 'number' && !isNaN(fund.xirr) ? formatPercent(fund.xirr) : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        {isDeleting ? (
                          <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl border border-rose-200 dark:border-rose-900">
                            <button
                              onClick={() => handleDelete(fund.id)}
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
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(fund)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(fund.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700/50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit MF */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFund ? 'Edit Mutual Fund' : 'Add Mutual Fund'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fund Search */}
          <div className="relative">
            <label className="label">Search Scheme Name *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type 2+ chars to search (e.g. Parag Parikh, HDFC Nifty)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                className="input-field pr-9"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </div>
            </div>

            {/* Dropdown for search results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl divide-y divide-gray-100 dark:divide-slate-700/60">
                {searchResults.map((result, i) => {
                  const code = result.scheme_code || result.schemeCode || '';
                  const name = result.scheme_name || result.schemeName || '';
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectFund(result)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-700/60 transition-colors flex flex-col"
                    >
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{name}</span>
                      <span className="text-[11px] text-gray-400 font-mono mt-0.5">Code: {code}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Scheme Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. 122639"
                value={formSchemeCode}
                onChange={(e) => setFormSchemeCode(e.target.value)}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="label">Scheme Name</label>
              <input
                type="text"
                placeholder="Fund name"
                value={formSchemeName}
                onChange={(e) => setFormSchemeName(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Buy NAV (₹) *</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                placeholder="e.g. 52.30"
                value={formBuyNav}
                onChange={(e) => setFormBuyNav(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Units *</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                placeholder="e.g. 191.20"
                value={formUnits}
                onChange={(e) => setFormUnits(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Buy Date *</label>
            <input
              type="date"
              required
              value={formBuyDate}
              onChange={(e) => setFormBuyDate(e.target.value)}
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
              {submitting ? 'Saving...' : editingFund ? 'Update Fund' : 'Add Mutual Fund'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
