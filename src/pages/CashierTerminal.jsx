import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  LogOut, 
  Search, 
  Bell, 
  Settings, 
  HelpCircle, 
  UserPlus, 
  ShoppingBag, 
  ArrowRight, 
  Plus, 
  Minus, 
  Trash2,
  AlertTriangle,
  Receipt
} from 'lucide-react';

function CashierTerminal({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState('12');
  const [guestCount, setGuestCount] = useState('1');
  
  const [showKeypad, setShowKeypad] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [stockAlerts, setStockAlerts] = useState([]);
  
  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState(0); // in percentage
  const [socket, setSocket] = useState(null);

  // Load products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();

    // Setup Socket
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('inventory_alert', (alert) => {
      setStockAlerts((prev) => {
        // Avoid duplicate alerts
        if (prev.find((p) => p.name === alert.name)) return prev;
        return [...prev, alert];
      });
      // Refresh products to show updated stock
      fetchProducts();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Filter products by category and search query
  useEffect(() => {
    let result = products;
    
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }
    
    if (searchQuery.trim() !== '') {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())));
    }
    
    setFilteredProducts(result);
  }, [activeCategory, searchQuery, products]);

  // Cart Management
  const addToCart = (product) => {
    // Check if stock is 0
    if (product.stock <= 0) {
      alert(`Sorry, ${product.name} is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more. Only ${product.stock} units left in stock.`);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      const existing = prev.find(item => item.id === productId);
      if (!existing) return prev;

      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(item => item.id !== productId);
      }

      // Check stock limit
      if (delta > 0 && newQty > existing.stock) {
        alert(`Cannot exceed available stock (${existing.stock} units).`);
        return prev;
      }

      return prev.map(item => 
        item.id === productId ? { ...item, quantity: newQty } : item
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter(item => item.id !== productId));
  };

  // Calculations
  const getSubtotal = () => {
    const rawSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return rawSubtotal * (1 - discount / 100);
  };
  const getTax = () => getSubtotal() * 0.08;
  const getTotal = () => getSubtotal() + getTax();

  // Payment keypad input logic
  const handleKeypadPress = (val) => {
    if (val === '.') {
      if (!paidAmount.includes('.')) {
        setPaidAmount(prev => prev + '.');
      }
    } else {
      setPaidAmount(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setPaidAmount(prev => prev.slice(0, -1));
  };

  const processPayment = async () => {
    const total = getTotal();
    const subtotal = getSubtotal();
    const tax = getTax();
    const paid = parseFloat(paidAmount) || 0;

    if (paid < total) {
      alert(`Paid amount ($${paid.toFixed(2)}) must be at least the total amount ($${total.toFixed(2)})`);
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          subtotal,
          tax,
          total,
          status: 'Paid'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record order');
      }

      const change = paid - total;
      alert(`Payment Successful!\nTotal: $${total.toFixed(2)}\nPaid: $${paid.toFixed(2)}\nChange: $${change.toFixed(2)}`);
      
      // Reset POS state
      setCart([]);
      setPaidAmount('');
      setShowKeypad(false);
      setNote('');
      setDiscount(0);
      fetchProducts(); // Refresh stock
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] overflow-hidden h-screen flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 bg-white border-b border-[#E9ECEF] h-16 shrink-0">
        <div className="flex items-center gap-8">
          <span className="text-xl font-extrabold text-[#714B67]">Odoo Cafe POS</span>
          <span className="px-3 py-1 bg-green-50 text-green-700 font-semibold rounded-full text-xs">
            Terminal Active • {user.username} ({user.role})
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              className="pl-10 pr-4 py-2 bg-[#f3f4f5] rounded-full border-none focus:outline-none focus:ring-2 focus:ring-[#714B67] text-sm w-64" 
              placeholder="Search menu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
            />
          </div>
          <button 
            className="p-2 text-gray-500 hover:bg-[#f3f4f5] rounded-full transition-colors relative"
            onClick={() => setStockAlerts([])}
          >
            <span className="material-symbols-outlined">notifications</span>
            {stockAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full"></span>
            )}
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#ba1a1a]/30 text-[#ba1a1a] rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Low Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center justify-between text-xs text-[#ba1a1a]">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} />
            <span>Low Stock Warning: {stockAlerts.map(a => `${a.name} (${a.stock} left)`).join(', ')}</span>
          </div>
          <button className="underline hover:text-[#93000a]" onClick={() => setStockAlerts([])}>Dismiss</button>
        </div>
      )}

      {/* POS Working Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Product Grid and Categories */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa]">
          
          {/* Category Selector */}
          <div className="h-16 shrink-0 border-b border-[#E9ECEF] flex items-center px-6 gap-3 bg-white overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'coffee', label: 'Coffee' },
              { id: 'tea', label: 'Tea & Infusions' },
              { id: 'pastry', label: 'Pastries' },
              { id: 'lunch', label: 'Lunch & Mains' }
            ].map((cat) => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
                  activeCategory === cat.id 
                    ? 'bg-[#714B67] text-white' 
                    : 'bg-[#f3f4f5] text-gray-600 hover:bg-[#e7e8e9]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingBag size={48} className="stroke-[1.5] mb-2" />
                <p>No products found matching filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="product-card cursor-pointer bg-white rounded-xl border border-[#E9ECEF] overflow-hidden shadow-sm flex flex-col group active:scale-95 duration-100 relative"
                  >
                    <div className="relative h-28 w-full overflow-hidden bg-gray-100">
                      <img 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        src={product.image} 
                      />
                      <span className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded text-[#714B67] font-bold text-xs shadow-sm">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.stock <= 5 && (
                        <span className="absolute top-2 left-2 bg-[#ba1a1a] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                          {product.stock === 0 ? 'Out of Stock' : `Low: ${product.stock}`}
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 leading-tight">{product.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Side: Order Sidebar */}
        <aside className="w-[380px] shrink-0 bg-white border-l border-[#E9ECEF] flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
          {/* Header/Guest details */}
          <div className="p-4 border-b border-[#E9ECEF] flex justify-between items-center bg-[#f8f9fa]">
            <div>
              <h2 className="font-bold text-lg text-[#714B67]">Current Order</h2>
              <div className="flex gap-2 mt-1">
                <input 
                  type="text" 
                  value={tableNumber} 
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-16 bg-white border border-[#E9ECEF] rounded px-2 py-0.5 text-xs text-center font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  placeholder="Table"
                />
                <input 
                  type="number" 
                  value={guestCount} 
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-16 bg-white border border-[#E9ECEF] rounded px-2 py-0.5 text-xs text-center font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  placeholder="Guests"
                />
              </div>
            </div>
            <button className="text-gray-500 hover:bg-[#e7e8e9] p-2 rounded-full">
              <UserPlus size={20} />
            </button>
          </div>

          {/* Cart list */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <ShoppingBag size={48} className="mb-2" />
                <p className="text-sm">Order is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#f3f4f5] border border-[#E9ECEF]">
                  <div className="w-8 h-8 rounded bg-[#714B67]/10 flex items-center justify-center font-bold text-xs text-[#714B67]">
                    {item.quantity}x
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm text-gray-900 truncate">{item.name}</span>
                      <span className="font-semibold text-sm text-[#714B67] shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-6 w-6 rounded-full border border-[#E9ECEF] bg-white flex items-center justify-center text-gray-600 hover:bg-[#714B67] hover:text-white transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-6 w-6 rounded-full border border-[#E9ECEF] bg-white flex items-center justify-center text-gray-600 hover:bg-[#714B67] hover:text-white transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="h-6 w-6 rounded-full border border-red-200 bg-white flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors ml-auto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Note section */}
          {cart.length > 0 && (
            <div className="px-4 py-2 border-t border-[#E9ECEF] bg-white">
              <input 
                type="text" 
                placeholder="Add special instructions note..." 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs text-gray-600 border border-gray-200 rounded p-1 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              />
            </div>
          )}

          {/* Totals & payment */}
          <div className="p-6 bg-[#f8f9fa] border-t border-[#E9ECEF] space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (8%)</span>
                <span>${getTax().toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-semibold">
                  <span>Discount ({discount}%)</span>
                  <span>-${(getSubtotal() * (discount/100)).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg text-gray-900 pt-2 border-t border-[#E9ECEF] border-dashed font-bold">
                <span>Total</span>
                <span className="text-[#714B67]">${getTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  const pct = prompt('Enter discount percentage (0-100):');
                  if (pct !== null) setDiscount(Math.min(100, Math.max(0, parseInt(pct) || 0)));
                }}
                className="py-2.5 border border-[#714B67] text-[#714B67] rounded-xl text-sm font-semibold hover:bg-purple-50 transition-colors"
              >
                Discount
              </button>
              <button 
                onClick={() => {
                  const table = prompt('Enter Table Number:');
                  if (table) setTableNumber(table);
                }}
                className="py-2.5 border border-[#714B67] text-[#714B67] rounded-xl text-sm font-semibold hover:bg-purple-50 transition-colors"
              >
                Table Setup
              </button>
            </div>

            <button 
              onClick={() => {
                if (cart.length === 0) return;
                setPaidAmount(getTotal().toFixed(2));
                setShowKeypad(true);
              }}
              disabled={cart.length === 0}
              className="w-full py-4 bg-[#714B67] text-white rounded-2xl text-md font-bold shadow-lg shadow-purple-900/10 hover:bg-[#57344f] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Receipt size={18} />
              <span>Process Payment</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </aside>
      </div>

      {/* Keypad Modal */}
      {showKeypad && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-80 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-900">Enter Payment Amount</h3>
              <button className="text-gray-500 hover:text-gray-900" onClick={() => setShowKeypad(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="text-right mb-6 text-3xl font-bold p-4 bg-[#f3f4f5] rounded-xl text-[#714B67] border border-[#E9ECEF]">
              ${paidAmount || '0.00'}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((num) => (
                <button 
                  key={num}
                  onClick={() => handleKeypadPress(num)}
                  className="h-14 rounded-xl bg-[#f3f4f5] font-semibold text-lg text-gray-800 hover:bg-[#714B67]/10 hover:text-[#714B67] transition-all"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={handleBackspace}
                className="h-14 rounded-xl bg-orange-50 text-orange-600 font-semibold hover:bg-orange-100 flex items-center justify-center"
              >
                <span className="material-symbols-outlined">backspace</span>
              </button>
            </div>

            <div className="flex gap-2 mt-4 font-semibold text-xs text-gray-500 justify-center">
              <span>Required: ${getTotal().toFixed(2)}</span>
            </div>

            <button 
              onClick={processPayment}
              className="w-full mt-6 py-4 bg-[#714B67] text-white rounded-xl font-bold shadow-lg hover:bg-[#57344f]"
            >
              Confirm & Complete Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierTerminal;
