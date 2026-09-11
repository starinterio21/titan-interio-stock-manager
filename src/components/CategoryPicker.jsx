import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Searchable category picker — type to filter, click to select.
 * Replaces a plain <select> which is painful to scroll with ~196 categories.
 *
 * Props:
 *   categories: [string] — list of category names (or [{id,name}] if withIds)
 *   value: currently selected category (name, or id if withIds)
 *   onChange: (value) => void
 *   placeholder: string
 *   allowAll: boolean — show an "All categories" option that clears selection
 *   withIds: boolean — when true, categories are [{id, name}] and value/onChange use id
 */
export default function CategoryPicker({
  categories,
  value,
  onChange,
  placeholder = 'Type to search category...',
  allowAll = false,
  withIds = false,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const normalized = useMemo(
    () => (withIds ? categories : categories.map((c) => ({ id: c, name: c }))),
    [categories, withIds]
  )

  const selected = normalized.find((c) => c.id === value)

  useEffect(() => {
    if (!open) {
      setQuery(selected ? selected.name : '')
    }
  }, [selected, open])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return normalized.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 50)
  }, [normalized, query])

  function select(cat) {
    onChange(cat.id)
    setQuery(cat.name)
    setOpen(false)
  }

  function selectAll() {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    setOpen(true)
    if (value) onChange('')
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        className="input-field"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {allowAll && (
            <button
              type="button"
              onClick={selectAll}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 text-titan-steel"
            >
              All categories
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-2">No categories match</p>
          ) : (
            filtered.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => select(cat)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 text-titan-dark"
              >
                {cat.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
