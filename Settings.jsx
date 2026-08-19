import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newCategory.trim()) return
    const { error } = await supabase.from('categories').insert({ name: newCategory.trim() })
    if (error) alert('Error: ' + error.message)
    else {
      setNewCategory('')
      loadCategories()
    }
  }

  async function handleRename(id) {
    if (!editValue.trim()) return
    const { error } = await supabase.from('categories').update({ name: editValue.trim() }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    else {
      setEditingId(null)
      loadCategories()
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete category "${cat.name}"? Items using it will become uncategorized.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) alert('Error: ' + error.message)
    else loadCategories()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Settings</h1>
        <p className="text-titan-steel text-sm">Manage item categories</p>
      </div>

      <form onSubmit={handleAdd} className="card flex gap-2">
        <input
          className="input-field"
          placeholder="New category name..."
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <button type="submit" className="btn-primary whitespace-nowrap">+ Add Category</button>
      </form>

      <div className="card p-0">
        {loading ? (
          <p className="p-5 text-titan-steel">Loading...</p>
        ) : (
          <ul>
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                {editingId === c.id ? (
                  <div className="flex gap-2 flex-1">
                    <input className="input-field" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                    <button onClick={() => handleRename(c.id)} className="btn-primary text-xs">Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary text-xs">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-titan-dark">{c.name}</span>
                    <div>
                      <button onClick={() => { setEditingId(c.id); setEditValue(c.name) }} className="text-titan-gold text-xs hover:underline mr-3">Rename</button>
                      <button onClick={() => handleDelete(c)} className="text-red-500 text-xs hover:underline">Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {categories.length === 0 && <li className="text-center text-gray-400 py-8">No categories yet</li>}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Tip: you can also create a category on the fly while adding a new item from the Inventory page.
      </p>
    </div>
  )
}
