/** Idempotent schema, applied automatically on first use (and by `npm run db:migrate`). */
export const SCHEMA: string[] = [
  `create table if not exists days (
    date date primary key,
    restaurant text not null default '',
    deadline text not null default '',
    runner_pid text,
    runner_name text,
    closed boolean not null default false,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists dishes (
    id uuid primary key default gen_random_uuid(),
    date date not null references days(date) on delete cascade,
    name text not null,
    price integer not null default 0 check (price >= 0),
    category text not null default 'Plat',
    position integer not null default 0
  )`,
  `create index if not exists dishes_date_idx on dishes (date)`,
  `create table if not exists orders (
    id uuid primary key default gen_random_uuid(),
    date date not null references days(date) on delete cascade,
    person_id text not null,
    name text not null,
    note text not null default '',
    lines jsonb not null default '[]'::jsonb,
    total integer not null default 0,
    created_by text not null,
    updated_at timestamptz not null default now(),
    unique (date, person_id)
  )`,
  `create index if not exists orders_person_idx on orders (person_id, date desc)`,
];
