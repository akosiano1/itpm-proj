import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { canManageUsers, canViewReports, canManageStock, canManageSales, canViewPointOfSales } from '../utils/roleUtils';

function Sidebar({ userProfile, onLogout }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        onLogout();
    };

    return (
        <div className="drawer-side">
            <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label>
            <ul className="menu p-4 w-80 min-h-full bg-base-100 text-base-content gap-2">
                {/* Sidebar Header */}
                <li className="menu-title">
                    <span>Quick Actions</span>
                </li>

                {/* Dashboard - Available to both admin and staff */}
                <li>
                    <button 
                        className={`btn w-full justify-start ${canManageSales(userProfile) ? 'btn-primary' : 'btn-disabled'}`}
                        onClick={() => canManageSales(userProfile) && navigate('/dashboard')}
                        disabled={!canManageSales(userProfile)}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Dashboard
                    </button>
                </li>

                {/* Point of Sales - Available to staff only */}
                <li>
                    <button 
                        className={`btn w-full justify-start ${canViewPointOfSales(userProfile) ? 'btn-success' : 'btn-disabled'}`}
                        onClick={() => canViewPointOfSales(userProfile) && navigate('/point-of-sale')}
                        disabled={!canViewPointOfSales(userProfile)}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0L12 20l2.5-2M17 13h-2.5M17 13v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5m10 0V8a2 2 0 00-2-2H9a2 2 0 00-2 2v5m10 0h-2.5" />
                        </svg>
                        Point of Sales
                    </button>
                </li>

                {/* Manage Inventory - Available to admin only */}
                <li>
                    <button 
                        className={`btn w-full justify-start ${canManageStock(userProfile) ? 'btn-secondary' : 'btn-disabled'}`}
                        onClick={() => canManageStock(userProfile) && navigate('/manage-inventory')}
                        disabled={!canManageStock(userProfile)}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Manage Inventory
                    </button>
                </li>

                {/* View Reports - Available to both admin and staff */}
                <li>
                    <button 
                        className={`btn w-full justify-start ${canViewReports(userProfile) ? 'btn-accent' : 'btn-disabled'}`}
                        onClick={() => canViewReports(userProfile) && navigate('/reports')}
                        disabled={!canViewReports(userProfile)}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        History Reports
                    </button>
                </li>

                {/* Manage Staff - Available to admin only */}
                <li>
                    <button 
                        className={`btn w-full justify-start ${canManageUsers(userProfile) ? 'btn-error' : 'btn-disabled'}`}
                        onClick={() => canManageUsers(userProfile) && navigate('/manage-staff')}
                        disabled={!canManageUsers(userProfile)}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        Manage Staff
                    </button>
                </li>
            </ul>
        </div>
    );
}

export default Sidebar;
