import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ItemSearchSelect from '../components/ItemSearchSelect'

export default function StockOut() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [jobOrder, setJobOrder] = useState('')
  const [issuedTo, setIssuedTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    const { data } = await supabase
      .from('items')
      .select('id, sku, name, unit, current_stock')
      .eq('active', true)
      .order('name')
    if (data) setItems(data)
  }

  const selectedItem = items.find((i) => i.id === itemId)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!itemId || !quantity || Number(quantity) <= 0) return

    if (selectedItem && Number(quantity) > selectedItem.current_stock) {
      const proceed = confirm(
        `Warning: this will take stock below zero (current: ${selectedItem.current_stock} ${selectedItem.unit}). Continue anyway?`
      )
      if (!proceed) return
    }

    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('stock_transactions').insert({
      item_id: itemId,
      type: 'out',
      quantity: Number(quantity),
      job_order: jobOrder || null,
      issued_to: issuedTo || null,
      user_id: session.user.id,
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✅ Stock out recorded successfully')
      setItemId(''); setQuantity(''); setJobOrder(''); setIssuedTo('')
      loadItems()
    }
    setSaving(false)
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Stock Out</h1>
        <p className="text-titan-steel text-sm">Record material issued to production or a job</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Item *</label>
          <ItemSearchSelect items={items} value={itemId} onChange={setItemId} />
          {selectedItem && (
            <p className="text-xs text-gray-400 mt-1">Current stock: {selectedItem.current_stock} {selectedItem.unit}</p>
          )}
        </div>

        <div>
          <label className="label">Quantity Issued *</label>
          <input required type="number" step="any" min="0.01" className="input-field" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div>
          <label className="label">Job / Work Order Reference</label>
          <input className="input-field" value={jobOrder} onChange={(e) => setJobOrder(e.target.value)} placeholder="JOB-2026-014" />
        </div>

        <div>
          <label className="label">Issued To</label>
          <input className="input-field" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} placeholder="Staff / team name" />
        </div>

        {message && <p className={message.startsWith('✅') ? 'text-green-700 text-sm' : 'text-red-600 text-sm'}>{message}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Recording...' : 'Record Stock Out'}
        </button>
      </form>
    </div>
  )
}
