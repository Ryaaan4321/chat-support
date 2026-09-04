'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, ApiError } from '@/lib/api';
import { Headphones, ShieldCheck, UserCheck, Check, ArrowRight, Loader2 } from 'lucide-react';

const AVATAR_OPTIONS = [
  { id: 'avatar-1', src: '/avatars/avatar-1.png', label: 'Persona 1' },
  { id: 'avatar-2', src: '/avatars/avatar-2.png', label: 'Persona 2' },
  { id: 'avatar-3', src: '/avatars/avatar-3.png', label: 'Persona 3' },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'AGENT' | 'MANAGER' | 'CUSTOMER'>('AGENT');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [managerKey, setManagerKey] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('/avatars/avatar-1.png');
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
        const cleanEmail = email.trim() || 'sarah.agent@swish.internal';
        await api.auth.loginAgent({ email: cleanEmail });
        handleRedirect('AGENT');
      } else if (role === 'MANAGER') {
        const cleanEmail = email.trim() || 'alex.lead@swish.internal';
        const key = managerKey.trim() || 'swish-manager-super-secret-2026';
        await api.auth.loginManager({ email: cleanEmail, password: key });
        handleRedirect('MANAGER');
      } else {
        const cleanEmail = email.trim() || 'customer-101';
        await api.auth.createCustomerSession({ customerId: cleanEmail });
        handleRedirect('CUSTOMER');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Full name is required');
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email address is required');
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
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Registration failed. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: 'AGENT' | 'MANAGER' | 'CUSTOMER') => {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (demoRole === 'AGENT') {
        await api.auth.loginAgent({ email: 'sarah.agent@swish.internal' });
        handleRedirect('AGENT');
      } else if (demoRole === 'MANAGER') {
        await api.auth.loginManager({
          email: 'alex.lead@swish.internal',
          password: 'swish-manager-super-secret-2026',
        });
        handleRedirect('MANAGER');
      } else {
        await api.auth.createCustomerSession({ customerId: 'cust-demo-1' });
        handleRedirect('CUSTOMER');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Demo sign in failed.');
      }
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
                        ? 'sarah.agent@swish.internal'
                        : role === 'MANAGER'
                        ? 'alex.lead@swish.internal'
                        : 'cust-101'
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                  />
                </div>

                {role === 'MANAGER' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Manager Passkey
                    </label>
                    <input
                      type="password"
                      value={managerKey}
                      onChange={(e) => setManagerKey(e.target.value)}
                      placeholder="swish-manager-super-secret-2026"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                    />
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
                  <div className="grid grid-cols-3 gap-3">
                    {AVATAR_OPTIONS.map((av) => {
                      const isSelected = selectedAvatar === av.src;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setSelectedAvatar(av.src)}
                          className={`relative flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="w-14 h-14 relative rounded-full overflow-hidden bg-slate-100 mb-1">
                            <Image
                              src={av.src}
                              alt={av.label}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                          <span className="text-[11px] font-medium text-slate-600">
                            {av.label}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
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

            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-600 text-center mb-3">
                Quick Demo Accounts
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('AGENT')}
                  className="py-1.5 px-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors text-center truncate"
                >
                  Agent Sarah
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('MANAGER')}
                  className="py-1.5 px-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors text-center truncate"
                >
                  Manager Alex
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('CUSTOMER')}
                  className="py-1.5 px-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors text-center truncate"
                >
                  Customer Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
