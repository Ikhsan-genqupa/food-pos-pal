import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'product-images';

export async function uploadProductImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  return getProductImageUrl(filePath);
}

export function getProductImageUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteProductImage(url: string): Promise<void> {
  // Extract path from URL
  const urlObj = new URL(url);
  const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)/);
  
  if (pathMatch && pathMatch[1]) {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([pathMatch[1]]);
    
    if (error) {
      console.error('Error deleting image:', error);
    }
  }
}
