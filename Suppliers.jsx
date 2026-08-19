import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { id: null, name: '', contact_person: '', phone: '', email: '', address: '', gstin: '' }

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [])

  async function loadSuppliers() {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('name')
    if (data) setSuppliers(data)
    setLoading(false)
  }

  function openAdd() {
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(s) {
    setForm(s)
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name, contact_person: form.contact_person || null, phone: form.phone || null,
      email: form.email || null, address: form.address || null, gstin: form.gstin || null,
    }
    let error
    if (form.id) {
      ;({ error } = await supabase.from('suppliers').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('suppliers').insert(payload))
    }
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowModal(false)
      loadSuppliers()
    }
    setSaving(false)
  }

  async function handleDelete(s) {
    if (!confirm(`Delete supplier "${s.name}"? This won't affect past transactions.`)) return
    const { error } = await supabase.from('suppliers').delete().eq('id', s.id)
    if (error) alert('Cannot delete — this supplier is linked to items. Try editing instead.')
    else loadSuppliers()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-titan-dark">Suppliers</h1>
          <p className="text-titan-steel text-sm">{suppliers.length} suppliers</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Supplier</button>
      </div>

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <p className="p-5 text-titan-steel">Loading...</p>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>GSTIN</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td>{s.contact_person || '—'}</td>
                  <td>{s.phone || '—'}</td>
                  <td>{s.email || '—'}</td>
                  <td>{s.gstin || '—'}</td>
                  <td>
                    <button onClick={() => openEdit(s)} className="text-titan-gold text-xs hover:underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(s)} className="text-red-500 text-xs hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">No suppliers yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200">
              <h2 className="font-semibold text-titan-dark">{form.id ? 'Edit Supplier' : 'Add Supplier'}</h2>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="label">Supplier Name *</label>
                <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Contact Person</label>
                <input className="input-field" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input-field" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <label className="label">GSTIN</label>
                <input className="input-field" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
