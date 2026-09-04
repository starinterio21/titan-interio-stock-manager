import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ItemPicker from '../components/ItemPicker'

export default function StockReturn() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [jobOrder, setJobOrder] = useState('')
  const [jobSuggestions, setJobSuggestions] = useState([])
  const [note, setNote] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadItems()
    loadJobSuggestions()
  }, [])

  async function loadItems() {
    const { data } = await supabase
      .from('items')
      .select('id, sku, name, unit, current_stock, categories(name)')
      .eq('active', true)
      .order('name')
    if (data) setItems(data)
  }

  async function loadJobSuggestions() {
    const { data } = await supabase
      .from('stock_transactions')
      .select('job_order')
      .not('job_order', 'is', null)
      .neq('job_order', '')
    if (data) {
      const unique = Array.from(new Set(data.map((d) => d.job_order.trim()))).sort((a, b) => a.localeCompare(b))
      setJobSuggestions(unique)
    }
  }

  const selectedItem = items.find((i) => i.id === itemId)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!itemId || !quantity || Number(quantity) <= 0) return
    if (!jobOrder.trim()) {
      setMessage('Job / Work Order Reference is required')
      return
    }

    setSaving(true)
    setMessage('')

    const now = new Date()
    const [year, month, day] = entryDate.split('-').map(Number)
    const createdAt = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds())

    const { error } = await supabase.from('stock_transactions').insert({
      item_id: itemId,
      type: 'return',
      quantity: Number(quantity),
      job_order: jobOrder.trim(),
      reason: note || null,
      user_id: session.user.id,
      created_at: createdAt.toISOString(),
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✅ Stock return recorded successfully')
      setItemId(''); setQuantity(''); setJobOrder(''); setNote('')
      setEntryDate(new Date().toISOString().slice(0, 10))
      loadItems()
      loadJobSuggestions()
    }
    setSaving(false)
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Stock Return</h1>
        <p className="text-titan-steel text-sm">Record unused material returned from a job back to stock</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Item *</label>
          <ItemPicker items={items} value={itemId} onChange={setItemId} />
          {selectedItem && (
            <p className="text-xs text-gray-400 mt-1">
              Current stock: {selectedItem.current_stock === null ? 'Not counted' : `${selectedItem.current_stock} ${selectedItem.unit}`}
            </p>
          )}
        </div>

        <div>
          <label className="label">Quantity Returned *</label>
          <input required type="number" step="any" min="0.01" className="input-field" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div>
          <label className="label">Date Returned</label>
          <input
            type="date"
            className="input-field"
            value={entryDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Job / Work Order Reference *</label>
          <input
            required
            className="input-field"
            list="return-job-suggestions"
            value={jobOrder}
            onChange={(e) => setJobOrder(e.target.value)}
            placeholder="JOB-2026-014"
            autoComplete="off"
          />
          <datalist id="return-job-suggestions">
            {jobSuggestions.map((job) => (
              <option key={job} value={job} />
            ))}
          </datalist>
          <p className="text-xs text-gray-400 mt-1">Pick the same job this material was originally issued to, so it nets off correctly on the Projects page.</p>
        </div>

        <div>
          <label className="label">Note</label>
          <input className="input-field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for return (optional)" />
        </div>

        {message && <p className={message.startsWith('✅') ? 'text-green-700 text-sm' : 'text-red-600 text-sm'}>{message}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Recording...' : 'Record Stock Return'}
        </button>
      </form>
    </div>
  )
}
