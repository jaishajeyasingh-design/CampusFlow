import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { extractApiErrorMessage } from '../services/api';
import type { SystemRole } from '../types';

import { Sparkles, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [raNumber, setRaNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [systemRole, setSystemRole] = useState<SystemRole>('STUDENT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearError = () => {
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanDept = department.trim();

    // 1. Full name validation
    if (!cleanFullName || cleanFullName.length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g., student@campusflow.edu).');
      return;
    }

    // 3. Password validation
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // 4. Role-specific validation
    let cleanRa: string | null = null;
    if (systemRole === 'STUDENT') {
      cleanRa = raNumber.trim().toUpperCase();
      if (!cleanRa) {
        setError('RA Number is mandatory for Student registration.');
        return;
      }
      if (!/^[A-Z0-9]{15}$/.test(cleanRa)) {
        setError('RA Number must be exactly 15 alphanumeric characters (e.g., RA2311003010001).');
        return;
      }
    }

    setLoading(true);
    try {
      await register({
        email: cleanEmail.toLowerCase(),
        password,
        full_name: cleanFullName,
        system_role: systemRole,
        ra_number: systemRole === 'STUDENT' ? cleanRa : null,
        department: cleanDept || null,
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMsg = extractApiErrorMessage(err, 'Registration failed. Please check inputs and try again.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const isDuplicateError = error && (
    error.toLowerCase().includes('already registered') ||
    error.toLowerCase().includes('already exists')
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white p-7 rounded-xl border border-slate-200 shadow-sm z-10">
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Create Account</h1>
          <p className="text-xs text-slate-500 mt-0.5">Register for CampusFlow</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <span>{error}</span>
              {isDuplicateError && (
                <div className="mt-1 pt-1 border-t border-rose-200/60">
                  <Link to="/login" className="text-blue-700 hover:text-blue-800 underline font-semibold">
                    Sign in to your existing account &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              disabled={loading}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError();
              }}
              required
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              disabled={loading}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              required
              placeholder="e.g. john@campusflow.edu"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">System Role</label>
            <select
              value={systemRole}
              disabled={loading}
              onChange={(e) => {
                setSystemRole(e.target.value as SystemRole);
                clearError();
              }}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs disabled:opacity-60 disabled:bg-slate-50"
            >
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="CLUB_ADMIN">Club Admin</option>
            </select>
          </div>

          {systemRole === 'STUDENT' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>15-Character RA Number</span>
                <span className="text-[10px] text-blue-600 font-normal">Alphanumeric</span>
              </label>
              <input
                type="text"
                value={raNumber}
                disabled={loading}
                onChange={(e) => {
                  setRaNumber(e.target.value.toUpperCase());
                  clearError();
                }}
                maxLength={15}
                required
                placeholder="RA2311003010099"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs font-mono tracking-wider uppercase disabled:opacity-60 disabled:bg-slate-50"
              />
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Department</label>
            <input
              type="text"
              value={department}
              disabled={loading}
              onChange={(e) => {
                setDepartment(e.target.value);
                clearError();
              }}
              required
              placeholder="e.g. Computer Science & Engineering"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              disabled={loading}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-white text-xs shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

