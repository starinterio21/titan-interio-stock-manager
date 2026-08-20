import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadTransactions()
  }, [])

  async function loadTransactions() {
    setLoading(true)
    const { data } = await supabase
      .from('stock_transactions')
      .select('*, items(name, sku, unit), suppliers(name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (data) setTransactions(data)
    setLoading(false)
  }

  function exportCsv() {
    const rows = filtered.map((t) => ({
      Date: new Date(t.created_at).toLocaleString(),
      Item: t.items?.name,
      SKU: t.items?.sku,
      Type: t.type,
      Quantity: t.quantity,
      Unit: t.items?.unit,
      Reference: t.reference || '',
      JobOrder: t.job_order || '',
      Supplier: t.suppliers?.name || '',
      IssuedTo: t.issued_to || '',
      User: t.profiles?.full_name || '',
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `titan-interio-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const filtered = transactions.filter((t) => {
    if (typeFilter && t.type !== typeFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const matches = t.items?.name?.toLowerCase().includes(s) || t.items?.sku?.toLowerCase().includes(s) || t.job_order?.toLowerCase().includes(s) || t.reference?.toLowerCase().includes(s)
      if (!matches) return false
    }
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false
    if (dateTo && new Date(t.created_at) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-titan-dark">Transaction History</h1>
          <p className="text-titan-steel text-sm">{filtered.length} transactions</p>
        </div>
        <button onClick={exportCsv} className="btn-secondary text-sm">⬇ Export CSV</button>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="label">Type</label>
          <select className="input-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
        <div>
          <label className="label">Search</label>
          <input className="input-field" placeholder="Item, SKU, job, ref..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input-field" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input-field" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <p className="p-5 text-titan-steel">Loading...</p>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Reference / Job</th>
                <th>Supplier / Issued To</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                  <td>
                    <p className="font-medium">{t.items?.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{t.items?.sku}</p>
                  </td>
                  <td>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      t.type === 'in' ? 'bg-green-100 text-green-700' :
                      t.type === 'out' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {t.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="font-semibold">{t.quantity} {t.items?.unit}</td>
                  <td className="text-xs">{t.reference || t.job_order || '—'}</td>
                  <td className="text-xs">{t.suppliers?.name || t.issued_to || '—'}</td>
                  <td className="text-xs">{t.profiles?.full_name || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
