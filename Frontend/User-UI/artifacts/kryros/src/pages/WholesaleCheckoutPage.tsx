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
    employeeCount: \"\",
    productCategories: \"\" as string,
    estimatedMonthlyOrder: \"\",
    description: \"\",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(\"\");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLocation(\"/login\");
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
    setSubmitError(\"\");

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
        throw new Error(err.message ?? \"Application submission failed\");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setLocation(\"/dashboard\");
      }, 2000);
    } catch (error: any) {
      setSubmitError(error.message ?? \"Something went wrong\");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps: ApplicationStep[] = [
    { id: 1, label: \"Company Info\", description: \"Tell us about your business\" },
    { id: 2, label: \"Contact Details\", description: \"Your contact information\" },
    { id: 3, label: \"Business Details\", description: \"Business specifics\" },
    { id: 4, label: \"Review & Submit\", description: \"Review and submit\" },
  ];

  return (
    <div className=\"min-h-screen bg-background\">
      {/* Header */}
      <div className=\"sticky top-0 z-20 bg-background border-b border-border\">
        <div className=\"max-w-2xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between\">
          <button
            onClick={() => setLocation(\"/dashboard\")}
            className=\"flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors\"
          >
            <ArrowLeft className=\"w-4 h-4\" /> Back
          </button>
          <h1 className=\"text-lg font-black text-foreground\">Apply for Wholesale</h1>
          <div className=\"w-16\" />
        </div>
      </div>

      <div className=\"max-w-2xl mx-auto px-4 md:px-6 py-6\">
        {submitSuccess ? (
          <div className=\"text-center py-12\">
            <div className=\"w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4\">
              <Check className=\"w-8 h-8 text-green-500\" />
            </div>
            <h2 className=\"text-2xl font-black text-foreground mb-2\">Application Submitted!</h2>
            <p className=\"text-sm text-muted-foreground mb-6\">
              Your wholesale application has been submitted successfully. Our team will review it and contact you soon.
            </p>
          </div>
        ) : (
          <>
            {/* Progress Steps */}
            <div className=\"mb-8\">
              <div className=\"flex items-center justify-between mb-4\">
                {steps.map((step, i) => (
                  <div key={step.id} className=\"flex items-center flex-1\">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        step.id < currentStep
                          ? \"bg-primary text-white\"
                          : step.id === currentStep
                          ? \"bg-primary text-white ring-4 ring-primary/20\"
                          : \"bg-muted text-muted-foreground\"
                      }`}
                    >
                      {step.id < currentStep ? <Check className=\"w-4 h-4\" /> : step.id}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 transition-colors ${
                          step.id < currentStep ? \"bg-primary\" : \"bg-border\"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className=\"flex justify-between\">
                {steps.map((step) => (
                  <div key={step.id} className=\"text-center flex-1\">
                    <p className=\"text-[10px] font-bold text-foreground\">{step.label}</p>
                    <p className=\"text-[9px] text-muted-foreground mt-0.5\">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {submitError && (
              <div className=\"mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3\">
                <AlertCircle className=\"w-5 h-5 text-red-500 flex-shrink-0 mt-0.5\" />
                <div>
                  <p className=\"text-sm font-bold text-red-600\">Error</p>
                  <p className=\"text-xs text-red-600/80 mt-0.5\">{submitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Company Info */}
              {currentStep === 1 && (
                <div className=\"space-y-4 mb-6\">
                  <h2 className=\"text-lg font-bold text-foreground mb-4\">Company Information</h2>

                  <div>
                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">
                      <Building2 className=\"w-3 h-3\" /> Company Name
                    </label>
                    <input
                      type=\"text\"
                      name=\"companyName\"
                      value={formData.companyName}
                      onChange={handleFormChange}
                      required
                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"
                    />
                  </div>

                  <div>
                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Business Type</label>
                    <select
                      name=\"businessType\"
                      value={formData.businessType}
                      onChange={handleFormChange}
                      required
                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"
                    >
                      <option value=\"\">Select business type</option>
                      <option value=\"retailer\">Retailer</option>
                      <option value=\"distributor\">Distributor</option>
                      <option value=\"reseller\">Reseller</option>
                      <option value=\"corporate\">Corporate Buyer</option>
                      <option value=\"other\">Other</option>
                    </select>
                  </div>

                  <div className=\"grid grid-cols-2 gap-3\">
                    <div>
                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Registration Number</label>
                      <input
                        type=\"text\"
                        name=\"registrationNumber\"
                        value={formData.registrationNumber}
                        onChange={handleFormChange}
                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"
                      />
                    </div>
                    <div>
                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Tax ID</label>
                      <input
                        type=\"text\"
                        name=\"taxId\"
                        value={formData.taxId}
                        onChange={handleFormChange}
                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"
                      />
                    </div>
                  </div>

                  <div>
                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">
                      <Globe className=\"w-3 h-3\" /> Website
                    </label>
                    <input
                      type=\"url\"
                      name=\"website\"
                      value={formData.website}
                      onChange={handleFormChange}
                      placeholder=\"https://example.com\"
                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Contact Details */}
              {currentStep === 2 && (
                <div className=\"space-y-4 mb-6\">
                  <h2 className=\"text-lg font-bold text-foreground mb-4\">Contact Information</h2>

                  <div className=\"grid grid-cols-2 gap-3\">
                    <div>
                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">First Name</label>
                      <input
                        type=\"text\"
                        name=\"firstName\"
                        value={formData.firstName}
                        onChange={handleFormChange}
                        required
                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"
                      />
                    </div>
                    <div>
                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Last Name</label>
                      <input
                        type=\"text\"
                        name=\"lastName\"
                        value={formData.lastName}
                        onChange={handleFormChange}
                        required
                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"
                      />
                    </div>
                  </div>

                  <div>
                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Job Title</label>
                    <input
                      type=\"text\"
                      name=\"jobTitle\"
                      value={formData.jobTitle}
                      onChange={handleFormChange}
                      required
                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"
                    />
                  </div>

                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <Mail className=\"w-3 h-3\" /> Email\n                    </label>\n                    <input\n                      type=\"email\"\n                      name=\"email\"\n                      value={formData.email}\n                      onChange={handleFormChange}\n                      required\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <Phone className=\"w-3 h-3\" /> Phone\n                    </label>\n                    <input\n                      type=\"tel\"\n                      name=\"phone\"\n                      value={formData.phone}\n                      onChange={handleFormChange}\n                      required\n                      placeholder=\"+260966423719\"\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <MapPin className=\"w-3 h-3\" /> Address\n                    </label>\n                    <input\n                      type=\"text\"\n                      name=\"address\"\n                      value={formData.address}\n                      onChange={handleFormChange}\n                      required\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div className=\"grid grid-cols-3 gap-3\">\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">City</label>\n                      <input\n                        type=\"text\"\n                        name=\"city\"\n                        value={formData.city}\n                        onChange={handleFormChange}\n                        required\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">State</label>\n                      <input\n                        type=\"text\"\n                        name=\"state\"\n                        value={formData.state}\n                        onChange={handleFormChange}\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Zip Code</label>\n                      <input\n                        type=\"text\"\n                        name=\"zipCode\"\n                        value={formData.zipCode}\n                        onChange={handleFormChange}\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Country</label>\n                    <input\n                      type=\"text\"\n                      name=\"country\"\n                      value={formData.country}\n                      onChange={handleFormChange}\n                      required\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n                </div>\n              )}\n\n              {/* Step 3: Business Details */}\n              {currentStep === 3 && (\n                <div className=\"space-y-4 mb-6\">\n                  <h2 className=\"text-lg font-bold text-foreground mb-4\">Business Details</h2>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <Phone className=\"w-3 h-3\" /> Business Phone\n                    </label>\n                    <input\n                      type=\"tel\"\n                      name=\"businessPhone\"\n                      value={formData.businessPhone}\n                      onChange={handleFormChange}\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <Mail className=\"w-3 h-3\" /> Business Email\n                    </label>\n                    <input\n                      type=\"email\"\n                      name=\"businessEmail\"\n                      value={formData.businessEmail}\n                      onChange={handleFormChange}\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div className=\"grid grid-cols-2 gap-3\">\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                        <DollarSign className=\"w-3 h-3\" /> Annual Revenue\n                      </label>\n                      <input\n                        type=\"number\"\n                        name=\"annualRevenue\"\n                        value={formData.annualRevenue}\n                        onChange={handleFormChange}\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                    <div>\n                      <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                        <Users className=\"w-3 h-3\" /> Employees\n                      </label>\n                      <input\n                        type=\"number\"\n                        name=\"employeeCount\"\n                        value={formData.employeeCount}\n                        onChange={handleFormChange}\n                        className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                      />\n                    </div>\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Product Categories of Interest</label>\n                    <input\n                      type=\"text\"\n                      name=\"productCategories\"\n                      value={formData.productCategories}\n                      onChange={handleFormChange}\n                      placeholder=\"e.g., Electronics, Appliances, Accessories\"\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2\">Estimated Monthly Order Value</label>\n                    <input\n                      type=\"number\"\n                      name=\"estimatedMonthlyOrder\"\n                      value={formData.estimatedMonthlyOrder}\n                      onChange={handleFormChange}\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30\"\n                    />\n                  </div>\n\n                  <div>\n                    <label className=\"block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1\">\n                      <FileText className=\"w-3 h-3\" /> Additional Information\n                    </label>\n                    <textarea\n                      name=\"description\"\n                      value={formData.description}\n                      onChange={handleFormChange}\n                      placeholder=\"Tell us more about your business and why you'd like to become a wholesale partner...\"\n                      rows={4}\n                      className=\"w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none\"\n                    />\n                  </div>\n                </div>\n              )}\n\n              {/* Step 4: Review & Submit */}\n              {currentStep === 4 && (\n                <div className=\"space-y-4 mb-6\">\n                  <h2 className=\"text-lg font-bold text-foreground mb-4\">Review Your Application</h2>\n\n                  <div className=\"bg-card border border-border rounded-2xl p-4 space-y-3\">\n                    <div>\n                      <p className=\"text-xs text-muted-foreground mb-1\">Company Name</p>\n                      <p className=\"text-sm font-bold text-foreground\">{formData.companyName}</p>\n                    </div>\n                    <div className=\"border-t border-border pt-3\">\n                      <p className=\"text-xs text-muted-foreground mb-1\">Business Type</p>\n                      <p className=\"text-sm font-bold text-foreground capitalize\">{formData.businessType}</p>\n                    </div>\n                    <div className=\"border-t border-border pt-3\">\n                      <p className=\"text-xs text-muted-foreground mb-1\">Contact Person</p>\n                      <p className=\"text-sm font-bold text-foreground\">{formData.firstName} {formData.lastName}</p>\n                      <p className=\"text-xs text-muted-foreground mt-1\">{formData.email} • {formData.phone}</p>\n                    </div>\n                    <div className=\"border-t border-border pt-3\">\n                      <p className=\"text-xs text-muted-foreground mb-1\">Location</p>\n                      <p className=\"text-sm font-bold text-foreground\">{formData.city}, {formData.state}, {formData.country}</p>\n                    </div>\n                  </div>\n\n                  <div className=\"bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3\">\n                    <Info className=\"w-5 h-5 text-primary flex-shrink-0 mt-0.5\" />\n                    <div>\n                      <p className=\"text-xs font-bold text-primary mb-1\">By submitting this application</p>\n                      <p className=\"text-xs text-primary/80 leading-relaxed\">\n                        You agree to our wholesale terms and conditions. We'll review your application and contact you within 2-3 business days with a decision.\n                      </p>\n                    </div>\n                  </div>\n                </div>\n              )}\n\n              {/* Navigation Buttons */}\n              <div className=\"flex gap-3 mb-6\">\n                {currentStep > 1 && (\n                  <button\n                    type=\"button\"\n                    onClick={() => setCurrentStep(currentStep - 1)}\n                    className=\"flex-1 py-3 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors\"\n                  >\n                    Previous\n                  </button>\n                )}\n                {currentStep < 4 ? (\n                  <button\n                    type=\"button\"\n                    onClick={() => setCurrentStep(currentStep + 1)}\n                    className=\"flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors\"\n                  >\n                    Next\n                  </button>\n                ) : (\n                  <button\n                    type=\"submit\"\n                    disabled={isSubmitting}\n                    className=\"flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2\"\n                  >\n                    {isSubmitting ? (\n                      <>\n                        <Loader2 className=\"w-4 h-4 animate-spin\" /> Submitting...\n                      </>\n                    ) : (\n                      <>\n                        <Check className=\"w-4 h-4\" /> Submit Application\n                      </>\n                    )}\n                  </button>\n                )}\n              </div>\n            </form>\n          </>\n        )}\n      </div>\n    </div>\n  );\n}\n
