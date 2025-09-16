'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Heart, Copy, Calculator, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Product, ProductUsage, UsagePeriod, calculateYearlyCost } from '@/lib/supabase'
import { useFavoritesStore } from '@/lib/stores/favorites'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface ProductCardProps {
  product: Product
  onUsageChange?: (productId: string, usage: ProductUsage | null) => void
  onDelete?: (productId: string) => void
  showDeleteIcon?: boolean
}

export function ProductCard({ product, onUsageChange, onDelete, showDeleteIcon = false }: ProductCardProps) {
  const { addFavorite, removeFavorite, isFavorite, loading, updateFavoriteUsage, getFavoriteUsage, addToSearchHistory, isInSearchHistory } = useFavoritesStore()
  const [copied, setCopied] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  // Initialize frequency and period from local storage if available
  const savedUsage = getFavoriteUsage(product.id)
  const [frequency, setFrequency] = useState<number>(savedUsage?.frequency || 1)
  const [period, setPeriod] = useState<UsagePeriod>(savedUsage?.period || 'month')
  
  // Update local state when saved usage data becomes available (after store rehydration)
  useEffect(() => {
    if (savedUsage) {
      setFrequency(savedUsage.frequency)
      setPeriod(savedUsage.period)
    }
  }, [savedUsage])
  

  // Format price to 2 decimal places
  const formatPrice = (priceInPounds: number | undefined | null) => {
    if (priceInPounds === undefined || priceInPounds === null || isNaN(priceInPounds)) {
      return '0.00'
    }
    return priceInPounds.toFixed(2)
  }

  // Calculate unit price (price per individual item)
  const calculateUnitPrice = (priceInPounds: number, quantity: number) => {
    if (quantity === 0) return 0
    return priceInPounds / quantity
  }

  const packPrice = product["pricePounds"] || formatPrice(product["Price"])
  const qty = parseInt(product["QTY"]) || 0
  const unitPrice = calculateUnitPrice(product["Price"], qty)
  const unitPriceFormatted = formatPrice(unitPrice)
  
  // Calculate yearly cost if usage data is provided
  const usage: ProductUsage = {
    productId: product.id,
    frequency,
    period
  }
  const yearlyCost = calculateYearlyCost(product, usage)
  const yearlyCostFormatted = formatPrice(yearlyCost)
  

  const handleFavoriteToggle = async () => {
    try {
      const wasAlreadyFavorite = isFavorite(product.id)
      
      if (wasAlreadyFavorite) {
        await removeFavorite(product.id)
        // Add to search history so it stays visible with delete icon
        if (!isInSearchHistory(product.id)) {
          addToSearchHistory([product])
        }
        toast.success('Removed from favorites')
      } else {
        await addFavorite(product, { frequency, period })
        toast.success('Added to favorites')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorites')
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(product.id)
      toast.success('Removed from search results')
    }
  }

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleCopyDetails = async () => {
    const hasMLUnit = product["UOM QTY"] && product["UOM QTY"].toLowerCase().includes('ml')
    const packQuantityDisplay = product["QTY"] + (hasMLUnit 
      ? product["UOM QTY"].toLowerCase() 
      : ''
    )
    const displayUnitPrice = hasMLUnit ? packPrice : unitPriceFormatted
    
    const details = `Product: ${product["Product Name"]}
Category: ${product["Category"]}
Supplier: ${product["Supplier"]}
Colour: ${product["Colour"]}
Size/Weight: ${product["sz/wt"]}
Quantity: ${packQuantityDisplay}
Amount: ${product["Amount"]}
Pack Price: £${packPrice}
Unit Price: £${displayUnitPrice}
Order Code: ${product["Order number"]}`

    try {
      await navigator.clipboard.writeText(details)
      setCopied(true)
      toast.success('Product details copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy details')
    }
  }

  const handleFrequencyChange = (value: string) => {
    const newFreq = parseInt(value) || 0
    setFrequency(newFreq)
    
    // Update local state if this is a favorite
    if (isFavorite(product.id)) {
      updateFavoriteUsage(product.id, { frequency: newFreq, period })
    }
    
    // Also update parent component
    if (onUsageChange) {
      onUsageChange(product.id, { productId: product.id, frequency: newFreq, period })
    }
  }

  const handlePeriodChange = (value: UsagePeriod) => {
    setPeriod(value)
    
    // Update local state if this is a favorite
    if (isFavorite(product.id)) {
      updateFavoriteUsage(product.id, { frequency, period: value })
    }
    
    // Also update parent component
    if (onUsageChange) {
      onUsageChange(product.id, { productId: product.id, frequency, period: value })
    }
  }

  return (
    <Card className={`w-full max-w-2xl mx-auto ${isFavorite(product.id) ? 'ring-2 ring-purple-300 bg-purple-50/50' : ''} ${isMinimized ? 'py-0' : ''}`}>
      <CardHeader className={isMinimized ? "pb-0 pt-2 px-6" : "pb-4"}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`flex items-center gap-2 ${isMinimized ? "mb-0" : "mb-2"}`}>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {product["Product Name"]}
              </CardTitle>
            </div>
            {!isMinimized && (
              <Badge variant="secondary" className="mb-2">
                {product["Category"]}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMinimize}
              className="p-2 text-gray-400 hover:text-gray-600"
              title={isMinimized ? 'Expand card' : 'Minimize card'}
            >
              {isMinimized ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </Button>
            {showDeleteIcon && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500"
                title="Remove from search results"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteToggle}
              disabled={loading}
              className={`p-2 ${
                isFavorite(product.id) 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-gray-400 hover:text-red-500'
              }`}
              title={isFavorite(product.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart 
                className={`h-5 w-5 ${
                  isFavorite(product.id) ? 'fill-current' : ''
                }`} 
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isMinimized ? (
        <CardContent className="pt-0 pb-3 px-6">
          <div className="text-2xl font-bold text-purple-600">
            £{yearlyCostFormatted} <span className="text-sm text-gray-600 font-normal">yearly cost</span>
          </div>
        </CardContent>
      ) : (
        <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Supplier</h4>
            <p className="text-gray-900">{product["Supplier"]}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Colour</h4>
            <p className="text-gray-900">{product["Colour"]}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Size/Weight</h4>
            <p className="text-gray-900">{product["sz/wt"]}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Pack Quantity</h4>
            <p className="text-gray-900">
              {product["QTY"]}
              {product["UOM QTY"] && product["UOM QTY"].toLowerCase().includes('ml') 
                ? product["UOM QTY"].toLowerCase() 
                : ''
              }
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Amount</h4>
            <p className="text-gray-900">{product["Amount"]}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Pack Price</h4>
            <p className="text-2xl font-bold text-green-600">
              £{packPrice}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Unit Price</h4>
            <p className="text-lg font-semibold text-blue-600">
              £{product["UOM QTY"] && product["UOM QTY"].toLowerCase().includes('ml') 
                ? packPrice 
                : unitPriceFormatted}
            </p>
            <p className="text-xs text-gray-500">per individual item</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Order Code</h4>
            <p className="text-gray-900 font-mono text-sm">{product["Order number"]}</p>
          </div>
        </div>
        
        {/* Yearly Cost Calculator */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-gray-700">Yearly Cost Calculator</h4>
          </div>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Usage Frequency
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={frequency}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                className="w-full"
                placeholder="Enter frequency"
              />
            </div>
            
            <div className="flex-1 min-w-[120px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Per Period
              </label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[140px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Yearly Cost
              </label>
              <div className="text-2xl font-bold text-purple-600">
                £{yearlyCostFormatted}
              </div>
            </div>
          </div>
          

        </div>
        
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyDetails}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Details'}
          </Button>
        </div>
      </CardContent>
      )}
    </Card>
  )
}
