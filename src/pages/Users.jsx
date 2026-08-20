import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Users() {
  const { profile: currentProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setUsers(data)
    setLoading(false)
  }

  async function updateRole(userId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) alert('Error: ' + error.message)
    else loadUsers()
  }

  async function toggleActive(user) {
    const { error } = await supabase.from('profiles').update({ active: !user.active }).eq('id', user.id)
    if (error) alert('Error: ' + error.message)
    else loadUsers()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-titan-dark">Users</h1>
        <p className="text-titan-steel text-sm">Manage staff accounts and roles</p>
      </div>

      <div className="card bg-titan-gold/10 border-titan-gold/30 text-sm text-titan-steel">
        Staff create their own accounts from the Login page's "Create Account" tab. New accounts
        start as <strong>Operator</strong> — assign the right role here once they've signed up.
      </div>

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <p className="p-5 text-titan-steel">Loading...</p>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="input-field py-1 text-xs"
                      value={u.role}
                      disabled={u.id === currentProfile.id}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Store Manager</option>
                      <option value="operator">Operator</option>
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={u.id === currentProfile.id}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                    >
                      {u.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Note: "Inactive" hides a user's status here for your reference; to fully block login access,
        remove them from Supabase Authentication in your project dashboard.
      </p>
    </div>
  )
}
