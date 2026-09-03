import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Projects() {
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    setLoading(true)
    const { data } = await supabase
      .from('stock_transactions')
      .select('*, items(name, sku, unit), profiles(full_name)')
      .eq('type', 'out')
      .not('job_order', 'is', null)
      .neq('job_order', '')
      .order('created_at', { ascending: false })

    setTransactions(data || [])
    setLoading(false)
  }

  const grouped = useMemo(() => {
    const map = new Map()
    for (const t of transactions) {
      const job = t.job_order.trim()
      if (!map.has(job)) map.set(job, [])
      map.get(job).push(t)
    }
    return Array.from(map.entries()).sort((a, b) => {
      // sort by most recent activity first
      const latestA = Math.max(...a[1].map((t) => new Date(t.created_at).getTime()))
      const latestB = Math.max(...b[1].map((t) => new Date(t.created_at).getTime()))
      return latestB - latestA
    })
  }, [transactions])

  const filteredJobs = grouped.filter(([job]) => job.toLowerCase().includes(search.toLowerCase()))

  const selectedEntries = selectedJob ? grouped.find(([job]) => job === selectedJob)?.[1] || [] : []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Projects</h1>
        <p className="text-titan-steel text-sm">
          Materials issued per Job / Work Order Reference — {grouped.length} project{grouped.length !== 1 ? 's' : ''}
        </p>
      </div>

      <input
        className="input-field max-w-xs"
        placeholder="Search by job / work order name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-titan-steel">Loading...</p>
      ) : filteredJobs.length === 0 ? (
        <div className="card">
          <p className="text-sm text-gray-400 py-4">No jobs recorded yet. Job / Work Order Reference gets filled in on Stock Out.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Job list */}
          <div className="card p-0 overflow-hidden lg:col-span-1">
            <div className="p-3 border-b border-gray-100">
              <h2 className="font-semibold text-titan-dark text-sm">All Projects</h2>
            </div>
            <ul className="max-h-[70vh] overflow-y-auto">
              {filteredJobs.map(([job, entries]) => {
                const totalQty = entries.reduce((sum, e) => sum + Number(e.quantity), 0)
                const isSelected = selectedJob === job
                return (
                  <li key={job}>
                    <button
                      onClick={() => setSelectedJob(job)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                        isSelected ? 'bg-titan-gold/10' : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className={`font-medium text-sm ${isSelected ? 'text-titan-gold' : 'text-titan-dark'}`}>{job}</p>
                      <p className="text-xs text-gray-400">
                        {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'} · {totalQty} units total
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Selected job detail */}
          <div className="card lg:col-span-2">
            {!selectedJob ? (
              <p className="text-sm text-gray-400 py-8 text-center">Select a project on the left to see its materials.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-titan-dark">{selectedJob}</h2>
                  <span className="text-xs text-gray-400">
                    {selectedEntries.length} entr{selectedEntries.length !== 1 ? 'ies' : 'y'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Issued To</th>
                        <th>Issued By</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntries.map((t) => (
                        <tr key={t.id}>
                          <td className="font-medium">{t.items?.name || '—'}</td>
                          <td className="font-mono text-xs">{t.items?.sku || '—'}</td>
                          <td className="text-orange-600 font-semibold">{t.quantity} {t.items?.unit}</td>
                          <td>{t.issued_to || '—'}</td>
                          <td>{t.profiles?.full_name || '—'}</td>
                          <td className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
