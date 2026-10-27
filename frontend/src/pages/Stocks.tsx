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
  Building2,
  BarChart2
} from 'lucide-react';
import Modal from '../components/Modal';
import { getStocks, addStock, updateStock, deleteStock } from '../api/stocks';
import { StockHolding } from '../types';
import { formatINR, formatDate, formatPercent } from '../utils/format';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function Stocks() {
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<StockHolding | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields
  const [formTicker, setFormTicker] = useState('');
  const [formName, setFormName] = useState('');
  const [formExchange, setFormExchange] = useState('NSE');
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formBuyDate, setFormBuyDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [formNotes, setFormNotes] = useState('');

  const fetchStockList = async () => {
    try {
      setErrorMessage(null);
      const res = await getStocks();
      const list = Array.isArray(res.data) ? res.data : (res.data?.holdings || []);
      setStocks(list);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to fetch stock holdings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStockList();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStockList();
  };

  const handleOpenAdd = () => {
    setEditingStock(null);
    setFormTicker('');
    setFormName('');
    setFormExchange('NSE');
    setFormBuyPrice('');
    setFormQuantity('');
    setFormBuyDate(format(new Date(), 'yyyy-MM-dd'));
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stock: StockHolding) => {
    setEditingStock(stock);
    setFormTicker(stock.ticker);
    setFormName(stock.name || '');
    setFormExchange(stock.exchange || 'NSE');
    setFormBuyPrice(stock.buy_price.toString());
    setFormQuantity(stock.quantity.toString());
    setFormBuyDate(stock.buy_date ? stock.buy_date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'));
    setFormNotes(stock.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const buyPriceNum = parseFloat(formBuyPrice);
    const quantityNum = parseFloat(formQuantity);

    if (isNaN(buyPriceNum) || buyPriceNum <= 0) {
      alert('Please enter a valid buy price');
      return;
    }
    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const payload = {
      ticker: formTicker.trim().toUpperCase(),
      name: formName.trim() || formTicker.trim().toUpperCase(),
      exchange: formExchange,
      buy_price: buyPriceNum,
      quantity: quantityNum,
      buy_date: formBuyDate,
      notes: formNotes.trim(),
    };

    setSubmitting(true);
    try {
      if (editingStock) {
        await updateStock(editingStock.id, payload);
      } else {
        await addStock(payload);
      }
      setIsModalOpen(false);
      fetchStockList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteStock(id);
      setDeleteConfirmId(null);
      fetchStockList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete holding');
    }
  };

  // Portfolio Totals
  const totals = useMemo(() => {
    const list = Array.isArray(stocks) ? stocks : [];
    const totalInvested = list.reduce((sum, s) => sum + (s.invested || (s.buy_price * s.quantity)), 0);
    const totalCurrentValue = list.reduce((sum, s) => sum + (s.current_value || ((s.current_price || s.buy_price) * s.quantity)), 0);
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    return { totalInvested, totalCurrentValue, totalPnl, totalPnlPercent };
  }, [stocks]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Stock Portfolio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time equity holdings and P&L tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating...' : 'Refresh Prices'}
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            <span>Add Stock</span>
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
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Overall Return %</p>
          <div className="flex items-center gap-1.5 mt-1">
            {totals.totalPnlPercent >= 0 ? (
              <ArrowUpRight size={20} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={20} className="text-rose-500" />
            )}
            <p className={clsx('text-xl font-bold', totals.totalPnlPercent >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {formatPercent(totals.totalPnlPercent)}
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
            <p className="text-xs text-gray-400">Loading holdings...</p>
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 mb-3">
              <BarChart2 size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">No stock holdings</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              You haven't added any stocks yet. Click "Add Stock" to track your first equity holding.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/40 dark:bg-slate-800/40 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100/60 dark:border-slate-700/60">
                <tr>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-3">Exchange</th>
                  <th className="py-3.5 px-3 text-right">Qty</th>
                  <th className="py-3.5 px-3 text-right">Buy Price</th>
                  <th className="py-3.5 px-3 text-right">Current Price</th>
                  <th className="py-3.5 px-3 text-right">Invested</th>
                  <th className="py-3.5 px-3 text-right">Current Value</th>
                  <th className="py-3.5 px-3 text-right">P&L</th>
                  <th className="py-3.5 px-3 text-right">P&L %</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80 dark:divide-slate-700/50">
                {stocks.map((stock) => {
                  const pnl = stock.pnl ?? ((stock.current_price || stock.buy_price) * stock.quantity - stock.buy_price * stock.quantity);
                  const pnlPercent = stock.pnl_percent ?? (stock.buy_price > 0 ? ((stock.current_price - stock.buy_price) / stock.buy_price) * 100 : 0);
                  const isPositive = pnl >= 0;
                  const isDeleting = deleteConfirmId === stock.id;

                  return (
                    <tr
                      key={stock.id}
                      className="hover:bg-white/50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Stock Name & Ticker */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-100">
                          {stock.ticker}
                        </div>
                        {stock.name && stock.name !== stock.ticker && (
                          <div className="text-xs text-gray-400 truncate max-w-[150px]">
                            {stock.name}
                          </div>
                        )}
                      </td>

                      {/* Exchange */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          {stock.exchange || 'NSE'}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="py-3.5 px-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {stock.quantity}
                      </td>

                      {/* Buy Price */}
                      <td className="py-3.5 px-3 text-right text-gray-600 dark:text-gray-400">
                        {formatINR(stock.buy_price)}
                      </td>

                      {/* Current Price */}
                      <td className="py-3.5 px-3 text-right font-medium text-gray-800 dark:text-gray-100">
                        {formatINR(stock.current_price || stock.buy_price)}
                      </td>

                      {/* Invested */}
                      <td className="py-3.5 px-3 text-right text-gray-600 dark:text-gray-400">
                        {formatINR(stock.invested || stock.buy_price * stock.quantity)}
                      </td>

                      {/* Current Value */}
                      <td className="py-3.5 px-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                        {formatINR(stock.current_value || (stock.current_price || stock.buy_price) * stock.quantity)}
                      </td>

                      {/* P&L */}
                      <td className="py-3.5 px-3 text-right font-semibold">
                        <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                          {isPositive ? '+' : '-'}{formatINR(pnl)}
                        </span>
                      </td>

                      {/* P&L % */}
                      <td className="py-3.5 px-3 text-right font-semibold">
                        <span className={clsx('inline-flex items-center gap-0.5', isPositive ? 'text-emerald-500' : 'text-rose-500')}>
                          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {formatPercent(pnlPercent)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        {isDeleting ? (
                          <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl border border-rose-200 dark:border-rose-900">
                            <button
                              onClick={() => handleDelete(stock.id)}
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
                              onClick={() => handleOpenEdit(stock)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(stock.id)}
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

      {/* Modal Add / Edit Stock */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStock ? 'Edit Stock Holding' : 'Add Stock Holding'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Ticker Symbol *</label>
            <input
              type="text"
              required
              placeholder="e.g. RELIANCE.NS, INFY, TATAMOTORS.NS"
              value={formTicker}
              onChange={(e) => setFormTicker(e.target.value)}
              className="input-field uppercase"
              autoFocus
            />
            <span className="text-[11px] text-gray-400 mt-1 block">For NSE, use .NS suffix (e.g. RELIANCE.NS)</span>
          </div>

          <div>
            <label className="label">Company Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Reliance Industries Ltd"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Exchange</label>
              <select
                value={formExchange}
                onChange={(e) => setFormExchange(e.target.value)}
                className="input-field"
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
              </select>
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                placeholder="e.g. 10"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Buy Price (₹) *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="e.g. 2450.50"
                value={formBuyPrice}
                onChange={(e) => setFormBuyPrice(e.target.value)}
                className="input-field"
              />
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
          </div>

          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Thesis, stop-loss or goals..."
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
              {submitting ? 'Saving...' : editingStock ? 'Update Holding' : 'Add Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
