import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product, UsagePeriod } from '../supabase'

interface FavoritesState {
  favorites: Product[]
  favoritesWithUsage: Record<string, { frequency: number; period: UsagePeriod }>
  searchHistory: Product[]
  loading: boolean
  addFavorite: (product: Product, usage?: { frequency: number; period: UsagePeriod }) => Promise<void>
  removeFavorite: (productId: string) => Promise<void>
  updateFavoriteUsage: (productId: string, usage: { frequency: number; period: UsagePeriod }) => void
  addToSearchHistory: (products: Product[]) => void
  removeFromSearchHistory: (productId: string) => void
  clearSearchHistory: () => void
  isFavorite: (productId: string) => boolean
  isInSearchHistory: (productId: string) => boolean
  loadFavorites: () => Promise<void>
  clearFavorites: () => void
  getFavoriteUsage: (productId: string) => { frequency: number; period: UsagePeriod } | null
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      favoritesWithUsage: {},
      searchHistory: [],
      loading: false,
      
      addFavorite: async (product: Product, usage = { frequency: 1, period: 'month' as UsagePeriod }) => {
        set({ loading: true })
        try {
          set((state) => {
            // Insert product in alphabetical order by Product Name
            const newFavorites = [...state.favorites, product].sort((a, b) => {
              const nameA = (a["Product Name"] || '').toLowerCase()
              const nameB = (b["Product Name"] || '').toLowerCase()
              return nameA.localeCompare(nameB)
            })

            return {
              favorites: newFavorites,
              favoritesWithUsage: {
                ...state.favoritesWithUsage,
                [product.id]: usage
              },
              loading: false,
            }
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      removeFavorite: async (productId: string) => {
        set({ loading: true })
        try {
          set((state) => {
            const newUsage = { ...state.favoritesWithUsage }
            delete newUsage[productId]
            
            return {
              favorites: state.favorites.filter((p) => p.id !== productId),
              favoritesWithUsage: newUsage,
              loading: false,
            }
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      updateFavoriteUsage: (productId: string, usage: { frequency: number; period: UsagePeriod }) => {
        set((state) => ({
          favoritesWithUsage: {
            ...state.favoritesWithUsage,
            [productId]: usage
          }
        }))
      },

      addToSearchHistory: (products: Product[]) => {
        set((state) => {
          const existingIds = new Set(state.searchHistory.map(p => p.id))
          const newProducts = products.filter(product => !existingIds.has(product.id))
          return {
            searchHistory: [...state.searchHistory, ...newProducts]
          }
        })
      },

      removeFromSearchHistory: (productId: string) => {
        set((state) => ({
          searchHistory: state.searchHistory.filter(p => p.id !== productId)
        }))
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] })
      },

      isFavorite: (productId: string) => {
        return get().favorites.some((p) => p.id === productId)
      },

      isInSearchHistory: (productId: string) => {
        return get().searchHistory.some((p) => p.id === productId)
      },

      loadFavorites: async () => {
        set({ loading: true })
        try {
          // For local storage version, favorites are automatically loaded by persist middleware
          // But we need to sort them alphabetically
          set((state) => ({
            favorites: [...state.favorites].sort((a, b) => {
              const nameA = (a["Product Name"] || '').toLowerCase()
              const nameB = (b["Product Name"] || '').toLowerCase()
              return nameA.localeCompare(nameB)
            }),
            loading: false
          }))
        } catch (error) {
          console.error('Error loading favorites:', error)
          set({ favorites: [], favoritesWithUsage: {}, searchHistory: [], loading: false })
        }
      },

      clearFavorites: () => {
        set({ favorites: [], favoritesWithUsage: {} })
      },

      getFavoriteUsage: (productId: string) => {
        return get().favoritesWithUsage[productId] || null
      },
    }),
    {
      name: 'favorites-storage', // unique name for localStorage key
    }
  )
)