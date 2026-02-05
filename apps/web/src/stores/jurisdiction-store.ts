import { create } from 'zustand';
import type { JurisdictionTreeNode } from '@lexvault/shared';
import { api } from '../services/api';

interface JurisdictionState {
  jurisdictions: JurisdictionTreeNode[];
  selectedJurisdictions: Set<string>;
  isFederalSelected: boolean;
  activeProvince: string | null;
  isLoading: boolean;
  error: string | null;
}

interface JurisdictionActions {
  fetchJurisdictions: () => Promise<void>;
  toggleProvince: (jurisdictionId: string) => void;
  toggleMunicipality: (jurisdictionId: string) => void;
  toggleFederal: () => void;
  clearSelection: () => void;
  removeJurisdiction: (jurisdictionId: string) => void;
  setActiveProvince: (jurisdictionId: string | null) => void;
}

function findFederalId(jurisdictions: JurisdictionTreeNode[]): string | null {
  const federal = jurisdictions.find((j) => j.level === 'federal');
  return federal?.id ?? null;
}

export const useJurisdictionStore = create<JurisdictionState & JurisdictionActions>()(
  (set, get) => ({
    // ── State ──────────────────────────────────────────────────────
    jurisdictions: [],
    selectedJurisdictions: new Set<string>(),
    isFederalSelected: false,
    activeProvince: null,
    isLoading: false,
    error: null,

    // ── Actions ────────────────────────────────────────────────────

    fetchJurisdictions: async () => {
      set({ isLoading: true, error: null });
      try {
        const jurisdictions = await api.getJurisdictions();
        set({ jurisdictions, isLoading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to load jurisdictions',
          isLoading: false,
        });
      }
    },

    toggleProvince: (jurisdictionId: string) => {
      const { selectedJurisdictions } = get();
      const next = new Set(selectedJurisdictions);

      if (next.has(jurisdictionId)) {
        // Also remove all municipalities of this province
        const { jurisdictions } = get();
        const province = jurisdictions
          .flatMap((j) => (j.level === 'federal' ? [] : [j]))
          .find((j) => j.id === jurisdictionId);

        next.delete(jurisdictionId);
        if (province) {
          for (const child of province.children) {
            next.delete(child.id);
          }
        }
      } else {
        next.add(jurisdictionId);
      }

      set({ selectedJurisdictions: next });
    },

    toggleMunicipality: (jurisdictionId: string) => {
      const { selectedJurisdictions } = get();
      const next = new Set(selectedJurisdictions);

      if (next.has(jurisdictionId)) {
        next.delete(jurisdictionId);
      } else {
        next.add(jurisdictionId);
      }

      set({ selectedJurisdictions: next });
    },

    toggleFederal: () => {
      const { jurisdictions, isFederalSelected, selectedJurisdictions } = get();
      const federalId = findFederalId(jurisdictions);
      if (!federalId) return;

      const next = new Set(selectedJurisdictions);

      if (isFederalSelected) {
        next.delete(federalId);
      } else {
        next.add(federalId);
      }

      set({
        selectedJurisdictions: next,
        isFederalSelected: !isFederalSelected,
      });
    },

    clearSelection: () => {
      set({
        selectedJurisdictions: new Set<string>(),
        isFederalSelected: false,
      });
    },

    removeJurisdiction: (jurisdictionId: string) => {
      const { selectedJurisdictions, jurisdictions } = get();
      const next = new Set(selectedJurisdictions);
      next.delete(jurisdictionId);

      // Check if this was the federal jurisdiction
      const federalId = findFederalId(jurisdictions);
      const isFederalSelected = federalId ? next.has(federalId) : false;

      set({ selectedJurisdictions: next, isFederalSelected });
    },

    setActiveProvince: (jurisdictionId: string | null) => {
      set({ activeProvince: jurisdictionId });
    },
  }),
);
