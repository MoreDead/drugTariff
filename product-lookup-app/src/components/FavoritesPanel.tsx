'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Trash2, Loader2 } from 'lucide-react'
import { useFavoritesStore } from '@/lib/stores/favorites'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function FavoritesPanel() {
  const { favorites, removeFavorite, loadFavorites, loading, clearFavorites } = useFavoritesStore()
  const [showPanel, setShowPanel] = useState(false)

  // Load favorites on component mount from local storage
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // Show panel even without user for testing

  // Don't show panel if no favorites
  if (favorites.length === 0) {
    return null
  }

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await removeFavorite(productId)
    } catch {
      toast.error('Failed to remove favorite')
    }
  }

  const handleClearFavorites = async () => {
    try {
      clearFavorites()
      toast.success('All favorites cleared')
    } catch {
      toast.error('Failed to clear favorites')
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setShowPanel(!showPanel)}
        className="rounded-full h-12 w-12 shadow-lg"
        size="sm"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Heart className="h-5 w-5 fill-current" />
        )}
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {favorites.length}
        </Badge>
      </Button>

      {showPanel && (
        <Card className="absolute bottom-16 right-0 w-80 max-h-96 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Favorites</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFavorites}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPanel(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {favorites.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {product["Product Name"]}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {product["Supplier"]}
                    </p>
                    <p className="text-xs font-mono text-gray-600">
                      {product["Order number"]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-semibold text-green-600">
                      {product["pricePounds"] || `£${product["Price"].toFixed(2)}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFavorite(product.id)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      disabled={loading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}