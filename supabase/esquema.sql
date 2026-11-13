-- VELT Escolar · base de datos (Supabase / Postgres)
-- Se pega UNA vez en Supabase → SQL Editor → New query → Run.
-- Solo datos del personal del centro: VELT no guarda datos de alumnos.
-- Todas las tablas tienen seguridad por filas (RLS): cada persona solo ve su centro,
-- solo dirección y jefatura cambian la configuración y cada uno solo lee sus avisos.

create extension if not exists "pgcrypto";

-- ——— Centros ———
-- La configuración del centro (jornada, personal, plantas, aulas, horario semanal,
-- plan del curso, material, reservas, ausencias del día) es un único documento.
create table if not exists centros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  estado jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now(),
  creado timestamptz not null default now()
);

-- Quién es quién: cada cuenta pertenece a un centro y es una persona del personal
create table if not exists miembros (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  centro_id uuid not null references centros (id) on delete cascade,
  persona_id text not null, -- el id de la persona dentro de centros.estado.personal
  gestion boolean not null default false, -- dirección o jefatura
  creado timestamptz not null default now(),
  unique (centro_id, persona_id)
);
create index if not exists miembros_centro on miembros (centro_id);

create or replace function mi_centro() returns uuid
language sql stable security definer set search_path = public as $$
  select centro_id from miembros where usuario_id = auth.uid()
$$;

create or replace function mi_persona() returns text
language sql stable security definer set search_path = public as $$
  select persona_id from miembros where usuario_id = auth.uid()
$$;

create or replace function soy_gestion() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select gestion from miembros where usuario_id = auth.uid()), false)
$$;

alter table centros enable row level security;
alter table miembros enable row level security;

drop policy if exists "ver mi centro" on centros;
create policy "ver mi centro" on centros for select using (id = mi_centro());
drop policy if exists "dirección cambia el centro" on centros;
create policy "dirección cambia el centro" on centros for update using (id = mi_centro() and soy_gestion()) with check (id = mi_centro());

drop policy if exists "ver a mis compañeros" on miembros;
create policy "ver a mis compañeros" on miembros for select using (centro_id = mi_centro());
drop policy if exists "dirección quita cuentas" on miembros;
create policy "dirección quita cuentas" on miembros for delete using (centro_id = mi_centro() and soy_gestion() and usuario_id <> auth.uid());

-- Dirección crea su centro: queda como primera persona y con permisos de gestión
create or replace function crear_centro(p_nombre text, p_persona text, p_estado jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare nuevo uuid;
begin
  if auth.uid() is null then raise exception 'Hay que iniciar sesión'; end if;
  if exists (select 1 from miembros where usuario_id = auth.uid()) then raise exception 'Esta cuenta ya pertenece a un centro'; end if;
  insert into centros (nombre, estado) values (p_nombre, p_estado) returning id into nuevo;
  insert into miembros (usuario_id, centro_id, persona_id, gestion) values (auth.uid(), nuevo, p_persona, true);
  return nuevo;
end $$;

-- Unirse con el código de invitación que dirección le da a cada persona
create or replace function unirse(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid; p jsonb;
begin
  if auth.uid() is null then raise exception 'Hay que iniciar sesión'; end if;
  if exists (select 1 from miembros where usuario_id = auth.uid()) then raise exception 'Esta cuenta ya pertenece a un centro'; end if;
  select id, e into c, p from centros, jsonb_array_elements(estado -> 'personal') e
   where upper(e ->> 'codigo') = upper(trim(p_codigo)) and coalesce((e ->> 'baja')::boolean, false) = false limit 1;
  if c is null then raise exception 'Código no válido'; end if;
  if exists (select 1 from miembros where centro_id = c and persona_id = p ->> 'id') then raise exception 'Esta persona ya tiene cuenta'; end if;
  insert into miembros (usuario_id, centro_id, persona_id, gestion)
  values (auth.uid(), c, p ->> 'id', (p ->> 'rol') in ('Dirección', 'Jefatura'));
  return c;
end $$;

-- Lo poco que el profesorado puede cambiar del centro: avisar de una avería y reservar un aula
create or replace function marcar_averia(p_material text, p_nota text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update centros set actualizado = now(), estado = jsonb_set(estado, '{materiales}', (
    select coalesce(jsonb_agg(case when m ->> 'id' = p_material
      then m || jsonb_build_object('estado', 'averiado', 'nota', p_nota) - 'prestadoA' else m end), '[]'::jsonb)
    from jsonb_array_elements(estado -> 'materiales') m))
  where id = mi_centro();
end $$;

create or replace function reservar_espacio(p_clave text, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update centros set actualizado = now(),
    estado = jsonb_set(estado, '{reservas}', coalesce(estado -> 'reservas', '{}'::jsonb) || jsonb_build_object(p_clave, p_motivo))
  where id = mi_centro() and not (coalesce(estado -> 'reservas', '{}'::jsonb) ? p_clave);
end $$;

-- ——— Tareas, avisos y mensajes ———
create table if not exists tareas (
  id text primary key,
  centro_id uuid not null references centros (id) on delete cascade default mi_centro(),
  responsable text not null,
  de text not null,
  datos jsonb not null,
  actualizado timestamptz not null default now()
);
create index if not exists tareas_centro on tareas (centro_id);

create table if not exists avisos (
  id text primary key,
  centro_id uuid not null references centros (id) on delete cascade default mi_centro(),
  para text not null,
  datos jsonb not null,
  creado timestamptz not null default now()
);
create index if not exists avisos_para on avisos (centro_id, para);

create table if not exists mensajes (
  id text primary key,
  centro_id uuid not null references centros (id) on delete cascade default mi_centro(),
  de text not null,
  para text not null,
  datos jsonb not null,
  creado timestamptz not null default now()
);
create index if not exists mensajes_centro on mensajes (centro_id);

alter table tareas enable row level security;
alter table avisos enable row level security;
alter table mensajes enable row level security;

-- Tareas: todo el centro las ve (el seguimiento es del equipo); las crea quien
-- dirige o cualquiera para sí mismo; las cambia dirección o su responsable
drop policy if exists "ver tareas" on tareas;
create policy "ver tareas" on tareas for select using (centro_id = mi_centro());
drop policy if exists "crear tareas" on tareas;
create policy "crear tareas" on tareas for insert with check (centro_id = mi_centro() and de = mi_persona());
drop policy if exists "cambiar tareas" on tareas;
create policy "cambiar tareas" on tareas for update using (centro_id = mi_centro() and (soy_gestion() or responsable = mi_persona() or de = mi_persona()));
drop policy if exists "borrar tareas" on tareas;
create policy "borrar tareas" on tareas for delete using (centro_id = mi_centro() and soy_gestion());

-- Avisos: cada uno lee y marca como leídos solo los suyos; cualquiera del centro puede avisar
drop policy if exists "mis avisos" on avisos;
create policy "mis avisos" on avisos for select using (centro_id = mi_centro() and para = mi_persona());
drop policy if exists "avisar" on avisos;
create policy "avisar" on avisos for insert with check (centro_id = mi_centro());
drop policy if exists "leer mis avisos" on avisos;
create policy "leer mis avisos" on avisos for update using (centro_id = mi_centro() and para = mi_persona());
drop policy if exists "retirar avisos" on avisos;
create policy "retirar avisos" on avisos for delete using (centro_id = mi_centro() and datos ->> 'de' = mi_persona());

-- Mensajes: solo los ven quien escribe y quien recibe
drop policy if exists "mis mensajes" on mensajes;
create policy "mis mensajes" on mensajes for select using (centro_id = mi_centro() and (de = mi_persona() or para = mi_persona()));
drop policy if exists "escribir" on mensajes;
create policy "escribir" on mensajes for insert with check (centro_id = mi_centro() and de = mi_persona());

-- Cambios en directo para todos los dispositivos
do $$ begin
  alter publication supabase_realtime add table centros, tareas, avisos, mensajes;
exception when duplicate_object then null; end $$;
