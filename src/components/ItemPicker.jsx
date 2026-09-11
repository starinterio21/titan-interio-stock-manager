import { useEffect, useMemo, useRef, useState } from 'react'
import CategoryPicker from './CategoryPicker'

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
  const [variantFilter, setVariantFilter] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const selectedItem = items.find((i) => i.id === value)

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

  const variants = useMemo(() => {
    const set = new Set()
    items.forEach((i) => {
      if (i.sub_category) set.add(i.sub_category)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((i) => !categoryFilter || i.categories?.name === categoryFilter)
      .filter((i) => !variantFilter || i.sub_category === variantFilter)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      .slice(0, 50) // cap rendered results for performance
  }, [items, query, categoryFilter, variantFilter])

  function selectItem(item) {
    onChange(item.id)
    setQuery('')
    setOpen(false)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    setOpen(true)
    if (value) onChange('') // clear selection while actively typing something new
  }

  function startSearching() {
    setQuery('')
    setOpen(true)
  }

  const showClosedSelection = !open && selectedItem

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-2 mb-1 flex-wrap">
        {showClosedSelection ? (
          <button
            type="button"
            onClick={startSearching}
            className="input-field flex-1 min-w-[160px] text-left overflow-x-auto whitespace-nowrap"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {selectedItem.name} ({selectedItem.sku})
          </button>
        ) : (
          <input
            className="input-field flex-1 min-w-[160px]"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
        )}
        <div className="w-[140px]">
          <CategoryPicker
            categories={categories}
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); setOpen(true) }}
            placeholder="Category..."
            allowAll
          />
        </div>
        <div className="w-[140px]">
          <CategoryPicker
            categories={variants}
            value={variantFilter}
            onChange={(v) => { setVariantFilter(v); setOpen(true) }}
            placeholder="Color / variant..."
            allowAll
          />
        </div>
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
                <span className="flex-1 min-w-0 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <span className="block font-medium text-titan-dark whitespace-nowrap">{item.name}</span>
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
