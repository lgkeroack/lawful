import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  File,
  Trash2,
  Download,
} from 'lucide-react';
import { useDocumentStore } from '../../stores/documentStore';
import type { DocumentQueryParams } from '@lexvault/shared';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';

type SortField = 'title' | 'uploaded_at' | 'file_size_bytes';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-blue-500" />;
}

export function DocumentList() {
  const navigate = useNavigate();
  const {
    documents,
    pagination,
    queryParams,
    isLoading,
    error,
    fetchDocuments,
    setQueryParams,
    deleteDocument,
    downloadDocument,
  } = useDocumentStore();

  const [searchInput, setSearchInput] = useState(queryParams.search || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [jurisdictionFilter, setJurisdictionFilter] = useState(
    queryParams.jurisdictionLevel || ''
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setQueryParams({ search: searchInput, page: 1 });
    },
    [searchInput, setQueryParams]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      const isSameField = queryParams.sortBy === field;
      const newOrder =
        isSameField && queryParams.sortOrder === 'asc' ? 'desc' : 'asc';
      setQueryParams({ sortBy: field, sortOrder: newOrder, page: 1 });
    },
    [queryParams.sortBy, queryParams.sortOrder, setQueryParams]
  );

  const handleJurisdictionFilter = useCallback(
    (level: string) => {
      setJurisdictionFilter(level);
      setQueryParams({ jurisdictionLevel: level || undefined, page: 1 });
    },
    [setQueryParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setQueryParams({ page });
    },
    [setQueryParams]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  }, [selectedIds, documents]);

  const handleBulkDelete = useCallback(async () => {
    if (!window.confirm(`Delete ${selectedIds.size} document(s)?`)) return;
    for (const id of selectedIds) {
      await deleteDocument(id);
    }
    setSelectedIds(new Set());
  }, [selectedIds, deleteDocument]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (queryParams.sortBy !== field) return null;
    return queryParams.sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
            />
          </div>
          <Button type="submit" variant="secondary" size="md">
            Search
          </Button>
        </form>

        <select
          value={jurisdictionFilter}
          onChange={(e) => handleJurisdictionFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Jurisdictions</option>
          <option value="federal">Federal</option>
          <option value="provincial">Provincial</option>
          <option value="territorial">Territorial</option>
          <option value="municipal">Municipal</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} selected
          </span>
          <Button
            variant="danger"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : documents.length === 0 ? (
        /* Empty state */
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="mb-1 text-lg font-medium text-gray-900">
            No documents found
          </h3>
          <p className="text-sm text-gray-500">
            {queryParams.search
              ? 'Try adjusting your search or filters.'
              : 'Upload your first document to get started.'}
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      documents.length > 0 &&
                      selectedIds.size === documents.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => handleSort('title')}
                >
                  Title
                  <SortIcon field="title" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Jurisdictions
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => handleSort('uploaded_at')}
                >
                  Uploaded
                  <SortIcon field="uploaded_at" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => handleSort('file_size_bytes')}
                >
                  Size
                  <SortIcon field="file_size_bytes" />
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className={`
                    border-b border-gray-100 transition-colors hover:bg-gray-50
                    ${selectedIds.has(doc.id) ? 'bg-blue-50' : ''}
                  `}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {doc.title}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <FileIcon type={doc.fileType} />
                      <span className="uppercase text-gray-600">
                        {doc.fileType}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {doc.jurisdictions.slice(0, 3).map((j) => (
                        <Badge
                          key={j.id}
                          label={j.code || j.name}
                          level={j.level}
                        />
                      ))}
                      {doc.jurisdictions.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{doc.jurisdictions.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {formatSize(doc.fileSizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        downloadDocument(doc.id, doc.originalFilename)
                      }
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing{' '}
            {(pagination.page - 1) * pagination.pageSize + 1}
            {' '}-{' '}
            {Math.min(
              pagination.page * pagination.pageSize,
              pagination.totalItems
            )}{' '}
            of {pagination.totalItems}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((page) => {
                const current = pagination.page;
                return (
                  page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - current) <= 1
                );
              })
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="px-1 text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(page)}
                    className={`
                      h-8 min-w-[32px] rounded-md px-2 text-sm
                      ${
                        page === pagination.page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
