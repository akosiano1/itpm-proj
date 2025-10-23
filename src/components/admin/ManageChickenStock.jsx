// src/components/admin/ManageChickenStock.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function ManageChickenStock() {
  const [stalls, setStalls] = useState([])
  const [selectedStallId, setSelectedStallId] = useState('')
  const [currentStock, setCurrentStock] = useState(0)
  const [stockUid, setStockUid] = useState(null)
  const [delta, setDelta] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // load stalls
  useEffect(() => {
    let isMounted = true
    async function loadStalls() {
      setError('')
      try {
        const { data, error } = await supabase
          .from('stalls')
          .select('stall_id, stall_name, location, status')
          .order('stall_name', { ascending: true })
        if (error) throw error
        if (isMounted) {
          setStalls(data || [])
          if ((data || []).length > 0) setSelectedStallId(data[0].stall_id)
        }
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load stalls')
      }
    }
    loadStalls()
    return () => { isMounted = false }
  }, [])

  // load stock for selected stall
  useEffect(() => {
    if (!selectedStallId) {
      setCurrentStock(0)
      setStockUid(null)
      return
    }
    let isMounted = true
    async function loadStock() {
      setError(''); setSuccess('')
      try {
        const { data, error } = await supabase
          .from('stall_stocks')
          .select('stallstock_id, quantity')
          .eq('stall_id', selectedStallId)
          .limit(1)
          .single()
        if (error) {
          // no rows -> init to zero
          if (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows')) {
            if (isMounted) {
              setCurrentStock(0)
              setStockUid(null)
            }
            return
          }
          throw error
        }
        if (isMounted) {
          setStockUid(data?.stallstock_id ?? null)
          setCurrentStock(data?.quantity ?? 0)
        }
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load stock')
      }
    }
    loadStock()
    return () => { isMounted = false }
  }, [selectedStallId])

  async function applyUpdate(sign) {
    setLoading(true)
    setError(''); setSuccess('')
    try {
      const numericDelta = Number(delta)
      if (!Number.isFinite(numericDelta)) {
        setError('Please enter a valid number for the stock change.')
        return
      }
      if (!selectedStallId) {
        setError('Please select a stall.')
        return
      }
      const newQuantity = Math.max(0, currentStock + sign * numericDelta)

      if (stockUid) {
        const { error } = await supabase
          .from('stall_stocks')
          .update({ quantity: newQuantity })
          .eq('stallstock_id', stockUid)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('stall_stocks')
          .insert([{ stall_id: selectedStallId, quantity: newQuantity }])
          .select('stallstock_id, quantity')
          .single()
        if (error) throw error
        setStockUid(data?.stallstock_id ?? null)
      }

      setCurrentStock(newQuantity)
      setSuccess('Stock updated successfully.')
      setDelta(0)
    } catch (e) {
      setError(e?.message || 'Failed to update stock.')
    } finally {
      setLoading(false)
    }
  }

  async function removeAllStock() {
    setLoading(true); setError(''); setSuccess('')
    try {
      if (!selectedStallId) {
        setError('Please select a stall.')
        return
      }
      if (stockUid) {
        const { error } = await supabase
          .from('stall_stocks')
          .update({ quantity: 0 })
          .eq('stallstock_id', stockUid)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('stall_stocks')
          .insert([{ stall_id: selectedStallId, quantity: 0 }])
          .select('stallstock_id')
          .single()
        if (error) throw error
        setStockUid(data?.stallstock_id ?? null)
      }
      setCurrentStock(0)
      setSuccess('All stock removed successfully.')
      setDelta(0)
    } catch (e) {
      setError(e?.message || 'Failed to remove all stock.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body">
        <h2 className="card-title text-error mb-4">Manage Chicken Stock</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Stall</span></label>
            <select
              className="select select-bordered w-full"
              value={selectedStallId}
              onChange={(e) => setSelectedStallId(e.target.value)}
              disabled={loading}
            >
              {stalls.map((s) => (
                <option key={s.stall_id} value={s.stall_id}>
                  {s.stall_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Current Stock</span></label>
            <input className="input input-bordered w-full" value={`${currentStock} kilos`} readOnly />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Add/Remove Amount in kg</span></label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              disabled={loading}
              min="0"
              step="1"
              placeholder="Enter quantity"
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Actions</span></label>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={() => applyUpdate(+1)} disabled={loading || !selectedStallId}>Add</button>
              <button className="btn btn-secondary" onClick={() => applyUpdate(-1)} disabled={loading || !selectedStallId}>Remove</button>
              <button className="btn btn-error" onClick={removeAllStock} disabled={loading || !selectedStallId}>Remove All</button>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 text-error">{error}</div>}
        {success && <div className="mt-4 text-success">{success}</div>}
      </div>
    </div>
  )
}
