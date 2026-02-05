import { create } from 'zustand';
import type { Document, DocumentQueryParams } from '@lexvault/shared';
import {
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_DEFAULT_PAGE_SIZE,
} from '@lexvault/shared';
import { api } from '../services/api';

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface DocumentState {
  documents: Document[];
  pagination: Pagination | null;
  filters: DocumentQueryParams;
  isLoading: boolean;
  error: string | null;
  selectedDocumentIds: Set<string>;
}

interface DocumentActions {
  fetchDocuments: () => Promise<void>;
  setFilters: (filters: Partial<DocumentQueryParams>) => void;
  toggleDocumentSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

export const useDocumentStore = create<DocumentState & DocumentActions>()(
  (set, get) => ({
    // ── State ──────────────────────────────────────────────────────
    documents: [],
    pagination: null,
    filters: {
      page: PAGINATION_DEFAULT_PAGE,
      pageSize: PAGINATION_DEFAULT_PAGE_SIZE,
      sortBy: 'uploaded_at',
      sortOrder: 'desc',
    },
    isLoading: false,
    error: null,
    selectedDocumentIds: new Set<string>(),

    // ── Actions ────────────────────────────────────────────────────

    fetchDocuments: async () => {
      const { filters } = get();
      set({ isLoading: true, error: null });

      try {
        const response = await api.getDocuments(filters);
        set({
          documents: response.data,
          pagination: response.pagination,
          isLoading: false,
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to fetch documents',
          isLoading: false,
        });
      }
    },

    setFilters: (newFilters: Partial<DocumentQueryParams>) => {
      const { filters, fetchDocuments } = get();
      const merged = { ...filters, ...newFilters };
      set({ filters: merged });

      // Automatically re-fetch when filters change
      void fetchDocuments();
    },

    toggleDocumentSelection: (id: string) => {
      const { selectedDocumentIds } = get();
      const next = new Set(selectedDocumentIds);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      set({ selectedDocumentIds: next });
    },

    selectAll: () => {
      const { documents } = get();
      const next = new Set(documents.map((d) => d.id));
      set({ selectedDocumentIds: next });
    },

    clearSelection: () => {
      set({ selectedDocumentIds: new Set<string>() });
    },
  }),
);
