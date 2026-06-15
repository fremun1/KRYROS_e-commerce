import { ShieldCheck, Lock, AlertTriangle, Eye } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      <h1 className="text-2xl font-black text-foreground mb-0.5">Security</h1>
      <p className="text-xs font-semibold text-foreground mb-1">Your security is our priority.</p>
      <p className="text-xs text-muted-foreground mb-5">
        We use industry-leading security measures to protect your data and transactions.
      </p>

      <div className="space-y-3 mb-5">
        {[
          {
            icon: ShieldCheck,
            title: "Secure Payments",
            desc: "All payments are encrypted and protected securely.",
          },
          {
            icon: Lock,
            title: "Data Protection",
            desc: "We protect your personal information with advanced security protocols.",
          },
          {
            icon: AlertTriangle,
            title: "Fraud Prevention",
            desc: "Our systems monitor and prevent suspicious activities 24/7.",
          },
          {
            icon: Eye,
            title: "Privacy Guaranteed",
            desc: "We never sell your personal data to third parties.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 p-4 bg-card border border-border rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
        <p className="text-xs font-semibold text-primary">Shop with confidence. You're safe with KRYROS.</p>
      </div>
    </div>
  );
}
