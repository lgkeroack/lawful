import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAuthStore } from '../../stores/authStore';
import { PASSWORD_MIN_LENGTH } from '@lexterrae/shared';

const PASSWORD_REQUIREMENTS = [
  { label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p: string) => p.length >= PASSWORD_MIN_LENGTH },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One digit', test: (p: string) => /\d/.test(p) },
  {
    label: 'One special character',
    test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
  },
];

export function RegisterForm() {
  const navigate = useNavigate();
  const { register, isLoading, error: storeError, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || storeError;

  const allRequirementsMet = useMemo(
    () => PASSWORD_REQUIREMENTS.every((r) => r.test(password)),
    [password]
  );

  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!displayName.trim()) {
      setLocalError('Display name is required.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Email is required.');
      return;
    }
    if (!allRequirementsMet) {
      setLocalError('Password does not meet all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      navigate('/documents', { replace: true });
    } catch {
      // Error is set by the store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Create account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Get started with Lex Terrae.
        </p>
      </div>

      <Input
        label="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name"
        required
        autoComplete="name"
      />

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Create a strong password"
        required
        autoComplete="new-password"
      />

      {/* Password Strength Requirements */}
      {password.length > 0 && (
        <div className="space-y-1.5 rounded-md bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600">Password requirements:</p>
          {PASSWORD_REQUIREMENTS.map((req) => {
            const isMet = req.test(password);
            return (
              <div
                key={req.label}
                className={`flex items-center gap-2 text-xs ${
                  isMet ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {isMet ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {req.label}
              </div>
            );
          })}
        </div>
      )}

      <Input
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm your password"
        required
        autoComplete="new-password"
        error={
          confirmPassword.length > 0 && !passwordsMatch
            ? 'Passwords do not match'
            : undefined
        }
      />

      {displayError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{displayError}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
        disabled={!allRequirementsMet || !passwordsMatch}
      >
        Create Account
      </Button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
