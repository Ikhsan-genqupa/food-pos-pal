-- Enable RLS on transactions and stocks
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Policy for Transactions: SELECT
DROP POLICY IF EXISTS "Select transactions based on outlet" ON public.transactions;
CREATE POLICY "Select transactions based on outlet" 
ON public.transactions 
FOR SELECT 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  OR 
  outlet_id = (SELECT outlet_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy for Transactions: INSERT
DROP POLICY IF EXISTS "Insert transactions based on outlet" ON public.transactions;
CREATE POLICY "Insert transactions based on outlet" 
ON public.transactions 
FOR INSERT 
WITH CHECK (
  outlet_id = (SELECT outlet_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy for Stocks: SELECT
DROP POLICY IF EXISTS "Select stocks based on outlet" ON public.stocks;
CREATE POLICY "Select stocks based on outlet" 
ON public.stocks 
FOR SELECT 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  OR 
  outlet_id = (SELECT outlet_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy for Stocks: UPDATE
DROP POLICY IF EXISTS "Update stocks based on outlet" ON public.stocks;
CREATE POLICY "Update stocks based on outlet" 
ON public.stocks 
FOR UPDATE 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  OR 
  outlet_id = (SELECT outlet_id FROM public.profiles WHERE id = auth.uid())
);
