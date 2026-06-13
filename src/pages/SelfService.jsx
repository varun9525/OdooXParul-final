import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash, 
  CheckCircle,
  X,
  CreditCard
} from 'lucide-react';

function SelfService() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

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
  }, []);

  // Filter products by category
  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === activeCategory));
    }
  }, [activeCategory, products]);

  // Cart Management
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert(`Sorry, ${product.name} is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Limit reached. Only ${product.stock} items left.`);
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

      if (delta > 0 && newQty > existing.stock) {
        alert(`Sorry, only ${existing.stock} items available.`);
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

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };
  const getTax = () => getSubtotal() * 0.08;
  const getTotal = () => getSubtotal() + getTax();

  const handleCheckout = async () => {
    if (cart.length === 0) return;

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
          subtotal: getSubtotal(),
          tax: getTax(),
          total: getTotal(),
          status: 'Paid' // Self-service orders are paid instantly
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to checkout');
      }

      setCart([]);
      setShowCart(false);
      setOrderCompleted(true);
      
      // Auto-hide success modal
      setTimeout(() => {
        setOrderCompleted(false);
        fetchProducts(); // Refresh stock details
      }, 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen flex flex-col font-sans relative">
      
      {/* Hero Welcome banner */}
      <header className="relative w-full h-[350px] min-h-[300px] overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
        <img 
          alt="Welcome to Odoo Cafe" 
          className="absolute inset-0 w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpPnjUoAcMyAnkmHO7rOHijd0SGasb1PZY1SNzgVHPyHClPzCsvnUdv5JbVp-Gto_BeIypUavSEkBtjxjeMQoNvxin6htV2v28wxtB9Bv7mAvfRYMTA8Y_8D33LiQYv-wtVUmGS2WGIX8gMQMy7g97bNMIluuZXbt5uGbuqqg1BLNE5JUYGTZtr4nOBS17wSEuTrDYxEz68v45PNvTfsb7Y63p3wcaoDXdehfXaMJdkN73laFzjvR-" 
        />
        <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-2">Welcome to Odoo Cafe</h1>
          <p className="text-white/90 text-sm md:text-lg max-w-lg">Hand-crafted coffee and artisanal pastries, ready for your selection.</p>
        </div>
      </header>

      {/* Sticky Categories Navigation */}
      <nav className="sticky top-0 z-40 bg-white shadow-sm overflow-x-auto flex items-center px-6 md:px-12 py-3 gap-6 hide-scrollbar border-b border-[#E9ECEF] shrink-0">
        {[
          { id: 'all', label: 'All Items', icon: 'grid_view' },
          { id: 'coffee', label: 'Coffee', icon: 'coffee' },
          { id: 'tea', label: 'Tea', icon: 'local_cafe' },
          { id: 'pastry', label: 'Pastry', icon: 'bakery_dining' },
          { id: 'lunch', label: 'Lunch', icon: 'lunch_dining' }
        ].map((cat) => (
          <button 
            key={cat.id} 
            onClick={() => setActiveCategory(cat.id)}
            className="flex flex-col items-center gap-1 group active:scale-95 transition-transform shrink-0"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              activeCategory === cat.id 
                ? 'bg-[#714B67] text-white' 
                : 'bg-[#f3f4f5] text-gray-500 group-hover:bg-[#714B67]/10'
            }`}>
              <span className="material-symbols-outlined text-xl">{cat.icon}</span>
            </div>
            <span className={`text-xs font-semibold ${
              activeCategory === cat.id ? 'text-[#714B67]' : 'text-gray-500'
            }`}>{cat.label}</span>
          </button>
        ))}
      </nav>

      {/* Products Grid */}
      <main className="flex-grow p-6 md:p-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <article 
              key={product.id} 
              className="bg-white rounded-xl border border-[#E9ECEF] overflow-hidden shadow-sm flex flex-col group transition-all hover:shadow-md"
            >
              <div className="h-44 relative overflow-hidden bg-gray-50">
                <img 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  src={product.image} 
                />
                <span className="absolute bottom-2 right-2 bg-[#714B67] text-white px-3 py-1 rounded-full font-bold text-sm shadow-sm">
                  ${product.price.toFixed(2)}
                </span>
                {product.stock === 0 && (
                  <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">
                    Out of Stock
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-base text-gray-900 mb-1">{product.name}</h3>
                <p className="text-gray-500 text-xs flex-grow mb-4 line-clamp-2">{product.description}</p>
                
                <button 
                  disabled={product.stock === 0}
                  className="w-full py-3 bg-[#714B67] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#57344f] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={() => addToCart(product)}
                >
                  <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                  Add to Cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Floating Kiosk Basket Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => setShowCart(true)}
            className="relative bg-[#017E84] text-white px-6 py-4 rounded-full shadow-lg flex items-center gap-3 active:scale-95 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <ShoppingBag size={20} />
            <span className="font-bold text-sm">View My Order</span>
            <span className="bg-[#ba1a1a] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </button>
        </div>
      )}

      {/* Mini Cart Sidebar Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[60] transform transition-transform duration-300 flex flex-col ${
        showCart ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 border-b border-[#E9ECEF] flex justify-between items-center bg-[#f8f9fa]">
          <h2 className="font-bold text-lg text-[#714B67]">Your Order Details</h2>
          <button className="p-2 hover:bg-[#e7e8e9] rounded-full text-gray-500" onClick={() => setShowCart(false)}>
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-[#f3f4f5] rounded-lg">
              <div className="flex-grow">
                <h4 className="font-bold text-sm text-gray-900">{item.name}</h4>
                <span className="text-[#017E84] font-semibold text-xs">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1 bg-white rounded-full border border-[#E9ECEF] p-1">
                <button 
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full"
                >
                  <Minus size={14} />
                </button>
                <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-[#f8f9fa] border-t border-[#E9ECEF] space-y-4 shrink-0">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Sales Tax (8%)</span>
            <span className="text-gray-900 font-semibold">${getTax().toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-base text-gray-900">Total Bill</span>
            <span className="font-black text-xl text-[#714B67]" id="cart-subtotal">${getTotal().toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            className="w-full py-4 bg-[#714B67] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#57344f] transition-opacity"
          >
            <CreditCard size={18} />
            <span>Proceed to Payment</span>
          </button>
        </div>
      </div>

      {/* Cart Backdrop */}
      {showCart && (
        <div className="fixed inset-0 bg-black/40 z-[55] transition-opacity" onClick={() => setShowCart(false)}></div>
      )}

      {/* Order Success Popup */}
      {orderCompleted && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
              <CheckCircle size={48} className="stroke-[2]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h3>
            <p className="text-gray-600 text-sm mb-6">
              Your order has been sent to the kitchen. Please pick up your ticket at the register.
            </p>
            <div className="px-6 py-2.5 bg-[#714B67] text-white rounded-full text-xs font-semibold uppercase tracking-wider">
              Enjoy your coffee!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SelfService;
