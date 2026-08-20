import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function StockAdjustment() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [itemId, setItemId] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [reason, setReason] = useState('')
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
  const difference = selectedItem && newQuantity !== '' ? Number(newQuantity) - selectedItem.current_stock : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!itemId || newQuantity === '' || Number(newQuantity) < 0) return
    if (!reason.trim()) {
      setMessage('Please enter a reason for this adjustment.')
      return
    }

    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('stock_transactions').insert({
      item_id: itemId,
      type: 'adjustment',
      quantity: Number(newQuantity),
      reason: reason.trim(),
      user_id: session.user.id,
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✅ Stock adjusted successfully')
      setItemId(''); setNewQuantity(''); setReason('')
      loadItems()
    }
    setSaving(false)
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Stock Adjustment</h1>
        <p className="text-titan-steel text-sm">Correct a stock count — wrong entry, physical count, damage, etc.</p>
      </div>

      <div className="card bg-titan-gold/10 border-titan-gold/30 text-sm text-titan-steel">
        This sets the stock to an exact number (not add/subtract). Use it to fix a wrong
        Stock In/Out entry, or after a physical stock count. A reason is required — it's kept
        in the transaction history for audit purposes.
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Item *</label>
          <select required className="input-field" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Select item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
            ))}
          </select>
          {selectedItem && (
            <p className="text-xs text-gray-400 mt-1">Current stock: {selectedItem.current_stock} {selectedItem.unit}</p>
          )}
        </div>

        <div>
          <label className="label">Correct Quantity *</label>
          <input required type="number" step="any" min="0" className="input-field" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
          {difference !== null && !isNaN(difference) && difference !== 0 && (
            <p className={`text-xs mt-1 ${difference > 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {difference > 0 ? `+${difference}` : difference} {selectedItem?.unit} from current stock
            </p>
          )}
        </div>

        <div>
          <label className="label">Reason *</label>
          <textarea required className="input-field" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Corrected wrong Stock In entry from 19 Aug, or Physical count reconciliation" />
        </div>

        {message && <p className={message.startsWith('✅') ? 'text-green-700 text-sm' : 'text-red-600 text-sm'}>{message}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : 'Apply Adjustment'}
        </button>
      </form>
    </div>
  )
}
