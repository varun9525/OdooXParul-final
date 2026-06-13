import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

function Login({ onLogin }) {
  const [role, setRole] = useState('employee');
  const [username, setUsername] = useState('cashier');
  const [password, setPassword] = useState('cashier123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else if (selectedRole === 'employee') {
      setUsername('cashier');
      setPassword('cashier123');
    } else if (selectedRole === 'customer') {
      setUsername('customer');
      setPassword('customer123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Map email/username if user enters a standard username
    const normalizedUsername = username.includes('@') 
      ? username.split('@')[0] 
      : username;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: normalizedUsername,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] h-screen overflow-hidden">
      <main className="flex h-full w-full">
        {/* Left Side: Atmospheric Cafe Visual */}
        <section className="hidden lg:flex lg:w-7/12 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[#714B67]/20 z-10 mix-blend-multiply"></div>
          <img 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            alt="Warm Cafe Interior" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNUV3rHnDVqSk4iuWLfMa-YNscTY1J1WBNffX4jzL36rchohAUKq0d9mb87u767BhHybcXzcFkocL09PLwdhq2TNXDOBZv0RsQKakj3AvYW6Erh3K2nbOzIpUMUXk4TnqgRW_iIDDbV6GdJ-Vbu226sgYAHrQ2jsMn5IAP4-SbnaWuPoGTMIO0hQX7w017XWa0sKEV68HN6vlkb48I6JnmWvcNN9bydzcwzyQrOKP-4ujbcam_rNWw" 
          />
          <div className="relative z-20 flex flex-col justify-between h-full p-12 text-white">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
              </div>
              <span className="font-bold text-2xl tracking-tight">Odoo Cafe POS</span>
            </div>
            <div className="max-w-md">
              <h1 className="text-4xl font-extrabold mb-4 leading-tight">Elevate your service experience.</h1>
              <p className="text-lg text-white/80">Seamlessly manage orders, inventory, and staff with our enterprise-grade point of sale system.</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-white object-cover" alt="Barista" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAG6mBhgNBraGsIQgSMu0Z_PvjVKjLzQfRgasOcEwXZye0vdsa1ORNqBt-jKJ5sK-1l_UyPfd7Pi7TU2hCkZURMTOK1s2WiL44lqvB5lXbJl3TmO52MGbafF35yNNSSXnuOYFHX3QfwsI8n3WC-E-rLl7PqQSReS4ngVbL_V78sx2m4q6fdxw-2hzZHsQHTshnvuIkFySzI-BedK-p5PKLd5P8Ej50N2qejPyskhdNaxdWk1HpbTxOn" />
                <img className="w-10 h-10 rounded-full border-2 border-white object-cover" alt="Manager" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCHYNGVDwgZZr8GjUifWyvBO_TUuWn8VJCq3tNzZkqAA2-DHkjdiv1KajYX1JGPOIYhgt9vr0fkvpsyZGHMFdYHVThcr1GmjzhNG75GiaXg_zb-_3PywGS1eZbqjFGFctoMEJz2TCnyp3VMjijx1I3fZjlCvEllYvId6F0mNT9Dr-PBRC_pv8oxcSyN73HQA5DMh49zR54Z7mW-iBKfkPaIrZuhL_jhzfIdCvoJoVeU5Cq3aUTEt8I" />
                <img className="w-10 h-10 rounded-full border-2 border-white object-cover" alt="Customer" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrYvFx73wEigab0AUr9aYzNpP6_hNGa6W0nFa4ZvYoPkF1AQLxdkceQBBWSzSt83vilWhrDPtmXVm1Vj8UZnBSTMaulkxg73tljTZpyfCdSCKCqTB55fosPCXecrKOOwprqbefk_58c0NA1HoAL4dULZ4KUy0tMpP7L69Y4pBJkci1VOpaz2XB-fw3rULm904Qdg9BUJaXnx3ANeny1sDClkNHphXFaCOh1tFpmGHmQ9pk9YMdzN3t" />
              </div>
              <p className="text-sm text-white/90">Trusted by 5,000+ cafes worldwide</p>
            </div>
          </div>
        </section>

        {/* Right Side: Login Form */}
        <section className="w-full lg:w-5/12 bg-white flex items-center justify-center p-8 lg:p-12 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#714B67]/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="w-full max-w-md space-y-6 flex flex-col">
            
            {/* Mobile Branding */}
            <div className="lg:hidden flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-[#714B67] rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
              </div>
              <span className="text-2xl font-bold text-[#714B67]">Odoo Cafe POS</span>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Please enter your credentials to access the terminal.</p>
              <p className="text-sm text-[#714B67] mt-1 font-semibold">Demo: admin (pass: admin123) | cashier (pass: cashier123)</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-[#ba1a1a] rounded-lg text-sm">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Access Role</label>
                <div className="relative">
                  <select 
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full bg-[#f3f4f5] border border-[#E9ECEF] rounded-lg px-4 py-3 appearance-none text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all"
                  >
                    <option value="admin">Administrator (Manager)</option>
                    <option value="employee">Employee / Staff (Cashier)</option>
                    <option value="customer">Customer Loyalty (Kiosk)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Username/Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block" htmlFor="username">Username or Email</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#714B67] transition-colors">alternate_email</span>
                  <input 
                    className="w-full bg-[#f3f4f5] border border-[#E9ECEF] rounded-lg pl-12 pr-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all" 
                    id="username" 
                    type="text"
                    placeholder="admin or cashier" 
                    required 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="password">Password</label>
                  <a className="text-sm font-semibold text-[#714B67] hover:underline" href="#forgot">Forgot Password?</a>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#714B67] transition-colors">lock</span>
                  <input 
                    className="w-full bg-[#f3f4f5] border border-[#E9ECEF] rounded-lg pl-12 pr-12 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all" 
                    id="password" 
                    type="password"
                    placeholder="••••••••" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2">
                <input className="w-5 h-5 rounded border-[#E9ECEF] text-[#714B67] focus:ring-[#714B67]" id="remember" type="checkbox"/>
                <label className="text-xs text-gray-500" htmlFor="remember">Remember this device for 30 days</label>
              </div>

              {/* Submit Button */}
              <button 
                className="w-full bg-[#714B67] text-white py-4 rounded-xl font-semibold shadow-lg shadow-[#714B67]/20 hover:bg-[#57344f] transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2 group" 
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Access Terminal</span>
                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 flex flex-col items-center space-y-4">
              <p className="text-xs text-gray-500">
                Don't have an account yet? 
                <a className="text-[#714B67] font-semibold ml-1 hover:underline" href="#trial">Sign up for free trial</a>
              </p>
              
              {/* Language/Support Links */}
              <div className="flex items-center space-x-4 opacity-50 text-xs">
                <a className="hover:opacity-100" href="#help">Help Center</a>
                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                <a className="hover:opacity-100" href="#privacy">Privacy Policy</a>
                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                <button className="flex items-center space-x-1 hover:opacity-100">
                  <span className="material-symbols-outlined text-[14px]">language</span>
                  <span>English</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Logo */}
          <div className="absolute bottom-6 left-0 right-0 text-center lg:text-left lg:px-12 opacity-20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Odoo SA © 2026</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Login;
