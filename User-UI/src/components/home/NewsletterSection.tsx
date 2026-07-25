import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface NewsletterSectionProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  bgColor?: string;
  textColor?: string;
  backgroundImage?: string;
}

export default function NewsletterSection({
  title = 'Stay in the Loop',
  subtitle = 'Get the latest deals, new arrivals, and exclusive offers straight to your inbox.',
  ctaText = 'Subscribe',
  bgColor,
  textColor,
  backgroundImage,
}: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post('/api/newsletter/subscribe', { email: email.toLowerCase().trim() });
      if (res.status === 200 || res.status === 409) {
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <section className="py-8 md:py-12 text-center" style={{ background: bgColor || 'var(--kryros-secondary-bg)' }}>
        <div className="max-w-lg mx-auto px-4">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
          <h3 className="text-lg font-bold mb-1">You're subscribed!</h3>
          <p className="text-sm text-muted-foreground">Welcome to KRYROS updates. Check your inbox!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-12 relative overflow-hidden" style={{ background: bgColor || 'var(--kryros-secondary-bg)', color: textColor }}>
      {backgroundImage && <img src={backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10" />}
      <div className="max-w-lg mx-auto px-4 text-center relative z-10">
        <h2 className="text-2xl font-black mb-2">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>}
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
            placeholder="Your email address"
            className="flex-1 px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {ctaText}
          </button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        <p className="text-[10px] text-muted-foreground mt-3">No spam, unsubscribe anytime.</p>
      </div>
    </section>
  );
}
