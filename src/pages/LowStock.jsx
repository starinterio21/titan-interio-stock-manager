import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LowStock() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLowStock()
  }, [])

  async function loadLowStock() {
    setLoading(true)
    const { data } = await supabase
      .from('items')
      .select('*, categories(name), suppliers(name)')
      .eq('active', true)
      .order('current_stock', { ascending: true })

    // Low Stock: above 0, but at or below reorder level (excludes not-yet-counted items)
    const lowStock = (data || []).filter((i) => i.current_stock !== null && i.current_stock > 0 && i.current_stock <= i.reorder_level)
    setItems(lowStock)
    setLoading(false)
  }

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Low Stock Items</h1>
        <p className="text-titan-steel text-sm">
          Stock above 0 but at or below reorder level — {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      <input
        className="input-field max-w-xs"
        placeholder="Search by name or SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <p className="p-5 text-titan-steel">Loading...</p>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Reorder Lvl</th>
                <th>Cost</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="bg-orange-50">
                  <td className="font-mono text-xs">{item.sku}</td>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.categories?.name || '—'}</td>
                  <td className="text-orange-600 font-semibold">{item.current_stock} {item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>₹{item.cost_price}</td>
                  <td>{item.location || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">No low stock items 🎉</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
