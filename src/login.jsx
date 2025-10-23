import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'


function Login() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({email: '', password: ''})
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleInputChange = (e) => {
        const {name, value} = e.target
        setFormData(prev => ({...prev, [name]: value}))
    }

    const handleSubmit = async (e) => { 
        e.preventDefault()
        setLoading(true)
        const {email,password} = formData
        const {data, error} = await supabase.auth.signInWithPassword({email,password})
        setLoading(false)
        
        if (!data.user?.email_confirmed_at) {
            alert('Please verify your email before logging in.');
            await supabase.auth.signOut();
            return;
        }

        
        if(error) {
            alert(error.message)
            console.error('Login error:', error.message)
        }
        else{
            const user = data.user

            const { data: profile, error: profileError} = await supabase
                .from('profiles')
                .select("*")
                .eq('id', user.id)
                .single()

            if(profileError){
                alert('Failed to load user profile.')
                console.error('Profile fetch error:', profileError.message)
                return
            }

            localStorage.setItem('userProfile', JSON.stringify(profile))
            alert(`Welcome back, ${profile.full_name || 'User'}!`)
            navigate('/dashboard')
        }
        
    }


    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 flex-col">
            <div className="text-center mb-8">
                <div className="w-24 rounded avatar">
                    <img src="./src/logo.png" />
                </div>
                <h1 className="text-4xl font-bold text-primary mb-2">
                    SALES AND STOCK MONITOR SYSTEM
                </h1>
                <p className="text-base-content/70 text-lg">Fried Chicken Stall Management</p>
            </div>

            <div className="card w-full max-w-md bg-base-100 shadow-2xl mt-4 border border-primary/20">
                <div className="card-body">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-primary">Welcome Back</h1>
                        <p className="text-base-content/70 mt-2">Access your stall management dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-control">
                            <label className="label" htmlFor="email">
                                <span className="label-text">Email</span>
                            </label>
                            <input
                                type="email" id="email" name="email"
                                placeholder="Enter your email" className="input input-bordered w-full"
                                value={formData.email} onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-control">
                            <label className="label" htmlFor="password">
                                <span className="label-text">Password</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    className="input input-bordered w-full pr-12"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-sm"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                                            />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="label cursor-pointer">
                                <input type="checkbox" className="checkbox checkbox-sm" />
                                <span className="label-text ml-2">Remember me</span>
                            </label>
                            <a href="#" className="link link-primary text-sm">
                                Forgot password?
                            </a>
                        </div>

                        <div className="form-control mt-6">
                            <button
                                type="submit"
                                className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>
                    </form>
                    <div className="divider"></div>
                </div>
            </div>
        </div>
    )
}

export default Login