-- ============================================================
-- Titan Interio Stock Manager — Database Schema
-- Run this FIRST in Supabase SQL Editor (before seed files)
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users with role info)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'operator' check (role in ('admin', 'manager', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. CATEGORIES
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- 3. SUPPLIERS
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  gstin text,
  created_at timestamptz not null default now()
);

-- 4. ITEMS (inventory master)
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid references categories(id),
  sub_category text,
  unit text not null default 'PCS',
  dimensions text,
  opening_stock numeric not null default 0,
  current_stock numeric not null default 0,
  reorder_level numeric not null default 0,
  cost_price numeric not null default 0,
  selling_price numeric not null default 0,
  supplier_id uuid references suppliers(id),
  location text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_items_category on items(category_id);
create index if not exists idx_items_active on items(active);

-- 5. STOCK TRANSACTIONS (in / out / adjustment — immutable audit log)
create table if not exists stock_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id),
  type text not null check (type in ('in', 'out', 'adjustment')),
  quantity numeric not null,
  reference text,        -- PO number / invoice number for stock-in
  job_order text,         -- job/work order reference for stock-out
  reason text,            -- required for adjustments
  supplier_id uuid references suppliers(id),
  issued_to text,
  user_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_item on stock_transactions(item_id);
create index if not exists idx_transactions_date on stock_transactions(created_at);

-- ============================================================
-- FUNCTION + TRIGGER: auto-update current_stock on every transaction
-- ============================================================
create or replace function update_item_stock()
returns trigger as $$
begin
  if new.type = 'in' then
    update items set current_stock = current_stock + new.quantity, updated_at = now() where id = new.item_id;
  elsif new.type = 'out' then
    update items set current_stock = current_stock - new.quantity, updated_at = now() where id = new.item_id;
  elsif new.type = 'adjustment' then
    update items set current_stock = new.quantity, updated_at = now() where id = new.item_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_update_stock on stock_transactions;
create trigger trg_update_stock
  after insert on stock_transactions
  for each row execute function update_item_stock();

-- ============================================================
-- FUNCTION: auto-create profile when a new user signs up
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email, 'operator');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table suppliers enable row level security;
alter table items enable row level security;
alter table stock_transactions enable row level security;

-- Helper: check current user's role
create or replace function current_user_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES policies
create policy "Users can view all profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Admins can update profiles" on profiles for update using (current_user_role() = 'admin');
create policy "Admins can insert profiles" on profiles for insert with check (current_user_role() = 'admin' or auth.uid() = id);

-- CATEGORIES policies (everyone reads, manager+ writes)
create policy "Anyone authenticated can view categories" on categories for select using (auth.role() = 'authenticated');
create policy "Manager+ can manage categories" on categories for all using (current_user_role() in ('admin','manager'));

-- SUPPLIERS policies
create policy "Anyone authenticated can view suppliers" on suppliers for select using (auth.role() = 'authenticated');
create policy "Manager+ can manage suppliers" on suppliers for all using (current_user_role() in ('admin','manager'));

-- ITEMS policies
create policy "Anyone authenticated can view items" on items for select using (auth.role() = 'authenticated');
create policy "Manager+ can manage items" on items for all using (current_user_role() in ('admin','manager'));

-- STOCK TRANSACTIONS policies (everyone authenticated can view + insert; nobody edits/deletes — audit integrity)
create policy "Anyone authenticated can view transactions" on stock_transactions for select using (auth.role() = 'authenticated');
create policy "Anyone authenticated can record transactions" on stock_transactions for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- Make the FIRST user who signs up an admin automatically
-- (Run this manually after your first signup — see README)
-- ============================================================
-- update profiles set role = 'admin' where email = 'YOUR_EMAIL_HERE';
