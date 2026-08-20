import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [backingUp, setBackingUp] = useState(false)

  const [alertSettings, setAlertSettings] = useState(null)
  const [newRecipient, setNewRecipient] = useState('')
  const [savingAlerts, setSavingAlerts] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  useEffect(() => {
    loadCategories()
    loadAlertSettings()
  }, [])

  async function loadAlertSettings() {
    const { data } = await supabase.from('alert_settings').select('*').single()
    if (data) setAlertSettings(data)
  }

  async function saveAlertSettings(updates) {
    setSavingAlerts(true)
    const merged = { ...alertSettings, ...updates }
    setAlertSettings(merged)
    const { error } = await supabase
      .from('alert_settings')
      .update(updates)
      .eq('id', alertSettings.id)
    if (error) alert('Error saving alert settings: ' + error.message)
    setSavingAlerts(false)
  }

  function addRecipient() {
    const email = newRecipient.trim()
    if (!email || alertSettings.recipient_emails.includes(email)) return
    saveAlertSettings({ recipient_emails: [...alertSettings.recipient_emails, email] })
    setNewRecipient('')
  }

  function removeRecipient(email) {
    saveAlertSettings({ recipient_emails: alertSettings.recipient_emails.filter((e) => e !== email) })
  }

  async function sendTestEmail() {
    setTestSending(true)
    setAlertMessage('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-stock-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ force: true }),
      })
      const result = await res.json()
      if (res.ok && result.sent) {
        setAlertMessage(`✅ Test email sent — ${result.outOfStock} out of stock, ${result.lowStock} low stock listed.`)
      } else if (res.ok && result.skipped) {
        setAlertMessage(`⚠️ Not sent: ${result.skipped}. Add at least one recipient and make sure alerts are enabled.`)
      } else {
        setAlertMessage('❌ Error: ' + (result.error || 'Unknown error — check Edge Function logs in Supabase.'))
      }
    } catch (err) {
      setAlertMessage('❌ Error: ' + err.message)
    }
    setTestSending(false)
  }

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

  async function handleBackupAll() {
    setBackingUp(true)
    try {
      const [itemsRes, catRes, supRes, txRes, usersRes] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('stock_transactions').select('*'),
        supabase.from('profiles').select('id, full_name, email, role, active, created_at'),
      ])

      const backup = {
        exported_at: new Date().toISOString(),
        source: 'Titan Interio Stock Manager',
        items: itemsRes.data || [],
        categories: catRes.data || [],
        suppliers: supRes.data || [],
        stock_transactions: txRes.data || [],
        users: usersRes.data || [],
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `titan-interio-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Backup failed: ' + err.message)
    }
    setBackingUp(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Settings</h1>
        <p className="text-titan-steel text-sm">Manage item categories</p>
      </div>

      <div className="card">
        <h2 className="font-semibold text-titan-dark mb-1">Full Data Backup</h2>
        <p className="text-sm text-titan-steel mb-3">
          Supabase's free plan doesn't include automatic backups. Download a complete snapshot
          of your inventory, categories, suppliers, transactions, and users anytime — keep it
          somewhere safe (email to yourself, Google Drive, etc). Recommended: do this weekly,
          or before any major changes.
        </p>
        <button onClick={handleBackupAll} disabled={backingUp} className="btn-primary">
          {backingUp ? 'Preparing backup...' : '⬇ Download Full Backup (JSON)'}
        </button>
      </div>

      {alertSettings && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-titan-dark">Low Stock Email Alerts</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={alertSettings.enabled}
                onChange={(e) => saveAlertSettings({ enabled: e.target.checked })}
              />
              {alertSettings.enabled ? 'Enabled' : 'Disabled'}
            </label>
          </div>

          <div>
            <label className="label">Recipients</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {alertSettings.recipient_emails.map((email) => (
                <span key={email} className="text-xs bg-gray-100 rounded-full px-3 py-1 flex items-center gap-2">
                  {email}
                  <button onClick={() => removeRecipient(email)} className="text-red-500 hover:text-red-700">✕</button>
                </span>
              ))}
              {alertSettings.recipient_emails.length === 0 && (
                <span className="text-xs text-gray-400">No recipients added yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                className="input-field"
                placeholder="staff@example.com"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
              />
              <button type="button" onClick={addRecipient} className="btn-secondary text-xs whitespace-nowrap">+ Add</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Frequency</label>
              <select
                className="input-field"
                value={alertSettings.frequency}
                onChange={(e) => saveAlertSettings({ frequency: e.target.value })}
              >
                <option value="every_6_hours">Every 6 hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            {alertSettings.frequency !== 'every_6_hours' && (
              <div>
                <label className="label">Send Time (IST)</label>
                <select
                  className="input-field"
                  value={alertSettings.send_hour}
                  onChange={(e) => saveAlertSettings({ send_hour: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {alertSettings.frequency === 'weekly' && (
            <div>
              <label className="label">Day of Week</label>
              <select
                className="input-field"
                value={alertSettings.weekly_day}
                onChange={(e) => saveAlertSettings({ weekly_day: Number(e.target.value) })}
              >
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={alertSettings.include_low_stock}
                onChange={(e) => saveAlertSettings({ include_low_stock: e.target.checked })}
              />
              Include low stock items
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={alertSettings.include_out_of_stock}
                onChange={(e) => saveAlertSettings({ include_out_of_stock: e.target.checked })}
              />
              Include out-of-stock items
            </label>
          </div>

          {alertSettings.last_sent_at && (
            <p className="text-xs text-gray-400">Last sent: {new Date(alertSettings.last_sent_at).toLocaleString()}</p>
          )}

          {alertMessage && <p className="text-sm">{alertMessage}</p>}

          <button onClick={sendTestEmail} disabled={testSending || savingAlerts} className="btn-secondary text-sm">
            {testSending ? 'Sending...' : '📧 Send Test Email Now'}
          </button>

          <p className="text-xs text-gray-400">
            Requires the Edge Function to be deployed and Brevo configured first — see README "Setting up email alerts".
          </p>
        </div>
      )}

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
