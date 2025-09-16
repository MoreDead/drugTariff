'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Loader2, CheckCircle2, Plus, Info } from 'lucide-react'
import { supabase, Product } from '@/lib/supabase'

// Debug component to show sample order codes
function SampleOrderCodes() {
  const { data: sampleProducts } = useQuery({
    queryKey: ['sample-order-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product')
        .select('"Order number", "Product Name"')
        .not('"Order number"', 'is', null)
        .limit(10)

      if (error) {
        return []
      }

      return data || []
    }
  })

  if (!sampleProducts || sampleProducts.length === 0) {
    return <p className="text-yellow-700 text-sm">No order codes found in database</p>
  }

  return (
    <div className="text-sm">
      <p className="text-yellow-700 mb-2">Sample order codes (click to test search):</p>
      {sampleProducts.map((product, index) => (
        <div key={index} className="text-yellow-700 mb-1">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('test-search', { detail: product["Order number"] }))
            }}
            className="bg-yellow-100 px-2 py-1 rounded hover:bg-yellow-200 cursor-pointer text-sm"
          >
            {product["Order number"]} ({product["Order number"]?.length} chars)
          </button>
          <span className="ml-2">- {product["Product Name"]?.slice(0, 30)}...</span>
        </div>
      ))}
    </div>
  )
}

interface SmartSearchPopupProps {
  isOpen: boolean
  onClose: () => void
  onSelectProducts: (products: Product[]) => void
  searchQuery: string
  searchTrigger?: number
}

type SearchStrategy = 'order-number' | 'multi-column' | 'none'

export function SmartSearchPopup({ isOpen, onClose, onSelectProducts, searchQuery, searchTrigger = 0 }: SmartSearchPopupProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [page, setPage] = useState(0)
  const [searchStrategy, setSearchStrategy] = useState<SearchStrategy>('none')

  // Determine search strategy based on query
  const getSearchStrategy = (query: string): SearchStrategy => {
    if (!query.trim()) return 'none'
    const words = query.trim().split(/\s+/).filter(word => word.length > 0)
    // Only support single word order number searches
    const strategy = words.length === 1 ? 'order-number' : 'none'
    return strategy
  }

  // Query for total count of matching products
  const { data: totalCount, isLoading: countLoading } = useQuery({
    queryKey: ['smart-search-count', searchQuery, searchTrigger],
    queryFn: async (): Promise<number> => {
      if (!searchQuery.trim()) return 0

      try {
        const strategy = getSearchStrategy(searchQuery)
        setSearchStrategy(strategy)

        let query = supabase
          .from('product')
          .select('*', { count: 'exact', head: true })

        if (strategy === 'order-number') {
          // Single word - search order number only
          console.log('Searching for order number:', searchQuery.trim())
          query = query.ilike('"Order number"', `%${searchQuery.trim()}%`)
        }
        
        const { count, error } = await query

        if (error) {
          console.error('Smart search count error details:', {
            error,
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint
          })
          return 0
        }

        console.log(`Found ${count || 0} results for "${searchQuery}" using ${strategy} strategy`)

        // Debug: Let's also check what order numbers actually exist
        if (strategy === 'order-number' && count === 0) {
          const debugQuery = await supabase
            .from('product')
            .select('"Order number"')
            .not('"Order number"', 'is', null)
            .limit(5)

          console.log('Debug - Sample order numbers in DB:', debugQuery.data?.map(p => `"${p["Order number"]}" (${p["Order number"]?.length} chars)`))

          // Test exact match
          const exactTest = await supabase
            .from('product')
            .select('"Order number"')
            .eq('"Order number"', searchQuery.trim())
            .limit(1)

          console.log('Debug - Exact match test result:', exactTest.data, 'Error:', exactTest.error)

          // Test ilike pattern
          const ilikeTest = await supabase
            .from('product')
            .select('"Order number"')
            .ilike('"Order number"', `%${searchQuery.trim()}%`)
            .limit(1)

          console.log('Debug - ilike pattern test result:', ilikeTest.data, 'Error:', ilikeTest.error)
        }

        return count || 0
      } catch (err) {
        console.error('Unexpected smart search count error:', err)
        return 0
      }
    },
    enabled: !!searchQuery.trim() && isOpen,
    retry: false,
  })

  // Query for smart search with pagination
  const { data: pageProducts, isLoading, error, isFetching } = useQuery({
    queryKey: ['smart-search', searchQuery, page, searchTrigger, searchStrategy],
    queryFn: async (): Promise<Product[]> => {
      if (!searchQuery.trim()) return []

      try {
        const strategy = searchStrategy || getSearchStrategy(searchQuery)
        
        let query = supabase
          .from('product')
          .select('*')

        if (strategy === 'order-number') {
          // Single word - search order number only
          console.log('Searching for order number:', searchQuery.trim())
          query = query.ilike('"Order number"', `%${searchQuery.trim()}%`)
        }
        
        let finalQuery = query.order('"Product Name"', { ascending: true })

        // For order number searches - search all results
        if (strategy === 'order-number') {
          finalQuery = finalQuery.limit(100)
        }

        const { data, error } = await finalQuery

        if (error) {
          console.error('Smart search error details:', {
            error,
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint
          })
          return []
        }

        const pageInfo = strategy === 'order-number' ? 'all results' : 'no search'
        console.log(`Retrieved ${data?.length || 0} products for ${pageInfo} using ${strategy} strategy`)
        return data || []
      } catch (err) {
        console.error('Unexpected smart search error:', err)
        return []
      }
    },
    enabled: !!searchQuery.trim() && isOpen && searchStrategy !== 'none',
    retry: false,
  })

  // Reset selection and pagination when popup closes or new search
  useEffect(() => {
    if (!isOpen) {
      setSelectedProductIds(new Set())
      setAllProducts([])
      setPage(0)
      setSearchStrategy('none')
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedProductIds(new Set())
    setAllProducts([])
    setPage(0)
    // Reset search strategy and let it be determined fresh by the query
    if (searchQuery) {
      const newStrategy = getSearchStrategy(searchQuery)
      setSearchStrategy(newStrategy)
    } else {
      setSearchStrategy('none')
    }
  }, [searchQuery])

  // Combine paginated results
  useEffect(() => {
    if (pageProducts) {
      if (page === 0) {
        // First page - replace all products
        setAllProducts(pageProducts)
      } else {
        // Subsequent pages - append to existing products
        setAllProducts(prev => [...prev, ...pageProducts])
      }
    }
  }, [pageProducts, page])

  const handleCheckboxChange = (productId: string, checked: boolean) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(productId)
      } else {
        newSet.delete(productId)
      }
      return newSet
    })
  }

  const handleAddSelected = () => {
    const selectedProducts = allProducts.filter(p => selectedProductIds.has(p.id))
    onSelectProducts(selectedProducts)
    onClose()
  }

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  const hasMoreResults = totalCount ? allProducts.length < totalCount : false
  const isLoadingMore = page > 0 && isFetching
  const selectedCount = selectedProductIds.size

  const formatPrice = (priceInPounds: number) => {
    return priceInPounds.toFixed(2)
  }

  const getSizeDisplay = (product: Product) => {
    // If sz/wt field is not NULL, display the size/weight value
    if (product["sz/wt"] && product["sz/wt"].trim() !== '') {
      return { label: 'Size/Weight', value: product["sz/wt"] }
    }
    
    // Check if UOM QTY contains "ml", "gram", or "m"
    const uomQty = product["UOM QTY"] ? product["UOM QTY"].toLowerCase() : ''
    if (uomQty.includes('ml') || uomQty.includes('gram') || uomQty.includes('m')) {
      return { label: 'Size', value: `${product["QTY"]} ${product["UOM QTY"]}` }
    }
    
    // Default case: display "Number" with qty value
    return { label: 'Number', value: product["QTY"] }
  }

  const getOrderCodeDisplay = (product: Product) => {
    const orderNumber = product["Order number"]?.trim()
    return orderNumber || 'N/A'
  }

  const getSearchStrategyText = () => {
    switch (searchStrategy) {
      case 'order-number':
        return 'Searching order numbers...'
      default:
        return 'Only single word order number searches are supported'
    }
  }

  const getSearchStrategyIcon = () => {
    switch (searchStrategy) {
      case 'order-number':
        return '🔢'
      case 'multi-column':
        return '🔍'
      default:
        return '⚡'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" aria-describedby="search-results-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Smart Search Results for &quot;{searchQuery}&quot;
          </DialogTitle>
        </DialogHeader>
        
        <div id="search-results-description" className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Debug: Show sample order codes */}
          {!searchQuery && (
            <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-sm text-yellow-800 mb-2">Debug: Sample Order Codes in Database</h4>
              <SampleOrderCodes />
            </div>
          )}

          {/* Search Strategy Indicator - only show for valid single-word searches */}
          {searchQuery && searchStrategy === 'order-number' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {getSearchStrategyIcon()} {getSearchStrategyText()}
              </span>
            </div>
          )}

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading State */}
            {isLoading && searchQuery && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">{getSearchStrategyText()}</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-8 text-red-600">
                Error searching products. Please try again.
              </div>
            )}

            {/* No Results */}
            {!isLoading && !error && searchQuery && searchStrategy === 'none' && (
              <div className="text-center py-8 text-orange-600">
                Only single word order number searches are supported. Please enter one word only.
              </div>
            )}

            {!isLoading && !error && searchQuery && searchStrategy === 'order-number' && totalCount === 0 && (
              <div className="text-center py-8 text-gray-600">
                No order number found matching &quot;{searchQuery}&quot;
              </div>
            )}

            {/* Empty Search Query */}
            {!searchQuery && (
              <div className="text-center py-8 text-gray-500">
                No search query provided
              </div>
            )}

            {/* Results List */}
            {allProducts && allProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {totalCount ? (
                      <>Showing {allProducts.length} of {totalCount} product{totalCount !== 1 ? 's' : ''}</>
                    ) : (
                      <>Found {allProducts.length} product{allProducts.length !== 1 ? 's' : ''}</>
                    )}
                  </p>
                  {countLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                
                {allProducts.map((product) => {
                  const isSelected = selectedProductIds.has(product.id)
                  const sizeDisplay = getSizeDisplay(product)
                  const orderCode = getOrderCodeDisplay(product)
                  return (
                    <Card key={product.id} className={`cursor-pointer transition-colors ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handleCheckboxChange(product.id, !!checked)}
                            className="mt-1"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 mb-1">
                              {product["Product Name"]}
                            </h3>
                            <Badge variant="secondary" className="mb-2">
                              {product["Category"]}
                            </Badge>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Supplier:</span> {product["Supplier"]}
                              </div>
                              <div>
                                <span className="font-medium">Colour:</span> {product["Colour"]}
                              </div>
                              <div>
                                <span className="font-medium">{sizeDisplay.label}:</span> {sizeDisplay.value}
                              </div>
                              <div>
                                <span className="font-medium">Order Code:</span> {orderCode}
                              </div>
                              <div>
                                <span className="font-medium">Price:</span> £{product["pricePounds"] || formatPrice(product["Price"])}
                              </div>
                              <div>
                                <span className="font-medium">Amount:</span> {product["Amount"]}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                
                {/* Load More Button */}
                {hasMoreResults && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Load More
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer with action buttons */}
          {allProducts && allProducts.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedCount > 0 ? (
                  <span>{selectedCount} product{selectedCount !== 1 ? 's' : ''} selected</span>
                ) : (
                  <span>Select products to add to your list</span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddSelected}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Add Selected ({selectedCount})
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}