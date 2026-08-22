import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NotCounted() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotCounted()
  }, [])

  async function loadNotCounted() {
    setLoading(true)
    const { data } = await supabase
      .from('items')
      .select('*, categories(name), suppliers(name)')
      .eq('active', true)
      .is('current_stock', null)
      .order('name', { ascending: true })

    setItems(data || [])
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
        <h1 className="text-2xl font-bold text-titan-dark">Not Yet Counted</h1>
        <p className="text-titan-steel text-sm">
          Items with no physical stock count entered yet — {items.length} item{items.length !== 1 ? 's' : ''}
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
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono text-xs">{item.sku}</td>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.categories?.name || '—'}</td>
                  <td className="text-gray-400 italic">Not counted</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.location || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">Every item has been counted 🎉</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-titan-steel">
        Use Stock Adjustment (or Stock In, for the opening quantity) to record each item's actual count from the factory floor.
      </p>
    </div>
  )
}
