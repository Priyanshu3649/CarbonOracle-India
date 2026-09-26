import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { Leaf, Zap, ShieldCheck, Building } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    label: 'Admin (CarbonOracle)',
    email: 'admin@carbonoracle.com',
    password: 'password123',
    icon: ShieldCheck,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
  },
  {
    label: 'Seller (GreenX Corp)',
    email: 'seller@greenx.com',
    password: 'password123',
    icon: Building,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
  },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  const quickFill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-green/10 text-brand-green rounded-xl mb-4">
            <Leaf size={24} />
          </div>
          <h1 className="text-2xl font-bold text-brand-dark">Sign In to CarbonOracle</h1>
          <p className="text-gray-500 mt-2">Enter your credentials to access the platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* Demo Quick-Fill */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-amber-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Demo Accounts</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickFill(acc.email, acc.password)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${acc.color}`}
                >
                  <Icon size={13} />
                  {acc.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-100 mb-5" />

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-brand-dark text-white py-2 rounded-lg hover:bg-gray-800 transition-colors mt-2"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
