
-- 1. Create app_role enum
create type public.app_role as enum ('admin', 'kasir', 'outlet');

-- 2. User Roles (must exist before has_role function)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- 3. Security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS for user_roles
create policy "Users can read own role" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- 4. Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "Anyone can read categories" on public.categories for select to authenticated using (true);
create policy "Admins can insert categories" on public.categories for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update categories" on public.categories for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete categories" on public.categories for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 5. Outlets
create table public.outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch_number text not null,
  address text not null default '',
  person_in_charge text not null default '',
  username text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.outlets enable row level security;
create policy "Anyone can read outlets" on public.outlets for select to authenticated using (true);
create policy "Admins can insert outlets" on public.outlets for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update outlets" on public.outlets for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete outlets" on public.outlets for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 6. Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  price numeric not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Anyone can read products" on public.products for select to authenticated using (true);
create policy "Admins can insert products" on public.products for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update products" on public.products for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete products" on public.products for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 7. Stocks
create table public.stocks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(product_id, outlet_id)
);
alter table public.stocks enable row level security;
create policy "Anyone can read stocks" on public.stocks for select to authenticated using (true);
create policy "Authenticated can insert stocks" on public.stocks for insert to authenticated with check (true);
create policy "Authenticated can update stocks" on public.stocks for update to authenticated using (true);

-- 8. Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique,
  outlet_id uuid references public.outlets(id) on delete set null,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null default 'cash',
  cash_received numeric not null default 0,
  change_amount numeric not null default 0,
  cashier_name text,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "Anyone can read transactions" on public.transactions for select to authenticated using (true);
create policy "Authenticated can insert transactions" on public.transactions for insert to authenticated with check (true);

-- 9. Transaction Items
create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  price numeric not null default 0,
  total numeric not null default 0
);
alter table public.transaction_items enable row level security;
create policy "Anyone can read transaction_items" on public.transaction_items for select to authenticated using (true);
create policy "Authenticated can insert transaction_items" on public.transaction_items for insert to authenticated with check (true);

-- 10. Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Admins can read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can insert profiles" on public.profiles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 11. Function: clean_invalid_stocks
create or replace function public.clean_invalid_stocks()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_invalid_products integer;
  deleted_invalid_outlets integer;
begin
  delete from public.stocks where product_id not in (select id from public.products);
  get diagnostics deleted_invalid_products = row_count;
  delete from public.stocks where outlet_id not in (select id from public.outlets);
  get diagnostics deleted_invalid_outlets = row_count;
  return json_build_object(
    'success', true,
    'deleted_invalid_products', deleted_invalid_products,
    'deleted_invalid_outlets', deleted_invalid_outlets,
    'total_deleted', deleted_invalid_products + deleted_invalid_outlets
  );
end;
$$;

-- 12. Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
