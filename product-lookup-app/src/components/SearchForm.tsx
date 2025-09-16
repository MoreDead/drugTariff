'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, History, X } from 'lucide-react'
import { useSearchStore } from '@/lib/stores/search'

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
})

type SearchFormData = z.infer<typeof searchSchema>

interface SearchFormProps {
  onSearch: (query: string) => void
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const { searchHistory, addToHistory, clearHistory, removeFromHistory } = useSearchStore()
  const [showHistory, setShowHistory] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  })


  const onSubmit = (data: SearchFormData) => {
    addToHistory(data.query)
    onSearch(data.query)
  }

  const handleHistoryClick = (query: string) => {
    setValue('query', query)
    setShowHistory(false)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Smart Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Smart Search</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  {...register('query')}
                  placeholder="Enter order number (single word only, e.g., 'ABC123' or '3345P')..."
                  className="pr-12"
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                type="submit" 
                variant="outline"
                className="bg-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Smart Search
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              • <strong>Single word only:</strong> Searches order numbers/product codes<br/>
              • <strong>Multiple words not supported</strong>
            </p>
          </div>
          
          {errors.query && (
            <p className="text-sm text-red-600">{errors.query.message}</p>
          )}
        </form>

        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div className="mt-4 border rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between p-3 border-b">
              <h4 className="font-medium text-sm">Recent Searches</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {searchHistory.map((query, index) => (
                <div
                  key={index}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between group"
                >
                  <button
                    onClick={() => handleHistoryClick(query)}
                    className="flex-1 text-left"
                  >
                    <span className="truncate">{query}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromHistory(query)
                    }}
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


