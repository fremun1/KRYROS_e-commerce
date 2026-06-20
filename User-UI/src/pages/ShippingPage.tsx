import { Truck, Clock, MapPin, Package } from "lucide-react";

export default function ShippingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      <h1 className="text-2xl font-black text-foreground mb-0.5">Shipping Information</h1>
      <p className="text-xs font-semibold text-foreground mb-0.5">Fast. Reliable. Convenient.</p>
      <p className="text-xs text-muted-foreground mb-5">We deliver your orders safely and on time.</p>

      <div className="space-y-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Shipping Options</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Standard Shipping</span>
              <span className="text-xs text-muted-foreground">3-7 business days</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold text-foreground">Express Shipping</span>
              <span className="text-xs text-muted-foreground">1-2 business days</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">We offer standard and express shipping options at checkout.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Processing Time</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Orders are processed within 1-2 business days (excluding weekends and holidays).
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Delivery Time</h2>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Standard: 3-7 business days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Express: 1-2 business days</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Shipping Charges</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Shipping fees are calculated at checkout based on your location and order value. Free shipping on orders over $100.
          </p>
        </div>
      </div>

      <div className="mt-4 bg-primary/5 border border-primary/20 rounded-2xl p-3">
        <p className="text-xs text-primary leading-relaxed font-medium">
          You'll receive a tracking number once your order is shipped.
        </p>
      </div>
    </div>
  );
}
