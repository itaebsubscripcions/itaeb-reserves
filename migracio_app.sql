-- ============================================================
-- ITAEB · Reserves — Migració per a l'aplicació connectada
-- Executa-ho a Supabase → SQL Editor → New query.
-- És reexecutable: no fa res si ja està aplicat.
-- ============================================================

-- 1) Columnes que l'aplicació necessita i que no hi eren
alter table reserves add column if not exists sol_nom          text;  -- nom visible del sol·licitant
alter table reserves add column if not exists responsable_nom  text;  -- nom de l'alumne/a responsable
alter table reserves add column if not exists origen           text;  -- 'escaneig' quan ve del lector de codis

-- 2) El lot passa a ser text (l'app genera identificadors propis)
alter table reserves alter column lot type text using lot::text;

-- 3) La clau forana de sol_email bloquejava el primer accés d'un usuari nou.
--    L'esborrem: qui entra amb @itaeb.cat ja queda donat d'alta pel trigger.
alter table reserves drop constraint if exists reserves_sol_email_fkey;

-- 4) Permisos que faltaven per a la gestió de catàlegs des de l'aplicació
drop policy if exists usuaris_gestio on usuaris;
create policy usuaris_gestio on usuaris for all to authenticated
  using (rol_actual() in ('consergeria','administrador'))
  with check (rol_actual() in ('consergeria','administrador'));

-- 5) Comprovació ràpida
select
  (select count(*) from material)    as referencies_material,
  (select count(*) from espais)      as espais,
  (select count(*) from protocols)   as franges_protocol,
  (select count(*) from usuaris)     as usuaris,
  (select count(*) from reserves)    as reserves;
