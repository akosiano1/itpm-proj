import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'under maintenance', label: 'Under Maintenance' }
]

// Map for badge colors
const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'active':
      return 'badge-success'
    case 'inactive':
      return 'badge-error'
    case 'under maintenance':
      return 'badge-warning'
    default:
      return 'badge-neutral'
  }
}

export default function StallStatusOverview() {
  const [stalls, setStalls] = useState([])
  const [statusLoadingId, setStatusLoadingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let isMounted = true
    async function load() {
      setError('')
      try {
        const { data, error } = await supabase
          .from('stalls')
          .select('stall_id, stall_name, location, status')
          .order('stall_name', { ascending: true })
        if (error) throw error
        if (isMounted) setStalls(data || [])
      } catch (e) {
        if (isMounted) setError(e?.message || 'Failed to load stalls')
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  async function handleStatusChange(stallId, newStatus) {
    setError('')
    setSuccess('')
    setStatusLoadingId(stallId)

    const prevStatus = stalls.find((s) => s.stall_id === stallId)?.status
    setStalls((prev) => prev.map((s) =>
      s.stall_id === stallId ? { ...s, status: newStatus } : s
    ))

    try {
      const { error } = await supabase
        .from('stalls')
        .update({ status: newStatus })
        .eq('stall_id', stallId)
      if (error) throw error
      setSuccess('Stall status updated successfully.')
    } catch (e) {
      setStalls((prev) => prev.map((s) =>
        s.stall_id === stallId ? { ...s, status: prevStatus } : s
      ))
      setError(e?.message || 'Failed to update stall status.')
    } finally {
      setStatusLoadingId(null)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body">
        <h2 className="card-title text-error mb-4">Stall Status Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stalls.length === 0 ? (
            <div className="text-base-content/50 col-span-3 text-center py-4">
              No stalls available.
            </div>
          ) : (
            stalls.map((stall) => (
              <div key={stall.stall_id} className="card bg-base-200 shadow-md">
                <div className="card-body p-4">
                  <h3 className="font-bold text-lg flex items-center justify-between">
                    {stall.stall_name}
                    <span className={`badge ${getStatusBadgeColor(stall.status)}`}>
                      {stall.status || 'N/A'}
                    </span>
                  </h3>
                  <p className="text-sm text-base-content/70 mb-2">
                    Location: {stall.location || 'N/A'}
                  </p>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Change Status</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        className="select select-bordered w-full"
                        value={stall.status || ''}
                        onChange={(e) => handleStatusChange(stall.stall_id, e.target.value)}
                        disabled={statusLoadingId === stall.stall_id}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {statusLoadingId === stall.stall_id && (
                        <div className="loading loading-spinner loading-sm"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {error && <div className="mt-4 text-error">{error}</div>}
        {success && <div className="mt-4 text-success">{success}</div>}
      </div>
    </div>
  )
}
