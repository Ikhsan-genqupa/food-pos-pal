
-- Create the product-images bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Set up RLS for the product-images bucket
-- Allow public access to read images
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'product-images' );

-- Allow authenticated users to upload images
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
);

-- Allow authenticated users to update/delete images
create policy "Authenticated users can update images"
on storage.objects for update
to authenticated
using ( bucket_id = 'product-images' );

create policy "Authenticated users can delete images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'product-images' );
