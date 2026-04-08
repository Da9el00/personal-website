-- Offer document support: structured WIP offers, client responses, history.

alter table projects
  add column if not exists offer_doc     jsonb   default null,
  add column if not exists offer_is_wip  boolean default true;

create table if not exists offer_events (
  id         uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  project_id uuid not null references projects(id) on delete cascade,
  actor      text not null check (actor in ('client','admin')),
  kind       text not null,   -- 'item_status' | 'item_note' | 'comment' | 'doc_replaced'
  ref        text,            -- item id, section id, or null
  payload    jsonb default '{}'
);

create index if not exists offer_events_project_idx
  on offer_events (project_id, created_at desc);

alter table offer_events enable row level security;
create policy "anon all" on offer_events for all to anon using (true) with check (true);
