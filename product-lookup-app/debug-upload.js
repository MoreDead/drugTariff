// Debug script to test Supabase connection and upload functionality
import { createClient } from '@supabase/supabase-js'

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wgxejxfgjtsoyfqtbvjr.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneGVqeGZnanRzb3lmcXRidmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzI0MjAsImV4cCI6MjA3Mjc0ODQyMH0.I1Xusp1mxQGqariGJy9PzIeoZ9cMlcdOO4rIXKVqXqk'

console.log('🔍 Debugging Supabase Upload...')
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('\n1. Testing Supabase connection...')
    
    // Test basic connection
    const { error } = await supabase
      .from('products')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return false
    }
    
    console.log('✅ Connection successful!')
    return true
  } catch (err) {
    console.error('❌ Connection error:', err.message)
    return false
  }
}

async function testTableStructure() {
  try {
    console.log('\n2. Testing table structure...')
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Table access failed:', error.message)
      console.log('💡 Make sure:')
      console.log('   - The "products" table exists')
      console.log('   - RLS policies allow public read access')
      console.log('   - Your anon key has the right permissions')
      return false
    }
    
    console.log('✅ Table access successful!')
    if (data && data.length > 0) {
      console.log('📊 Sample record:', Object.keys(data[0]))
    } else {
      console.log('📊 Table is empty (this is normal for new tables)')
    }
    return true
  } catch (err) {
    console.error('❌ Table structure error:', err.message)
    return false
  }
}

async function testInsert() {
  try {
    console.log('\n3. Testing data insertion...')
    
    const testProduct = {
      supplier_name: 'Test Supplier',
      vmp_name: 'Test Product Type',
      amp_name: 'Test Product Name',
      size: 'Test Size',
      qty: 10,
      price: 5.99,
      prod_ord_no: 'TEST-001',
      pk_ord_no: 'PK-TEST-001'
    }
    
    const { data, error } = await supabase
      .from('products')
      .insert([testProduct])
      .select()
    
    if (error) {
      console.error('❌ Insert failed:', error.message)
      console.log('💡 Make sure:')
      console.log('   - RLS policies allow public insert access')
      console.log('   - All required columns are present')
      console.log('   - Data types match the schema')
      return false
    }
    
    console.log('✅ Insert successful!')
    console.log('📊 Inserted record ID:', data[0].id)
    
    // Clean up test record
    await supabase
      .from('products')
      .delete()
      .eq('id', data[0].id)
    
    console.log('🧹 Test record cleaned up')
    return true
  } catch (err) {
    console.error('❌ Insert error:', err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting Supabase upload debug...\n')
  
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.log('\n❌ Cannot proceed - connection failed')
    console.log('\n🔧 Fix steps:')
    console.log('1. Create .env.local file with your Supabase credentials')
    console.log('2. Run: NEXT_PUBLIC_SUPABASE_URL=your_url NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key node debug-upload.js')
    return
  }
  
  const tableOk = await testTableStructure()
  if (!tableOk) {
    console.log('\n❌ Cannot proceed - table access failed')
    return
  }
  
  const insertOk = await testInsert()
  if (!insertOk) {
    console.log('\n❌ Cannot proceed - insert failed')
    return
  }
  
  console.log('\n🎉 All tests passed! Your Supabase setup is working correctly.')
  console.log('\n💡 If CSV upload still fails, check:')
  console.log('   - CSV file format and column names')
  console.log('   - Browser console for detailed error messages')
  console.log('   - Network tab for failed requests')
}

main().catch(console.error)
















