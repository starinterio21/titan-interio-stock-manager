import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabase'

const COLORS = ['#D4A02A', '#3F4650', '#5A6572', '#F0C75E', '#8B8B8B', '#C9A876', '#6B7280', '#A0826D']

export default function Reports() {
  const [items, setItems] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [itemsRes, txRes] = await Promise.all([
      supabase.from('items').select('*, categories(name)').eq('active', true),
      supabase.from('stock_transactions').select('*, items(name, category_id)').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    ])
    if (itemsRes.data) setItems(itemsRes.data)
    if (txRes.data) setTransactions(txRes.data)
    setLoading(false)
  }

  if (loading) return <p className="text-titan-steel">Loading reports...</p>

  // Stock value by category
  const categoryMap = {}
  items.forEach((item) => {
    const cat = item.categories?.name || 'Uncategorized'
    categoryMap[cat] = (categoryMap[cat] || 0) + item.current_stock * item.cost_price
  })
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Top consumed items (last 30 days, stock-out)
  const consumptionMap = {}
  transactions.filter((t) => t.type === 'out').forEach((t) => {
    const name = t.items?.name || 'Unknown'
    consumptionMap[name] = (consumptionMap[name] || 0) + t.quantity
  })
  const consumptionData = Object.entries(consumptionMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)

  const totalStockValue = items.reduce((sum, i) => sum + i.current_stock * i.cost_price, 0)
  const totalPotentialSales = items.reduce((sum, i) => sum + i.current_stock * i.selling_price, 0)

  function exportInventoryCsv() {
    const rows = items.map((i) => ({
      SKU: i.sku, Name: i.name, Category: i.categories?.name || '', CurrentStock: i.current_stock,
      Unit: i.unit, ReorderLevel: i.reorder_level, CostPrice: i.cost_price, SellingPrice: i.selling_price,
      StockValue: (i.current_stock * i.cost_price).toFixed(2),
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `titan-interio-stock-valuation-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-titan-dark">Reports</h1>
          <p className="text-titan-steel text-sm">Stock valuation & consumption insights</p>
        </div>
        <button onClick={exportInventoryCsv} className="btn-secondary text-sm">⬇ Export Full Stock Valuation CSV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Stock Value (Cost)</p>
          <p className="text-2xl font-bold text-titan-dark mt-1">₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Potential Value (Selling Price)</p>
          <p className="text-2xl font-bold text-titan-dark mt-1">₹{totalPotentialSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-titan-dark mb-3">Stock Value by Category (Top 8)</h2>
          {categoryData.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-titan-dark mb-3">Top Consumed Items (Last 30 Days)</h2>
          {consumptionData.length === 0 ? (
            <p className="text-sm text-gray-400">No stock-out activity in the last 30 days</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={consumptionData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty" fill="#D4A02A" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
