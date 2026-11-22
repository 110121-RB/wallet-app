-- -- Optional performance indexes for the transaction search screen.
-- -- Safe to run more than once in the Supabase SQL Editor.

-- create index if not exists transactions_user_date_idx
--   on public.transactions (user_id, transaction_date desc);

-- create index if not exists transactions_user_type_date_idx
--   on public.transactions (user_id, type, transaction_date desc);

-- create index if not exists transactions_user_wallet_date_idx
--   on public.transactions (user_id, wallet_id, transaction_date desc);
