-- Database Migration: Add UOM QTY Column
-- Run this in your Supabase SQL Editor to add the UOM QTY column

-- Add the uom_qty column to the products table
ALTER TABLE products ADD COLUMN uom_qty INTEGER;

-- Add index for better query performance
CREATE INDEX idx_products_uom_qty ON products(uom_qty);

-- Update existing records with a default value if needed
-- (Optional: You may want to set this based on your data requirements)
-- UPDATE products SET uom_qty = 1 WHERE uom_qty IS NULL;

-- Add comment to describe the column
COMMENT ON COLUMN products.uom_qty IS 'Unit of Measure Quantity - the quantity per unit of measure';

-- Verify the change was successful
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' AND column_name = 'uom_qty';