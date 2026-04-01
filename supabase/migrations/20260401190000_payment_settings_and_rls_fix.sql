
-- 1. Fix Transactions RLS (Public Access)
DROP POLICY IF EXISTS "Select transactions based on outlet" ON public.transactions;
DROP POLICY IF EXISTS "Insert transactions based on outlet" ON public.transactions;

CREATE POLICY "Enable read for all" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for payment proof" ON public.transactions FOR UPDATE 
USING (status IN ('awaiting_payment', 'awaiting_verification'))
WITH CHECK (true);

-- 2. Create Payment Settings Table
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'bank', 'ewallet', 'qris'
    provider_name TEXT NOT NULL,
    account_number TEXT,
    account_name TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Payment Settings
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read payment settings" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage payment settings" ON public.payment_settings FOR ALL TO authenticated USING (true);

-- 3. Storage Bucket for Payment Assets (QRIS)
-- Note: Supabase storage buckets are often managed via SQL as well
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-assets', 'payment-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'payment-assets');
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-assets');
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'payment-assets');
