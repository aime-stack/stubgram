-- =====================================================
-- Wallet Transactions RLS Verification & Fix
-- =====================================================
-- This script verifies and corrects RLS policies for the transactions table
-- to ensure authenticated users can INSERT and SELECT their own transactions.

-- 1. Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'transactions';

-- 2. View existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'transactions';

-- 3. Drop existing policies (if any) to start fresh
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transactions;

-- 4. Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create INSERT policy
-- Allow authenticated users to insert transactions where user_id matches their auth.uid()
CREATE POLICY "Users can insert their own transactions" 
  ON transactions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- 6. Create SELECT policy
-- Allow authenticated users to view their own transactions
CREATE POLICY "Users can view their own transactions" 
  ON transactions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 7. Verify policies were created
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'transactions';

-- 8. Test INSERT (uncomment to test manually in Supabase SQL Editor)
-- Note: This will only work if you're authenticated as a user
-- INSERT INTO transactions (user_id, type, amount, status, description)
-- VALUES (auth.uid(), 'CASH_IN', 1000, 'PENDING', 'Test deposit');

-- 9. Test SELECT (uncomment to test manually)
-- SELECT * FROM transactions WHERE user_id = auth.uid();
