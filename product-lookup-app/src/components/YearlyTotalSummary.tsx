'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, TrendingUp } from 'lucide-react'
import { ProductUsage, calculateYearlyCost, Product } from '@/lib/supabase'

interface YearlyTotalSummaryProps {
  products: Product[]
  usageData: Record<string, ProductUsage>
}

export function YearlyTotalSummary({ products, usageData }: YearlyTotalSummaryProps) {
  // Calculate total yearly cost across all products
  const totalYearlyCost = products.reduce((total, product) => {
    const usage = usageData[product.id]
    if (usage && usage.frequency > 0) {
      return total + calculateYearlyCost(product, usage)
    }
    return total
  }, 0)

  // Count how many products have usage data
  const productsWithUsage = products.filter(product => {
    const usage = usageData[product.id]
    return usage && usage.frequency > 0
  })

  // Format price in pounds
  const formatPrice = (priceInPounds: number) => {
    return priceInPounds.toFixed(2)
  }

  // Don't show if no products have usage data
  if (productsWithUsage.length === 0) {
    return null
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-purple-600" />
          <CardTitle className="text-xl font-bold text-purple-900">
            Total Yearly Cost Summary
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="text-4xl font-bold text-purple-600 mb-2">
              £{formatPrice(totalYearlyCost)}
            </div>
            <p className="text-gray-600">
              Total estimated yearly cost across {productsWithUsage.length} product{productsWithUsage.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-white/60 rounded-lg px-4 py-2 border border-purple-200">
            <Calculator className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-800">
              Based on usage patterns of favourites entered below
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}