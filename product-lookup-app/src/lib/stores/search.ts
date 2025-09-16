import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SearchState {
  searchHistory: string[]
  addToHistory: (query: string) => void
  clearHistory: () => void
  removeFromHistory: (query: string) => void
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      searchHistory: [],
      addToHistory: (query) =>
        set((state) => {
          const trimmedQuery = query.trim()
          if (!trimmedQuery) return state
          
          const newHistory = [trimmedQuery, ...state.searchHistory.filter(q => q !== trimmedQuery)]
          return {
            searchHistory: newHistory.slice(0, 10) // Keep only last 10 searches
          }
        }),
      clearHistory: () => set({ searchHistory: [] }),
      removeFromHistory: (query) =>
        set((state) => ({
          searchHistory: state.searchHistory.filter(q => q !== query),
        })),
    }),
    {
      name: 'product-lookup-smart-search-history',
    }
  )
)

