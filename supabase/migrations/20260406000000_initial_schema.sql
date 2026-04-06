create table if not exists projects (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  name          text not null,
  client_name   text not null,
  description   text,
  display_title text,
  offer_summary text,
  deliverables  jsonb default '[]',
  timeline      text,
  price         text,
  status        text default 'offer' check (status in ('offer','active','completed')),
  share_key     text unique default substring(md5(gen_random_uuid()::text),1,12)
);

create table if not exists task_groups (
  id         uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  project_id uuid not null references projects(id) on delete cascade,
  name       text not null
);

create table if not exists tasks (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  group_id    uuid not null references task_groups(id) on delete cascade,
  title       text not null,
  description text,
  status      text default 'todo' check (status in ('todo','doing','done'))
);

create table if not exists labels (
  id         uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  project_id uuid not null references projects(id) on delete cascade,
  name       text not null,
  color      text default '#6b7280'
);

create table if not exists task_labels (
  task_id  uuid not null references tasks(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create table if not exists contact_requests (
  id         uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name       text not null,
  email      text not null,
  message    text,
  read       boolean default false
);

alter table projects         enable row level security;
alter table task_groups      enable row level security;
alter table tasks            enable row level security;
alter table labels           enable row level security;
alter table task_labels      enable row level security;
alter table contact_requests enable row level security;

create policy "anon all" on projects         for all to anon using (true) with check (true);
create policy "anon all" on task_groups      for all to anon using (true) with check (true);
create policy "anon all" on tasks            for all to anon using (true) with check (true);
create policy "anon all" on labels           for all to anon using (true) with check (true);
create policy "anon all" on task_labels      for all to anon using (true) with check (true);
create policy "anon all" on contact_requests for all to anon using (true) with check (true);
