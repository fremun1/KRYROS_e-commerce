import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Check, AlertCircle, Loader2, Building2, FileText,
  Phone, Mail, MapPin, Globe, Users, DollarSign, Info, Briefcase,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { API_BASE } from "@/lib/api";

interface ApplicationStep {
  id: number;
  label: string;
  description: string;
}

export default function WholesaleCheckoutPage() {
  const [, setLocation] = useLocation();
  const { user, token } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: "",
    businessType: "",
    registrationNumber: "",
    taxId: "",
    website: "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: "",
    jobTitle: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    businessPhone: "",
    businessEmail: "",
    annualRevenue: "",
    employeeCount: "",
    productCategories: "" as string,
    estimatedMonthlyOrder: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLocation("/login");
      return;
    }
  }, [token, setLocation]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`${API_BASE}/api/wholesale/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : null,
          estimatedMonthlyOrder: formData.estimatedMonthlyOrder ? parseFloat(formData.estimatedMonthlyOrder) : null,
          employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : null,
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
    { id: 1, label: "Company Info", description: "Tell us about your business" },
    { id: 2, label: "Contact Details", description: "Your contact information" },
    { id: 3, label: "Business Details", description: "Business specifics" },
    { id: 4, label: "Review & Submit", description: "Review and submit" },
  ];

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
          <h1 className="text-lg font-black text-foreground">Apply for Wholesale</h1>
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
              Your wholesale application has been submitted successfully. Our team will review it and contact you soon.
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
              {/* Step 1: Company Info */}
              {currentStep === 1 && (
                <div className="space-y-4 mb-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Company Information</h2>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Company Name
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Business Type</label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select business type</option>
                      <option value="retailer">Retailer</option>
                      <option value="distributor">Distributor</option>
                      <option value="reseller">Reseller</option>
                      <option value="corporate">Corporate Buyer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Registration Number</label>
                      <input
                        type="text"
                        name="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Tax ID</label>
                      <input
                        type="text"
                        name="taxId"
                        value={formData.taxId}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleFormChange}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Contact Details */}
              {currentStep === 2 && (
                <div className="space-y-4 mb-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Contact Information</h2>

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
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Job Title</label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
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
                      placeholder="+260966423719"
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
                </div>
              )}

              {/* Step 3: Business Details */}
              {currentStep === 3 && (
                <div className="space-y-4 mb-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Business Details</h2>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Annual Revenue (K)
                    </label>
                    <input
                      type="number"
                      name="annualRevenue"
                      value={formData.annualRevenue}
                      onChange={handleFormChange}
                      placeholder="e.g. 500000"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Employee Count
                    </label>
                    <input
                      type="number"
                      name="employeeCount"
                      value={formData.employeeCount}
                      onChange={handleFormChange}
                      placeholder="e.g. 10"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Product Categories of Interest
                    </label>
                    <input
                      type="text"
                      name="productCategories"
                      value={formData.productCategories}
                      onChange={handleFormChange}
                      placeholder="e.g. Smartphones, Laptops, Accessories"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Estimated Monthly Order (K)
                    </label>
                    <input
                      type="number"
                      name="estimatedMonthlyOrder"
                      value={formData.estimatedMonthlyOrder}
                      onChange={handleFormChange}
                      placeholder="e.g. 50000"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Additional Comments
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      rows={4}
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
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
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Company</h3>
                      <p className="text-sm font-bold text-foreground">{formData.companyName}</p>
                      <p className="text-xs text-muted-foreground">{formData.businessType} • {formData.registrationNumber || "No Reg #"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Contact</h3>
                        <p className="text-sm font-bold text-foreground">{formData.firstName} {formData.lastName}</p>
                        <p className="text-xs text-muted-foreground">{formData.jobTitle}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Reach</h3>
                        <p className="text-xs text-muted-foreground">{formData.email}</p>
                        <p className="text-xs text-muted-foreground">{formData.phone}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Business Scale</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-xs text-muted-foreground">Revenue: <span className="font-bold text-foreground">K{formData.annualRevenue || "0"}</span></p>
                        <p className="text-xs text-muted-foreground">Monthly Order: <span className="font-bold text-foreground">K{formData.estimatedMonthlyOrder || "0"}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-600/80 leading-relaxed">
                      By submitting, you agree to our wholesale terms and conditions. Our team will review your application within 2-3 business days.
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
                      (currentStep === 1 && (!formData.companyName || !formData.businessType)) ||
                      (currentStep === 2 && (!formData.firstName || !formData.lastName || !formData.jobTitle || !formData.email || !formData.phone || !formData.address || !formData.city))
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
