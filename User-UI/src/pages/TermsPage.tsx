export default function TermsPage() {
  const sections = [
    { title: "Acceptance of Terms", content: "By accessing or using our app, you agree to be bound by these terms." },
    { title: "Use of Our Services", content: "You agree to use our services only for lawful purposes and in accordance with our policies." },
    { title: "Orders & Payments", content: "All orders are subject to availability. We reserve the right to refuse or cancel any order." },
    { title: "Changes to Terms", content: "We may update these terms from time to time. Continued use of the app means you accept the updated terms." },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      <h1 className="text-2xl font-black text-foreground mb-0.5">Terms & Conditions</h1>
      <p className="text-xs text-muted-foreground mb-3">Last updated: May 20, 2026</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-5">
        Please read these terms and conditions carefully before using KRYROS.
      </p>

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

      <p className="text-xs text-muted-foreground text-center">For any questions, please contact our support team.</p>
    </div>
  );
}
