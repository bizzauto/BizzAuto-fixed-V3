import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore.getState();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const businessId = searchParams.get('businessId');
    const error = searchParams.get('error');

    if (error) {
      console.error('[AuthCallback] Error:', error);
      navigate('/login?error=' + error, { replace: true });
      return;
    }

    if (token && userId) {
      try {
        const store = useAuthStore.getState();
        store.setUser({
          id: userId,
          name: name || '',
          email: email || '',
          role: (role as any) || 'USER',
          businessId: businessId || undefined,
        } as any);
        store.setTokens(token, refreshToken || '');

        // Sync onboarding/admission flags from localStorage
        const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
        const admissionCompleted = localStorage.getItem('admissionCompleted') === 'true';
        if (onboardingCompleted) store.setOnboardingCompleted(true);
        if (admissionCompleted) store.setAdmissionCompleted(true);

        const redirectPath = role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
        navigate(redirectPath, { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Failed:', err);
        navigate('/login?error=auth_failed', { replace: true });
      }
    } else {
      navigate('/login?error=no_token', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
