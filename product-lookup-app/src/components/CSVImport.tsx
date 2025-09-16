'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase, ProductInsert } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

const csvSchema = z.object({
  file: z.any().refine((file) => file && file.length > 0, 'Please select a CSV file'),
})

type CSVFormData = z.infer<typeof csvSchema>

interface CSVImportProps {
  onImportSuccess?: () => void
}

export function CSVImport({ onImportSuccess }: CSVImportProps = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([])
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'testing' | 'connected' | 'failed'>('unknown')
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CSVFormData>({
    resolver: zodResolver(csvSchema),
  })

  const parseCSV = (file: File, previewOnly: boolean = false): Promise<Record<string, string>[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: previewOnly ? 5 : 0, // Only preview first 5 rows if previewOnly
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`))
          } else {
            resolve(results.data as Record<string, string>[])
          }
        },
        error: (error) => {
          reject(error)
        },
      })
    })
  }

  const handleFileSelect = async (file: File) => {
    try {
      const previewData = await parseCSV(file, true)
      setCsvPreview(previewData)
      setDetectedColumns(Object.keys(previewData[0] || {}))
      setShowPreview(true)
    } catch (error) {
      console.error('Preview error:', error)
      toast.error('Failed to preview CSV file')
    }
  }

  const testConnection = async () => {
    setConnectionStatus('testing')
    try {
      const { error } = await supabase
        .from('product')
        .select('count')
        .limit(1)
      
      if (error) {
        setConnectionStatus('failed')
        toast.error(`Connection failed: ${error.message}`)
      } else {
        setConnectionStatus('connected')
        toast.success('Connection successful!')
      }
    } catch (error) {
      setConnectionStatus('failed')
      toast.error(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const transformToProduct = (row: Record<string, string>): ProductInsert => {
    // Flexible column mapping - handles different column names and orders
    const getValue = (possibleKeys: string[], defaultValue: string = '') => {
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key]
        }
      }
      return defaultValue
    }

    return {
      "Supplier": getValue(['Supplier', 'Supplier Name', 'supplier_name', 'supplier'], ''),
      "Category": getValue(['Category', 'VMP Name', 'vmp_name', 'VMP', 'vmp', 'Product Type', 'product_type'], ''),
      "Product Name": getValue(['Product Name', 'AMP Name', 'amp_name', 'AMP', 'amp', 'product_name'], ''),
      "Colour": getValue(['Colour', 'Color', 'colour', 'color'], ''),
      "sz/wt": getValue(['sz/wt', 'sz / wt', 'Size', 'size', 'Product Size', 'product_size', 'Weight', 'weight'], ''),
      "QTY": getValue(['QTY', 'qty', 'Quantity', 'quantity', 'Pack Size', 'pack_size'], '0'),
      "UOM QTY": getValue(['UOM QTY', 'uom_qty', 'UOM Qty', 'uom qty', 'Unit of Measure Qty', 'unit_of_measure_qty', 'Unit Qty', 'unit_qty'], ''),
      "Amount": getValue(['Amount', 'amount'], ''),
      "Order number": getValue(['Order number', 'Prod Ord No', 'prod_ord_no', 'Order Code', 'order_code', 'Product Code', 'product_code'], ''),
      "Price": parseFloat(getValue(['Price', 'price', 'Cost', 'cost', 'Unit Price', 'unit_price'], '0')) || 0,
      "pricePounds": getValue(['pricePounds', 'price_pounds', 'Price Pounds', 'price pounds'], ''),
    }
  }

  const uploadToSupabase = async (products: ProductInsert[]) => {
    const batchSize = 100
    const totalBatches = Math.ceil(products.length / batchSize)
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = products.slice(i * batchSize, (i + 1) * batchSize)

      console.log(`Inserting batch ${i + 1} with ${batch.length} records into 'product' table...`)
      console.log('Sample record from batch:', batch[0])

      const { data, error } = await supabase
        .from('product')
        .insert(batch)

      console.log(`Batch ${i + 1} insert response:`, { data, error })

      if (error) {
        console.error(`Batch ${i + 1} insert error details:`, error)
        throw new Error(`Batch ${i + 1} failed: ${error.message}`)
      }

      console.log(`Batch ${i + 1} inserted successfully`)
      
      const progress = Math.round(((i + 1) / totalBatches) * 100)
      setUploadProgress(progress)
    }
  }

  const onSubmit = async (data: CSVFormData) => {
    try {
      setIsUploading(true)
      setUploadStatus('uploading')
      setUploadProgress(0)

      const file = data.file[0] as File
      
      // Parse CSV (full file, not preview)
      const csvData = await parseCSV(file, false)
      
      if (csvData.length === 0) {
        throw new Error('CSV file is empty')
      }

      // Transform data
      const products = csvData.map(transformToProduct)
      
      // Upload to Supabase
      await uploadToSupabase(products)
      
      setUploadStatus('success')
      toast.success(`Successfully imported ${products.length} products!`)

      // Debug: Check if data was actually inserted (with small delay for DB commit)
      console.log('=== POST-IMPORT DEBUG ===')
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms for DB commit

      // Check the exact same query pattern used in the count check
      console.log('Using same query pattern as count check...')
      const verifyQuery = await supabase
        .from('product')
        .select('*', { count: 'exact', head: true })
      console.log('Product count after import:', verifyQuery.count)
      console.log('Verify query error:', verifyQuery.error)
      console.log('Full verify query response:', verifyQuery)

      // Also check with a simple select to see actual data
      console.log('Checking for actual data with simple select...')
      const dataQuery = await supabase
        .from('product')
        .select('id, "Order number", "Product Name"')
        .limit(3)
      console.log('Sample data query results:', dataQuery)
      console.log('Sample data:', dataQuery.data)
      console.log('Sample data error:', dataQuery.error)

      // Aggressive cache invalidation - clear everything
      queryClient.clear() // Clear all cache

      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['product-count'] })
      queryClient.invalidateQueries({ queryKey: ['smart-search-count'] })
      queryClient.invalidateQueries({ queryKey: ['smart-search'] })
      queryClient.invalidateQueries({ queryKey: ['sample-order-codes'] })

      // Force a complete cache clear and refetch
      await queryClient.refetchQueries({ queryKey: ['product-count'] })

      // Call the success callback if provided
      onImportSuccess?.()

      // Don't auto-refresh - let user see debug logs and manually refresh if needed
      console.log('Import completed. Check the logs above for detailed debug info.')
      console.log('If UI does not update automatically, refresh the page manually.')
      
      // Reset form and close dialog
      reset()
      setShowPreview(false)
      setCsvPreview([])
      setDetectedColumns([])
      setTimeout(() => {
        setIsOpen(false)
        setUploadStatus('idle')
        setUploadProgress(0)
      }, 2000)
      
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      
      // More detailed error messages
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check for common Supabase errors
        if (error.message.includes('JWT')) {
          errorMessage = 'Authentication error - check your Supabase API key'
        } else if (error.message.includes('relation "product" does not exist')) {
          errorMessage = 'Database table not found - run the supabase-setup.sql script'
        } else if (error.message.includes('row-level security policy')) {
          errorMessage = 'Row Level Security error - run this SQL in Supabase: "DROP POLICY IF EXISTS \\"Allow insert access for all users\\" ON public.product; CREATE POLICY \\"Allow insert access for all users\\" ON public.product FOR INSERT WITH CHECK (true);"'
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Permission denied - check RLS policies in Supabase'
        } else if (error.message.includes('Invalid URL')) {
          errorMessage = 'Invalid Supabase URL - check your environment variables'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - check your internet connection and Supabase URL'
        }
      }
      
      toast.error(`Upload failed: ${errorMessage}`)
      console.log('Full error details:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import CSV Data
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm">
            <span>Connection Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'failed' ? 'bg-red-100 text-red-800' :
              connectionStatus === 'testing' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus === 'connected' ? '✅ Connected' :
               connectionStatus === 'failed' ? '❌ Failed' :
               connectionStatus === 'testing' ? '🔄 Testing...' :
               '❓ Unknown'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
            >
              Test Connection
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              {...register('file')}
              type="file"
              accept=".csv"
              className="cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleFileSelect(file)
                }
              }}
            />
            {errors.file && (
              <p className="text-sm text-red-600 mt-1">
                {String(errors.file.message || 'Invalid file')}
              </p>
            )}
          </div>

          {/* CSV Preview */}
          {showPreview && csvPreview.length > 0 && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-2">CSV Preview (first 5 rows):</h4>
              <div className="text-sm">
                <p className="mb-2"><strong>Detected columns:</strong> {detectedColumns.join(', ')}</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        {detectedColumns.map((col) => (
                          <th key={col} className="text-left p-1 font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, index) => (
                        <tr key={index} className="border-b">
                          {detectedColumns.map((col) => (
                            <td key={col} className="p-1 truncate max-w-32" title={row[col]}>
                              {row[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Upload successful!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Upload failed. Please try again.</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? 'Uploading...' : 'Import CSV'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Flexible CSV format supported:</strong></p>
          <p>Columns can be in any order and use various names:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><strong>Supplier:</strong> &quot;Supplier&quot;, &quot;Supplier Name&quot;, &quot;supplier_name&quot;</li>
            <li><strong>Category:</strong> &quot;Category&quot;, &quot;VMP Name&quot;, &quot;Product Type&quot;</li>
            <li><strong>Product Name:</strong> &quot;Product Name&quot;, &quot;AMP Name&quot;, &quot;product_name&quot;</li>
            <li><strong>Colour:</strong> &quot;Colour&quot;, &quot;Color&quot;, &quot;colour&quot;, &quot;color&quot;</li>
            <li><strong>Size/Weight:</strong> &quot;sz/wt&quot;, &quot;sz / wt&quot;, &quot;Size&quot;, &quot;Weight&quot;</li>
            <li><strong>Quantity:</strong> &quot;QTY&quot;, &quot;qty&quot;, &quot;Quantity&quot;, &quot;Pack Size&quot;</li>
            <li><strong>UOM QTY:</strong> &quot;UOM QTY&quot;, &quot;uom_qty&quot;, &quot;Unit of Measure Qty&quot;</li>
            <li><strong>Amount:</strong> &quot;Amount&quot;, &quot;amount&quot;</li>
            <li><strong>Order Code:</strong> &quot;Order number&quot;, &quot;Order Code&quot;, &quot;Product Code&quot;</li>
            <li><strong>Price:</strong> &quot;Price&quot;, &quot;price&quot;, &quot;Cost&quot; (in pounds and pence, e.g., 12.50 for £12.50)</li>
            <li><strong>Price Pounds:</strong> &quot;pricePounds&quot;, &quot;Price Pounds&quot; (optional)</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
