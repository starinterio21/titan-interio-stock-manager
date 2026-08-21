import { useState, useRef, useEffect } from 'react'

/**
 * Searchable item picker — type any part of the name or SKU to filter,
 * click a result to select. Replaces plain <select> dropdowns for item lists.
 *
 * items: array of { id, name, sku, ...extra }
 * value: currently selected item id
 * onChange: (id) => void
 */
export default function ItemSearchSelect({ items, value, onChange, placeholder = 'Search item by name or SKU...' }) {
  const [query, setQuery] = useState('')
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

  const filtered = query.trim()
    ? items.filter((i) => {
        const q = query.toLowerCase()
        return i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      })
    : items

  function handleSelect(item) {
    onChange(item.id)
    setQuery('')
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setQuery('')
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {selectedItem && !open ? (
        <div
          className="input-field flex items-center justify-between cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <span>{selectedItem.name} <span className="text-gray-400 font-mono text-xs">({selectedItem.sku})</span></span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear() }}
            className="text-gray-400 hover:text-red-500 ml-2"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          type="text"
          className="input-field"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-3">No items match "{query}"</p>
          ) : (
            filtered.slice(0, 50).map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className="px-3 py-2 text-sm hover:bg-titan-gold/10 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
              >
                <span>{item.name}</span>
                <span className="text-xs text-gray-400 font-mono">{item.sku}</span>
              </div>
            ))
          )}
          {filtered.length > 50 && (
            <p className="text-xs text-gray-400 px-3 py-2 bg-gray-50">Showing first 50 — keep typing to narrow down</p>
          )}
        </div>
      )}
    </div>
  )
}
