'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, ApiError } from '@/lib/api';
import { Headphones, ShieldCheck, UserCheck, Check, ArrowRight, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/desk/user-avatar';
import { CLOUDINARY_AVATARS } from '@/lib/avatars';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'AGENT' | 'MANAGER' | 'CUSTOMER'>('AGENT');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(CLOUDINARY_AVATARS[0].src);
  const [capacity, setCapacity] = useState(3);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRedirect = (userRole: 'AGENT' | 'MANAGER' | 'CUSTOMER') => {
    if (userRole === 'AGENT') {
      router.push('/agent');
    } else if (userRole === 'MANAGER') {
      router.push('/manager');
    } else {
      router.push('/customer');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (role === 'AGENT') {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
          setErrorMsg('Please enter your agent email address.');
          setLoading(false);
          return;
        }
        await api.auth.loginAgent({ email: cleanEmail });
        handleRedirect('AGENT');
      } else if (role === 'MANAGER') {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
          setErrorMsg('Please enter your manager email address.');
          setLoading(false);
          return;
        }
        await api.auth.loginManager({ email: cleanEmail });
        handleRedirect('MANAGER');
      } else {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
          setErrorMsg('Please enter your customer ID or name.');
          setLoading(false);
          return;
        }
        await api.auth.createCustomerSession({ customerId: cleanEmail });
        handleRedirect('CUSTOMER');
      }
    } catch (err: unknown) {
      const msg =
        (err instanceof ApiError && err.message && err.message !== '[object Object]') ? err.message :
        (err instanceof Error && err.message && err.message !== '[object Object]') ? err.message :
        'Sign in failed. Please check your credentials and try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Full name is required.');
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Valid email address is required.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.auth.signup({
        name: name.trim(),
        email: email.trim(),
        role,
        avatarUrl: selectedAvatar,
        chatCapacity: role === 'AGENT' ? capacity : undefined,
      });

      handleRedirect(res.user.role);
    } catch (err: unknown) {
      const msg =
        (err instanceof ApiError && err.message && err.message !== '[object Object]') ? err.message :
        (err instanceof Error && err.message && err.message !== '[object Object]') ? err.message :
        'Unable to complete registration. Please check your details and try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              S
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">Swish Desk</span>
          </div>
          <p className="text-sm text-slate-500 text-center">
            Unified Customer Support & Chat Operations
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/50 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-sm font-semibold rounded-xl transition-all ${
                tab === 'signin'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-sm font-semibold rounded-xl transition-all ${
                tab === 'signup'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-6">
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('AGENT')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    role === 'AGENT'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Headphones className="w-5 h-5 mb-1 text-blue-600" />
                  <span className="text-xs">Agent</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('MANAGER')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    role === 'MANAGER'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 mb-1 text-blue-600" />
                  <span className="text-xs">Manager</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    role === 'CUSTOMER'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <UserCheck className="w-5 h-5 mb-1 text-blue-600" />
                  <span className="text-xs">Customer</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                {errorMsg}
              </div>
            )}

            {tab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {role === 'CUSTOMER' ? 'Customer ID or Name' : 'Email Address'}
                  </label>
                  <input
                    type={role === 'CUSTOMER' ? 'text' : 'email'}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      role === 'AGENT'
                        ? 'agent@company.com'
                        : role === 'MANAGER'
                        ? 'manager@company.com'
                        : 'Enter your customer name or ID'
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maya@example.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Choose Profile Avatar
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {CLOUDINARY_AVATARS.map((av) => {
                      const isSelected = selectedAvatar === av.src;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setSelectedAvatar(av.src)}
                          className={`relative flex flex-col items-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/30'
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="mb-1">
                            <UserAvatar
                              src={av.src}
                              alt={av.label}
                              size="xl"
                              className="border-none shadow-none bg-slate-100/70"
                            />
                          </div>
                          <span className="text-[11px] font-medium text-slate-700 truncate max-w-full">
                            {av.label}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 size-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="size-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {role === 'AGENT' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Max Concurrent Chat Capacity
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 min-w-8 text-center">
                        {capacity}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}


          </div>
        </div>
      </div>
    </div>
  );
}
