import React from 'react';
import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { DocumentList } from '../components/browser/DocumentList';
import { Button } from '../components/common/Button';

export function DocumentsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <Link to="/upload">
          <Button>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </Link>
      </div>
      <DocumentList />
    </div>
  );
}

// Re-export as DocumentBrowserPage for backward compatibility with App.tsx
export { DocumentsPage as DocumentBrowserPage };
