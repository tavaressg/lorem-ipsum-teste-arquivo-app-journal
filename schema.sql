-- ============================================================
-- Yama Jiu-Jitsu — Supabase Schema v1
-- Idempotente: pode ser executado várias vezes sem erro.
-- Execute no SQL Editor: https://app.supabase.com → SQL Editor
-- ============================================================

-- ---- Perfil (vinculado a auth.users) ----
create table if not exists public.profiles (
  id                  uuid references auth.users on delete cascade primary key,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null,
  role                text default 'aluno' not null check (role in ('aluno','professor')),
  apelido             text,
  nome                text,
  nome_completo       text,
  iniciais            text,
  faixa               text default 'branca',
  graus               int  default 0,
  modalidade          text default 'Jiu-Jitsu',
  desde               text,
  foto                text,
  foco                text[] default '{}',
  aulas_grau_atual    int  default 0,
  aulas_grau_meta     int  default 40,
  aulas_graduacao     int  default 160,
  mensalidade_valor   numeric(10,2) default 0,
  mensalidade_status  text default 'ok',
  mensalidade_venc    text default '—',
  jogo                jsonb,
  retro               jsonb
);

-- ---- Treinos ----
create table if not exists public.treinos (
  id          bigint not null,
  user_id     uuid references auth.users on delete cascade not null,
  created_at  timestamptz default now() not null,
  tipo        text,
  data        date not null,
  titulo      text,
  tecnica     text,
  mood        text,
  feel        int,
  dia         text,
  det         jsonb,
  primary key (id, user_id)
);

-- ---- Progresso por técnica ----
create table if not exists public.tec_progress (
  user_id     uuid references auth.users on delete cascade not null,
  jp          text not null,
  estado      text default 'aprendida',
  dias        jsonb default '[]',
  hoje_a      int default 0,
  hoje_t      int default 0,
  treinos     int default 0,
  ultima      text default '—',
  ultima_rev  date,
  nota        text,
  nivel       text default 'novo',
  updated_at  timestamptz default now() not null,
  primary key (user_id, jp)
);

-- ---- Graduações ----
create table if not exists public.graduacoes (
  id          bigserial primary key,
  user_id     uuid references auth.users on delete cascade not null,
  faixa       text,
  graus       int,
  tipo        text,
  data        date,
  por         text,
  created_at  timestamptz default now() not null
);

-- ---- Notas ----
create table if not exists public.notas (
  id          bigint not null,
  user_id     uuid references auth.users on delete cascade not null,
  data        date,
  texto       text,
  created_at  timestamptz default now() not null,
  primary key (id, user_id)
);

-- ---- Lesões ----
create table if not exists public.lesoes (
  id          bigint not null,
  user_id     uuid references auth.users on delete cascade not null,
  parte       text,
  data        date,
  status      text,
  nota        text,
  created_at  timestamptz default now() not null,
  primary key (id, user_id)
);

-- ---- Check-ins ----
create table if not exists public.check_ins (
  id          bigserial primary key,
  user_id     uuid references auth.users on delete cascade not null,
  data        date not null,
  hora        text,
  unique (user_id, data)
);

-- ---- Analytics ----
create table if not exists public.analytics_events (
  id          bigserial primary key,
  user_id     uuid references auth.users on delete cascade,
  event       text not null,
  props       jsonb,
  ts          timestamptz default now() not null
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.treinos           enable row level security;
alter table public.tec_progress      enable row level security;
alter table public.graduacoes        enable row level security;
alter table public.notas             enable row level security;
alter table public.lesoes            enable row level security;
alter table public.check_ins         enable row level security;
alter table public.analytics_events  enable row level security;

-- Helper: é professor?
create or replace function public.is_professor()
returns boolean language sql security definer as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'professor');
$$;

-- ---- Policies (drop primeiro para ser idempotente) ----

-- profiles
drop policy if exists "prof_own_read"   on public.profiles;
drop policy if exists "prof_all_read"   on public.profiles;
drop policy if exists "prof_own_insert" on public.profiles;
drop policy if exists "prof_own_update" on public.profiles;
drop policy if exists "prof_all_update" on public.profiles;
create policy "prof_own_read"   on public.profiles for select using (auth.uid() = id);
create policy "prof_all_read"   on public.profiles for select using (public.is_professor());
create policy "prof_own_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "prof_own_update" on public.profiles for update using (auth.uid() = id);
create policy "prof_all_update" on public.profiles for update using (public.is_professor());

-- treinos
drop policy if exists "tr_own_all"   on public.treinos;
drop policy if exists "tr_prof_read" on public.treinos;
create policy "tr_own_all"   on public.treinos for all    using (auth.uid() = user_id);
create policy "tr_prof_read" on public.treinos for select using (public.is_professor());

-- tec_progress
drop policy if exists "tp_own_all"   on public.tec_progress;
drop policy if exists "tp_prof_read" on public.tec_progress;
create policy "tp_own_all"   on public.tec_progress for all    using (auth.uid() = user_id);
create policy "tp_prof_read" on public.tec_progress for select using (public.is_professor());

-- graduacoes
drop policy if exists "gr_own_read"   on public.graduacoes;
drop policy if exists "gr_own_insert" on public.graduacoes;
drop policy if exists "gr_prof_all"   on public.graduacoes;
create policy "gr_own_read"   on public.graduacoes for select using (auth.uid() = user_id);
create policy "gr_own_insert" on public.graduacoes for insert with check (auth.uid() = user_id);
create policy "gr_prof_all"   on public.graduacoes for all    using (public.is_professor());

-- notas
drop policy if exists "no_own_all" on public.notas;
create policy "no_own_all" on public.notas for all using (auth.uid() = user_id);

-- lesoes
drop policy if exists "le_own_all"   on public.lesoes;
drop policy if exists "le_prof_read" on public.lesoes;
create policy "le_own_all"   on public.lesoes for all    using (auth.uid() = user_id);
create policy "le_prof_read" on public.lesoes for select using (public.is_professor());

-- check_ins
drop policy if exists "ci_own_all"   on public.check_ins;
drop policy if exists "ci_prof_read" on public.check_ins;
create policy "ci_own_all"   on public.check_ins for all    using (auth.uid() = user_id);
create policy "ci_prof_read" on public.check_ins for select using (public.is_professor());

-- analytics_events
drop policy if exists "ae_own_insert" on public.analytics_events;
drop policy if exists "ae_own_read"   on public.analytics_events;
drop policy if exists "ae_prof_read"  on public.analytics_events;
create policy "ae_own_insert" on public.analytics_events for insert with check (auth.uid() = user_id);
create policy "ae_own_read"   on public.analytics_events for select using (auth.uid() = user_id);
create policy "ae_prof_read"  on public.analytics_events for select using (public.is_professor());

-- ============================================================
-- Triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists tr_profiles_upd on public.profiles;
create trigger tr_profiles_upd
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists tr_tecprog_upd on public.tec_progress;
create trigger tr_tecprog_upd
  before update on public.tec_progress
  for each row execute function public.set_updated_at();

-- Cria perfil vazio automaticamente ao criar usuário via auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values(new.id) on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Para promover um usuário a professor (após cadastro):
--   update public.profiles set role = 'professor' where id = '<uuid>';
-- O UUID aparece em: Supabase Dashboard → Authentication → Users
-- ============================================================
