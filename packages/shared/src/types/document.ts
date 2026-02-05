import type { Jurisdiction } from './jurisdiction.js';

export type FileType = 'pdf' | 'txt';

export interface Document {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  fileKey: string;
  fileType: FileType;
  fileSizeBytes: number;
  originalFilename: string;
  contentText: string | null;
  tags: string[];
  uploadedAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DocumentWithJurisdictions extends Document {
  jurisdictions: Jurisdiction[];
}

export interface DocumentUploadRequest {
  title: string;
  description?: string;
  tags?: string[];
  jurisdictionIds: string[];
}

export interface DocumentUpdateRequest {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface DocumentQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  jurisdictionLevel?: string;
  jurisdictionId?: string;
  fileType?: FileType;
  sortBy?: 'title' | 'uploaded_at' | 'file_size_bytes';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
