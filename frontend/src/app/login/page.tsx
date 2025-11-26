'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useOTP, setUseOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.requestVerification(email, true);
      setOtpSent(true);
      alert('OTP sent to your email! Check backend logs for the code.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.verifyOTP(email, otp);
      
      localStorage.setItem('user', JSON.stringify(response.user));
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(email, password);
      
      localStorage.setItem('user', JSON.stringify(response.user));
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 text-3xl font-bold mb-2">
            <span>💖</span>
            <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              JECRC Dating
            </span>
          </Link>
          <p className="text-gray-600">Welcome back! Log in to continue.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setUseOTP(false)}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                !useOTP
                  ? 'bg-purple-100 text-purple-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setUseOTP(true)}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                useOTP
                  ? 'bg-purple-100 text-purple-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              OTP Login
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {useOTP ? (
            // OTP Login Form
            !otpSent ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JECRC Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@jecrcu.edu.in"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOTPLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest text-gray-900 placeholder:text-gray-400"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Check backend logs for OTP code (console email provider)
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Login'}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-purple-600 hover:underline text-sm"
                >
                  Resend OTP
                </button>
              </form>
            )
          ) : (
            // Password Login Form
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JECRC Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@jecrcu.edu.in"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-purple-600 hover:underline font-semibold">
              Sign up
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          By logging in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-gray-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
