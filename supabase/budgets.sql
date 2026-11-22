-- Budget Management migration. Run once in the Supabase SQL Editor.

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (length(trim(category)) > 0),
  amount numeric(18, 2) not null check (amount > 0),
  period text not null check (period in ('weekly', 'monthly')),
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, period)
);

-- Also upgrades an existing budgets table created by an earlier migration.
alter table public.budgets
  alter column user_id set default auth.uid();

create index if not exists budgets_user_id_idx
  on public.budgets (user_id);

alter table public.budgets enable row level security;

grant select, insert, update, delete on public.budgets to authenticated;

drop policy if exists "Users can read their budgets" on public.budgets;
create policy "Users can read their budgets"
  on public.budgets for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their budgets" on public.budgets;
create policy "Users can create their budgets"
  on public.budgets for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their budgets" on public.budgets;
create policy "Users can update their budgets"
  on public.budgets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their budgets" on public.budgets;
create policy "Users can delete their budgets"
  on public.budgets for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_budget_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_budget_updated_at();
