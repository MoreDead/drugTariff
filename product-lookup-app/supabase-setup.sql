-- Supabase Database Setup for Product Lookup App
-- Run this in your Supabase SQL Editor to set up the database

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.user_favorites;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.product;

-- Create the products table with new structure
CREATE TABLE IF NOT EXISTS public.product (
  "Supplier" TEXT NULL,
  "Category" TEXT NULL,
  "Product Name" TEXT NULL,
  "Colour" TEXT NULL,
  "sz/wt" TEXT NULL,
  "QTY" TEXT NULL,
  "UOM QTY" TEXT NULL,
  "Amount" TEXT NULL,
  "Order number" TEXT NULL,
  "Price" DECIMAL(10,2) NULL,
  "pricePounds" TEXT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT product_pkey PRIMARY KEY (id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_supplier ON public.product("Supplier");
CREATE INDEX IF NOT EXISTS idx_product_category ON public.product("Category");
CREATE INDEX IF NOT EXISTS idx_product_name ON public.product("Product Name");
CREATE INDEX IF NOT EXISTS idx_product_order_number ON public.product("Order number");
CREATE INDEX IF NOT EXISTS idx_product_price ON public.product("Price");

-- Enable Row Level Security (RLS)
ALTER TABLE public.product ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Allow read access for all users" ON public.product;
DROP POLICY IF EXISTS "Allow insert access for all users" ON public.product;

-- Create policies to allow read and insert access for all users
CREATE POLICY "Allow read access for all users" ON public.product
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access for all users" ON public.product
  FOR INSERT WITH CHECK (true);

-- Create the user_favorites table for storing user favorites
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.product(id) ON DELETE CASCADE,
  order_code TEXT NOT NULL,
  usage_frequency INTEGER DEFAULT 1,
  usage_period TEXT DEFAULT 'month' CHECK (usage_period IN ('day', 'week', 'month')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT unique_session_product UNIQUE (session_id, product_id)
);

-- Create indexes for user_favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_session_id ON public.user_favorites(session_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON public.user_favorites(product_id);

-- Enable RLS for user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for user_favorites (allow all operations for now)
CREATE POLICY "Allow all operations on user_favorites" ON public.user_favorites
  FOR ALL USING (true) WITH CHECK (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON public.product
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_favorites_updated_at BEFORE UPDATE ON public.user_favorites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to describe the tables and columns
COMMENT ON TABLE public.product IS 'Stores product information from CSV imports';
COMMENT ON COLUMN public.product."Supplier" IS 'Product supplier name';
COMMENT ON COLUMN public.product."Category" IS 'Product category/type (formerly VMP Name)';
COMMENT ON COLUMN public.product."Product Name" IS 'Product name (formerly AMP Name)';
COMMENT ON COLUMN public.product."Colour" IS 'Product colour';
COMMENT ON COLUMN public.product."sz / wt" IS 'Product size or weight';
COMMENT ON COLUMN public.product."QTY" IS 'Quantity per pack as text';
COMMENT ON COLUMN public.product."UOM QTY" IS 'Unit of Measure Quantity as text (e.g., "1ml", "250ml")';
COMMENT ON COLUMN public.product."Amount" IS 'Amount field';
COMMENT ON COLUMN public.product."Order number" IS 'Product order code';
COMMENT ON COLUMN public.product."Price" IS 'Product price in pounds and pence (e.g., 12.50 for £12.50)';
COMMENT ON COLUMN public.product."pricePounds" IS 'Product price in pounds as text';

COMMENT ON TABLE public.user_favorites IS 'Stores user favorites with usage tracking';
COMMENT ON COLUMN public.user_favorites.session_id IS 'User session identifier';
COMMENT ON COLUMN public.user_favorites.product_id IS 'Reference to product';
COMMENT ON COLUMN public.user_favorites.order_code IS 'Product order code at time of favoriting';
COMMENT ON COLUMN public.user_favorites.usage_frequency IS 'How often the product is used per period';
COMMENT ON COLUMN public.user_favorites.usage_period IS 'The usage period (day, week, month)';
COMMENT ON COLUMN public.user_favorites.display_order IS 'Order for displaying favorites';

-- Display setup completion message
SELECT 'Database setup completed successfully!' as status;

