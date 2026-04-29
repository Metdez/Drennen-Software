import { create } from "zustand";
import type { FilterChip } from "@/data/types";

interface AppState {
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilters: FilterChip[];
  toggleFilter: (chip: FilterChip) => void;
  rescheduledShipDates: Record<string, string>;
  rescheduleJob: (jobId: string, newDate: string) => void;
  resetReschedules: () => void;
  resetAll: () => void;
}

const initialState = {
  selectedJobId: null,
  searchQuery: "",
  activeFilters: [] as FilterChip[],
  rescheduledShipDates: {},
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setSelectedJobId: (id) => set({ selectedJobId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleFilter: (chip) =>
    set((state) => ({
      activeFilters: state.activeFilters.includes(chip)
        ? state.activeFilters.filter((activeChip) => activeChip !== chip)
        : [...state.activeFilters, chip],
    })),
  rescheduleJob: (jobId, newDate) =>
    set((state) => ({
      rescheduledShipDates: {
        ...state.rescheduledShipDates,
        [jobId]: newDate,
      },
    })),
  resetReschedules: () => set({ rescheduledShipDates: {} }),
  resetAll: () =>
    set({
      selectedJobId: initialState.selectedJobId,
      searchQuery: initialState.searchQuery,
      activeFilters: initialState.activeFilters,
      rescheduledShipDates: initialState.rescheduledShipDates,
    }),
}));

export const useSelectedJobId = (): string | null => useAppStore((state) => state.selectedJobId);
export const useSearchQuery = (): string => useAppStore((state) => state.searchQuery);
export const useActiveFilters = (): FilterChip[] => useAppStore((state) => state.activeFilters);
