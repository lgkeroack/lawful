import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, File, X, AlertCircle } from 'lucide-react';
import { useDocumentStore } from '../../stores/documentStore';
import { useJurisdictionStore } from '../../stores/jurisdictionStore';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { JurisdictionMap } from '../map/JurisdictionMap';
import { ProvinceDetail } from '../map/ProvinceDetail';
import { JurisdictionSummary } from '../map/JurisdictionSummary';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '@lexterrae/shared';

const ACCEPTED_EXTENSIONS = ['.pdf', '.txt'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
  return <File className="h-8 w-8 text-blue-500" />;
}

export function UploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const { uploadDocument, isUploading, uploadProgress, uploadError, clearUploadError } =
    useDocumentStore();
  const { selections, activeProvince } = useJurisdictionStore();

  const validateFile = useCallback((f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Only ${ACCEPTED_EXTENSIONS.join(', ')} files are allowed.`;
    }
    if (
      !ALLOWED_MIME_TYPES.includes(f.type as (typeof ALLOWED_MIME_TYPES)[number]) &&
      f.type !== ''
    ) {
      if (ext !== '.txt') {
        return `Invalid file type: ${f.type}. Only PDF and TXT files are allowed.`;
      }
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (${formatFileSize(f.size)}). Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (f: File) => {
      setFileError(null);
      clearUploadError();
      const error = validateFile(f);
      if (error) {
        setFileError(error);
        setFile(null);
        return;
      }
      setFile(f);
      if (!title) {
        const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    },
    [validateFile, title, clearUploadError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const removeFile = useCallback(() => {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!file) {
      setFormError('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setFormError('Please provide a title.');
      return;
    }
    if (title.length > MAX_TITLE_LENGTH) {
      setFormError(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
      return;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setFormError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
      return;
    }
    if (selections.length === 0) {
      setFormError('Please select at least one jurisdiction.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const jurisdictionIds = selections.map((s) => s.id);

    try {
      await uploadDocument(file, {
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        jurisdictionIds,
      });
      setUploadSuccess(true);
      setFile(null);
      setTitle('');
      setDescription('');
      setTagsInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // Error is handled by store
    }
  };

  if (uploadSuccess) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="rounded-lg border border-green-200 bg-green-50 p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Upload className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-green-900">
            Upload Successful
          </h3>
          <p className="mb-4 text-sm text-green-700">
            Your document has been uploaded and is ready for use.
          </p>
          <Button onClick={() => setUploadSuccess(false)}>
            Upload Another Document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {/* Drag and Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
        className={`
          cursor-pointer rounded-lg border-2 border-dashed p-8 text-center
          transition-colors
          ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={handleInputChange}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-4">
            {getFileIcon(file.type)}
            <div className="text-left">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.size)} &middot;{' '}
                {file.type || 'text/plain'}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="mb-1 text-sm font-medium text-gray-700">
              Drag and drop your file here
            </p>
            <p className="text-xs text-gray-500">
              or click to browse &middot; PDF or TXT only &middot; Max{' '}
              {MAX_FILE_SIZE_MB}MB
            </p>
          </>
        )}
      </div>

      {fileError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700">{fileError}</p>
        </div>
      )}

      {/* Metadata fields */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900">Document Details</h3>

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title"
          maxLength={MAX_TITLE_LENGTH}
          required
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </p>
        </div>

        <Input
          label="Tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Comma-separated tags (e.g., contract, lease, employment)"
          helperText="Separate tags with commas"
        />
      </div>

      {/* Jurisdiction Selection */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900">
          Jurisdiction Selection
        </h3>
        <p className="text-xs text-gray-500">
          Select which jurisdictions this document applies to.
        </p>

        {activeProvince ? <ProvinceDetail /> : <JurisdictionMap />}
        <JurisdictionSummary />
      </div>

      {/* Errors */}
      {(formError || uploadError) && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{formError || uploadError}</p>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Uploading...</span>
            <span className="font-medium text-blue-600">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          isLoading={isUploading}
          disabled={!file || isUploading}
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>
    </form>
  );
}
