import { useState } from "react";
import { Search, Package, RefreshCcw, Truck, CreditCard, User, Info, ChevronRight, MessageCircle } from "lucide-react";
import { Link } from "wouter";

const topics = [
  { icon: Package, title: "Track Your Order", href: "/track" },
  { icon: RefreshCcw, title: "Returns & Refunds", href: "/returns" },
  { icon: Truck, title: "Shipping Information", href: "/shipping" },
  { icon: CreditCard, title: "Payment Methods", href: "/faq" },
  { icon: User, title: "Account & Profile", href: "/dashboard" },
  { icon: Info, title: "Product Information", href: "/shop" },
];

export default function HelpPage() {
  const [searchQ, setSearchQ] = useState("");

  const filtered = topics.filter((t) =>
    !searchQ || t.title.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      <h1 className="text-2xl font-black text-foreground mb-0.5">Help Center</h1>
      <p className="text-xs text-muted-foreground mb-5">How can we help you today?</p>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search for help topics..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Popular Topics */}
      <h2 className="text-sm font-bold text-foreground mb-3">Popular Topics</h2>
      <div className="space-y-2 mb-5">
        {filtered.map(({ icon: Icon, title, href }) => (
          <Link key={title} href={href}>
            <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl cursor-pointer hover:border-primary/30 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
              </div>
              <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No topics found for "{searchQ}"</p>
        </div>
      )}

      {/* Can't find */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Can't find what you need?</p>
          <p className="text-xs text-muted-foreground">Contact our support team directly.</p>
        </div>
        <Link href="/contact">
          <button className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex-shrink-0">
            Contact Us <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
    </div>
  );
}
