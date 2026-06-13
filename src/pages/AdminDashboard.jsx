import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Utensils, 
  LayoutDashboard, 
  Inbox, 
  BarChart3, 
  Users, 
  Settings as SettingsIcon, 
  HelpCircle, 
  Bell, 
  User, 
  DollarSign, 
  FileSpreadsheet, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Coffee,
  CheckCircle2
} from 'lucide-react';

function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState({
    todaySales: 0,
    ordersToday: 0,
    stockAlerts: [],
    topProduct: { name: 'None', count: 0 }
  });
  const [orders, setOrders] = useState([]);
  const [socket, setSocket] = useState(null);

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      const statsRes = await fetch('/api/dashboard/stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      const ordersRes = await fetch('/api/orders');
      const ordersData = await ordersRes.json();
      setOrders(ordersData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchStats();

    // Setup Socket
    const newSocket = io();
    setSocket(newSocket);

    // Listen for new orders to refresh dashboard stats dynamically
    newSocket.on('new_order', () => {
      fetchStats();
    });

    newSocket.on('order_updated', () => {
      fetchStats();
    });

    newSocket.on('inventory_alert', () => {
      fetchStats();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const markAsPaid = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Paid' })
      });
      if (res.ok) {
        fetchStats();
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] overflow-x-hidden min-h-screen font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 bg-white border-r border-[#E9ECEF] shadow-sm py-6 space-y-4 z-50">
        <div className="px-6 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#714B67] rounded-lg flex items-center justify-center text-white">
              <Utensils size={20} />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-[#714B67]">Main Terminal</h1>
              <p className="text-xs text-gray-500 font-semibold">Active Session</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a className="flex items-center px-4 py-3 bg-[#714B67]/10 text-[#714B67] border-l-4 border-[#714B67] font-semibold transition-all duration-200" href="#overview">
            <LayoutDashboard size={20} className="mr-3" />
            <span>Overview</span>
          </a>
          <a className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 transition-all font-semibold" href="#inventory">
            <Inbox size={20} className="mr-3" />
            <span>Inventory</span>
          </a>
          <a className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 transition-all font-semibold" href="#reports">
            <BarChart3 size={20} className="mr-3" />
            <span>Sales Reports</span>
          </a>
          <a className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 transition-all font-semibold" href="#staff">
            <Users size={20} className="mr-3" />
            <span>Staff Shift Logs</span>
          </a>
        </nav>
        <div className="px-6 pt-4 border-t border-[#E9ECEF]">
          <button 
            onClick={onLogout}
            className="w-full bg-[#714B67] text-white py-3 rounded-lg font-semibold hover:bg-[#57344f] active:scale-95 duration-100 transition-transform"
          >
            Close Register
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:ml-64 min-h-screen">
        
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex justify-between items-center w-full px-8 py-4 bg-white border-b border-[#E9ECEF]">
          <div className="flex items-center space-x-6">
            <h2 className="text-lg font-black text-[#714B67]">Odoo Admin Dashboard</h2>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className="p-2 text-gray-500 hover:bg-[#f3f4f5] rounded-full transition-colors"
              onClick={fetchStats}
            >
              <RefreshCw size={20} />
            </button>
            <div className="flex items-center space-x-3 ml-4">
              <img 
                alt="Manager Profile" 
                className="w-10 h-10 rounded-full border-2 border-[#714B67]/20" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpuk_WXUowga7VrS1aJv0L1KrpVeeFgnhn5J-GDPP7ScaEpMcbWfM_qco4lTBmyR_kylHDKJqSQjWg9MM5aHyjLNbVODi7zHd58ns7odlUtRSyB_ZjdAgWZjflTAZQkqyT4Ga4qh2rdPwsqG_u9NhV-lSV35ZrpCGFe5des2fEp_uZHUGi8D3gphtw85r0CjTJEErmKbbJ6oiT862RX7FvFBzI2oXvKb3t554DksbR1wGXqbGIocsl" 
              />
              <div className="hidden md:block">
                <p className="font-semibold text-sm text-gray-800">Alex Rivera</p>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Store Manager</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
          
          {/* KPI Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total Sales */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={60} className="text-[#714B67]" />
              </div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Total Sales (Today)</p>
              <h3 className="text-3xl font-extrabold text-gray-900">${(stats.todaySales || 0).toFixed(2)}</h3>
              <div className="flex items-center mt-4 text-emerald-600 font-semibold text-xs gap-1">
                <TrendingUp size={14} />
                <span>Active Terminal</span>
              </div>
            </div>

            {/* Orders Today */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileSpreadsheet size={60} className="text-[#017E84]" />
              </div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Orders Today</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{stats.ordersToday || 0}</h3>
              <div className="flex items-center mt-4 text-emerald-600 font-semibold text-xs gap-1">
                <CheckCircle2 size={14} />
                <span>All routes active</span>
              </div>
            </div>

            {/* Top Product */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Coffee size={60} className="text-[#57344f]" />
              </div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Top Product</p>
              <h3 className="text-3xl font-extrabold text-gray-900 truncate">
                {stats.topProduct?.name || 'None'}
              </h3>
              <p className="text-xs text-gray-500 font-semibold mt-4">
                {stats.topProduct?.count || 0} units sold
              </p>
            </div>

            {/* Stock Alerts */}
            <div className={`glass-card p-6 rounded-2xl relative overflow-hidden group border ${
              stats.stockAlerts?.length > 0 ? 'bg-red-50/50 border-red-200' : 'border-[#E9ECEF]'
            }`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertTriangle size={60} className="text-[#ba1a1a]" />
              </div>
              <p className={`text-sm font-semibold mb-1 ${
                stats.stockAlerts?.length > 0 ? 'text-[#ba1a1a]' : 'text-gray-500'
              }`}>Stock Alerts</p>
              <h3 className={`text-3xl font-extrabold ${
                stats.stockAlerts?.length > 0 ? 'text-[#ba1a1a]' : 'text-gray-900'
              }`}>
                {stats.stockAlerts?.length > 0 ? `${stats.stockAlerts.length} Items Low` : 'All Good'}
              </h3>
              <p className="text-xs text-gray-500 font-semibold mt-4">
                {stats.stockAlerts?.length > 0 ? 'Review inventory log below' : 'Stock levels optimal'}
              </p>
            </div>
          </div>

          {/* Chart and Transaction Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales Performance Chart (Visual CSS) */}
            <div className="lg:col-span-2 glass-card p-6 rounded-2xl h-[450px] flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-lg text-gray-900">Sales Performance</h4>
                <p className="text-xs text-gray-500">Revenue tracking for the last 7 days</p>
              </div>
              <div className="flex-1 w-full relative flex items-end justify-between gap-4 px-4 pb-4 pt-12">
                {[
                  { day: 'Mon', h: '40%', val: '$320' },
                  { day: 'Tue', h: '55%', val: '$440' },
                  { day: 'Wed', h: '75%', val: '$600' },
                  { day: 'Thu', h: '90%', val: '$710' },
                  { day: 'Fri', h: '65%', val: '$510' },
                  { day: 'Sat', h: '50%', val: '$400' },
                  { day: 'Sun', h: '45%', val: '$360' }
                ].map((bar, i) => (
                  <div key={i} className="w-full flex flex-col items-center group relative h-full justify-end">
                    <div className="absolute -top-6 text-[10px] font-bold text-[#714B67] opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.val}
                    </div>
                    <div className="w-full bg-[#714B67]/10 rounded-t-lg relative h-full flex items-end overflow-hidden group-hover:bg-[#714B67]/20 transition-all">
                      <div className="w-full bg-[#714B67] rounded-t-lg transition-all" style={{ height: bar.h }}></div>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold mt-2">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions List */}
            <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[450px]">
              <div className="p-6 border-b border-[#E9ECEF] shrink-0">
                <h4 className="font-extrabold text-lg text-gray-900">Recent Transactions</h4>
              </div>
              <div className="flex-grow overflow-y-auto custom-scrollbar">
                {orders.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No orders placed today.
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-[#f8f9fa] sticky top-0 text-xs font-semibold text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9ECEF] text-sm text-gray-700">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-900">#POS-{order.id}</p>
                            <p className="text-[10px] text-gray-500 font-semibold">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold">${order.total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            {order.status === 'Paid' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                                Paid
                              </span>
                            ) : (
                              <button 
                                onClick={() => markAsPaid(order.id)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase transition-colors"
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Inventory and Staff Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Inventory preview */}
            <div className="glass-card p-6 rounded-2xl">
              <h4 className="font-extrabold text-lg text-gray-900 mb-6">Inventory status</h4>
              {stats.stockAlerts?.length === 0 ? (
                <p className="text-sm text-gray-500">All items are sufficiently stocked.</p>
              ) : (
                <div className="space-y-4">
                  {stats.stockAlerts?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-[#f3f4f5] rounded-xl">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-white border border-[#E9ECEF] flex items-center justify-center mr-3 text-[#714B67]">
                          <Coffee size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                          <p className="text-xs text-red-600 font-semibold">{item.stock === 0 ? 'Out of stock' : `Low Stock: ${item.stock} left`}</p>
                        </div>
                      </div>
                      <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#ba1a1a] h-full transition-all" 
                          style={{ width: `${Math.min(100, (item.stock / 50) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Baristas Shifts Activity */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-extrabold text-lg text-gray-900">Baristas On Duty</h4>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">2 Online</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img 
                      alt="Sarah" 
                      className="w-10 h-10 rounded-full mr-3 object-cover" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl8UJlknzU4BuGj4fB8IsaS71KtID9_u7fhMlz0k24w52gonePq2QxPVmLiYTfCBtdNaHlOlqhGcB8ALlk2u14keDWCb12RIOFKUeFuV6dA-HyWdiCm1raUDhmDmssFrjV1-PBC9wWhAnoplu3L-gxTGnnrlikuiZScjBRNeZXkprpw8H5cAL7Q38tWwEhf0tqw9gEI-u8NKKC6qgum8okLZyC3ObzU7rT3c9ayhmM0mFQfFVKLmyW" 
                    />
                    <div>
                      <p className="font-bold text-sm text-gray-900">Sarah J.</p>
                      <p className="text-xs text-gray-500">Clocked in at 08:00 AM</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900">$412.00</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Today's Sales</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img 
                      alt="Marcus" 
                      className="w-10 h-10 rounded-full mr-3 object-cover" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_X8o1pDrSFaO9jRQ7_29IDImPMV14c5UY5Bce3RrLzK0831L4F_Zt_xUOh-sODltQmOrLvWOg3K6cH37Lu3Ap7sb6olu1nOBdvRxphpVrOjT8WovjcLq9zZQeORZb9-krarAzD9k1V-EgCFBBmtcjRWHlc8j3dYKZeyyhQit6p6WfdazcUg79bbGylrPSoWtVbapvw-ZVOVNAMRNSc_3jvz9E5yFndUcg5RrKewTsXNf_1JVcOuj1" 
                    />
                    <div>
                      <p className="font-bold text-sm text-gray-900">Marcus T.</p>
                      <p className="text-xs text-gray-500">Clocked in at 09:30 AM</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900">$285.50</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Today's Sales</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
