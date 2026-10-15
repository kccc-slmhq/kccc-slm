-- SLM 예산 집행 현황 - Supabase 스키마
-- Supabase SQL Editor에서 그대로 실행하세요. (여러 번 실행해도 안전)
--
-- 회기: 매년 8월 ~ 다음 해 7월. fiscal_year 는 회기 "시작 연도"
--   예) fiscal_year = 2026  →  2026.08 ~ 2027.07

-- 회기별 예산안
create table if not exists budget_plans (
  fiscal_year integer primary key,
  total_amount bigint not null default 0 check (total_amount >= 0),
  source_filename text,
  confirmed_at timestamptz not null default now()
);

-- 예산안 항목 (큰 카테고리 + 항목명 + 배정 금액)
create table if not exists budget_items (
  id bigint generated always as identity primary key,
  fiscal_year integer not null references budget_plans(fiscal_year) on delete cascade,
  category_group text not null default '',
  category text not null,
  amount bigint not null check (amount >= 0),
  sort_order integer not null default 0,
  unique (fiscal_year, category_group, category)
);

-- 월별 장부 (확정된 달만 존재). month 는 그 달 1일
create table if not exists ledger_months (
  month date primary key check (extract(day from month) = 1),
  fiscal_year integer not null,
  source_filename text,
  confirmed_at timestamptz not null default now()
);

create index if not exists ledger_months_fiscal_year_idx on ledger_months (fiscal_year);

-- 월별 장부의 지출 내역 (사용자가 확정한 항목)
create table if not exists ledger_entries (
  id bigint generated always as identity primary key,
  month date not null references ledger_months(month) on delete cascade,
  entry_date date,
  description text not null default '',
  category_group text not null default '',
  category text not null,
  amount bigint not null check (amount >= 0),
  sort_order integer not null default 0
);

create index if not exists ledger_entries_month_idx on ledger_entries (month);

-- [업데이트] 큰 카테고리(category_group) 추가. 이미 만들어진 DB에서도 안전하게 실행됨
alter table budget_items add column if not exists category_group text not null default '';
alter table ledger_entries add column if not exists category_group text not null default '';
alter table budget_items drop constraint if exists budget_items_fiscal_year_category_key;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'budget_items_fiscal_year_category_group_category_key'
  ) then
    alter table budget_items
      add constraint budget_items_fiscal_year_category_group_category_key
      unique (fiscal_year, category_group, category);
  end if;
end $$;

-- 재정 데이터는 로그인한 사용자만 조회/수정 가능 (공개 대시보드와 달리 비공개)
alter table budget_plans enable row level security;
alter table budget_items enable row level security;
alter table ledger_months enable row level security;
alter table ledger_entries enable row level security;

drop policy if exists "authenticated full access" on budget_plans;
create policy "authenticated full access" on budget_plans
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on budget_items;
create policy "authenticated full access" on budget_items
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on ledger_months;
create policy "authenticated full access" on ledger_months
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on ledger_entries;
create policy "authenticated full access" on ledger_entries
  for all to authenticated using (true) with check (true);

-- 예산안 확정: 해당 회기의 예산안을 통째로 교체 (한 트랜잭션)
-- p_items: [{"category_group": "...", "category": "...", "amount": 123}, ...]
create or replace function save_budget(
  p_fiscal_year integer,
  p_source_filename text,
  p_items jsonb
) returns void
language plpgsql
security invoker
as $$
begin
  insert into budget_plans (fiscal_year, total_amount, source_filename, confirmed_at)
  values (
    p_fiscal_year,
    (select coalesce(sum((x->>'amount')::bigint), 0) from jsonb_array_elements(p_items) x),
    p_source_filename,
    now()
  )
  on conflict (fiscal_year) do update
    set total_amount = excluded.total_amount,
        source_filename = excluded.source_filename,
        confirmed_at = excluded.confirmed_at;

  delete from budget_items where fiscal_year = p_fiscal_year;

  insert into budget_items (fiscal_year, category_group, category, amount, sort_order)
  select p_fiscal_year, trim(coalesce(x.category_group, '')), trim(x.category), x.amount, (x.ord - 1)::integer
  from rows from (jsonb_to_recordset(p_items) as (category_group text, category text, amount bigint))
    with ordinality as x(category_group, category, amount, ord);
end;
$$;

-- 월별 장부 확정: 해당 월의 내역을 통째로 교체 (한 트랜잭션)
-- p_month: 그 달 1일. p_entries: [{"entry_date": "2026-08-03" | null, "description": "...", "category_group": "...", "category": "...", "amount": 123}, ...]
create or replace function save_ledger_month(
  p_month date,
  p_source_filename text,
  p_entries jsonb
) returns void
language plpgsql
security invoker
as $$
declare
  v_fiscal_year integer;
begin
  v_fiscal_year := case
    when extract(month from p_month) >= 8 then extract(year from p_month)::integer
    else extract(year from p_month)::integer - 1
  end;

  insert into ledger_months (month, fiscal_year, source_filename, confirmed_at)
  values (p_month, v_fiscal_year, p_source_filename, now())
  on conflict (month) do update
    set fiscal_year = excluded.fiscal_year,
        source_filename = excluded.source_filename,
        confirmed_at = excluded.confirmed_at;

  delete from ledger_entries where month = p_month;

  insert into ledger_entries (month, entry_date, description, category_group, category, amount, sort_order)
  select p_month, x.entry_date, coalesce(x.description, ''), trim(coalesce(x.category_group, '')), trim(x.category),
    x.amount, (x.ord - 1)::integer
  from rows from (
    jsonb_to_recordset(p_entries)
      as (entry_date date, description text, category_group text, category text, amount bigint)
  ) with ordinality as x(entry_date, description, category_group, category, amount, ord);
end;
$$;

revoke all on function save_budget(integer, text, jsonb) from public, anon;
revoke all on function save_ledger_month(date, text, jsonb) from public, anon;
grant execute on function save_budget(integer, text, jsonb) to authenticated;
grant execute on function save_ledger_month(date, text, jsonb) to authenticated;
