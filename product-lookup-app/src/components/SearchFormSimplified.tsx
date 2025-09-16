'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, History, X, ShoppingCart } from 'lucide-react'
import { useSearchStore } from '@/lib/stores/search'

// Simplified schema - single validation rule
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
})

type SearchFormData = z.infer<typeof searchSchema>

interface SearchFormProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  onProductSearch?: (query: string) => void
  productSearchQuery?: string
  onProductSearchChange?: (query: string) => void
}

// Extracted reusable components
const SearchInput = ({ 
  value, 
  onChange, 
  placeholder, 
  onFocus, 
  onBlur, 
  onToggleHistory 
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  onFocus: () => void
  onBlur: () => void
  onToggleHistory: () => void
}) => (
  <div className="relative flex-1">
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pr-12"
      onFocus={onFocus}
      onBlur={onBlur}
    />
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
      onClick={onToggleHistory}
    >
      <History className="h-4 w-4" />
    </Button>
  </div>
)

const HistoryDropdown = ({ 
  title, 
  items, 
  onItemClick, 
  onClear, 
  onRemove 
}: {
  title: string
  items: string[]
  onItemClick: (item: string) => void
  onClear: () => void
  onRemove: (item: string) => void
}) => (
  <div className="mt-4 border rounded-lg bg-white shadow-lg">
    <div className="flex items-center justify-between p-3 border-b">
      <h4 className="font-medium text-sm">{title}</h4>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
    <div className="max-h-48 overflow-y-auto">
      {items.map((item, index) => (
        <div
          key={index}
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between group"
        >
          <button
            onClick={() => onItemClick(item)}
            className="flex-1 text-left"
          >
            <span className="truncate">{item}</span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(item)
            }}
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  </div>
)

export function SearchFormSimplified({ 
  onSearch, 
  isLoading = false, 
  onProductSearch, 
  productSearchQuery = '', 
  onProductSearchChange 
}: SearchFormProps) {
  const { 
    searchHistory, 
    addToHistory, 
    clearHistory, 
    removeFromHistory
  } = useSearchStore()
  
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [showProductHistory, setShowProductHistory] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  })

  // Simplified handlers
  const handleOrderSearch = (data: SearchFormData) => {
    addToHistory(data.query)
    onSearch(data.query)
  }

  const handleProductSearch = () => {
    if (productSearchQuery.trim()) {
      addToHistory(productSearchQuery)
      onProductSearch?.(productSearchQuery)
    }
  }

  const handleHistoryClick = (query: string) => {
    setValue('query', query)
    setShowOrderHistory(false)
  }

  const handleProductHistoryClick = (query: string) => {
    onProductSearchChange?.(query)
    setShowProductHistory(false)
  }

  // Debounced history hiding
  const hideHistory = () => setTimeout(() => setShowOrderHistory(false), 200)
  const hideProductHistory = () => setTimeout(() => setShowProductHistory(false), 200)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleOrderSearch)} className="space-y-4">
          {/* Order Code Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search by Order Code</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  {...register('query')}
                  placeholder="Enter order number (prod_ord_no or pk_ord_no)..."
                  className="pr-12"
                  onFocus={() => setShowOrderHistory(true)}
                  onBlur={hideHistory}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowOrderHistory(!showOrderHistory)}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                type="submit" 
                variant="outline"
                disabled={isLoading}
                className="bg-white"
              >
                {isLoading ? 'Searching...' : 'Search Order Codes'}
              </Button>
            </div>
          </div>

          {/* Product/Supplier Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search by Product or Supplier</label>
            <div className="flex gap-2">
              <SearchInput
                value={productSearchQuery}
                onChange={onProductSearchChange || (() => {})}
                placeholder="Enter product name or supplier (e.g., adhesive, Hollister)..."
                onFocus={() => setShowProductHistory(true)}
                onBlur={hideProductHistory}
                onToggleHistory={() => setShowProductHistory(!showProductHistory)}
              />
              {onProductSearch && (
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleProductSearch}
                  disabled={!productSearchQuery.trim()}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Search Products
                </Button>
              )}
            </div>
          </div>
          
          {errors.query && (
            <p className="text-sm text-red-600">{errors.query.message}</p>
          )}
        </form>

        {/* History Dropdowns */}
        {showOrderHistory && searchHistory.length > 0 && (
          <HistoryDropdown
            title="Recent Order Code Searches"
            items={searchHistory}
            onItemClick={handleHistoryClick}
            onClear={clearHistory}
            onRemove={removeFromHistory}
          />
        )}

        {showProductHistory && searchHistory.length > 0 && (
          <HistoryDropdown
            title="Recent Product Searches"
            items={searchHistory}
            onItemClick={handleProductHistoryClick}
            onClear={clearHistory}
            onRemove={removeFromHistory}
          />
        )}
      </CardContent>
    </Card>
  )
}
