-- VELT Escolar · esquema de la base de datos (Supabase / Postgres)
-- Se pega una vez en Supabase → SQL Editor → Run.
-- Solo datos del personal del centro: VELT no guarda datos de alumnos.
-- Cada tabla tiene seguridad por filas (RLS): cada persona solo ve su centro.

create extension if not exists "pgcrypto";

-- ——— Centros y personas ———
create table centros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado timestamptz not null default now()
);

create table personas (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros (id) on delete cascade,
  usuario_id uuid references auth.users (id) on delete set null, -- su cuenta, si ya ha entrado
  nombre text not null,
  apellido text not null default '',
  rol text not null check (rol in ('Dirección', 'Jefatura', 'Profesorado', 'Conserjería', 'Secretaría')),
  turno text not null default 'manana' check (turno in ('manana', 'tarde', 'ambos')),
  materia text,
  baja boolean not null default false,
  creado timestamptz not null default now()
);
create index on personas (centro_id);
create unique index on personas (usuario_id) where usuario_id is not null;

-- ¿A qué centro pertenece quien hace la consulta? ¿Es dirección?
create or replace function mi_centro() returns uuid
language sql stable security definer set search_path = public as $$
  select centro_id from personas where usuario_id = auth.uid() and not baja limit 1
$$;

create or replace function soy_direccion() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from personas where usuario_id = auth.uid() and not baja and rol in ('Dirección', 'Jefatura'))
$$;

create or replace function mi_persona() returns uuid
language sql stable security definer set search_path = public as $$
  select id from personas where usuario_id = auth.uid() and not baja limit 1
$$;

-- ——— Configuración del centro ———
create table plantas (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros (id) on delete cascade,
  nombre text not null,
  orden int not null default 0
);

create table espacios (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros (id) on delete cascade,
  planta_id uuid not null references plantas (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('aula', 'especial', 'oficina', 'exterior')),
  cerrado text, -- motivo, si está cerrado
  orden int not null default 0
);

create table franjas (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros (id) on delete cascade,
  inicio time not null,
  fin time not null check (fin > inicio),
  nombre text not null,
  turno text not null check (turno in ('manana', 'tarde')),
  recreo boolean not null default false,
  orden int not null default 0
);

-- Qué hace cada persona en cada franja
create table horario (
  centro_id uuid not null references centros (id) on delete cascade,
  persona_id uuid not null references personas (id) on delete cascade,
  franja_id uuid not null references franjas (id) on delete cascade,
  tipo text not null check (tipo in ('clase', 'guardia', 'libre', 'fuera', 'lugar')),
  espacio_id uuid references espacios (id) on delete set null,
  grupo text,   -- «2.º ESO A»: solo el nombre del grupo, nunca alumnos
  materia text,
  motivo text,  -- para tipo «lugar»: «Jefatura de estudios», «Conserjería»…
  primary key (persona_id, franja_id)
);

create table materiales (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('proyector', 'pizarra', 'portatil', 'audio', 'laboratorio', 'otro')),
  cantidad int not null default 1 check (cantidad > 0),
  espacio_id uuid references espacios (id) on delete set null, -- null = almacén
  estado text not null default 'ok' check (estado in ('ok', 'averiado', 'prestado')),
  prestado_a uuid references personas (id) on delete set null,
  nota text
);

-- ——— Día a día ———
create table reservas (
  centro_id uuid not null references centros (id) on delete cascade,
  fecha date not null,
  franja_id uuid not null references franjas (id) on delete cascade,
  espacio_id uuid not null references espacios (id) on delete cascade,
  motivo text not null,
  primary key (fecha, franja_id, espacio_id)
);

create table ausencias (
  centro_id uuid not null references centros (id) on delete cascade,
  persona_id uuid not null references personas (id) on delete cascade,
  fecha date not null,
  primary key (persona_id, fecha)
);

create table guardias (
  centro_id uuid not null references centros (id) on delete cascade,
  fecha date not null,
  franja_id uuid not null references franjas (id) on delete cascade,
  espacio_id uuid not null references espacios (id) on delete cascade,
  cubre uuid not null references personas (id) on delete cascade,
  primary key (fecha, franja_id, espacio_id)
);

create table tareas (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros (id) on delete cascade,
  responsable_id uuid not null references personas (id) on delete cascade,
  creada_por uuid references personas (id) on delete set null,
  titulo text not null,
  fecha date,
  hora time,
  porque text not null default '',
  nota text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'hecha')),
  duda text,
  respuesta text,
  creada timestamptz not null default now()
);
create index on tareas (centro_id, estado);
create index on tareas (responsable_id);

-- ——— Seguridad por filas ———
-- Todos los del centro leen su centro. Dirección y jefatura cambian la configuración.
-- Cada persona puede actualizar sus propias tareas (confirmar, hecha, duda).
do $$
declare t text;
begin
  foreach t in array array['plantas', 'espacios', 'franjas', 'horario', 'materiales', 'reservas', 'ausencias', 'guardias'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "leer su centro" on %I for select using (centro_id = mi_centro())', t);
    execute format('create policy "direccion escribe" on %I for all using (centro_id = mi_centro() and soy_direccion()) with check (centro_id = mi_centro() and soy_direccion())', t);
  end loop;
end $$;

alter table centros enable row level security;
create policy "leer mi centro" on centros for select using (id = mi_centro());

alter table personas enable row level security;
create policy "leer personal del centro" on personas for select using (centro_id = mi_centro());
create policy "direccion gestiona personal" on personas for all using (centro_id = mi_centro() and soy_direccion()) with check (centro_id = mi_centro() and soy_direccion());

alter table tareas enable row level security;
create policy "leer tareas del centro" on tareas for select using (centro_id = mi_centro());
create policy "direccion crea y edita tareas" on tareas for all using (centro_id = mi_centro() and soy_direccion()) with check (centro_id = mi_centro() and soy_direccion());
create policy "responsable actualiza su tarea" on tareas for update using (responsable_id = mi_persona()) with check (responsable_id = mi_persona());

-- Las tareas cambian en directo en todos los móviles del centro
alter publication supabase_realtime add table tareas, ausencias, guardias, reservas, materiales;
