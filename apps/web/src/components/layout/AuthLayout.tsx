import React from 'react';
import { MapPin } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Lex Terrae</h1>
          <p className="mt-1 text-sm text-gray-500">
            Canadian Legal Document Management
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg bg-white p-8 shadow-md">
          {children}
        </div>
      </div>
    </div>
  );
}
