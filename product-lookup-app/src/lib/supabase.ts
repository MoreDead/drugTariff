import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on new table structure
export interface Product {
  id: string
  "Supplier": string
  "Category": string // Product category/type
  "Product Name": string // Product name
  "Colour": string // Product colour
  "sz/wt": string // Size/weight
  "QTY": string // Quantity as text
  "UOM QTY": string // Unit of Measure Quantity
  "Amount": string // Amount field
  "Order number": string // Order code
  "Price": number // Price in pounds and pence (e.g., 12.50 for £12.50)
  "pricePounds": string // Price in pounds as text
  created_at?: string
  updated_at?: string
}

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<ProductInsert>

// Usage tracking types for yearly cost calculations
export type UsagePeriod = 'day' | 'week' | 'month'

export interface ProductUsage {
  productId: string
  frequency: number // How many times used per period
  period: UsagePeriod // The period (day, week, month)
}

export interface ProductWithUsage extends Product {
  usage?: ProductUsage
}

// Helper function to calculate yearly uses from usage data
export const calculateYearlyUses = (usage: ProductUsage): number => {
  const { frequency, period } = usage
  switch (period) {
    case 'day':
      return frequency * 365
    case 'week':
      return frequency * 52
    case 'month':
      return frequency * 12
    default:
      return 0
  }
}

// Helper function to calculate yearly cost
export const calculateYearlyCost = (product: Product, usage: ProductUsage): number => {
  const yearlyUses = calculateYearlyUses(usage)
  
  // If UOM QTY contains "ml", use pack price instead of unit price
  const hasMLUnit = product["UOM QTY"] && product["UOM QTY"].toLowerCase().includes('ml')
  const qty = parseInt(product["QTY"]) || 0
  const price = (product["Price"] || 0) / 100 // Convert from pence to pounds
  
  const pricePerUse = hasMLUnit 
    ? price  // Use pack price for ml products
    : (qty === 0 ? 0 : price / qty)  // Use unit price for others
    
  return yearlyUses * pricePerUse
}

// Database types for user favorites with usage data
export interface UserFavorite {
  id: string
  session_id: string
  product_id: string
  order_code: string
  usage_frequency: number
  usage_period: UsagePeriod
  display_order: number
  created_at: string
  updated_at: string
}

export interface UserFavoriteInsert {
  session_id: string
  product_id: string
  order_code: string
  usage_frequency?: number
  usage_period?: UsagePeriod
  display_order?: number
}

export interface UserFavoriteUpdate {
  usage_frequency?: number
  usage_period?: UsagePeriod
  updated_at?: string
}

// Combined type for favorites with full product data
export interface FavoriteWithProduct extends UserFavorite {
  // Product fields
  "Supplier": string
  "Category": string
  "Product Name": string
  "Colour": string
  "sz/wt": string
  "QTY": string
  "UOM QTY": string
  "Amount": string
  "Order number": string
  "Price": number
  "pricePounds": string
  
  // Favorite-specific fields
  favorite_id: string
  favorited_at: string
  favorite_updated_at: string
}

// CSV parsing types
export interface CSVRow {
  'Supplier': string
  'Category': string
  'Product Name': string
  'Colour': string
  'sz/wt': string
  'QTY': string
  'UOM QTY': string
  'Amount': string
  'Order number': string
  'Price': string
  'pricePounds': string
}

// Session management helpers
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return 'server-session'
  
  let sessionId = localStorage.getItem('user-session-id')
  if (!sessionId) {
    // Generate a simple session ID based on timestamp and random number
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('user-session-id', sessionId)
  }
  return sessionId
}
