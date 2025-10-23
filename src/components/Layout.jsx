import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getRoleDisplayName, getRoleBadgeColor, isAdmin } from '../utils/roleUtils';
import Sidebar from './Sidebar';

function Layout({ children, userProfile }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role, full_name, stall_id, status')
                    .eq('id', user.id)
                    .single();

                if (!error) {
                    setUserRole(profile?.role || 'staff');
                }
            }
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error logging out:', error.message);
            alert('Failed to log out.');
        } else {
            // Optional: clear any stored profile info
            localStorage.removeItem('userProfile');
            navigate('/login');
        }
};


    if (!user) {
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
        <div className="drawer lg:drawer-open min-h-screen bg-base-200">
            <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
            <div className="drawer-content flex flex-col">
                {/* Navbar */}
                <div className="navbar bg-base-100 shadow-lg">
                    <div className="flex-none lg:hidden">
                        <label htmlFor="my-drawer-2" className="btn btn-square btn-ghost drawer-button">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </label>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center">
                            
                            <div>
                                <h1 className="text-xl font-bold text-primary">Johhny's Chicken Stall Dashboard</h1>
                                {userRole && (
                                    <div className="flex items-center gap-2">
                                        <span className={`badge ${getRoleBadgeColor(userRole)} badge-sm`}>
                                            {getRoleDisplayName(userRole)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex-none">
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                                <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                                    {userProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </div>
                            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                                <li>
                                    <div className="text-sm text-base-content/70">
                                        {userProfile?.full_name || user?.email || 'User'}
                                    </div>
                                </li>
                                <li><a onClick={handleLogout}>Logout</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-grow">
                    {children}
                </div>
            </div>

            {/* Sidebar */}
            <Sidebar userProfile={userProfile} onLogout={handleLogout} />
        </div>
    );
}

export default Layout;
