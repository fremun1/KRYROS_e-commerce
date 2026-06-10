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

  useEffect(() => {
    if (!token) {
      setLocation("/login");
      return;
    }
    fetchCreditPlans();
  }, [token, setLocation]);

  const fetchCreditPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/credit/plans`);
      if (res.ok) {
        const data = await res.json();
        setCreditPlans(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch credit plans:", err);
    } finally {
      setPlansLoading(false);
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
      const res = await fetch(`${API_BASE}/api/credit/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: selectedPlan,
          amount: selectedAmount,
          ...formData,
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
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
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
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />\n                              <span className=\"text-xs text-muted-foreground\">{plan.duration}mo</span>\n                            </div>\n                            <div className=\"flex items-center gap-1.5\">\n                              <Percent className=\"w-3.5 h-3.5 text-muted-foreground\" />\n                              <span className=\"text-xs text-muted-foreground\">{plan.interestRate}%</span>\n                            </div>\n                            <div className=\"flex items-center gap-1.5\">\n                              <DollarSign className=\"w-3.5 h-3.5 text-muted-foreground\" />\n                              <span className=\"text-xs text-muted-foreground\">{format(plan.minimumAmount)}-{format(plan.maximumAmount)}</span>\n                            </div>\n                          </div>\n                        </button>\n                      ))}\n                    </div>\n                  )}\n                </div>\n              )}\n\n              {/* Step 2: Enter Amount */}\n              {currentStep === 2 && selectedPlanData && (\n                <div className=\"space-y-4 mb-6\">\n                  <h2 className=\"text-lg font-bold text-foreground mb-4\">How much do you need?</h2>\n                  <div className=\"bg-card border border-border rounded-2xl p-4 mb-4\">\n                    <p className=\"text-xs text-muted-foreground mb-2\">Selected Plan</p>\n                    <p className=\"text-lg font-black text-foreground\">{selectedPlanData.name || `${selectedPlanData.duration}-Month Plan`}</p>\n                    <p className=\"text-xs text-muted-foreground mt-1\">{selectedPlanData.duration} months • {selectedPlanData.interestRate}% interest</p>\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">\n                      Credit Amount\n                    </label>\n                    <div className=\"relative\">\n                      <span className=\"absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-foreground\">K</span>\n                      <input\n                        type=\"number\"\n                        name=\"creditAmount\"\n                        value={selectedAmount || \"\"}\n                        onChange={(e) => setSelectedAmount(Number(e.target.value) || null)}\n                        min={selectedPlanData.minimumAmount}\n                        max={selectedPlanData.maximumAmount}\n                        className=\"w-full pl-8 pr-4 py-3 border border-border rounded-xl text-lg font-bold text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                        placeholder=\"0\"\n                      />\n                    </div>\n                    <p className=\"text-xs text-muted-foreground mt-2\">\n                      Range: {format(selectedPlanData.minimumAmount)} - {format(selectedPlanData.maximumAmount)}\n                    </p>\n                  </div>\n\n                  {selectedAmount && (\n                    <div className=\"bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2\">\n                      <div className=\"flex items-center justify-between\">\n                        <span className=\"text-xs text-muted-foreground\">Credit Amount</span>\n                        <span className=\"text-sm font-bold text-foreground\">{format(selectedAmount)}</span>\n                      </div>\n                      <div className=\"flex items-center justify-between\">\n                        <span className=\"text-xs text-muted-foreground\">Interest ({selectedPlanData.interestRate}%)</span>\n                        <span className=\"text-sm font-bold text-foreground\">{format(selectedAmount * selectedPlanData.interestRate / 100)}</span>\n                      </div>\n                      <div className=\"border-t border-primary/20 pt-2 flex items-center justify-between\">\n                        <span className=\"text-xs font-bold text-primary\">Total Amount</span>\n                        <span className=\"text-lg font-black text-primary\">{format(selectedAmount * (1 + selectedPlanData.interestRate / 100))}</span>\n                      </div>\n                      <div className=\"border-t border-primary/20 pt-2 flex items-center justify-between\">\n                        <span className=\"text-xs font-bold text-primary\">Monthly Payment</span>\n                        <span className=\"text-lg font-black text-primary\">{format(monthlyPayment)}</span>\n                      </div>\n                    </div>\n                  )}\n                </div>\n              )}\n\n              {/* Step 3: Personal Info */}\n              {currentStep === 3 && (\n                <div className=\"space-y-4 mb-6\">\n                  <h2 className=\"text-lg font-bold text-foreground mb-4\">Your Information</h2>\n\n                  <div className=\"grid grid-cols-2 gap-3\">\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">\n                        First Name\n                      </label>\n                      <input\n                        type=\"text\"\n                        name=\"firstName\"\n                        value={formData.firstName}\n                        onChange={handleFormChange}\n                        required\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">\n                        Last Name\n                      </label>\n                      <input\n                        type=\"text\"\n                        name=\"lastName\"\n                        value={formData.lastName}\n                        onChange={handleFormChange}\n                        required\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <Mail className=\"w-3 h-3\" /> Email\n                    </label>\n                    <input\n                      type=\"email\"\n                      name=\"email\"\n                      value={formData.email}\n                      onChange={handleFormChange}\n                      required\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <Phone className=\"w-3 h-3\" /> Phone\n                    </label>\n                    <input\n                      type=\"tel\"\n                      name=\"phone\"\n                      value={formData.phone}\n                      onChange={handleFormChange}\n                      required\n                      placeholder=\"+260966423719\"\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <MapPin className=\"w-3 h-3\" /> Address\n                    </label>\n                    <input\n                      type=\"text\"\n                      name=\"address\"\n                      value={formData.address}\n                      onChange={handleFormChange}\n                      required\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div className=\"grid grid-cols-2 gap-3\">\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">City</label>\n                      <input\n                        type=\"text\"\n                        name=\"city\"\n                        value={formData.city}\n                        onChange={handleFormChange}\n                        required\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">State/Province</label>\n                      <input\n                        type=\"text\"\n                        name=\"state\"\n                        value={formData.state}\n                        onChange={handleFormChange}\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                  </div>\n\n                  <div className=\"grid grid-cols-2 gap-3\">\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Country</label>\n                      <input\n                        type=\"text\"\n                        name=\"country\"\n                        value={formData.country}\n                        onChange={handleFormChange}\n                        required\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Zip Code</label>\n                      <input\n                        type=\"text\"\n                        name=\"zipCode\"\n                        value={formData.zipCode}\n                        onChange={handleFormChange}\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Employment Status</label>\n                    <select\n                      name=\"employmentStatus\"\n                      value={formData.employmentStatus}\n                      onChange={handleFormChange}\n                      required\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    >\n                      <option value=\"\">Select employment status</option>\n                      <option value=\"employed\">Employed</option>\n                      <option value=\"self-employed\">Self-Employed</option>\n                      <option value=\"unemployed\">Unemployed</option>\n                      <option value=\"student\">Student</option>\n                      <option value=\"retired\">Retired</option>\n                    </select>\n                  </div>\n\n                  {formData.employmentStatus === \"employed\" && (\n                    <>\n                      <div>\n                        <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Employer Name</label>\n                        <input\n                          type=\"text\"\n                          name=\"employerName\"\n                          value={formData.employerName}\n                          onChange={handleFormChange}\n                          className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                        />\n                      </div>\n                      <div>\n                        <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Employer Phone</label>\n                        <input\n                          type=\"tel\"\n                          name=\"employerPhone\"\n                          value={formData.employerPhone}\n                          onChange={handleFormChange}\n                          className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                        />\n                      </div>\n                    </>\n                  )}\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Monthly Income</label>\n                    <input\n                      type=\"number\"\n                      name=\"monthlyIncome\"\n                      value={formData.monthlyIncome}\n                      onChange={handleFormChange}\n                      required\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n                </div>\n              )}\n\n              {/* Step 4: Review & Submit */}\n              {currentStep === 4 && (\n                <div className=\"space-y-4 mb-6\">\n                  <h2 className=\"text-lg font-bold text-foreground mb-4\">Review Your Application</h2>\n\n                  <div className=\"bg-card border border-border rounded-2xl p-4 space-y-3\">\n                    <div>\n                      <p className=\"text-xs text-muted-foreground mb-1\">Credit Plan</p>\n                      <p className=\"text-sm font-bold text-foreground\">{selectedPlanData?.name || `${selectedPlanData?.duration}-Month Plan`}</p>\n                    </div>\n                    <div className=\"border-t border-border pt-3\">\n                      <p className=\"text-xs text-muted-foreground mb-1\">Credit Amount</p>\n                      <p className=\"text-sm font-bold text-foreground\">{format(selectedAmount || 0)}</p>\n                    </div>\n                    <div className=\"border-t border-border pt-3\">\n                      <p className=\"text-xs text-muted-foreground mb-1\">Monthly Payment</p>\n                      <p className=\"text-sm font-bold text-foreground\">{format(monthlyPayment)}</p>\n                    </div>\n                    <div className=\"border-t border-border pt-3\">\n                      <p className=\"text-xs text-muted-foreground mb-1\">Applicant</p>\n                      <p className=\"text-sm font-bold text-foreground\">{formData.firstName} {formData.lastName}</p>\n                      <p className=\"text-xs text-muted-foreground mt-1\">{formData.email} • {formData.phone}</p>\n                    </div>\n                  </div>\n\n                  <div className=\"bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3\">\n                    <Info className=\"w-5 h-5 text-primary flex-shrink-0 mt-0.5\" />\n                    <div>\n                      <p className=\"text-xs font-bold text-primary mb-1\">By submitting this application</p>\n                      <p className=\"text-xs text-primary/80 leading-relaxed\">\n                        You agree to our terms and conditions. We'll review your application and contact you within 24 hours with a decision.\n                      </p>\n                    </div>\n                  </div>\n                </div>\n              )}\n\n              {/* Navigation Buttons */}\n              <div className=\"flex gap-3 mb-6\">\n                {currentStep > 1 && (\n                  <button\n                    type=\"button\"\n                    onClick={() => setCurrentStep(currentStep - 1)}\n                    className=\"flex-1 py-3 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors\"\n                  >\n                    Previous\n                  </button>\n                )}\n                {currentStep < 4 ? (\n                  <button\n                    type=\"button\"\n                    onClick={() => {\n                      if (currentStep === 1 && !selectedPlan) return;\n                      if (currentStep === 2 && !selectedAmount) return;\n                      setCurrentStep(currentStep + 1);\n                    }}\n                    disabled={(\n                      (currentStep === 1 && !selectedPlan) ||\n                      (currentStep === 2 && !selectedAmount)\n                    )}\n                    className=\"flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed\"\n                  >\n                    Next\n                  </button>\n                ) : (\n                  <button\n                    type=\"submit\"\n                    disabled={isSubmitting}\n                    className=\"flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2\"\n                  >\n                    {isSubmitting ? (\n                      <>\n                        <Loader2 className=\"w-4 h-4 animate-spin\" /> Submitting...\n                      </>\n                    ) : (\n                      <>\n                        <Check className=\"w-4 h-4\" /> Submit Application\n                      </>\n                    )}\n                  </button>\n                )}\n              </div>\n            </form>\n          </>\n        )}\n      </div>\n    </div>\n  );\n}\n
