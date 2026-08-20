import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';

type VerificationStatus = 'loading' | 'success' | 'error' | 'resend';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const urlToken = searchParams.get('token');

      if (urlToken) {
        // Verify email with token from URL
        try {
          const res = await fetch(`/api/auth/verify-email?token=${urlToken}`);
          const data = await res.json();

          if (data.success) {
            setStatus('success');
            setMessage('Email verified successfully! You can now access all features.');
          } else {
            setStatus('error');
            setMessage(data.error || 'Invalid or expired verification token');
          }
        } catch {
          setStatus('error');
          setMessage('Failed to verify email. Please try again.');
        }
      } else if (token) {
        // Check verification status for logged-in users
        try {
          const res = await fetch('/api/auth/verification-status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();

          if (data.success && data.data.verified) {
            setStatus('success');
            setMessage('Your email is already verified!');
          } else {
            setStatus('resend');
          }
        } catch {
          setStatus('resend');
        }
      } else {
        setStatus('resend');
      }
    };

    verifyToken();
  }, [searchParams, token]);

  const handleResend = async () => {
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage('Verification email sent! Check your inbox.');
      } else {
        setMessage(data.error || 'Failed to send verification email');
      }
    } catch {
      setMessage('Failed to send verification email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Header */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">
              {status === 'success' ? '✅' : status === 'error' ? '❌' : '📧'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {status === 'success'
              ? 'Email Verified!'
              : status === 'error'
              ? 'Verification Failed'
              : 'Verify Your Email'}
          </h1>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-gray-600">{message}</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-red-600">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                Go to Login
              </button>
            </div>
          )}

          {/* Resend State */}
          {status === 'resend' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                {message || "Your email isn't verified yet. Enter your email to resend the verification link."}
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleResend}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                Send Verification Email
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full text-gray-600 py-2 hover:text-gray-800"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}