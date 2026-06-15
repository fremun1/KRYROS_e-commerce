export default function RefundPage() {
  const sections = [
    {
      title: "Eligibility",
      content: "Refunds are available for items returned within 7 days of delivery in original condition and original packaging. After 7 days, we are unable to process any refund requests.",
    },
    {
      title: "Non-Refundable Items",
      content: "Certain items are non-refundable, including gift cards, downloadable digital products, and clearance/final-sale items. Items that show signs of use, damage, or missing original packaging are also not eligible.",
    },
    {
      title: "Refund Process",
      content: "Once we receive and inspect your returned item within the 7-day window, we will notify you by email and process your refund within 5–7 business days.",
    },
    {
      title: "Refund Method",
      content: "Refunds will be issued to the original payment method used at the time of purchase. We do not offer cash refunds.",
    },
    {
      title: "Important Notice",
      content: "We strictly enforce a 7-day return and refund window from the date of delivery. Requests submitted after 7 days will not be accepted under any circumstances. Please inspect your order immediately upon receipt.",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      <h1 className="text-2xl font-black text-foreground mb-0.5">Refund Policy</h1>
      <p className="text-xs text-muted-foreground mb-3">Last updated: May 20, 2026</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-5">
        We want you to be 100% satisfied with your purchase. If you are not satisfied, you have <strong className="text-foreground">7 days</strong> from the date of delivery to request a refund.
      </p>

      <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 mb-5">
        <p className="text-xs font-bold text-destructive">⚠️ 7-Day Return Window</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          All return and refund requests must be made within <strong>7 days</strong> of receiving your order. We do not accept returns or process refunds after this period.
        </p>
      </div>

      <div className="space-y-3 mb-5">
        {sections.map((sec, i) => (
          <div key={sec.title} className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-bold text-foreground mb-1.5">
              <span className="text-primary mr-1">{i + 1}.</span>{sec.title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{sec.content}</p>
          </div>
        ))}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
        <p className="text-xs font-bold text-foreground mb-0.5">Need Help?</p>
        <p className="text-xs text-muted-foreground">Contact our support team within your 7-day window at {import.meta.env.VITE_CONTACT_EMAIL || "info@kryros.com"}</p>
      </div>
    </div>
  );
}
