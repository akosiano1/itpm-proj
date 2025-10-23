import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from './supabaseClient';
import Layout from './components/Layout';

function ManageStaff() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Staff creation states
  const [staffEmail, setStaffEmail] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [selectedStall, setSelectedStall] = useState('');
  const [stalls, setStalls] = useState([]);

  // 🧠 Get logged-in user and verify admin role
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
          if (profile.role !== 'admin') {
            alert('Access denied. Only admins can manage staff.');
            navigate('/dashboard');
            return;
          }
        }
      }

      setLoading(false);
    };

    getUser();
  }, [navigate]);

  // 🧩 Fetch stalls and staff
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      const fetchData = async () => {
        // Fetch stalls
        const { data: stallsData, error: stallsError } = await supabase
          .from('stalls')
          .select('stall_id, stall_name, location')
          .order('stall_name');

        if (!stallsError && stallsData) {
          setStalls(stallsData);
          if (stallsData.length > 0 && !selectedStall) {
            setSelectedStall(stallsData[0].stall_id);
          }
        }

        // Fetch staff
        const { data: staffData, error: staffError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, status, stall_id')
          .eq('role', 'staff')
          .order('full_name');

        if (!staffError) setStaffList(staffData || []);
      };
      fetchData();
    }
  }, [userProfile, selectedStall]);

  // 🧱 Create new staff
  const handleCreateStaff = async () => {
    if (!staffEmail || !staffPassword) {
      alert('Please fill in email and password.');
      return;
    }

    if (userProfile.role !== 'admin') {
      alert('Only admins can create staff accounts.');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: staffEmail,
        password: staffPassword,
        email_confirm: false,
      });

      if (!error) {
        // Send the confirmation email manually
        await supabaseAdmin.auth.resend({
          type: 'signup',
          email: staffEmail,
        });
      } 

      if (error) throw error;
      const newUser = data.user;
      if (!newUser?.id) throw new Error('No user ID returned from createUser.');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: newUser.id,
          full_name: staffName,
          email: staffEmail,
          role: 'staff',
          status: 'active',
          stall_id: selectedStall,
        }]);

      if (profileError) throw profileError;

      alert('Staff account created successfully!');
      
      // Reset form
      setStaffEmail('');
      setStaffName('');
      setStaffPassword('');

      // Refresh staff list
      const { data: updatedStaff, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status, stall_id')
        .eq('role', 'staff')
        .order('full_name');

      if (!fetchError) {
        setStaffList(updatedStaff || []);
      }

    } catch (error) {
      console.error('Error creating staff:', error);
      alert('Error creating staff account: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  // 🗑️ Delete staff
  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', staffId);

      if (profileError) throw profileError;

      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(staffId);
      if (authError) console.warn('Could not delete from auth.users:', authError);

      alert('Staff member deleted successfully!');
      
      // Update staff list
      const { data: updatedStaff } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status, stall_id')
        .eq('role', 'staff')
        .order('full_name');
      setStaffList(updatedStaff || []);

    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error deleting staff member: ' + error.message);
    }
  };

  // Group staff by stall
  const staffByStall = {};
  stalls.forEach(stall => {
    staffByStall[stall.stall_id] = staffList.filter(staff => staff.stall_id === stall.stall_id);
  });

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
          <h1 className="text-3xl font-bold text-primary mb-2">Manage Staff</h1>
          <p className="text-base-content/70">Create and manage staff accounts across all stalls</p>
        </div>

        {/* Create Staff Form */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-error mb-4">Create New Staff Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Full Name</span></label>
                <input type="text" placeholder="Doe loe ritoe" className="input input-bordered w-full"
                  value={staffName} onChange={(e) => setStaffName(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Email</span></label>
                <input type="email" placeholder="staff@chickenstall.com" className="input input-bordered w-full"
                  value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Password</span></label>
                <input type="password" placeholder="Secure password" className="input input-bordered w-full"
                  value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Stall</span></label>
                <select className="select select-bordered w-full"
                  value={selectedStall} onChange={(e) => setSelectedStall(e.target.value)}>
                  {stalls.map(stall => (
                    <option key={stall.stall_id} value={stall.stall_id}>
                      {stall.stall_name} - {stall.location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-actions justify-end mt-4">
              <button className="btn btn-error" onClick={handleCreateStaff} disabled={creating}>
                {creating ? <span className="loading loading-spinner"></span> : null}
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>

        {/* Stall Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {stalls.map(stall => (
            <div key={stall.stall_id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title text-primary">{stall.stall_name}</h2>
                  <div className="badge badge-secondary">
                    {staffByStall[stall.stall_id]?.length || 0} staff
                  </div>
                </div>
                <p className="text-sm text-base-content/70 mb-3">{stall.location}</p>

                <div className="space-y-2">
                  {staffByStall[stall.stall_id]?.length > 0 ? (
                    staffByStall[stall.stall_id].map(staff => (
                      <div key={staff.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                        <div>
                          <div className="font-medium">{staff.full_name}</div>
                          <div className="text-sm text-base-content/70">{staff.email}</div>
                          <div className={`badge badge-sm ${staff.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                            {staff.status}
                          </div>
                        </div>
                        <button className="btn btn-sm btn-error" onClick={() => handleDeleteStaff(staff.id)}>
                          Delete
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-base-content/50 py-4">
                      No staff assigned to this stall
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default ManageStaff;