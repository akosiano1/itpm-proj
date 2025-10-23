// src/components/admin/EditMenuPrices.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function EditMenuPrices() {
  const [menuItems, setMenuItems] = useState([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let isMounted = true
    async function loadMenuItems() {
      setMenuLoading(true); setError('')
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('item_id, item_name, price')
          .order('item_name', { ascending: true })
        if (error) throw error
        if (isMounted) setMenuItems(data || [])
      } catch (e) {
        if (isMounted) setError(e?.message || 'Failed to load menu items.')
      } finally {
        if (isMounted) setMenuLoading(false)
      }
    }
    loadMenuItems()
    return () => { isMounted = false }
  }, [])

  function handleItemFieldChange(itemId, field, value) {
    setMenuItems((prev) => prev.map((it) => (it.item_id === itemId ? { ...it, [field]: value } : it)))
  }

  async function saveMenuItem(item) {
    setLoading(true); setError(''); setSuccess('')
    try {
      const trimmedName = String(item.item_name || '').trim()
      const priceNum = Number(item.price)
      if (!trimmedName) {
        setError('Item name cannot be empty.')
        return
      }
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        setError('Price must be a non-negative number.')
        return
      }
      const { error } = await supabase
        .from('menu_items')
        .update({ item_name: trimmedName, price: priceNum })
        .eq('item_id', item.item_id)
      if (error) throw error
      setSuccess('Menu item updated.')
    } catch (e) {
      setError(e?.message || 'Failed to update menu item.')
    } finally {
      setLoading(false)
    }
  }

  async function addMenuItem() {
    setLoading(true); setError(''); setSuccess('')
    try {
      const trimmedName = String(newItemName || '').trim()
      const priceNum = Number(newItemPrice)
      if (!trimmedName) {
        setError('Item name cannot be empty.')
        return
      }
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        setError('Price must be a non-negative number.')
        return
      }
      const { data, error } = await supabase
        .from('menu_items')
        .insert([{ item_name: trimmedName, price: priceNum }])
        .select('item_id, item_name, price')
        .single()
      if (error) throw error
      setMenuItems((prev) => [...prev, data])
      setNewItemName(''); setNewItemPrice('')
      setSuccess('Menu item added.')
    } catch (e) {
      setError(e?.message || 'Failed to add menu item.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body">
        <h2 className="card-title text-error mb-4">Edit Menu Prices</h2>

        {menuLoading ? (
          <div className="loading loading-spinner text-primary"></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((mi) => (
                  <tr key={mi.item_id}>
                    <td>
                      <input className="input input-bordered w-full" value={mi.item_name}
                        onChange={(e) => handleItemFieldChange(mi.item_id, 'item_name', e.target.value)} />
                    </td>
                    <td>
                      <div className="join">
                        <input type="number" className="input input-bordered join-item w-40" value={mi.price}
                          min="0" step="0.01"
                          onChange={(e) => handleItemFieldChange(mi.item_id, 'price', e.target.value)} />
                        <span className="btn btn-ghost join-item">PHP</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-primary" onClick={() => saveMenuItem(mi)} disabled={loading}>Save</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="divider">Add New Item</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Item name</span></label>
            <input className="input input-bordered w-full" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Whole Chicken" />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Price (PHP)</span></label>
            <input type="number" className="input input-bordered w-full" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} min="0" step="0.01" placeholder="0.00" />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">&nbsp;</span></label>
            <button className="btn btn-secondary mt-5" onClick={addMenuItem} disabled={loading}>Add Item</button>
          </div>
        </div>

        {error && <div className="mt-4 text-error">{error}</div>}
        {success && <div className="mt-4 text-success">{success}</div>}
      </div>
    </div>
  )
}
