import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWhiteLabelStore } from "../lib/store";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useWhiteLabelStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Try again.");
    }
  };

  const fillDemo = () => {
    setEmail("demo@reseller.com");
    setPassword("demo123");
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
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-gray-400 mt-1">Sign in to your reseller dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input-field pr-10"
                required
                minLength={3}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="glow-btn w-full py-3 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center gap-3 text-sm">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300">Sign up</Link>
            </p>
            <button type="button" onClick={fillDemo} className="ml-auto text-xs text-gray-500 hover:text-indigo-400 transition-colors">
              Fill Demo Credentials
            </button>
          </div>
        </form>

        {/* Demo Info Card */}
        <div className="mt-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
          <p className="text-xs text-gray-400">
            <span className="text-indigo-300 font-medium">Demo:</span> Use any email & password to login.
            Or click "Fill Demo Credentials" above.
          </p>
        </div>
      </div>
    </div>
  );
}
