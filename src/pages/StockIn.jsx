import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ItemPicker from '../components/ItemPicker'

export default function StockIn() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [itemsRes, supRes] = await Promise.all([
      supabase.from('items').select('id, sku, name, unit, current_stock, categories(name)').eq('active', true).order('name'),
      supabase.from('suppliers').select('*').order('name'),
    ])
    if (itemsRes.data) setItems(itemsRes.data)
    if (supRes.data) setSuppliers(supRes.data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!itemId || !quantity || Number(quantity) <= 0) return
    setSaving(true)
    setMessage('')

    const now = new Date()
    const [year, month, day] = entryDate.split('-').map(Number)
    const createdAt = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds())

    const { error } = await supabase.from('stock_transactions').insert({
      item_id: itemId,
      type: 'in',
      quantity: Number(quantity),
      supplier_id: supplierId || null,
      reference: reference || null,
      user_id: session.user.id,
      created_at: createdAt.toISOString(),
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✅ Stock in recorded successfully')
      setItemId(''); setQuantity(''); setSupplierId(''); setReference('')
      setEntryDate(new Date().toISOString().slice(0, 10))
      loadData()
    }
    setSaving(false)
  }

  const selectedItem = items.find((i) => i.id === itemId)

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Stock In</h1>
        <p className="text-titan-steel text-sm">Record material received from a supplier</p>
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
          <label className="label">Quantity Received *</label>
          <input required type="number" step="any" min="0.01" className="input-field" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div>
          <label className="label">Date Received</label>
          <input
            type="date"
            className="input-field"
            value={entryDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setEntryDate(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Defaults to today — change this for backdated / historical entries.</p>
        </div>

        <div>
          <label className="label">Supplier</label>
          <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Invoice / PO Reference</label>
          <input className="input-field" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-2026-001" />
        </div>

        {message && <p className={message.startsWith('✅') ? 'text-green-700 text-sm' : 'text-red-600 text-sm'}>{message}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Recording...' : 'Record Stock In'}
        </button>
      </form>
    </div>
  )
}
