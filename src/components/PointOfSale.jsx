import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';

function PointOfSale() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stallInfo, setStallInfo] = useState(null);

  // Get logged-in user and verify staff role
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
          // Only staff and admin can access POS
          if (profile.role !== 'staff' && profile.role !== 'admin') {
            alert('Access denied. Only staff can use Point of Sale.');
            navigate('/dashboard');
            return;
          }
        }
      }

      setLoading(false);
    };

    getUser();
  }, [navigate]);

    // Fetch stall info
    useEffect(() => {
      const fetchStallInfo = async () => {
        if (!userProfile?.stall_id) return;
        try {
          const { data, error } = await supabase
            .from('stalls')
            .select('stall_name, location')
            .eq('stall_id', userProfile.stall_id)
            .single();
    
          if (error) throw error;
          setStallInfo(data);
        } catch (error) {
          console.error('Error fetching stall info:', error);
        }
      };
    
      fetchStallInfo();
    }, [userProfile]);
  

  // Fetch menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('item_id, item_name, price, image_url')
          .order('item_name', { ascending: true });

        if (error) throw error;
        setMenuItems(data || []);
      } catch (error) {
        console.error('Error fetching menu items:', error);
        setError('Failed to load menu items');
      }
    };

    if (userProfile?.role === 'staff' || userProfile?.role === 'admin') {
      fetchMenuItems();
    }
  }, [userProfile]);

  // Add item to cart
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.item_id === item.item_id);
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.item_id === item.item_id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.item_id !== itemId));
  };

  // Update quantity in cart
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(cart.map(item =>
      item.item_id === itemId
        ? { ...item, quantity: quantity }
        : item
    ));
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      setError('Please add items to cart before processing sale');
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const totalAmount = calculateTotal();
      const saleDate = new Date().toLocaleDateString('en-CA');

      // Insert sales records for each item in cart
      const salesData = cart.map(item => ({
        stall_id: userProfile.stall_id,
        user_id: userProfile.id,
        sale_date: saleDate,
        product_id: item.item_id,
        quantity_sold: item.quantity,
        total_amount: item.price * item.quantity,
        payment_method: paymentMethod
      }));

      const { error } = await supabase
        .from('sales')
        .insert(salesData);

      if (error) throw error;

      setSuccess(`Sale processed successfully! Total: ₱${totalAmount.toFixed(2)}`);
      setCart([]);
      setPaymentMethod('');

    } catch (error) {
      console.error('Error processing sale:', error);
      setError('Failed to process sale: ' + error.message);
    } finally {
      setProcessing(false);
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
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-primary">Point of Sale</span>
          <span className="text-base-content/60"> • </span>
          <span className="text-secondary">{stallInfo?.stall_name}</span>
          <span className="text-base-content/60"> • </span>
          <span className="text-secondary">{stallInfo?.location}</span>
        </h1>
          <p className="text-base-content/70">Process customer orders and payments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-secondary mb-4">Menu Items</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.map(item => (
                    <div key={item.item_id} className="card bg-base-200 shadow-md">
                      <div className="card-body p-4">
                        <div className='flex flex-row gap-4'>
                          <img
                            src={item.image_url || '/default-image.jpg'}
                            alt={item.item_name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="font-semibold text-lg">{item.item_name}</h3>
                            <p className="text-primary font-bold text-xl">₱{item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <button 
                          className="btn btn-primary btn-sm mt-2"
                          onClick={() => addToCart(item)}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cart and Checkout */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-accent mb-4">Cart</h2>
                
                {cart.length === 0 ? (
                  <p className="text-base-content/70 text-center py-8">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map(item => (
                        <div key={item.item_id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-sm text-base-content/70">₱{item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              className="btn btn-sm btn-circle btn-ghost"
                              onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button 
                              className="btn btn-sm btn-circle btn-ghost"
                              onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                            >
                              +
                            </button>
                            <button 
                              className="btn btn-sm btn-error btn-circle"
                              onClick={() => removeFromCart(item.item_id)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="divider"></div>

                    <div className="mb-4">
                      <p className="text-lg font-bold text-right">
                        Total: ₱{calculateTotal().toFixed(2)}
                      </p>
                    </div>

                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">Payment Method</span>
                      </label>
                      <select 
                        className="select select-bordered w-full"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="">Select payment method</option>
                        <option value="cash">Cash</option>
                        <option value="Gcash">Gcash</option>
                      </select>
                    </div>

                    <button 
                      className="btn btn-success w-full"
                      onClick={processSale}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <span className="loading loading-spinner"></span>
                          Processing...
                        </>
                      ) : (
                        'Process Sale'
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success mt-4">
            <span>{success}</span>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setSuccess('')}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default PointOfSale;
