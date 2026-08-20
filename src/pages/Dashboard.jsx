import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({ totalItems: 0, stockValue: 0, lowStock: 0 })
  const [lowStockItems, setLowStockItems] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)

    const { data: items } = await supabase.from('items').select('*').eq('active', true)
    if (items) {
      const totalItems = items.length
      const stockValue = items.reduce((sum, i) => sum + i.current_stock * i.cost_price, 0)
      const lowStock = items.filter((i) => i.current_stock <= i.reorder_level)
      setStats({ totalItems, stockValue, lowStock: lowStock.length })
      setLowStockItems(lowStock.slice(0, 8))
    }

    const { data: activity } = await supabase
      .from('stock_transactions')
      .select('*, items(name, sku), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(8)
    if (activity) setRecentActivity(activity)

    setLoading(false)
  }

  if (loading) return <p className="text-titan-steel">Loading dashboard...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Dashboard</h1>
        <p className="text-titan-steel text-sm">Overview of your inventory</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total SKUs</p>
          <p className="text-3xl font-bold text-titan-dark mt-1">{stats.totalItems}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Stock Value</p>
          <p className="text-3xl font-bold text-titan-dark mt-1">
            ₹{stats.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Low Stock Items</p>
          <p className={`text-3xl font-bold mt-1 ${stats.lowStock > 0 ? 'text-red-600' : 'text-titan-dark'}`}>
            {stats.lowStock}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-titan-dark">Low Stock Alerts</h2>
            <Link to="/inventory" className="text-xs text-titan-gold hover:underline">View all</Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-gray-400">No items below reorder level. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {lowStockItems.map((item) => (
                <li key={item.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-titan-dark">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.sku}</p>
                  </div>
                  <span className="text-red-600 font-semibold">
                    {item.current_stock} / {item.reorder_level} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-titan-dark">Recent Activity</h2>
            <Link to="/transactions" className="text-xs text-titan-gold hover:underline">View all</Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">No transactions yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((t) => (
                <li key={t.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-titan-dark">{t.items?.name}</p>
                    <p className="text-xs text-gray-400">{t.profiles?.full_name} · {new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-semibold ${t.type === 'in' ? 'text-green-600' : t.type === 'out' ? 'text-orange-600' : 'text-blue-600'}`}>
                    {t.type === 'in' ? '+' : t.type === 'out' ? '-' : '='}{t.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
