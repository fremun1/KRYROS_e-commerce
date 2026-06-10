import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Check, AlertCircle, Loader2, CreditCard, Calendar,
  DollarSign, Percent, Info, FileText, Phone, Mail, MapPin,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { API_BASE } from "@/lib/api";

interface CreditPlan {
  id: string;
  duration: number;
  interestRate: number;
  minimumAmount: number;
  maximumAmount: number;
  name?: string;
  description?: string;
}

interface ApplicationStep {
  id: number;
  label: string;
  description: string;
}

export default function ApplyCreditPage() {
  const [, setLocation] = useLocation();
  const { user, token } = useAuthStore();
  const format = useCurrencyStore((s) => s.format);

  const [currentStep, setCurrentStep] = useState(1);
  const [creditPlans, setCreditPlans] = useState<CreditPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    employmentStatus: "",
    monthlyIncome: "",
    employerName: "",
    employerPhone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [product, setProduct] = useState<any>(null);
  const [productLoading, setProductLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      const currentPath = window.location.pathname + window.location.search;
      setLocation(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    fetchData();
  }, [token, setLocation]);

  const fetchData = async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const productId = searchParams.get("productId");
    
    setPlansLoading(true);
    if (productId) setProductLoading(true);

    try {
      // 1. Fetch Product if ID exists
      if (productId) {
        const prodRes = await fetch(`${API_BASE}/api/products/${productId}`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProduct(prodData);
          if (prodData.price) {
            setSelectedAmount(Number(prodData.price));
          }
        }
        setProductLoading(false);
      }

      // 2. Fetch Credit Plans
      const url = productId 
        ? `${API_BASE}/api/credit/plans?productId=${productId}`
        : `${API_BASE}/api/credit/plans`;
        
      const res = await fetch(url);
      if (res.ok) {
        let data = await res.json();
        let plans = Array.isArray(data) ? data : data.data ?? [];
        
        if (plans.length === 0) {
          const fallbackRes = await fetch(`${API_BASE}/api/credit/plans`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            plans = Array.isArray(fallbackData) ? fallbackData : fallbackData.data ?? [];
          }
        }
        setCreditPlans(plans);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setPlansLoading(false);
      setProductLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !selectedAmount || !token) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const productId = searchParams.get("productId");
      
      const res = await fetch(`${API_BASE}/api/credit/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: productId,
          planId: selectedPlan,
          amount: selectedAmount,
          ...formData,
          country: formData.country || "Zambia",
          employmentStatus: formData.employmentStatus === "business-owner" ? "self-employed" : 
                           formData.employmentStatus === "other" ? "unemployed" : 
                           formData.employmentStatus,
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Application submission failed");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    } catch (error: any) {
      setSubmitError(error.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps: ApplicationStep[] = [
    { id: 1, label: "Select Plan", description: "Choose a credit plan that suits you" },
    { id: 2, label: "Enter Amount", description: "Specify the amount you need" },
    { id: 3, label: "Personal Info", description: "Provide your details" },
    { id: 4, label: "Review & Submit", description: "Review and submit your application" },
  ];

  const selectedPlanData = creditPlans.find((p) => p.id === selectedPlan);
  const monthlyPayment = selectedAmount && selectedPlanData
    ? (selectedAmount * (1 + selectedPlanData.interestRate / 100)) / selectedPlanData.duration
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-black text-foreground">Apply for Credit</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        {submitSuccess ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Application Submitted!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your credit application has been submitted successfully. You'll be redirected to your dashboard.
            </p>
          </div>
        ) : (
          <>
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        step.id < currentStep
                          ? "bg-primary text-white"
                          : step.id === currentStep
                          ? "bg-primary text-white ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 transition-colors ${
                          step.id < currentStep ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                {steps.map((step) => (
                  <div key={step.id} className="text-center flex-1">
                    <p className="text-[10px] font-bold text-foreground">{step.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {submitError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-600">Error</p>
                  <p className="text-xs text-red-600/80 mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {/* Product Summary */}
            {product && (
              <div className="mb-6 p-4 bg-card border border-border rounded-2xl flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-xl overflow-hidden flex-shrink-0 border border-border">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <CreditCard className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Applying for</p>
                  <h3 className="text-sm font-black text-foreground truncate">{product.name}</h3>
                  <p className="text-sm font-bold text-primary mt-0.5">{format(product.price)}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Select Plan */}
              {currentStep === 1 && (
                <div className="space-y-4 mb-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Select a Credit Plan</h2>
                  {plansLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : creditPlans.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No credit plans available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creditPlans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                            selectedPlan === plan.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-foreground">{plan.name || `${plan.duration}-Month Plan`}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{plan.description || "Flexible payment terms"}</p>
                            </div>
                            {selectedPlan === plan.id && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{plan.duration}mo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{plan.interestRate}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{format(plan.minimumAmount)}-{format(plan.maximumAmount)}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Enter Amount */}
              {currentStep === 2 && selectedPlanData && (
                <div className="space-y-4 mb-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">How much do you need?</h2>
                  <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Selected Plan</p>
                    <p className="text-lg font-black text-foreground">{selectedPlanData.name || `${selectedPlanData.duration}-Month Plan`}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedPlanData.duration} months • {selectedPlanData.interestRate}% interest</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Credit Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-foreground">K</span>
                      <input
                        type="number"
                        name="creditAmount"
                        value={selectedAmount || ""}
                        onChange={(e) => setSelectedAmount(Number(e.target.value) || null)}
                        min={selectedPlanData.minimumAmount}
                        max={selectedPlanData.maximumAmount}
                        className="w-full pl-8 pr-4 py-3 border border-border rounded-xl text-lg font-bold text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Range: {format(selectedPlanData.minimumAmount)} - {format(selectedPlanData.maximumAmount)}
                    </p>
                  </div>

                  {selectedAmount && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Credit Amount</span>
                        <span className="text-sm font-bold text-foreground">{format(selectedAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Interest ({selectedPlanData.interestRate}%)</span>
                        <span className="text-sm font-bold text-foreground">{format(selectedAmount * selectedPlanData.interestRate / 100)}</span>
                      </div>
                      <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">Total Amount</span>
                        <span className="text-lg font-black text-primary">{format(selectedAmount * (1 + selectedPlanData.interestRate / 100))}</span>
                      </div>
                      <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">Monthly Payment</span>
                        <span className="text-lg font-black text-primary">{format(monthlyPayment)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Personal Info */}
              {currentStep === 3 && (
                <div className="space-y-4 mb-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Your Information</h2>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      required
                      placeholder="+260977123456"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Zip Code</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Employment Status</label>
                    <select
                      name="employmentStatus"
                      value={formData.employmentStatus}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select status</option>
                      <option value="employed">Employed</option>
                      <option value="self-employed">Self-Employed</option>
                      <option value="business-owner">Business Owner</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Monthly Income (K)
                    </label>
                    <input
                      type="number"
                      name="monthlyIncome"
                      value={formData.monthlyIncome}
                      onChange={handleFormChange}
                      required
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <div className="space-y-4 mb-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Review Your Application</h2>
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Selected Plan</h3>
                      <p className="text-sm font-bold text-foreground">{selectedPlanData?.name || `${selectedPlanData?.duration}-Month Plan`}</p>
                      <p className="text-xs text-muted-foreground">{selectedPlanData?.duration} months • {selectedPlanData?.interestRate}% interest</p>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Amount Details</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-xs text-muted-foreground">Requested: <span className="font-bold text-foreground">{format(selectedAmount || 0)}</span></p>
                        <p className="text-xs text-muted-foreground">Monthly: <span className="font-bold text-foreground">{format(monthlyPayment)}</span></p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Personal Details</h3>
                      <p className="text-sm font-bold text-foreground">{formData.firstName} {formData.lastName}</p>
                      <p className="text-xs text-muted-foreground">{formData.email} • {formData.phone}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formData.address}, {formData.city}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-600/80 leading-relaxed">
                      By submitting, you authorize us to review your credit history. Approval usually takes 24-48 hours.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-8">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s - 1)}
                    className="flex-1 py-3 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                )}
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s + 1)}
                    disabled={
                      (currentStep === 1 && !selectedPlan) ||
                      (currentStep === 2 && (!selectedAmount || selectedAmount < (selectedPlanData?.minimumAmount || 0) || selectedAmount > (selectedPlanData?.maximumAmount || 0))) ||
                      (currentStep === 3 && (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.employmentStatus || !formData.monthlyIncome))
                    }
                    className="flex-[2] py-3 bg-primary text-white rounded-xl text-sm font-black hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-3 bg-primary text-white rounded-xl text-sm font-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
