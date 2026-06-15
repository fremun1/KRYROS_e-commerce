import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Heart, ShoppingBag, CreditCard, FileCheck, Package, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { fetchProducts, API_BASE } from "@/lib/api";
import type { Product } from "@/lib/api";
import { useCurrencyStore } from "@/store/currencyStore";
import AccountLayout from "@/components/layout/AccountLayout";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface CreditPlan {
  id: string;
  name: string;
  duration: number;
  interestRate: number;
  minimumAmount: number;
  maximumAmount: number;
  isActive: boolean;
}

interface UserCredit {
  availableCredit?: number;
  creditLimit?: number;
  usedCredit?: number;
}

type GetNowHero = { title1?: string; title2?: string; ctaText?: string; ctaLink?: string; bgColor?: string; imageUrl?: string };

const steps = [
  { icon: ShoppingBag, title: "Shop", desc: "Choose the products you love" },
  { icon: CreditCard, title: "Choose Plan", desc: "Select a payment plan that suits you" },
  { icon: FileCheck, title: "Quick Approval", desc: "Get approved in seconds" },
  { icon: Package, title: "Enjoy", desc: "Receive your products and pay easy" },
];

export default function GetNowPage() {
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userCredit, setUserCredit] = useState<UserCredit | null>(null);
  const [loading, setLoading] = useState(true);
  const [getHero, setGetHero] = useState<GetNowHero | null>(null);
  const format = useCurrencyStore((s) => s.format);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [plansRes, prods] = await Promise.all([
          fetch(`${API_BASE}/api/credit/plans`).then((r) => r.ok ? r.json() : []),
          fetchProducts({ take: 8, allowCredit: true }),
        ]);
        const activePlans: CreditPlan[] = Array.isArray(plansRes)
          ? plansRes.filter((p: CreditPlan) => p.isActive)
          : [];
        setPlans(activePlans);
        setProducts(prods.slice(0, 4));

        const creditRes = await fetch(`${API_BASE}/api/credit/my-account`).catch(() => null);
        if (creditRes?.ok) {
          const data = await creditRes.json();
          setUserCredit(data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Fetch CMS hero banner for Get Now page
  useEffect(() => {
    fetch(`${API_BASE}/api/cms/site-config/get-now`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.value) setGetHero(d.value); })
      .catch(() => {});
  }, []);

  const activePlan = plans[selectedPlan];
  const monthlyDivisor = activePlan?.duration ?? 12;
  const interestRate = activePlan?.interestRate ?? 0;

  const formatCredit = (val?: number) =>
    val != null ? format(val) : "—";

  return (
    <AccountLayout>
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground">Get Now</h1>
          <p className="text-muted-foreground text-xs mt-1 leading-5">
            Buy now, pay in easy installments<br />Simple. Flexible. Hassle-free.
          </p>
        </div>
        <div className="bg-foreground rounded-2xl px-4 py-3 flex items-center gap-2 cursor-pointer min-w-[155px]">
          <div className="flex-1">
            <p className="text-[10px] text-white/40 mb-0.5">Available Credit</p>
            <p className="text-xl font-black text-primary leading-tight">
              {userCredit ? formatCredit(userCredit.availableCredit ?? (userCredit.creditLimit != null && userCredit.usedCredit != null ? userCredit.creditLimit - userCredit.usedCredit : undefined)) : "—"}
            </p>
            {userCredit?.creditLimit != null && (
              <p className="text-[10px] text-white/40">of {formatCredit(userCredit.creditLimit)}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
        </div>
      </div>

      {/* Hero Banner — only shown when admin has configured it */}
      {getHero && (
      <div className="rounded-2xl overflow-hidden mb-6 relative" style={getHero.imageUrl ? { backgroundImage: `url(${getHero.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: getHero.bgColor || "#EDF7F5" }}>
        <div className="flex items-center p-5 gap-3">
          <div className="flex-1 z-10">
            {getHero.title1 && <h2 className="text-[22px] font-black text-foreground leading-tight">{getHero.title1}</h2>}
            {getHero.title2 && <h2 className="text-[22px] font-black text-primary leading-tight mb-3">{getHero.title2}</h2>}
            <p className="text-xs text-muted-foreground mb-0.5">
              {plans.some((p) => p.interestRate === 0) ? "0% interest on select plans" : "Flexible interest plans"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">Easy monthly payments</p>
            <Link href="/shop">
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all">
                How It Works <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
          <div className="relative flex-shrink-0 w-40 h-36">
            <div className="absolute right-0 top-0 w-24 h-24 rounded-2xl overflow-hidden shadow-lg bg-muted">
              {products[0]?.image && <img src={products[0].image} alt={products[0].name} className="w-full h-full object-cover" />}
            </div>
            <div className="absolute left-0 top-5 w-14 h-14 rounded-xl overflow-hidden bg-white shadow-md">
              {products[1]?.image && <img src={products[1].image} alt={products[1].name} className="w-full h-full object-cover" />}
            </div>
            <div className="absolute right-3 bottom-0 w-14 h-14 rounded-xl overflow-hidden bg-white shadow-md">
              {products[2]?.image && <img src={products[2].image} alt={products[2].name} className="w-full h-full object-cover" />}
            </div>
            <div className="absolute top-0 right-0 -translate-y-1 translate-x-1 bg-white rounded-lg px-2 py-1 shadow-sm flex items-center gap-1 border border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[8px] font-bold text-foreground">Instant Approval</span>
            </div>
            <div className="absolute bottom-2 left-0 bg-white rounded-lg px-2 py-1 shadow-sm flex items-center gap-1 border border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[8px] font-bold text-foreground">
                {plans.some((p) => p.interestRate === 0) ? "0% Interest" : "Flexible Plans"}
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* How Get Now Works */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-foreground mb-4">How Get Now Works</h2>
        <div className="flex items-start">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center text-center flex-1 min-w-0 px-0.5">
                  <div className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center mb-2 shadow-sm">
                    <Icon className="w-4.5 h-4.5 text-primary" strokeWidth={1.5} style={{ width: 18, height: 18 }} />
                  </div>
                  <p className="text-[9px] font-bold text-foreground leading-tight mb-0.5">{i + 1}. {step.title}</p>
                  <p className="text-[8px] text-muted-foreground leading-tight">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0 mb-5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular On Get Now */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Popular On Get Now</h2>
          <Link href="/shop">
            <span className="text-xs text-primary font-semibold cursor-pointer">View All</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <div className="p-2.5 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))
            : products.map((p) => (
                <UnifiedProductCard
                  key={p.id}
                  product={p}
                  className="w-full"
                />
              ))}
        </div>
      </div>

      {/* Choose Your Plan */}
      {!loading && plans.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-4">Choose Your Plan</h2>
          <div className="flex gap-2">
            {plans.map((plan, i) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(i)}
                className={`relative flex-1 p-2.5 rounded-2xl border-2 text-left transition-all ${
                  selectedPlan === i
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {i === 0 && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 bg-primary text-white rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                <p className="text-2xl font-black text-foreground leading-none">{plan.duration}</p>
                <p className="text-[9px] text-muted-foreground mb-1.5">Months</p>
                <p className="text-[9px] font-bold text-green-600 mb-1">
                  {plan.interestRate === 0 ? "0% Interest" : `${plan.interestRate}% Interest`}
                </p>
                <p className="text-[8px] text-muted-foreground leading-snug">{plan.name}</p>
                <p className="text-[8px] text-muted-foreground leading-snug">
                  Min: {format(plan.minimumAmount)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Safe Secure Trusted */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/30 transition-colors">
        <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-bold text-foreground">Safe, Secure & Trusted</p>
          <p className="text-[10px] text-muted-foreground leading-snug">Your information is protected with industry-standard security.</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
    </AccountLayout>
  );
}
