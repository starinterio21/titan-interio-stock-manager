import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Searchable item picker — type to filter by name/SKU, optional category
 * filter, click a result to select. Replaces a plain <select> which is
 * painful to use with hundreds of items.
 *
 * Props:
 *   items: [{ id, name, sku, unit, current_stock, categories: { name } }]
 *   value: currently selected item id
 *   onChange: (id) => void
 *   placeholder: string
 */
export default function ItemPicker({ items, value, onChange, placeholder = 'Type to search item or SKU...' }) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const selectedItem = items.find((i) => i.id === value)

  // Keep the visible text in sync with the selected item when closed
  useEffect(() => {
    if (!open) {
      setQuery(selectedItem ? `${selectedItem.name} (${selectedItem.sku})` : '')
    }
  }, [selectedItem, open])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const categories = useMemo(() => {
    const set = new Set()
    items.forEach((i) => {
      if (i.categories?.name) set.add(i.categories.name)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((i) => !categoryFilter || i.categories?.name === categoryFilter)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      .slice(0, 50) // cap rendered results for performance
  }, [items, query, categoryFilter])

  function selectItem(item) {
    onChange(item.id)
    setQuery(`${item.name} (${item.sku})`)
    setOpen(false)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    setOpen(true)
    if (value) onChange('') // clear selection while actively typing something new
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-2 mb-1">
        <input
          className="input-field flex-1"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        <select
          className="input-field max-w-[140px]"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setOpen(true) }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-2">No items match</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-titan-dark truncate">{item.name}</span>
                  <span className="block text-xs text-gray-400 font-mono">{item.sku} · {item.categories?.name || 'Uncategorized'}</span>
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {item.current_stock === null ? 'Not counted' : `${item.current_stock} ${item.unit}`}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
