import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Check, AlertCircle, Loader2,
  User, MapPin, Globe,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { API_BASE } from "@/lib/api";

export default function WholesaleCheckoutPage() {
  const [, setLocation] = useLocation();
  const { user, token } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    state: "",
    country: "",
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          // Sending dummy data for required backend fields if any
          companyName: `${formData.firstName} ${formData.lastName}`,
          businessType: "retailer",
          email: user?.email || "",
          phone: "0000000000",
          address: `${formData.state}, ${formData.country}`,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-black text-foreground">Wholesale Application</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {submitSuccess ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Application Submitted!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your application has been submitted successfully.
            </p>
          </div>
        ) : (
          <>
            {submitError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-600">Error</p>
                  <p className="text-xs text-red-600/80 mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> First Name
                  </label>
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
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> Last Name
                  </label>
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
                  <MapPin className="w-3 h-3" /> Province / State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleFormChange}
                  required
                  placeholder="Enter state"
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleFormChange}
                  required
                  placeholder="Enter country"
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-primary text-white rounded-xl text-sm font-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
