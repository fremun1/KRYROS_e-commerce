import { useState } from "react";
import { ChevronDown } from "lucide-react";

const tabs = ["All", "Orders", "Shipping", "Returns", "Account"];

const faqs = [
  { category: "Orders", q: "How can I track my order?", a: "You can track your order from the 'Orders' section in the app using your Order ID or Tracking Number." },
  { category: "Shipping", q: "How long does shipping take?", a: "Standard shipping takes 3-7 business days. Express shipping takes 1-2 business days." },
  { category: "Orders", q: "Can I cancel or change my order?", a: "You can cancel or change your order within 24 hours of placing it by contacting our support team." },
  { category: "Returns", q: "What is your return policy?", a: "We accept returns within 30 days of delivery. Items must be in original condition and packaging." },
  { category: "Returns", q: "How do I request a refund?", a: "Go to My Orders, select the item, tap 'Return / Exchange', and follow the instructions to ship it back." },
  { category: "Account", q: "Which payment methods do you accept?", a: "We accept Visa, Mastercard, PayPal, Apple Pay, Google Pay, and bank transfers." },
  { category: "Account", q: "How can I contact customer support?", a: "You can reach us via email at kryrosmobile@gmail.com, by phone at +1(800) 123-4567, or through Live Chat in the app." },
];

export default function FaqPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = faqs.filter((f) => activeTab === "All" || f.category === activeTab);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      <h1 className="text-2xl font-black text-foreground mb-0.5">Frequently Asked Questions</h1>
      <p className="text-xs text-muted-foreground mb-5">Find quick answers to common questions.</p>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setOpenIndex(null); }}
            className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FAQs */}
      <div className="space-y-2">
        {filtered.map((faq, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-semibold text-foreground pr-4">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`} />
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4">
                <div className="h-px bg-border mb-3" />
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
