-- Enable UUID generation
create extension if not exists "pgcrypto";

-- User profiles for authentication
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "profile_owner"
  on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Top-level journey (one per user session)
create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  created_at timestamptz default now()
);
alter table public.journeys enable row level security;
create policy "journey_owner"
  on public.journeys
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Experiences collected in phase 1
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  title text not null,
  details text,
  tags text[] default '{}',
  rank int,
  is_top7 boolean default false
);
alter table public.experiences enable row level security;
create policy "exp_owner"
  on public.experiences
  using (auth.uid() = (select user_id from public.journeys j where j.id = experiences.journey_id))
  with check (auth.uid() = (select user_id from public.journeys j where j.id = experiences.journey_id));

-- Clusters of experiences
create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  name text not null
);
create table public.cluster_experiences (
  cluster_id uuid not null references public.clusters(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  primary key (cluster_id, experience_id)
);

-- Detailed stories for top-7 experiences
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  context text,
  action text,
  skills text[] default '{}',
  emotion int check (emotion between 1 and 5),
  impact text
);
alter table public.stories enable row level security;
create policy "story_owner"
  on public.stories
  using (auth.uid() = (select user_id from public.journeys j where j.id = stories.journey_id))
  with check (auth.uid() = (select user_id from public.journeys j where j.id = stories.journey_id));
create unique index stories_journey_experience_idx on public.stories (journey_id, experience_id);

-- AI analysis result
create table public.analysis (
  journey_id uuid primary key references public.journeys(id) on delete cascade,
  themes text[] default '{}',
  core_values text[] default '{}',
  implications text[] default '{}',
  top_skills text[] default '{}'
);

-- Stored Phase 4 analysis in Markdown
create table public.analysis_results (
  journey_id uuid primary key references public.journeys(id) on delete cascade,
  content text,
  created_at timestamptz default now()
);
alter table public.analysis_results enable row level security;
create policy "analysis_results_owner"
  on public.analysis_results
  using (auth.uid() = (select user_id from public.journeys j where j.id = analysis_results.journey_id))
  with check (auth.uid() = (select user_id from public.journeys j where j.id = analysis_results.journey_id));

-- Context profile
create table public.context_profiles (
  journey_id uuid primary key references public.journeys(id) on delete cascade,
  chips text[] default '{}',
  notes text
);

-- Career plan (goal, options, roadmap, risks)
create table public.plans (
  journey_id uuid primary key references public.journeys(id) on delete cascade,
  goal text not null
);

create table public.plan_options (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.plans(journey_id) on delete cascade,
  text text not null
);

create table public.plan_roadmap (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.plans(journey_id) on delete cascade,
  horizon text not null
);

create table public.plan_roadmap_actions (
  roadmap_id uuid not null references public.plan_roadmap(id) on delete cascade,
  action text not null,
  id uuid primary key default gen_random_uuid()
);

create table public.plan_risks (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.plans(journey_id) on delete cascade,
  risk text not null,
  mitigation text not null
);
