import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { isAdmin } from './utils/roleUtils';
import Layout from './components/Layout';
// Charts
import {
    Chart as ChartJS,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

function Dashboard() {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Chart data states
    const [salesByStall, setSalesByStall] = useState([]);
    const [stockByStall, setStockByStall] = useState([]);
    const [salesVsExpense, setSalesVsExpense] = useState({ sales: 0, expenses: 0 });
    const [bestSellers, setBestSellers] = useState([]);
    const [last7DaysSales, setLast7DaysSales] = useState([]);
    const [chartsLoading, setChartsLoading] = useState(true);

    // Load sales by stall data
    const loadSalesByStall = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    stall_id,
                    total_amount,
                    stalls(stall_name)
                `);

            if (error) throw error;

            // Group by stall and calculate totals
            const stallSales = {};
            data?.forEach(sale => {
                const stallId = sale.stall_id;
                const stallName = sale.stalls?.stall_name || `Stall ${stallId}`;
                
                if (!stallSales[stallId]) {
                    stallSales[stallId] = {
                        stall_id: stallId,
                        stall_name: stallName,
                        total_sales: 0,
                        transaction_count: 0
                    };
                }
                stallSales[stallId].total_sales += Number(sale.total_amount || 0);
                stallSales[stallId].transaction_count += 1;
            });

            setSalesByStall(Object.values(stallSales));
        } catch (err) {
            console.error('Error loading sales by stall:', err);
        }
    };

    // Load stock by stall data
    const loadStockByStall = async () => {
        try {
            const { data, error } = await supabase
                .from('stall_stocks')
                .select(`
                    stall_id,
                    quantity,
                    stalls(stall_name)
                `);

            if (error) throw error;

            // Group by stall and calculate totals
            const stallStock = {};
            data?.forEach(stock => {
                const stallId = stock.stall_id;
                const stallName = stock.stalls?.stall_name || `Stall ${stallId}`;
                
                if (!stallStock[stallId]) {
                    stallStock[stallId] = {
                        stall_id: stallId,
                        stall_name: stallName,
                        total_stock: 0
                    };
                }
                stallStock[stallId].total_stock += Number(stock.quantity || 0);
            });

            setStockByStall(Object.values(stallStock));
        } catch (err) {
            console.error('Error loading stock by stall:', err);
        }
    };

    // Load sales vs expenses data
    const loadSalesVsExpense = async () => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Get total sales
            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select('total_amount')
                .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0]);

            if (salesError) throw salesError;

            // Get total expenses
            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select('cost')
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

            if (expensesError) throw expensesError;

            const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0;
            const totalExpenses = expensesData?.reduce((sum, expense) => sum + Number(expense.cost || 0), 0) || 0;

            setSalesVsExpense({ sales: totalSales, expenses: totalExpenses });
        } catch (err) {
            console.error('Error loading sales vs expenses:', err);
        }
    };

    // Load best sellers data
    const loadBestSellers = async () => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data, error } = await supabase
                .from('sales')
                .select(`
                    quantity_sold,
                    menu_items(item_name)
                `)
                .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0]);

            if (error) throw error;

            // Group by item and calculate totals
            const itemSales = {};
            data?.forEach(sale => {
                const itemName = sale.menu_items?.item_name || 'Unknown Item';
                
                if (!itemSales[itemName]) {
                    itemSales[itemName] = {
                        item_name: itemName,
                        units_sold: 0
                    };
                }
                itemSales[itemName].units_sold += Number(sale.quantity_sold || 0);
            });

            // Sort by units sold and take top 4
            const sortedItems = Object.values(itemSales)
                .sort((a, b) => b.units_sold - a.units_sold)
                .slice(0, 4);

            setBestSellers(sortedItems);
        } catch (err) {
            console.error('Error loading best sellers:', err);
        }
    };

    // Load last 7 days sales data
    const loadLast7DaysSales = async () => {
        try {
            // Get current date in Philippines timezone (UTC+8)
            const now = new Date();
            const philippinesTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
            const today = philippinesTime.toISOString().split('T')[0];
            
            // Get 7 days ago (including today, so 6 days back)
            const sevenDaysAgo = new Date(philippinesTime);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

            console.log('Loading sales from:', sevenDaysAgoStr, 'to:', today);

            const { data, error } = await supabase
                .from('sales')
                .select('sale_date, total_amount')
                .gte('sale_date', sevenDaysAgoStr)
                .lte('sale_date', today)
                .order('sale_date', { ascending: true });

            if (error) throw error;

            // Group by date and calculate daily totals
            const dailySales = {};
            data?.forEach(sale => {
                const date = sale.sale_date.split('T')[0];
                if (!dailySales[date]) {
                    dailySales[date] = 0;
                }
                dailySales[date] += Number(sale.total_amount || 0);
            });

            // Create array for last 7 days (including today)
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(philippinesTime);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                
                last7Days.push({
                    date: dateStr,
                    day: dayName,
                    sales: dailySales[dateStr] || 0
                });
            }

            console.log('Last 7 days data:', last7Days);
            setLast7DaysSales(last7Days);
        } catch (err) {
            console.error('Error loading last 7 days sales:', err);
        }
    };

    // Load all chart data
    const loadChartData = async () => {
        setChartsLoading(true);
        try {
            await Promise.all([
                loadSalesByStall(),
                loadStockByStall(),
                loadSalesVsExpense(),
                loadBestSellers(),
                loadLast7DaysSales()
            ]);
        } catch (err) {
            console.error('Error loading chart data:', err);
        } finally {
            setChartsLoading(false);
        }
    };

    // Chart datasets
    const donutSalesByStall = useMemo(() => ({
        labels: salesByStall.map(stall => stall.stall_name),
        datasets: [
            {
                label: 'Sales Count',
                data: salesByStall.map(stall => stall.transaction_count),
                backgroundColor: ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa'],
                borderWidth: 0,
            },
        ],
    }), [salesByStall]);

    const donutStockByStall = useMemo(() => ({
        labels: stockByStall.map(stall => stall.stall_name),
        datasets: [
            {
                label: 'Stock Qty',
                data: stockByStall.map(stall => stall.total_stock),
                backgroundColor: ['#fbbf24', '#818cf8', '#f87171', '#34d399', '#f472b6'],
                borderWidth: 0,
            },
        ],
    }), [stockByStall]);

    const donutSalesVsExpense = useMemo(() => ({
        labels: ['Sales', 'Expenses'],
        datasets: [
            {
                label: 'Amount',
                data: [salesVsExpense.sales, salesVsExpense.expenses],
                backgroundColor: ['#22d3ee', '#f97316'],
                borderWidth: 0,
            },
        ],
    }), [salesVsExpense]);

    const donutBestSeller = useMemo(() => ({
        labels: bestSellers.map(item => item.item_name),
        datasets: [
            {
                label: 'Units Sold',
                data: bestSellers.map(item => item.units_sold),
                backgroundColor: ['#86efac', '#93c5fd', '#fda4af', '#fde68a'],
                borderWidth: 0,
            },
        ],
    }), [bestSellers]);

    const last7DaysBar = useMemo(() => ({
        labels: last7DaysSales.map(day => day.day),
        datasets: [
            {
                label: 'Sales (PHP)',
                data: last7DaysSales.map(day => day.sales),
                backgroundColor: '#60a5fa',
                borderRadius: 6,
            },
        ],
    }), [last7DaysSales]);

    const donutOptions = useMemo(() => ({
        plugins: {
            legend: { position: 'bottom' },
            title: { display: false },
        },
        cutout: '65%',
        maintainAspectRatio: false,
    }), []);

    const barOptions = useMemo(() => ({
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: { mode: 'index', intersect: false },
        },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
        },
        maintainAspectRatio: false,
    }), []);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Fetch profile info from your database
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role, full_name, stall_id, status')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                } else {
                    setUserProfile(profile);
                    console.log('Profile loaded:', profile);
                    
                    // Load chart data for admin users
                    if (profile.role === 'admin') {
                        loadChartData();
                    }
                }
            }

            setLoading(false);
        };

        getUser();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center">
                <div className="loading loading-spinner loading-lg text-primary"></div>
            </div>
        );
    }

    return (
        <Layout userProfile={userProfile}>
            <div className="container mx-auto p-6">
                {/* Welcome Card */}
                

                {isAdmin(userProfile) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Donut: Sales of 3 stalls */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title">Sales by Stall</h2>
                                <div className="h-64">
                                    {chartsLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="loading loading-spinner loading-md text-primary"></div>
                                        </div>
                                    ) : (
                                        <Doughnut data={donutSalesByStall} options={donutOptions} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Donut: Stocks per stall */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title">Stocks per Stall</h2>
                                <div className="h-64">
                                    {chartsLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="loading loading-spinner loading-md text-primary"></div>
                                        </div>
                                    ) : (
                                        <Doughnut data={donutStockByStall} options={donutOptions} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Donut: Sales vs Expense */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title">Sales vs Expense</h2>
                                <div className="h-64">
                                    {chartsLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="loading loading-spinner loading-md text-primary"></div>
                                        </div>
                                    ) : (
                                        <Doughnut data={donutSalesVsExpense} options={donutOptions} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Donut: Best seller */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title">Best Seller</h2>
                                <div className="h-64">
                                    {chartsLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="loading loading-spinner loading-md text-primary"></div>
                                        </div>
                                    ) : (
                                        <Doughnut data={donutBestSeller} options={donutOptions} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bar: Last 7 days overall sales (span 2 columns on lg) */}
                        <div className="card bg-base-100 shadow-xl lg:col-span-2">
                            <div className="card-body">
                                <h2 className="card-title">Last 7 Days Sales</h2>
                                <div className="h-80">
                                    {chartsLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="loading loading-spinner loading-md text-primary"></div>
                                        </div>
                                    ) : (
                                        <Bar data={last7DaysBar} options={barOptions} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Staff Dashboard</h2>
                            <p>Customized staff widgets and shortcuts will appear here.</p>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default Dashboard;
