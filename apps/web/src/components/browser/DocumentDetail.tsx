import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Trash2,
  Edit3,
  Save,
  X,
  FileText,
  File,
  ChevronRight,
} from 'lucide-react';
import type { DocumentWithJurisdictions } from '@lexvault/shared';
import { useDocumentStore } from '../../stores/documentStore';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface DocumentDetailProps {
  documentId: string;
}

export function DocumentDetail({ documentId }: DocumentDetailProps) {
  const navigate = useNavigate();
  const {
    currentDocument,
    isLoadingDetail,
    error,
    fetchDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
  } = useDocumentStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDocument(documentId);
  }, [documentId, fetchDocument]);

  useEffect(() => {
    if (currentDocument) {
      setEditTitle(currentDocument.title);
      setEditDescription(currentDocument.description || '');
      setEditTags(currentDocument.tags.join(', '));
    }
  }, [currentDocument]);

  const handleSave = async () => {
    if (!currentDocument) return;
    setIsSaving(true);
    try {
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      await updateDocument(currentDocument.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        tags,
      });
      setIsEditing(false);
    } catch {
      // Error handled by store
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentDocument) return;
    setIsDeleting(true);
    try {
      await deleteDocument(currentDocument.id);
      navigate('/documents');
    } catch {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    if (currentDocument) {
      setEditTitle(currentDocument.title);
      setEditDescription(currentDocument.description || '');
      setEditTags(currentDocument.tags.join(', '));
    }
    setIsEditing(false);
  };

  if (isLoadingDetail) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  if (!currentDocument) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-gray-600">Document not found.</p>
        <Button variant="secondary" onClick={() => navigate('/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const doc = currentDocument;
  const isPdf = doc.fileType === 'pdf';

  // Build jurisdiction breadcrumbs
  const jurisdictionBreadcrumbs = buildBreadcrumbs(doc);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/documents')}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {isPdf ? (
            <FileText className="h-8 w-8 flex-shrink-0 text-red-500" />
          ) : (
            <File className="h-8 w-8 flex-shrink-0 text-blue-500" />
          )}
          <div>
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-semibold"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {doc.originalFilename} &middot;{' '}
              {formatSize(doc.fileSizeBytes)} &middot;{' '}
              Uploaded {formatDate(doc.uploadedAt)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadDocument(doc.id, doc.originalFilename)
                }
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Jurisdiction breadcrumbs */}
      {jurisdictionBreadcrumbs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {jurisdictionBreadcrumbs.map((crumbs, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <span className="mx-2 text-gray-300">|</span>}
              {crumbs.map((crumb, j) => (
                <React.Fragment key={j}>
                  {j > 0 && (
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  )}
                  <span
                    className={
                      j === crumbs.length - 1
                        ? 'font-medium text-gray-900'
                        : 'text-gray-500'
                    }
                  >
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Description */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Description
            </h3>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Add a description..."
              />
            ) : (
              <p className="text-sm text-gray-600">
                {doc.description || 'No description provided.'}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Tags</h3>
            {isEditing ? (
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Comma-separated tags"
                helperText="Separate tags with commas"
              />
            ) : doc.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {doc.tags.map((tag) => (
                  <Badge key={tag} label={tag} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No tags.</p>
            )}
          </div>

          {/* Document preview */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Preview
            </h3>
            {isPdf ? (
              <div className="overflow-hidden rounded border border-gray-200">
                <object
                  data={`/api/documents/${doc.id}/download`}
                  type="application/pdf"
                  className="h-[600px] w-full"
                >
                  <iframe
                    src={`/api/documents/${doc.id}/download`}
                    className="h-[600px] w-full"
                    title="PDF Preview"
                  >
                    <p className="p-4 text-sm text-gray-500">
                      Your browser does not support PDF preview.{' '}
                      <button
                        onClick={() =>
                          downloadDocument(doc.id, doc.originalFilename)
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Download instead
                      </button>
                    </p>
                  </iframe>
                </object>
              </div>
            ) : (
              <div className="max-h-96 overflow-auto rounded border border-gray-200 bg-gray-50 p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {doc.contentText || 'No text content available.'}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">File Type</dt>
                <dd className="font-medium uppercase text-gray-900">
                  {doc.fileType}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">File Size</dt>
                <dd className="font-medium text-gray-900">
                  {formatSize(doc.fileSizeBytes)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Original Filename</dt>
                <dd className="break-all font-medium text-gray-900">
                  {doc.originalFilename}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Uploaded</dt>
                <dd className="font-medium text-gray-900">
                  {formatDate(doc.uploadedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="font-medium text-gray-900">
                  {formatDate(doc.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Jurisdictions
            </h3>
            {doc.jurisdictions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {doc.jurisdictions.map((j) => (
                  <Badge key={j.id} label={j.name} level={j.level} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No jurisdictions assigned.</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Document"
      >
        <p className="mb-4 text-sm text-gray-600">
          Are you sure you want to delete <strong>{doc.title}</strong>? This
          document will be moved to trash and permanently deleted after 30 days.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Helper functions

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

function buildBreadcrumbs(doc: DocumentWithJurisdictions): string[][] {
  const crumbs: string[][] = [];
  const federalJ = doc.jurisdictions.find((j) => j.level === 'federal');
  const provinces = doc.jurisdictions.filter(
    (j) => j.level === 'provincial' || j.level === 'territorial'
  );
  const municipalities = doc.jurisdictions.filter(
    (j) => j.level === 'municipal'
  );

  if (federalJ) {
    crumbs.push(['Canada']);
  }

  provinces.forEach((prov) => {
    const provMunis = municipalities.filter((m) => m.parentId === prov.id);
    if (provMunis.length > 0) {
      provMunis.forEach((m) => {
        crumbs.push(['Canada', prov.name, m.name]);
      });
    } else {
      crumbs.push(['Canada', prov.name]);
    }
  });

  // Orphan municipalities (no parent province in the selections)
  const coveredMuniIds = new Set(
    provinces.flatMap((prov) =>
      municipalities.filter((m) => m.parentId === prov.id).map((m) => m.id)
    )
  );
  municipalities
    .filter((m) => !coveredMuniIds.has(m.id))
    .forEach((m) => {
      crumbs.push(['Canada', '...', m.name]);
    });

  return crumbs;
}
