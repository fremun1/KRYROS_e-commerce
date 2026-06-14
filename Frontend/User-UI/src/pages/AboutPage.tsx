import { Target, Eye, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-foreground">About Us</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your Trusted Shopping Partner</p>
        </div>
        <div className="flex-shrink-0 ml-2">
          <img src="/kryros-logo.png" alt="KRYROS" className="w-20 h-20 rounded-2xl shadow-lg" onError={(e) => { (e.target as HTMLImageElement).src = '/kryros-logo.svg'; }} />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-5">
        KRYROS is your one-stop destination for premium products, unbeatable deals, and exceptional service. We are committed to bringing you the best shopping experience with trust, convenience, and innovation at our core.
      </p>

      {/* Mission / Vision / Values */}
      <div className="space-y-3 mb-5">
        {[
          { icon: Target, title: "Our Mission", text: "To deliver quality products and outstanding service that enhance your everyday life." },
          { icon: Eye, title: "Our Vision", text: "To be the most trusted and innovative e-commerce platform globally." },
          { icon: Heart, title: "Our Values", text: "Customer First • Integrity • Quality Dedication • Sustainability" },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 p-4 bg-card border border-border rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ value: "50+", label: "Countries" }, { value: "1M+", label: "Customers" }, { value: "10K+", label: "Products" }].map(({ value, label }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-xl font-black text-primary">{value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Company info */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Company Information</h3>
        <div className="space-y-2">
          {[
            { label: "Registered", value: "KRYROS MOBILE TECH LIMITED" },
            { label: "Address", value: "West Sussex, Burgess Hill, United Kingdom" },
            { label: "Email", value: "kryrosmobile@gmail.com" },
            { label: "Phone", value: "(+260) 966-423-719" },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-3 text-xs">
              <span className="font-semibold text-foreground w-20 flex-shrink-0">{label}</span>
              <span className="text-muted-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
