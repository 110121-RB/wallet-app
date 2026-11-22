-- Step 6: persistent in-app finance notifications.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in (
    'budget_warning', 'budget_exceeded', 'recurring_due', 'goal_milestone'
  )),
  title text not null,
  message text not null,
  route text,
  entity_id uuid,
  dedupe_key text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id) where is_read = false;

alter table public.notifications enable row level security;
grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists "Users own notifications" on public.notifications;
create policy "Users own notifications" on public.notifications
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.sync_finance_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  budget_record record;
  recurring_record record;
  goal_record record;
  period_start date;
  period_end date;
  spent numeric;
  percentage numeric;
  threshold_value integer;
  saved numeric;
  milestone integer;
  inserted_count integer := 0;
  affected integer;
begin
  if current_uid is null then raise exception 'Authentication required'; end if;

  for budget_record in
    select * from public.budgets where user_id = current_uid
  loop
    if budget_record.period = 'weekly' then
      period_start := current_date - (extract(isodow from current_date)::integer - 1);
      period_end := period_start + 7;
    else
      period_start := date_trunc('month', current_date)::date;
      period_end := (period_start + interval '1 month')::date;
    end if;

    select coalesce(sum(abs(t.amount)), 0) into spent
    from public.transactions t
    where t.user_id = current_uid
      and t.type = 'expense'
      and t.category = budget_record.category
      and t.transaction_date >= period_start
      and t.transaction_date < period_end;

    percentage := case
      when budget_record.amount > 0 then spent / budget_record.amount * 100
      else 0
    end;
    threshold_value := case when percentage >= 100 then 100 when percentage >= 80 then 80 else 0 end;

    if threshold_value > 0 then
      insert into public.notifications(
        user_id, type, title, message, route, entity_id, dedupe_key
      ) values (
        current_uid,
        case when threshold_value = 100 then 'budget_exceeded' else 'budget_warning' end,
        case when threshold_value = 100 then 'Budget limit reached' else 'Budget almost reached' end,
        initcap(budget_record.category) || ' is at ' || round(percentage) || '% of its ' || budget_record.period || ' budget.',
        '/budget',
        budget_record.id,
        'budget:' || budget_record.id || ':' || period_start || ':' || threshold_value
      ) on conflict (user_id, dedupe_key) do nothing;
      get diagnostics affected = row_count;
      inserted_count := inserted_count + affected;
    end if;
  end loop;

  for recurring_record in
    select * from public.recurring_rules
    where user_id = current_uid
      and is_active
      and next_run_date between current_date and current_date + 3
  loop
    insert into public.notifications(
      user_id, type, title, message, route, entity_id, dedupe_key
    ) values (
      current_uid,
      'recurring_due',
      'Recurring transaction due',
      recurring_record.name || ' is scheduled for ' || recurring_record.next_run_date || '.',
      '/recurring',
      recurring_record.id,
      'recurring:' || recurring_record.id || ':' || recurring_record.next_run_date
    ) on conflict (user_id, dedupe_key) do nothing;
    get diagnostics affected = row_count;
    inserted_count := inserted_count + affected;
  end loop;

  for goal_record in
    select g.*, coalesce(sum(c.amount), 0) as saved_amount
    from public.savings_goals g
    left join public.savings_contributions c on c.goal_id = g.id
    where g.user_id = current_uid
    group by g.id
  loop
    saved := goal_record.saved_amount;
    percentage := case
      when goal_record.target_amount > 0 then saved / goal_record.target_amount * 100
      else 0
    end;
    milestone := case
      when percentage >= 100 then 100
      when percentage >= 75 then 75
      when percentage >= 50 then 50
      when percentage >= 25 then 25
      else 0
    end;

    if milestone > 0 then
      insert into public.notifications(
        user_id, type, title, message, route, entity_id, dedupe_key
      ) values (
        current_uid,
        'goal_milestone',
        case when milestone = 100 then 'Savings goal completed' else 'Savings milestone reached' end,
        goal_record.name || ' has reached ' || milestone || '% of its target.',
        '/goal-details?id=' || goal_record.id,
        goal_record.id,
        'goal:' || goal_record.id || ':' || milestone
      ) on conflict (user_id, dedupe_key) do nothing;
      get diagnostics affected = row_count;
      inserted_count := inserted_count + affected;
    end if;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.sync_finance_notifications() from public;
grant execute on function public.sync_finance_notifications() to authenticated;
