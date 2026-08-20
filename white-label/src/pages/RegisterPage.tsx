import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", password: "" });
  const navigate = useNavigate();

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate registration
    await new Promise((r) => setTimeout(r, 1000));
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">RP</span>
            </div>
            <span className="text-xl font-bold gradient-text">ResellerPro</span>
          </Link>
          <h1 className="text-2xl font-bold">Start Your SaaS Business</h1>
          <p className="text-gray-400 mt-1">Join 500+ successful resellers</p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-400"
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? "bg-indigo-500" : "bg-white/5"}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-5">
          {step === 1 ? (
            <>
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input id="reg-name" name="name" type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Rahul Sharma" className="input-field" required />
              </div>
              <div>
                <label htmlFor="reg-company" className="block text-sm font-medium text-gray-300 mb-1.5">Company Name</label>
                <input id="reg-company" name="company" type="text" value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="My Digital Agency" className="input-field" required />
              </div>
              <div>
                <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
                <input id="reg-phone" name="phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 9876543210" className="input-field" />
              </div>
              <button type="button" onClick={() => setStep(2)} className="glow-btn w-full py-3 inline-flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input id="reg-email" name="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" className="input-field" required />
              </div>
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <input id="reg-password" name="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 8 characters" className="input-field" minLength={8} required />
              </div>
              <button type="submit" className="glow-btn w-full py-3 inline-flex items-center justify-center gap-2">
                Create Account <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-400 hover:text-white">← Back</button>
            </>
          )}

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
