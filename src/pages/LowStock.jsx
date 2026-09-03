import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LowStock() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(new Set())

  useEffect(() => {
    loadLowStock()
  }, [])

  async function loadLowStock() {
    setLoading(true)
    const { data } = await supabase
      .from('items')
      .select('*, categories(name), suppliers(name)')
      .eq('active', true)
      .order('name', { ascending: true })

    // Low Stock: above 0, but at or below reorder level (excludes not-yet-counted items)
    const lowStock = (data || []).filter(
      (i) => i.current_stock !== null && i.current_stock > 0 && i.reorder_level !== null && i.current_stock <= i.reorder_level
    )
    setItems(lowStock)
    setLoading(false)
  }

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of filtered) {
      const cat = item.categories?.name || 'Uncategorized'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(item)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  function toggle(cat) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Auto-expand all groups while actively searching, so matches are visible
  const isSearching = search.trim().length > 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Low Stock Items</h1>
        <p className="text-titan-steel text-sm">
          Stock above 0 but at or below reorder level — {items.length} item{items.length !== 1 ? 's' : ''} across {grouped.length} categor{grouped.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      <input
        className="input-field max-w-xs"
        placeholder="Search by name or SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-titan-steel">Loading...</p>
      ) : grouped.length === 0 ? (
        <div className="card">
          <p className="text-sm text-gray-400 py-4">No low stock items 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([category, catItems]) => {
            const isOpen = isSearching || expanded.has(category)
            return (
              <div key={category} className="card p-0 overflow-hidden">
                <button
                  onClick={() => toggle(category)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-titan-dark">{category}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                      {catItems.length} low
                    </span>
                    <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </span>
                </button>
                {isOpen && (
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Stock</th>
                        <th>Reorder Lvl</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.map((item) => (
                        <tr key={item.id} className="bg-orange-50">
                          <td className="font-mono text-xs">{item.sku}</td>
                          <td className="font-medium">{item.name}</td>
                          <td className="text-orange-600 font-semibold">{item.current_stock} {item.unit}</td>
                          <td>{item.reorder_level}</td>
                          <td>{item.location || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
