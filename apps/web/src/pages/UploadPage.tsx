import React from 'react';
import { UploadPanel } from '../components/upload/UploadPanel';

export function UploadPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a PDF or TXT file and assign it to the relevant jurisdictions.
        </p>
      </div>
      <UploadPanel />
    </div>
  );
}
