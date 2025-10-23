import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function ExpensesOverview() {
  const [expenseName, setExpenseName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [date, setDate] = useState('')
  const [supplier, setSupplier] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    let isMounted = true
    async function loadExpenses() {
      setError('')
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('expense_id, expense_name, quantity, cost, date, supplier_name, created_at')
          .order('date', { ascending: false })
        if (error) throw error
        if (isMounted) setExpenses(data || [])
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load expenses')
      }
    }
    loadExpenses()
    return () => { isMounted = false }
  }, [])

  async function addExpense() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (!expenseName) { setError('Expense name required'); return }
      if (!cost || Number(cost) < 0) { setError('Cost must be a non-negative number'); return }

      const payload = {
        expense_name: expenseName,
        quantity: quantity || null,
        cost: Number(cost),
        date: date || new Date().toISOString().slice(0, 10),
        supplier_name: supplier || null
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert([payload])
        .select('expense_id, expense_name, quantity, cost, date, supplier_name, created_at')
        .single()
      if (error) throw error

      setExpenses((prev) => [data, ...prev])
      setExpenseName('')
      setQuantity('')
      setCost('')
      setDate('')
      setSupplier('')
      setSuccess('Expense added.')
    } catch (e) {
      setError(e?.message || 'Failed to add expense.')
    } finally {
      setLoading(false)
    }
  }

  async function deleteExpense(expenseId) {
    if (!window.confirm('Delete this expense?')) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase.from('expenses').delete().eq('expense_id', expenseId)
      if (error) throw error
      setExpenses((prev) => prev.filter((x) => x.expense_id !== expenseId))
      setSuccess('Expense deleted.')
    } catch (e) {
      setError(e?.message || 'Failed to delete expense.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body">
        <h2 className="card-title text-error mb-4">Expenses Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Expense name</span></label>
            <input className="input input-bordered w-full" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Quantity</span></label>
            <input className="input input-bordered w-full" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 20 kilos" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Cost (PHP)</span></label>
            <input type="number" className="input input-bordered w-full" value={cost} onChange={(e) => setCost(e.target.value)} min="0" step="0.01" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Supplier</span></label>
            <input className="input input-bordered w-full" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>

          <div className="card-actions mt-5 mx-auto">
            <button className="btn btn-primary" onClick={addExpense} disabled={loading}>Add Expense</button>
          </div>
        </div>

        {error && <div className="mt-4 text-error">{error}</div>}
        {success && <div className="mt-4 text-success">{success}</div>}

        <div className="divider">Recent Expenses</div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty</th>
                <th>Cost</th>
                <th>Date</th>
                <th>Supplier</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((ex) => (
                <tr key={ex.expense_id}>
                  <td>{ex.expense_name}</td>
                  <td>{ex.quantity}</td>
                  <td>PHP {Number(ex.cost).toFixed(2)}</td>
                  <td>{ex.date}</td>
                  <td>{ex.supplier_name}</td>
                  <td className="text-right">
                    <button className="btn btn-sm btn-error" onClick={() => deleteExpense(ex.expense_id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-base-content/50 py-4">
                    No expenses recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
