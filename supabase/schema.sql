-- Schéma Supabase de l'application appecole.
-- À exécuter une fois dans l'éditeur SQL du projet Supabase.
--
-- Principe :
--   * une école (ecoles) regroupe des membres (moniteurs et élèves) ;
--   * toutes les données métier sont dans records (un document JSON par
--     élève, vol, validation, séance, moniteur, et les réglages) ;
--   * les moniteurs lisent et écrivent tout ce qui concerne leur école ;
--   * un élève ne lit que ses propres données, les séances auxquelles il est
--     inscrit, la liste des moniteurs et les réglages (sites, météo).

create table if not exists public.ecoles (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.membres (
  user_id uuid primary key references auth.users on delete cascade,
  ecole_id uuid not null references public.ecoles on delete cascade,
  role text not null check (role in ('moniteur', 'eleve')),
  personne_id text not null
);

create table if not exists public.invitations (
  email text primary key,
  ecole_id uuid not null references public.ecoles on delete cascade,
  role text not null check (role in ('moniteur', 'eleve')),
  personne_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.records (
  ecole_id uuid not null references public.ecoles on delete cascade,
  kind text not null check (kind in ('moniteur', 'eleve', 'vol', 'validation', 'seance', 'reglages')),
  id text not null,
  eleve_id text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (ecole_id, kind, id)
);

-- Types d'enregistrements autorisés (mis à jour si le schéma a déjà été installé)
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('moniteur', 'eleve', 'vol', 'validation', 'seance', 'journee', 'statut', 'message', 'reglages'));

create index if not exists records_eleve on public.records (ecole_id, eleve_id);

-- Fonctions d'aide (security definer pour éviter la récursion des policies)
create or replace function public.mon_ecole() returns uuid
language sql stable security definer set search_path = public as $$
  select ecole_id from membres where user_id = auth.uid()
$$;

create or replace function public.mon_role() returns text
language sql stable security definer set search_path = public as $$
  select role from membres where user_id = auth.uid()
$$;

create or replace function public.ma_personne() returns text
language sql stable security definer set search_path = public as $$
  select personne_id from membres where user_id = auth.uid()
$$;

alter table public.ecoles enable row level security;
alter table public.membres enable row level security;
alter table public.invitations enable row level security;
alter table public.records enable row level security;

drop policy if exists ecoles_lecture on public.ecoles;
create policy ecoles_lecture on public.ecoles for select
  using (id = public.mon_ecole());

drop policy if exists ecoles_modif on public.ecoles;
create policy ecoles_modif on public.ecoles for update
  using (id = public.mon_ecole() and public.mon_role() = 'moniteur');

drop policy if exists membres_lecture on public.membres;
create policy membres_lecture on public.membres for select
  using (user_id = auth.uid()
         or (ecole_id = public.mon_ecole() and public.mon_role() = 'moniteur'));

drop policy if exists membres_suppression on public.membres;
create policy membres_suppression on public.membres for delete
  using (ecole_id = public.mon_ecole() and public.mon_role() = 'moniteur');

drop policy if exists invitations_moniteurs on public.invitations;
create policy invitations_moniteurs on public.invitations for all
  using (ecole_id = public.mon_ecole() and public.mon_role() = 'moniteur')
  with check (ecole_id = public.mon_ecole() and public.mon_role() = 'moniteur');

drop policy if exists records_moniteurs on public.records;
create policy records_moniteurs on public.records for all
  using (ecole_id = public.mon_ecole() and public.mon_role() = 'moniteur')
  with check (ecole_id = public.mon_ecole() and public.mon_role() = 'moniteur');

drop policy if exists records_eleves on public.records;
create policy records_eleves on public.records for select
  using (
    ecole_id = public.mon_ecole()
    and public.mon_role() = 'eleve'
    and (
      kind in ('reglages', 'moniteur')
      or eleve_id = public.ma_personne()
      or (kind = 'seance' and data -> 'eleveIds' ? public.ma_personne())
    )
  );

-- Un élève note ses propres vols. Il ne peut ni indiquer de paiement, ni modifier
-- ou supprimer un vol dont le moniteur a déjà noté le paiement.
drop policy if exists vols_eleves_ajout on public.records;
create policy vols_eleves_ajout on public.records for insert
  with check (
    ecole_id = public.mon_ecole() and public.mon_role() = 'eleve'
    and kind = 'vol' and eleve_id = public.ma_personne()
    and data ->> 'eleveId' = public.ma_personne()
    and not (data ? 'paiement')
  );

drop policy if exists vols_eleves_modif on public.records;
create policy vols_eleves_modif on public.records for update
  using (
    ecole_id = public.mon_ecole() and public.mon_role() = 'eleve'
    and kind = 'vol' and eleve_id = public.ma_personne()
    and not (data ? 'paiement')
  )
  with check (
    ecole_id = public.mon_ecole() and public.mon_role() = 'eleve'
    and kind = 'vol' and eleve_id = public.ma_personne()
    and data ->> 'eleveId' = public.ma_personne()
    and not (data ? 'paiement')
  );

drop policy if exists vols_eleves_suppression on public.records;
create policy vols_eleves_suppression on public.records for delete
  using (
    ecole_id = public.mon_ecole() and public.mon_role() = 'eleve'
    and kind = 'vol' and eleve_id = public.ma_personne()
    and not (data ? 'paiement')
  );

-- Discussion : les élèves lisent et écrivent dans le canal « ecole » (pas dans « moniteurs »)
-- et peuvent supprimer leurs propres messages.
drop policy if exists messages_eleves_lecture on public.records;
create policy messages_eleves_lecture on public.records for select
  using (
    ecole_id = public.mon_ecole() and public.mon_role() = 'eleve'
    and kind = 'message' and data ->> 'canal' = 'ecole'
  );

drop policy if exists messages_eleves_ajout on public.records;
create policy messages_eleves_ajout on public.records for insert
  with check (
    ecole_id = public.mon_ecole() and public.mon_role() = 'eleve'
    and kind = 'message' and data ->> 'canal' = 'ecole'
    and data ->> 'auteurId' = public.ma_personne() and data ->> 'auteurRole' = 'eleve'
  );

drop policy if exists messages_eleves_suppression on public.records;
create policy messages_eleves_suppression on public.records for delete
  using (
    ecole_id = public.mon_ecole() and public.mon_role() = 'eleve'
    and kind = 'message' and data ->> 'auteurId' = public.ma_personne()
  );

-- Création d'une école par son premier moniteur.
create or replace function public.creer_ecole(p_nom text, p_personne_id text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  if exists (select 1 from membres where user_id = auth.uid()) then
    raise exception 'Ce compte fait déjà partie d''une école';
  end if;
  insert into ecoles (nom) values (p_nom) returning id into v_id;
  insert into membres (user_id, ecole_id, role, personne_id)
    values (auth.uid(), v_id, 'moniteur', p_personne_id);
  return v_id;
end;
$$;

-- Rattache le compte connecté à l'école qui l'a invité (par e-mail).
create or replace function public.rejoindre_ecole() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  inv invitations%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;
  select * into inv from invitations
    where email = lower(auth.jwt() ->> 'email');
  if not found then
    return false;
  end if;
  insert into membres (user_id, ecole_id, role, personne_id)
    values (auth.uid(), inv.ecole_id, inv.role, inv.personne_id)
    on conflict (user_id) do nothing;
  delete from invitations where email = inv.email;
  return true;
end;
$$;

revoke execute on function public.creer_ecole(text, text) from public, anon;
revoke execute on function public.rejoindre_ecole() from public, anon;
grant execute on function public.creer_ecole(text, text) to authenticated;
grant execute on function public.rejoindre_ecole() to authenticated;
