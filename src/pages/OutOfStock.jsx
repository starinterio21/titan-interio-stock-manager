import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OutOfStock() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(new Set())

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

  const isSearching = search.trim().length > 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Out of Stock Items</h1>
        <p className="text-titan-steel text-sm">
          Items with 0 stock — {items.length} item{items.length !== 1 ? 's' : ''} across {grouped.length} categor{grouped.length !== 1 ? 'ies' : 'y'}
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
          <p className="text-sm text-gray-400 py-4">No out of stock items 🎉</p>
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
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      {catItems.length} out
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
                        <tr key={item.id} className="bg-red-50">
                          <td className="font-mono text-xs">{item.sku}</td>
                          <td className="font-medium">{item.name}</td>
                          <td className="text-red-600 font-semibold">{item.current_stock} {item.unit}</td>
                          <td>{item.reorder_level ?? '—'}</td>
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
