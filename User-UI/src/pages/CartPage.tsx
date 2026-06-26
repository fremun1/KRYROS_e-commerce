import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ChevronLeft, Info, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { fetchSettings } from "@/lib/api";

// Free shipping: 50 qualifying items, each individually worth >= $100 USD
const FREE_SHIPPING_TARGET = 50;
const QUALIFYING_PRICE_USD = 100;

export default function CartPage() {
  const { items, removeFromCart, updateQty, clearCart } = useCartStore();
  const format = useCurrencyStore((s) => s.format);
  const cartCount = items.reduce((t, i) => t + i.qty, 0);
  const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);
  const [feeRate, setFeeRate] = useState(0.03); // default to 3%

  // Calculate shipping as sum of each product's shipping fee
  const shipping = items.reduce((t, i) => t + (i.shippingFee || 0) * i.qty, 0);
  const fee = subtotal * feeRate;
  const total = subtotal + shipping + fee;

  // Calculate delivery range: use the slowest item's delivery window
  const deliveryMinDays = items.reduce(
    (max, i) => Math.max(max, i.estimatedDeliveryMinDays || i.estimatedDeliveryDays || 2),
    0,
  ) || 2;
  const deliveryMaxDays = items.reduce(
    (max, i) => Math.max(max, i.estimatedDeliveryMaxDays || i.estimatedDeliveryDays || 7),
    0,
  ) || 7;

  // Calculate estimated delivery dates
  const today = new Date();
  const estimatedStart = new Date(today);
  estimatedStart.setDate(today.getDate() + deliveryMinDays);
  const estimatedEnd = new Date(today);
  estimatedEnd.setDate(today.getDate() + deliveryMaxDays);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const deliveryRangeText = deliveryMinDays === deliveryMaxDays
    ? `delivery in ${deliveryMaxDays} day${deliveryMaxDays === 1 ? "" : "s"}`
    : `delivery in ${deliveryMinDays}-${deliveryMaxDays} days`;

  useEffect(() => {
    fetchSettings().then((settings) => {
      const rate = settings.find((s: any) => s.key === 'processing_fee_rate')?.value;
      if (rate) setFeeRate(Number(rate) / 100);
    }).catch(() => {});
  }, []);

  const TopBar = () => (
    <div className="md:hidden sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
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
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 text-center lg:px-8">
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
    {/* lg: extra top padding + wider horizontal padding */}
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10 lg:py-10 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        {/* lg: larger heading */}
        <h1 className="text-2xl md:text-3xl font-black text-foreground lg:text-4xl">
          Cart <span className="text-muted-foreground text-lg font-medium">({cartCount})</span>
        </h1>
        <button onClick={() => { clearCart(); toast.success("Cart cleared"); }} className="text-sm text-destructive hover:underline">
          Clear All
        </button>
      </div>

      {/* lg: wider gap between columns */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
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
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 lg:p-5 lg:gap-5"
              >
                {/* lg: larger product image */}
                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-muted flex-shrink-0 md:w-24 md:h-24 lg:w-28 lg:h-28" />
                <div className="flex-1 min-w-0">
                  {/* lg: larger product name */}
                  <h3 className="font-semibold text-foreground text-sm leading-snug mb-1 lg:text-base">{item.name}</h3>
                  {/* lg: larger price */}
                  <p className="text-lg font-black text-foreground lg:text-xl">{format(item.price * item.qty)}</p>
                  <p className="text-xs text-muted-foreground lg:text-sm">{format(item.price)} each</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button onClick={() => { removeFromCart(item.id); toast.success("Removed from cart"); }} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                  {/* lg: slightly larger qty control */}
                  <div className="flex items-center border border-border rounded-xl overflow-hidden">
                    <button onClick={() => { if (item.qty <= 1) { removeFromCart(item.id); } else updateQty(item.id, item.qty - 1); }} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors lg:w-9 lg:h-9">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold lg:w-10">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors lg:w-9 lg:h-9">
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
          {/* lg: more padding inside summary card */}
          <div className="bg-card border border-border rounded-2xl p-5 sticky top-24 lg:p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 lg:text-xl">Order Summary</h2>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm lg:text-base">
                <span className="text-muted-foreground">Subtotal ({cartCount} items)</span>
                <span className="font-semibold text-foreground">{format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm lg:text-base">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold text-foreground">{format(shipping)}</span>
              </div>
              <div className="flex justify-between text-sm lg:text-base">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-semibold text-foreground">{format(fee)}</span>
              </div>

              {/* Delivery Information */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mt-3">
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground capitalize">{deliveryRangeText}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Estimated by {formatDate(estimatedStart)} - {formatDate(estimatedEnd)}</p>
                  </div>
                </div>
              </div>

              {/* FREE_SHIPPING_UI: banner hidden. Restore by uncommenting the block below. */}
              {/*
              {shippingUnlocked ? (
                <p className="text-xs text-green-600 font-semibold">🎉 Free shipping unlocked!</p>
              ) : (
                <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs text-foreground font-medium">
                    You have <span className="text-primary font-bold">{qualifyingCount}</span> qualifying item{qualifyingCount !== 1 ? "s" : ""}.
                    Add <span className="text-primary font-bold">{itemsRemaining}</span> more for free shipping.
                  </p>
                  <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (qualifyingCount / FREE_SHIPPING_TARGET) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3 flex-shrink-0" />
                    Only items worth {format(QUALIFYING_PRICE_USD)}+ count toward free shipping.
                  </p>
                </div>
              )}
              */}
            </div>
            <div className="border-t border-border pt-3 mb-5">
              <div className="flex justify-between">
                <span className="font-bold text-foreground lg:text-lg">Total</span>
                <span className="font-black text-xl text-foreground lg:text-2xl">{format(total)}</span>
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
              {/* lg: slightly taller checkout button */}
              <button className="w-full py-3.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95 lg:py-4 lg:text-base">
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
