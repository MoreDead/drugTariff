'use client'

import { useState } from 'react'
import React from 'react'
import { SearchForm, SearchCriteria } from '@/components/SearchForm'
import { ProductCard } from '@/components/ProductCard'
import { CSVImport } from '@/components/CSVImport'
import { AuthDialog } from '@/components/AuthDialog'
import { YearlyTotalSummary } from '@/components/YearlyTotalSummary'
import { FavoritesPanel } from '@/components/FavoritesPanel'
import { Product, ProductUsage, supabase } from '@/lib/supabase'
import { useFavoritesStore } from '@/lib/stores/favorites'
import { Database, Upload } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

export default function HomePage() {
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null)
  const [usageData, setUsageData] = useState<Record<string, ProductUsage>>({})
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const { favorites, loadFavorites, favoritesWithUsage, searchHistory, removeFromSearchHistory, isInSearchHistory } = useFavoritesStore()

  // Check if database has existing data
  const { data: productCount, isLoading: checkingData, refetch: refetchProductCount } = useQuery({
    queryKey: ['product-count'],
    queryFn: async () => {
      console.log('=== PRODUCT COUNT DEBUG ===')

      // Try different query approaches
      console.log('Attempting count query with head=true...')
      const countQuery = await supabase
        .from('product')
        .select('*', { count: 'exact', head: true })

      console.log('Count query result:', countQuery)
      console.log('Count:', countQuery.count)
      console.log('Count error:', countQuery.error)

      // Also try a simple select to see if we can read any data at all
      console.log('Attempting simple select query...')
      const selectQuery = await supabase
        .from('product')
        .select('id')
        .limit(1)

      console.log('Select query result:', selectQuery)
      console.log('Select data length:', selectQuery.data?.length)
      console.log('Select error:', selectQuery.error)

      if (countQuery.error) {
        console.error('Error checking product count:', countQuery.error)
        return 0
      }

      console.log('Final product count:', countQuery.count || 0)
      return countQuery.count || 0
    }
  })

  const hasExistingData = (productCount || 0) > 0


  const handleSearch = async (criteria: SearchCriteria) => {
    console.log('handleSearch called with criteria:', criteria)
    setSearchCriteria(criteria)

    // Clear previous search results
    setSelectedProducts([])

    try {
      const results = await performStructuredSearch(criteria)
      console.log('Search results:', results)
      if (results.length > 0) {
        handleSelectProducts(results)
      } else {
        console.log('No results found')
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  // New structured search function
  const performStructuredSearch = async (criteria: SearchCriteria): Promise<Product[]> => {
    try {
      let query = supabase.from('product').select('*')

      // Priority logic: if order number is provided, search only order numbers
      if (criteria.orderNumber) {
        console.log('Searching order numbers only:', criteria.orderNumber)
        query = query.ilike('"Order number"', `%${criteria.orderNumber}%`)
      } else {
        // Combined search logic
        console.log('Performing combined search:', criteria)

        // Product name search (if provided)
        if (criteria.productName) {
          const words = criteria.productName.trim().split(/\s+/).filter(word => word.length > 0)
          words.forEach(word => {
            query = query.ilike('"Product Name"', `%${word}%`)
          })
        }

        // Supplier filter (if provided)
        if (criteria.supplier) {
          query = query.eq('"Supplier"', criteria.supplier)
        }

        // Colour filter (if provided)
        if (criteria.colour) {
          query = query.eq('"Colour"', criteria.colour)
        }
      }

      const finalQuery = query.order('"Product Name"', { ascending: true }).limit(100)
      const { data, error } = await finalQuery

      if (error) {
        console.error('Structured search error:', error)
        return []
      }

      let finalResults = data || []

      // Additional filtering for product name search to ensure all words match
      if (!criteria.orderNumber && criteria.productName) {
        const words = criteria.productName.trim().split(/\s+/).filter(word => word.length > 0)
        finalResults = finalResults.filter(product => {
          const productName = (product["Product Name"] || '').toLowerCase()
          const lowerWords = words.map(w => w.toLowerCase())
          return lowerWords.every(word => productName.includes(word))
        })
      }

      console.log(`Structured search found ${finalResults.length} results`)
      return finalResults
    } catch (err) {
      console.error('Unexpected structured search error:', err)
      return []
    }
  }

  const handleSelectProducts = (products: Product[]) => {
    // Add selected products to the list (appears in main results)
    setSelectedProducts(prev => {
      const combined = [...prev]
      products.forEach(product => {
        // Avoid duplicates
        const exists = combined.some(p => p.id === product.id)
        if (!exists) {
          combined.push(product)
        }
      })
      return combined
    })
  }

  const handleDeleteFromSearch = (productId: string) => {
    removeFromSearchHistory(productId)
  }

  const handleUsageChange = (productId: string, usage: ProductUsage | null) => {
    setUsageData(prev => {
      if (usage === null || usage.frequency === 0) {
        const newData = { ...prev }
        delete newData[productId]
        return newData
      }
      return {
        ...prev,
        [productId]: usage
      }
    })
  }

  const handleCSVImportSuccess = () => {
    // Refetch product count after successful CSV import
    refetchProductCount()
  }

  // Load favorites from local storage on component mount
  React.useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // Sync usage data from local storage to local state
  React.useEffect(() => {
    const localUsageData: Record<string, ProductUsage> = {}
    Object.entries(favoritesWithUsage).forEach(([productId, usage]) => {
      localUsageData[productId] = {
        productId,
        frequency: usage.frequency,
        period: usage.period
      }
    })
    setUsageData(localUsageData)
  }, [favoritesWithUsage])

  // Combine favorites, search history, and selected products for display
  const displayedProducts = React.useMemo(() => {
    // Favorites should already be sorted alphabetically from the store
    const favoriteProducts = favorites || []

    // Add search history items that aren't already favorites (these have delete icons)
    const searchOnlyProducts = searchHistory.filter(searchProduct =>
      !favoriteProducts.some(fav => fav.id === searchProduct.id)
    )

    // Add selected products from popups that aren't already in favorites or search history
    const popupSelectedProducts = selectedProducts.filter(selectedProduct =>
      !favoriteProducts.some(fav => fav.id === selectedProduct.id) &&
      !searchOnlyProducts.some(search => search.id === selectedProduct.id)
    )

    // Combine all unfavorited products and sort them alphabetically
    const allUnfavoritedProducts = [...popupSelectedProducts, ...searchOnlyProducts].sort((a, b) => {
      const nameA = (a["Product Name"] || '').toLowerCase()
      const nameB = (b["Product Name"] || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })

    // Order: unfavorited products (alphabetically sorted) first, then favorites (alphabetically sorted)
    return [...allUnfavoritedProducts, ...favoriteProducts]
  }, [favorites, searchHistory, selectedProducts])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Product Lookup
              </h1>
              <p className="text-gray-600">
                Search for products by order number, name, or supplier
              </p>
            </div>
            <div>
              <AuthDialog />
            </div>
          </div>
        </div>


        {/* Data Status Indicator */}
        {checkingData && (
          <div className="flex justify-center mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-blue-800 text-sm">
                Checking database...
              </span>
            </div>
          </div>
        )}

        {!checkingData && hasExistingData && (
          <div className="flex justify-center mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-green-800 text-sm">
                Product database is ready with {productCount} products
              </span>
            </div>
          </div>
        )}

        {!checkingData && !hasExistingData && (
          <div className="flex justify-center mb-8">
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-6 py-4 flex flex-col items-center gap-4 max-w-md">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800 font-medium">
                  Database is empty
                </span>
              </div>
              <p className="text-orange-700 text-sm text-center">
                No products found in the database. Please import a CSV file to get started.
              </p>
              <CSVImport onImportSuccess={handleCSVImportSuccess} />
            </div>
          </div>
        )}

        {/* Search Form */}
        <div className="mb-8">
          <SearchForm
            onSearch={handleSearch}
          />
        </div>

        {/* Yearly Total Summary */}
        {favorites.length > 0 && (
          <YearlyTotalSummary products={favorites} usageData={usageData} />
        )}

        {/* Product Cards */}
        <div className="max-w-4xl mx-auto">
          {displayedProducts.length > 0 && (
            <div className="space-y-6">
              {displayedProducts.map((product) => {
                const isFavorite = favorites.some(f => f.id === product.id)
                const isInSearchHistoryFlag = isInSearchHistory(product.id)
                
                return (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onUsageChange={handleUsageChange}
                    onDelete={!isFavorite && isInSearchHistoryFlag ? handleDeleteFromSearch : undefined}
                    showDeleteIcon={!isFavorite && isInSearchHistoryFlag}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Instructions */}
        {displayedProducts.length === 0 && !checkingData && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                How to Use
              </h3>
              <p className="text-blue-800">
                Use the smart search above to find products. Enter an order number for direct lookup, 
                or use multiple words to search across product names, suppliers, and colours.
              </p>
            </div>
          </div>
        )}
      </div>


      {/* Floating Favorites Panel */}
      <FavoritesPanel />
    </div>
  )
}