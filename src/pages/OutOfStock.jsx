import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OutOfStock() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOutOfStock()
  }, [])

  async function loadOutOfStock() {
    setLoading(true)
    const { data } = await supabase
      .from('items')
      .select('*, categories(name), suppliers(name)')
      .eq('active', true)
      .order('name', { ascending: true })

    // Out of Stock: confirmed 0 (excludes not-yet-counted items, which are null)
    const outOfStock = (data || []).filter((i) => i.current_stock !== null && i.current_stock <= 0)
    setItems(outOfStock)
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
        <h1 className="text-2xl font-bold text-titan-dark">Out of Stock Items</h1>
        <p className="text-titan-steel text-sm">
          Items with 0 stock — {items.length} item{items.length !== 1 ? 's' : ''}
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
                <tr key={item.id} className="bg-red-50">
                  <td className="font-mono text-xs">{item.sku}</td>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.categories?.name || '—'}</td>
                  <td className="text-red-600 font-semibold">{item.current_stock} {item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>₹{item.cost_price}</td>
                  <td>{item.location || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">No out of stock items 🎉</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
