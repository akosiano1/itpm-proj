import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';

function Reports() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [salesByStall, setSalesByStall] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [statistics, setStatistics] = useState({
    totalSales: 0,
    totalExpenses: 0,
    highestEarningStall: null,
    lowestEarningStall: null
  });
  
  // Error states
  const [error, setError] = useState('');

  // Get logged-in user and verify access
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, full_name, stall_id, status')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setUserProfile(profile);
          // Both admin and staff can access reports
          if (profile.role !== 'staff' && profile.role !== 'admin') {
            alert('Access denied. Only staff and admin can view reports.');
            navigate('/dashboard');
            return;
          }
        }
      }

      setLoading(false);
    };

    getUser();
  }, [navigate]);

  // Load all reports data
  useEffect(() => {
    if (userProfile?.role === 'staff' || userProfile?.role === 'admin') {
      loadReportsData();
    }
  }, [userProfile]);

  const loadReportsData = async () => {
    try {
      await Promise.all([
        loadSalesByStall(),
        loadTransactions(),
        loadExpenses(),
        loadStatistics()
      ]);
    } catch (err) {
      setError('Failed to load reports data: ' + err.message);
    }
  };

  // Load sales overview by stall
  const loadSalesByStall = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          stall_id,
          total_amount,
          sale_date,
          stalls(stall_name)
        `)
        .order('sale_date', { ascending: false });
  
      if (error) throw error;
  
      // Group by stall and calculate totals
      const stallSales = {};
      data?.forEach(sale => {
        const stallId = sale.stall_id;
        if (!stallSales[stallId]) {
          stallSales[stallId] = {
            stall_id: stallId,
            stall_name: sale.stalls?.stall_name || `Stall ${stallId}`,
            total_sales: 0,
            transaction_count: 0,
            last_sale: null
          };
        }
        stallSales[stallId].total_sales += Number(sale.total_amount || 0);
        stallSales[stallId].transaction_count += 1;
        if (
          !stallSales[stallId].last_sale ||
          new Date(sale.sale_date) > new Date(stallSales[stallId].last_sale)
        ) {
          stallSales[stallId].last_sale = sale.sale_date;
        }
      });
  
      setSalesByStall(Object.values(stallSales));
    } catch (err) {
      console.error('Error loading sales by stall:', err);
    }
  };
  

  // Load detailed transactions
  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          sale_id,
          sale_date,
          quantity_sold,
          total_amount,
          payment_method,
          stalls(stall_name),
          menu_items(item_name)
        `)
        .order('sale_date', { ascending: false })
        .limit(50);
  
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  };
  


  // Load expenses
  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('expense_id, expense_name, quantity, cost, date, supplier_name, created_at')
        .order('date', { ascending: false })
        .limit(20); // Limit to recent 20 expenses

      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error('Error loading expenses:', err);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      // Get total sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total_amount');

      if (salesError) throw salesError;

      // Get total expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('cost');

      if (expensesError) throw expensesError;
      

      const totalSales = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.cost, 0) || 0;

      // Get stall performance for highest/lowest
      const { data: stallData, error: stallError } = await supabase
        .from('sales')
        .select(`
          stall_id,
          total_amount,
          stalls(stall_name)
        `);

      if (stallError) throw stallError;

      // Calculate stall totals
      const stallTotals = {};
      stallData?.forEach(sale => {
        const stallId = sale.stall_id;
        if (!stallTotals[stallId]) {
          stallTotals[stallId] = {
            stall_id: stallId,
            stall_name: sale.stalls?.stall_name || `Stall ${stallId}`,
            total: 0
          };
        }
        stallTotals[stallId].total += sale.total_amount;
      });

      

      const stallArray = Object.values(stallTotals);
      const highestEarningStall = stallArray.reduce((max, stall) => 
        stall.total > max.total ? stall : max, stallArray[0] || null);
      const lowestEarningStall = stallArray.reduce((min, stall) => 
        stall.total < min.total ? stall : min, stallArray[0] || null);

      setStatistics({
        totalSales,
        totalExpenses,
        highestEarningStall,
        lowestEarningStall
      });
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title text-error justify-center">Access Denied</h2>
            <p>You need to be logged in to access this page.</p>
            <div className="card-actions justify-center mt-4">
              <button onClick={() => navigate('/login')} className="btn btn-primary">Go to Login</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout userProfile={userProfile}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Reports Dashboard</h1>
          <p className="text-base-content/70">Comprehensive overview of sales, expenses, and performance metrics</p>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        )}

        {/* Cards Grid - 2 per row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card 1: Sales Overview by Stall */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-primary mb-4">Sales Overview by Stall</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Stall</th>
                      <th>Total Sales</th>
                      <th>Transactions</th>
                      <th>Last Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByStall.map((stall) => (
                      <tr key={stall.stall_id}>
                         
                        <td className="text-success font-bold">₱{stall.total_sales.toFixed(2)}</td>
                        <td>{stall.transaction_count}</td>
                        <td>{stall.last_sale ? new Date(stall.last_sale).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                    {salesByStall.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center text-base-content/50 py-4">
                          No sales data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 2: Detailed Transactions */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-4">Recent Transactions</h2>
              <div className="overflow-x-auto max-h-96">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Stall</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Amount</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.sale_id}>
                        <td>{new Date(transaction.sale_date).toLocaleDateString()}</td>
                        <td>{transaction.profiles?.full_name || `${transaction.stalls?.stall_name}`}</td>
                        <td>{transaction.menu_items?.item_name}</td>
                        <td>{transaction.quantity_sold}</td>
                        <td className="text-success font-bold">₱{transaction.total_amount.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${transaction.payment_method === 'cash' ? 'badge-primary' : 'badge-secondary'}`}>
                            {transaction.payment_method}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center text-base-content/50 py-4">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 3: Expenses Report */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-error mb-4">Recent Expenses</h2>
              <div className="overflow-x-auto max-h-96">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Qty</th>
                      <th>Cost</th>
                      <th>Date</th>
                      <th>Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.expense_id}>
                        <td className="font-medium">{expense.expense_name}</td>
                        <td>{expense.quantity || 'N/A'}</td>
                        <td className="text-error font-bold">₱{Number(expense.cost).toFixed(2)}</td>
                        <td>{expense.date}</td>
                        <td>{expense.supplier_name || 'N/A'}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-base-content/50 py-4">
                          No expenses recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 4: Statistics */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-accent mb-4">Key Statistics</h2>
              <div className="space-y-4">
                <div className="stat">
                  <div className="stat-title">Total Sales</div>
                  <div className="stat-value text-success">₱{statistics.totalSales.toFixed(2)}</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">Total Expenses</div>
                  <div className="stat-value text-error">₱{statistics.totalExpenses.toFixed(2)}</div>
                </div>

                <div className="stat">
                  <div className="stat-title">Net Profit</div>
                  <div className={`stat-value ${(statistics.totalSales - statistics.totalExpenses) >= 0 ? 'text-success' : 'text-error'}`}>
                    ₱{(statistics.totalSales - statistics.totalExpenses).toFixed(2)}
                  </div>
                </div>

                <div className="divider"></div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Highest Earning Stall:</span>
                    <span className="text-success font-bold">
                      {statistics.highestEarningStall ? 
                        `${statistics.highestEarningStall.stall_name} (₱${statistics.highestEarningStall.total.toFixed(2)})` : 
                        'N/A'
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Lowest Earning Stall:</span>
                    <span className="text-warning font-bold">
                      {statistics.lowestEarningStall ? 
                        `${statistics.lowestEarningStall.stall_name} (₱${statistics.lowestEarningStall.total.toFixed(2)})` : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Reports;
