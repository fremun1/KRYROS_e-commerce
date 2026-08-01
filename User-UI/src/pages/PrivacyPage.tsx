import { useState, useEffect } from "react";
import { EFFECTIVE_API_BASE } from "@/lib/api";

interface SiteSettings {
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  companyName?: string;
}

export default function PrivacyPage() {
  const [settings, setSettings] = useState<SiteSettings>({});

  useEffect(() => {
    fetch(`${EFFECTIVE_API_BASE}/api/cms/site-config/contact`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value) setSettings(data.value);
      })
      .catch(() => {});
  }, []);

  const contactEmail = settings.contactEmail || import.meta.env.VITE_CONTACT_EMAIL || "info@kryros.com";

  const sections = [
    { title: "Information We Collect", content: "We collect information you provide directly to us, such as your name, email address, and payment details." },
    { title: "How We Use Your Information", content: "We use your information to process orders, improve our services, communicate with you, and ensure security." },
    { title: "Information Sharing", content: "We do not share your personal data. We share information only with trusted partners who help us operate our services." },
    { title: "Data Security", content: "We implement industry-standard security measures to protect your information." },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-6">
      <h1 className="text-2xl font-black text-foreground mb-0.5">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground mb-3">Last updated: May 20, 2026</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-5">
        At KRYROS, we respect your privacy and are committed to protecting your personal data.
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

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
        <p className="text-xs font-bold text-foreground mb-0.5">Contact Us</p>
        <p className="text-xs text-muted-foreground">For privacy inquiries, email us at {contactEmail}</p>
      </div>
    </div>
  );
}
