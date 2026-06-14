import AccountLayout from "@/components/layout/AccountLayout";

export default function ReturnsPage() {
  return (
    <AccountLayout>
      <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-foreground mb-0.5">Returns & Exchanges</h1>
      <p className="text-xs text-muted-foreground mb-5">Simple and straightforward — within 7 days of delivery.</p>

      <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 mb-5">
        <p className="text-xs font-bold text-destructive">⚠️ 7-Day Return Policy</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          All return and exchange requests must be submitted within <strong>7 days</strong> of receiving your order. We cannot accept returns or exchanges after this 7-day window has passed.
        </p>
      </div>

      <div className="space-y-3 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-bold text-foreground mb-2">Return Eligibility</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Items must be returned within <strong>7 days</strong> of delivery in their original condition and original packaging, with all accessories included. Items that have been used, damaged, or are missing packaging will not be accepted.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-bold text-foreground mb-2">How to Return</h2>
          <div className="space-y-2">
            {[
              "Go to My Orders and select the item you want to return.",
              "Tap on 'Return / Exchange' and select your reason.",
              "Follow the instructions and ship the item back within the 7-day window.",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-primary">{i + 1}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-bold text-foreground mb-2">Exchange</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Exchanges are subject to product availability and must be requested within <strong>7 days</strong> of delivery. If the requested item is unavailable, a refund will be issued to your original payment method.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-bold text-foreground mb-2">Refund Timeline</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Once your returned item is received and inspected, refunds are processed within 5–7 business days back to your original payment method.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-3">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          After 7 days from delivery, we are unable to process any return or exchange request. Please inspect your order immediately upon receipt and contact us right away if there is an issue.
        </p>
      </div>
    </div>
    </AccountLayout>
  );
}
