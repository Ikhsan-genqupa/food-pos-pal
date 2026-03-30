-- Create a security definer function that admins can call to list all users
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  role text,
  outlet_id uuid,
  outlet_name text,
  outlet_branch text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    COALESCE((au.raw_user_meta_data->>'username'), split_part(au.email, '@', 1))::text AS username,
    COALESCE(ur.role::text, 'outlet') AS role,
    p.outlet_id,
    o.name::text AS outlet_name,
    o.branch_number::text AS outlet_branch,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.outlets o ON o.id = p.outlet_id
  ORDER BY au.created_at ASC;
END;
$$;

-- Grant execute permission to authenticated users (RLS inside the function handles admin check)
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
