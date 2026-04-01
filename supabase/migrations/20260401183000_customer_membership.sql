
-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES public.outlets(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    membership_id TEXT UNIQUE,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated" ON public.customers FOR UPDATE TO authenticated USING (true);

-- 2. Update transactions table to link with customers
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- 3. Ensure order_source exists (was mentioned in previous tasks)
-- Already exists in types, but making sure it's in the table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='order_source') THEN
        ALTER TABLE public.transactions ADD COLUMN order_source TEXT DEFAULT 'offline';
    END IF;
END $$;
