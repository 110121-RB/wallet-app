-- Step 4: recurring transactions. Run once in Supabase SQL Editor.

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(18,2) not null check (amount > 0),
  frequency text not null check (frequency in ('weekly', 'monthly')),
  next_run_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists recurring_rule_id uuid references public.recurring_rules(id) on delete set null,
  add column if not exists recurring_scheduled_date date;

create unique index if not exists transactions_recurring_occurrence_idx
  on public.transactions(recurring_rule_id, recurring_scheduled_date)
  where recurring_rule_id is not null;
create index if not exists recurring_rules_due_idx
  on public.recurring_rules(next_run_date) where is_active = true;

alter table public.recurring_rules enable row level security;
grant select, insert, update, delete on public.recurring_rules to authenticated;

drop policy if exists "Users own recurring rules" on public.recurring_rules;
create policy "Users own recurring rules" on public.recurring_rules
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.wallets w
      where w.id = wallet_id and w.user_id = (select auth.uid())
    )
  );

create or replace function public.process_my_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  rule record;
  scheduled_date date;
  created_count integer := 0;
begin
  if current_uid is null then raise exception 'Authentication required'; end if;

  for rule in
    select * from public.recurring_rules
    where user_id = current_uid and is_active and next_run_date <= current_date
    for update skip locked
  loop
    scheduled_date := rule.next_run_date;
    while scheduled_date <= current_date loop
      insert into public.transactions (
        user_id, wallet_id, name, type, category, amount, description,
        icon_name, icon_color, background_color, transaction_date,
        recurring_rule_id, recurring_scheduled_date
      ) values (
        rule.user_id, rule.wallet_id, rule.name, rule.type, rule.category,
        rule.amount, 'Created automatically', 'wallet', '#FFFFFF', '#6C63FF',
        scheduled_date, rule.id, scheduled_date
      ) on conflict (recurring_rule_id, recurring_scheduled_date)
        where recurring_rule_id is not null do nothing;

      if found then created_count := created_count + 1; end if;
      if rule.frequency = 'weekly' then
        scheduled_date := scheduled_date + 7;
      else
        scheduled_date := (scheduled_date + interval '1 month')::date;
      end if;
    end loop;
    update public.recurring_rules set next_run_date = scheduled_date, updated_at = now()
    where id = rule.id;
  end loop;
  return created_count;
end;
$$;

revoke all on function public.process_my_recurring_transactions() from public;
grant execute on function public.process_my_recurring_transactions() to authenticated;

-- Background worker used only by pg_cron. It is not callable by app users.
create or replace function public.process_all_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rule record;
  scheduled_date date;
  created_count integer := 0;
begin
  for rule in
    select * from public.recurring_rules
    where is_active and next_run_date <= current_date
    for update skip locked
  loop
    scheduled_date := rule.next_run_date;
    while scheduled_date <= current_date loop
      insert into public.transactions (
        user_id, wallet_id, name, type, category, amount, description,
        icon_name, icon_color, background_color, transaction_date,
        recurring_rule_id, recurring_scheduled_date
      ) values (
        rule.user_id, rule.wallet_id, rule.name, rule.type, rule.category,
        rule.amount, 'Created automatically', 'wallet', '#FFFFFF', '#6C63FF',
        scheduled_date, rule.id, scheduled_date
      ) on conflict (recurring_rule_id, recurring_scheduled_date)
        where recurring_rule_id is not null do nothing;
      if found then created_count := created_count + 1; end if;
      if rule.frequency = 'weekly' then
        scheduled_date := scheduled_date + 7;
      else
        scheduled_date := (scheduled_date + interval '1 month')::date;
      end if;
    end loop;
    update public.recurring_rules set next_run_date = scheduled_date, updated_at = now()
    where id = rule.id;
  end loop;
  return created_count;
end;
$$;

revoke all on function public.process_all_recurring_transactions() from public, anon, authenticated;

-- Supabase Cron runs in UTC. 00:05 UTC is 09:05 Japan time.
create extension if not exists pg_cron with schema pg_catalog;
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'process-recurring-transactions-daily') then
    perform cron.schedule(
      'process-recurring-transactions-daily',
      '5 0 * * *',
      'select public.process_all_recurring_transactions()'
    );
  end if;
end;
$$;
