import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useCurrencyStore } from "@/store/currencyStore";

export default function CartPage() {
  const { items, removeFromCart, updateQty, clearCart } = useCartStore();
  const format = useCurrencyStore((s) => s.format);
  const cartCount = items.reduce((t, i) => t + i.qty, 0);
  const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);
  const shipping = subtotal >= 100 ? 0 : 9.99;
  const total = subtotal + shipping;

  const TopBar = () => (
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
      <Link href="/shop">
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
      </Link>
      <span className="text-base font-black text-foreground">KRY<span className="text-primary">ROS</span></span>
      <div className="flex-1" />
      <Link href="/shop">
        <span className="text-xs text-primary font-semibold hover:underline">Continue Shopping</span>
      </Link>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some products to get started.</p>
        <Link href="/shop">
          <button className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all">
            Continue Shopping
          </button>
        </Link>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Cart <span className="text-muted-foreground text-lg font-medium">({cartCount})</span>
        </h1>
        <button onClick={() => { clearCart(); toast.success("Cart cleared"); }} className="text-sm text-destructive hover:underline">
          Clear All
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
              >
                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm leading-snug mb-1">{item.name}</h3>
                  <p className="text-lg font-black text-foreground">{format(item.price * item.qty)}</p>
                  <p className="text-xs text-muted-foreground">{format(item.price)} each</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button onClick={() => { removeFromCart(item.id); toast.success("Removed from cart"); }} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center border border-border rounded-xl overflow-hidden">
                    <button onClick={() => { if (item.qty <= 1) { removeFromCart(item.id); } else updateQty(item.id, item.qty - 1); }} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-2xl p-5 sticky top-24">
            <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartCount} items)</span>
                <span className="font-semibold text-foreground">{format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className={`font-semibold ${shipping === 0 ? "text-green-600" : "text-foreground"}`}>
                  {shipping === 0 ? "Free" : format(shipping)}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-primary">Add {format(100 - subtotal)} more for free shipping</p>
              )}
            </div>
            <div className="border-t border-border pt-3 mb-5">
              <div className="flex justify-between">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-black text-xl text-foreground">{format(total)}</span>
              </div>
            </div>

            {/* Promo code */}
            <div className="flex gap-2 mb-5">
              <input type="text" placeholder="Promo code" className="flex-1 px-3 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              <button className="px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
                Apply
              </button>
            </div>

            <Link href="/checkout">
              <button className="w-full py-3.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95">
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>

            <Link href="/shop">
              <button className="w-full mt-3 py-3 border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all">
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
