'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, X, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const searchSchema = z.object({
  orderNumber: z.string().optional().or(z.literal('')),
  supplier: z.string().default('all'),
  colour: z.string().default('all'),
  productName: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val || !val.trim()) return true;
    const words = val.trim().split(/\s+/);
    return words.length <= 3;
  }, "Maximum 3 words allowed for product name search")
})

type SearchFormData = z.infer<typeof searchSchema>

export interface SearchCriteria {
  orderNumber?: string
  supplier?: string
  colour?: string
  productName?: string
}

interface SearchFormProps {
  onSearch: (criteria: SearchCriteria) => void
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [colourSearchTerm, setColourSearchTerm] = useState('')
  const [showColourDropdown, setShowColourDropdown] = useState(false)

  // Real-time supplier search as user types
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['supplier-search', supplierSearchTerm],
    queryFn: async () => {
      if (!supplierSearchTerm.trim()) {
        return []
      }

      console.log('Searching suppliers for:', supplierSearchTerm)

      // Use batch approach to get all matching suppliers
      const batchSize = 1000
      let allSuppliers = new Set<string>()
      let hasMore = true
      let offset = 0

      while (hasMore && offset < 5000) { // Limit to 5 batches max
        console.log(`Fetching batch ${offset / batchSize + 1} (offset: ${offset})`)

        const { data: batchData, error: batchError } = await supabase
          .from('product')
          .select('"Supplier"')
          .not('"Supplier"', 'is', null)
          .ilike('"Supplier"', `${supplierSearchTerm}%`)
          .order('"Supplier"', { ascending: true })
          .range(offset, offset + batchSize - 1)

        if (batchError) {
          console.error(`Batch ${offset / batchSize + 1} failed:`, batchError)
          break
        }

        if (!batchData || batchData.length === 0) {
          console.log('No more data, stopping')
          hasMore = false
          break
        }

        console.log(`Batch ${offset / batchSize + 1} returned ${batchData.length} records`)

        // Add unique suppliers from this batch
        batchData.forEach(item => {
          if (item.Supplier && item.Supplier.trim()) {
            allSuppliers.add(item.Supplier)
          }
        })

        // If we got fewer records than requested, we've reached the end
        if (batchData.length < batchSize) {
          console.log('Got fewer records than requested, stopping')
          hasMore = false
        } else {
          offset += batchSize
        }
      }

      const uniqueSuppliersList = Array.from(allSuppliers).sort()
      console.log(`Found ${uniqueSuppliersList.length} unique suppliers across all batches`)
      console.log('Unique suppliers:', uniqueSuppliersList)

      return uniqueSuppliersList
    },
    enabled: supplierSearchTerm.trim().length >= 2 // Only search when user has typed at least 2 characters
  })

  // Real-time colour search as user types
  const { data: colours, isLoading: coloursLoading } = useQuery({
    queryKey: ['colour-search', colourSearchTerm],
    queryFn: async () => {
      if (!colourSearchTerm.trim()) {
        return []
      }

      console.log('Searching colours for:', colourSearchTerm)

      // Use batch approach to get all matching colours
      const batchSize = 1000
      let allColours = new Set<string>()
      let hasMore = true
      let offset = 0

      while (hasMore && offset < 5000) { // Limit to 5 batches max
        console.log(`Fetching colour batch ${offset / batchSize + 1} (offset: ${offset})`)

        const { data: batchData, error: batchError } = await supabase
          .from('product')
          .select('"Colour"')
          .not('"Colour"', 'is', null)
          .ilike('"Colour"', `${colourSearchTerm}%`)
          .order('"Colour"', { ascending: true })
          .range(offset, offset + batchSize - 1)

        if (batchError) {
          console.error(`Colour batch ${offset / batchSize + 1} failed:`, batchError)
          break
        }

        if (!batchData || batchData.length === 0) {
          console.log('No more colour data, stopping')
          hasMore = false
          break
        }

        console.log(`Colour batch ${offset / batchSize + 1} returned ${batchData.length} records`)

        // Add unique colours from this batch
        batchData.forEach(item => {
          if (item.Colour && item.Colour.trim()) {
            allColours.add(item.Colour)
          }
        })

        // If we got fewer records than requested, we've reached the end
        if (batchData.length < batchSize) {
          console.log('Got fewer colour records than requested, stopping')
          hasMore = false
        } else {
          offset += batchSize
        }
      }

      const uniqueColoursList = Array.from(allColours).sort()
      console.log(`Found ${uniqueColoursList.length} unique colours across all batches`)
      console.log('Unique colours:', uniqueColoursList)

      return uniqueColoursList
    },
    enabled: colourSearchTerm.trim().length >= 1 // Only search when user has typed at least 1 character
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      supplier: 'all',
      colour: 'all'
    }
  })

  const watchedValues = watch()

  // Since we're doing real-time search, suppliers IS the filtered results
  const filteredSuppliers = suppliers || []
  const filteredColours = colours || []

  const handleSupplierSelect = (supplier: string) => {
    setValue('supplier', supplier)
    setSupplierSearchTerm(supplier)
    setShowSupplierDropdown(false)
  }

  const handleSupplierInputChange = (value: string) => {
    console.log('Supplier input changed to:', value)
    setSupplierSearchTerm(value)
    setShowSupplierDropdown(true)
    // If user types, set the actual form value to the typed value (for "all" vs specific supplier)
    setValue('supplier', value === '' ? 'all' : value)
    console.log('Filtered suppliers:', filteredSuppliers.length)
  }

  const handleColourSelect = (colour: string) => {
    setValue('colour', colour)
    setColourSearchTerm(colour)
    setShowColourDropdown(false)
  }

  const handleColourInputChange = (value: string) => {
    console.log('Colour input changed to:', value)
    setColourSearchTerm(value)
    setShowColourDropdown(true)
    // If user types, set the actual form value to the typed value (for "all" vs specific colour)
    setValue('colour', value === '' ? 'all' : value)
    console.log('Filtered colours:', filteredColours.length)
  }

  const onSubmit = (data: SearchFormData) => {
    console.log('Form submitted with data:', data)

    // Clean up the data
    const criteria: SearchCriteria = {
      orderNumber: data.orderNumber?.trim() || undefined,
      supplier: data.supplier === 'all' ? undefined : data.supplier,
      colour: data.colour === 'all' ? undefined : data.colour,
      productName: data.productName?.trim() || undefined
    }

    console.log('Processed criteria:', criteria)

    // Validate that at least one field is filled
    const hasSearchCriteria = criteria.orderNumber || criteria.supplier || criteria.colour || criteria.productName

    console.log('Has search criteria:', hasSearchCriteria)

    if (!hasSearchCriteria) {
      console.log('No search criteria provided, not searching')
      return // Don't search if no criteria provided
    }

    console.log('Calling onSearch with criteria:', criteria)
    onSearch(criteria)
  }

  const handleClear = () => {
    reset({
      orderNumber: '',
      supplier: 'all',
      colour: 'all',
      productName: ''
    })
    setSupplierSearchTerm('')
    setShowSupplierDropdown(false)
    setColourSearchTerm('')
    setShowColourDropdown(false)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Order Number Search - Full Width Priority Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Order Number <span className="text-xs text-gray-500">(Priority - searches only order codes when filled)</span>
            </label>
            <Input
              {...register('orderNumber')}
              placeholder="Enter order number for exact search..."
              className="w-full"
            />
            {errors.orderNumber && (
              <p className="text-sm text-red-600">{errors.orderNumber.message}</p>
            )}
          </div>

          {/* Combined Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Searchable Supplier Field */}
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-gray-700">Supplier</label>
              <div className="relative">
                <Input
                  value={supplierSearchTerm}
                  onChange={(e) => handleSupplierInputChange(e.target.value)}
                  onFocus={() => setShowSupplierDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                  placeholder="Type to search suppliers... (or leave empty for all)"
                  className="w-full"
                />
                {showSupplierDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {!supplierSearchTerm || supplierSearchTerm.length < 2 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Type at least 2 characters to search suppliers...
                      </div>
                    ) : suppliersLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Searching suppliers...
                      </div>
                    ) : filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map((supplier) => (
                        <button
                          key={supplier}
                          type="button"
                          onClick={() => handleSupplierSelect(supplier)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        >
                          {supplier}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No suppliers found starting with "{supplierSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
                {suppliersLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Searchable Colour Field */}
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-gray-700">Colour</label>
              <div className="relative">
                <Input
                  value={colourSearchTerm}
                  onChange={(e) => handleColourInputChange(e.target.value)}
                  onFocus={() => setShowColourDropdown(true)}
                  onBlur={() => setTimeout(() => setShowColourDropdown(false), 200)}
                  placeholder="Type to search colours... (or leave empty for all)"
                  className="w-full"
                />
                {showColourDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {!colourSearchTerm || colourSearchTerm.length < 1 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Start typing to search colours...
                      </div>
                    ) : coloursLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Searching colours...
                      </div>
                    ) : filteredColours.length > 0 ? (
                      filteredColours.map((colour) => (
                        <button
                          key={colour}
                          type="button"
                          onClick={() => handleColourSelect(colour)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        >
                          {colour}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No colours found starting with "{colourSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
                {coloursLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Product Name Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Product Name</label>
              <Input
                {...register('productName')}
                placeholder="1-3 words to search..."
                className="w-full"
              />
              {errors.productName && (
                <p className="text-sm text-red-600">{errors.productName.message}</p>
              )}
            </div>

          </div>

          {/* Search Instructions */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p><strong>Search Logic:</strong></p>
            <ul className="mt-1 space-y-1">
              <li>• <strong>Order Number Priority:</strong> When filled, searches only order numbers (ignores other fields)</li>
              <li>• <strong>Combined Search:</strong> When order number is empty, searches product names with optional supplier/colour filters</li>
              <li>• <strong>Product Name:</strong> All words must appear in the product name (1-3 words maximum)</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
            <Button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={suppliersLoading || coloursLoading}
            >
              <Search className="h-4 w-4" />
              Search Products
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  )
}


