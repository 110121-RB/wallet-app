-- Step 5: savings goals and contribution ledger.
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  target_amount numeric(18,2) not null check (target_amount > 0),
  currency text not null default 'JPY' check (currency = 'JPY'),
  deadline date,
  color text not null default '#a3e635',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(18,2) not null check (amount <> 0),
  note text,
  contribution_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists savings_goals_user_idx on public.savings_goals(user_id);
create index if not exists savings_contributions_goal_idx on public.savings_contributions(goal_id, contribution_date desc);
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
grant select, insert, update, delete on public.savings_goals, public.savings_contributions to authenticated;
drop policy if exists "Users own savings goals" on public.savings_goals;
create policy "Users own savings goals" on public.savings_goals for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users own savings contributions" on public.savings_contributions;
create policy "Users own savings contributions" on public.savings_contributions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.savings_goals g where g.id = goal_id and g.user_id = auth.uid()));

create or replace function public.add_savings_contribution(p_goal_id uuid, p_amount numeric, p_note text default null, p_date date default current_date)
returns uuid language plpgsql security definer set search_path = public as $$
declare current_uid uuid := auth.uid(); current_saved numeric; result_id uuid;
begin
  if current_uid is null then raise exception 'Authentication required'; end if;
  if p_amount = 0 then raise exception 'Amount cannot be zero'; end if;
  perform 1 from public.savings_goals where id = p_goal_id and user_id = current_uid for update;
  if not found then raise exception 'Savings goal not found'; end if;
  select coalesce(sum(amount), 0) into current_saved from public.savings_contributions where goal_id = p_goal_id;
  if current_saved + p_amount < 0 then raise exception 'Withdrawal exceeds saved amount'; end if;
  insert into public.savings_contributions(goal_id, user_id, amount, note, contribution_date) values (p_goal_id, current_uid, p_amount, nullif(trim(p_note), ''), p_date) returning id into result_id;
  return result_id;
end; $$;
revoke all on function public.add_savings_contribution(uuid,numeric,text,date) from public;
grant execute on function public.add_savings_contribution(uuid,numeric,text,date) to authenticated;

create or replace function public.update_savings_contribution(
  p_contribution_id uuid,
  p_amount numeric,
  p_note text default null,
  p_date date default current_date
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  current_uid uuid := auth.uid();
  contribution_record record;
  current_saved numeric;
begin
  if current_uid is null then raise exception 'Authentication required'; end if;
  if p_amount = 0 then raise exception 'Amount cannot be zero'; end if;

  select c.* into contribution_record
  from public.savings_contributions c
  where c.id = p_contribution_id and c.user_id = current_uid
  for update;
  if not found then raise exception 'Contribution not found'; end if;

  perform 1 from public.savings_goals
  where id = contribution_record.goal_id and user_id = current_uid
  for update;

  select coalesce(sum(amount), 0) into current_saved
  from public.savings_contributions
  where goal_id = contribution_record.goal_id;

  if current_saved - contribution_record.amount + p_amount < 0 then
    raise exception 'Change would make saved amount negative';
  end if;

  update public.savings_contributions
  set amount = p_amount,
      note = nullif(trim(p_note), ''),
      contribution_date = p_date
  where id = p_contribution_id;

  return p_contribution_id;
end; $$;
revoke all on function public.update_savings_contribution(uuid,numeric,text,date) from public;
grant execute on function public.update_savings_contribution(uuid,numeric,text,date) to authenticated;

create or replace function public.delete_savings_contribution(
  p_contribution_id uuid
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  current_uid uuid := auth.uid();
  contribution_record record;
  current_saved numeric;
begin
  if current_uid is null then raise exception 'Authentication required'; end if;

  select c.* into contribution_record
  from public.savings_contributions c
  where c.id = p_contribution_id and c.user_id = current_uid
  for update;
  if not found then raise exception 'Contribution not found'; end if;

  perform 1 from public.savings_goals
  where id = contribution_record.goal_id and user_id = current_uid
  for update;

  select coalesce(sum(amount), 0) into current_saved
  from public.savings_contributions
  where goal_id = contribution_record.goal_id;

  if current_saved - contribution_record.amount < 0 then
    raise exception 'Delete would make saved amount negative';
  end if;

  delete from public.savings_contributions where id = p_contribution_id;
  return true;
end; $$;
revoke all on function public.delete_savings_contribution(uuid) from public;
grant execute on function public.delete_savings_contribution(uuid) to authenticated;

create or replace function public.set_savings_goal_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end; $$;
drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at before update on public.savings_goals
for each row execute function public.set_savings_goal_updated_at();
