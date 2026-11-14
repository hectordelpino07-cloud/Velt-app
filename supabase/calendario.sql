-- VELT Escolar · calendario de cada persona (Google Calendar, iPhone, Outlook)
-- Se pega UNA vez en Supabase → SQL Editor → New query → Run (con la traducción
-- de Chrome desactivada). Crea un enlace privado por persona que su calendario
-- consulta solo cada pocas horas: clases, guardias y tareas, con aviso antes.

-- Enlace privado de cada cuenta (solo lo ve su dueño)
create table if not exists calendarios (
  usuario_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  token uuid not null unique default gen_random_uuid()
);
alter table calendarios enable row level security;
drop policy if exists "mi enlace" on calendarios;
create policy "mi enlace" on calendarios for select using (usuario_id = auth.uid());

create or replace function mi_calendario() returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'Hay que iniciar sesión'; end if;
  insert into calendarios (usuario_id) values (auth.uid()) on conflict (usuario_id) do nothing;
  select token into t from calendarios where usuario_id = auth.uid();
  return t;
end $$;

-- Para que la respuesta sea un calendario (.ics) y no JSON
do $$ begin
  create domain "text/calendar" as text;
exception when duplicate_object then null; end $$;

create or replace function ics_texto(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), '\', '\\'), ';', '\;'), ',', '\,'), E'\n', '\n')
$$;

-- El calendario: se pide con ?token=… y no necesita sesión (el token es la llave)
create or replace function calendario(token uuid) returns "text/calendar"
language plpgsql stable security definer set search_path = public as $$
declare
  m record; c record; e jsonb;
  franjas jsonb; semana jsonb; dia jsonb; h jsonb; f jsonb;
  lunes date := date_trunc('week', now() at time zone 'Europe/Madrid')::date;
  fin_curso text;
  sale text := '';
  titulo text; lugar text; ini text; fin text; fecha date; hora text;
  t record;
begin
  select mb.* into m from calendarios ca join miembros mb on mb.usuario_id = ca.usuario_id where ca.token = calendario.token;
  if not found then
    return E'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//VELT//Escolar//ES\r\nEND:VCALENDAR\r\n';
  end if;
  select * into c from centros where id = m.centro_id;
  franjas := c.estado -> 'franjas';
  semana := c.estado -> 'semana' -> m.persona_id;
  -- El curso termina el 30 de junio
  fin_curso := to_char(make_date(extract(year from now())::int + case when extract(month from now()) >= 7 then 1 else 0 end, 6, 30), 'YYYYMMDD') || 'T235959Z';

  sale := 'BEGIN:VCALENDAR' || E'\r\n' || 'VERSION:2.0' || E'\r\n' || 'PRODID:-//VELT//Escolar//ES' || E'\r\n'
    || 'CALSCALE:GREGORIAN' || E'\r\n' || 'METHOD:PUBLISH' || E'\r\n'
    || 'X-WR-CALNAME:VELT · ' || ics_texto(c.nombre) || E'\r\n'
    || 'X-WR-TIMEZONE:Europe/Madrid' || E'\r\n' || 'REFRESH-INTERVAL;VALUE=DURATION:PT1H' || E'\r\n';

  -- Clases y guardias de la semana, que se repiten cada semana hasta fin de curso
  if semana is not null then
    for d in 0 .. jsonb_array_length(semana) - 1 loop
      dia := semana -> d;
      for i in 0 .. coalesce(jsonb_array_length(dia), 0) - 1 loop
        h := dia -> i; f := franjas -> i;
        if f is null then continue; end if;
        titulo := null; lugar := null;
        if jsonb_typeof(h) = 'object' and h ? 'grupo' then
          titulo := (h ->> 'materia') || ' · ' || (h ->> 'grupo');
          select x ->> 'nombre' into lugar from jsonb_array_elements(c.estado -> 'espacios') x where x ->> 'id' = h ->> 'espacio';
        elsif h = '"guardia"'::jsonb then
          titulo := 'Guardia';
        elsif jsonb_typeof(h) = 'object' and h ->> 'motivo' = 'Guardia de recreo' then
          titulo := 'Guardia de recreo';
          select x ->> 'nombre' into lugar from jsonb_array_elements(c.estado -> 'espacios') x where x ->> 'id' = h ->> 'lugar';
        end if;
        if titulo is null then continue; end if;
        ini := to_char(lunes + d, 'YYYYMMDD') || 'T' || replace(f ->> 'inicio', ':', '') || '00';
        fin := to_char(lunes + d, 'YYYYMMDD') || 'T' || replace(f ->> 'fin', ':', '') || '00';
        sale := sale || 'BEGIN:VEVENT' || E'\r\n'
          || 'UID:velt-' || m.persona_id || '-' || d || '-' || i || '@velt' || E'\r\n'
          || 'DTSTAMP:' || to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"') || E'\r\n'
          || 'DTSTART;TZID=Europe/Madrid:' || ini || E'\r\n'
          || 'DTEND;TZID=Europe/Madrid:' || fin || E'\r\n'
          || 'RRULE:FREQ=WEEKLY;UNTIL=' || fin_curso || E'\r\n'
          || 'SUMMARY:' || ics_texto(titulo) || E'\r\n'
          || case when lugar is not null then 'LOCATION:' || ics_texto(lugar) || E'\r\n' else '' end
          || 'BEGIN:VALARM' || E'\r\n' || 'ACTION:DISPLAY' || E'\r\n' || 'DESCRIPTION:' || ics_texto(titulo) || E'\r\n'
          || 'TRIGGER:-PT10M' || E'\r\n' || 'END:VALARM' || E'\r\n'
          || 'END:VEVENT' || E'\r\n';
      end loop;
    end loop;
  end if;

  -- Tareas pendientes con fecha: a su hora (o todo el día), con aviso una hora antes y el día anterior
  for t in select datos from tareas where centro_id = m.centro_id and responsable = m.persona_id
            and coalesce(datos ->> 'estado', '') <> 'hecha' and datos ->> 'fecha' is not null loop
    fecha := (t.datos ->> 'fecha')::date;
    hora := t.datos ->> 'hora';
    sale := sale || 'BEGIN:VEVENT' || E'\r\n'
      || 'UID:velt-tarea-' || (t.datos ->> 'id') || '@velt' || E'\r\n'
      || 'DTSTAMP:' || to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"') || E'\r\n'
      || case when hora is null
           then 'DTSTART;VALUE=DATE:' || to_char(fecha, 'YYYYMMDD') || E'\r\n'
           else 'DTSTART;TZID=Europe/Madrid:' || to_char(fecha, 'YYYYMMDD') || 'T' || replace(hora, ':', '') || '00' || E'\r\n'
             || 'DURATION:PT30M' || E'\r\n' end
      || 'SUMMARY:' || ics_texto('Tarea: ' || (t.datos ->> 'titulo')) || E'\r\n'
      || 'DESCRIPTION:' || ics_texto(coalesce(t.datos ->> 'porque', '')) || E'\r\n'
      || 'BEGIN:VALARM' || E'\r\n' || 'ACTION:DISPLAY' || E'\r\n' || 'DESCRIPTION:' || ics_texto(t.datos ->> 'titulo') || E'\r\n'
      || 'TRIGGER:' || case when hora is null then 'PT8H' else '-PT1H' end || E'\r\n' || 'END:VALARM' || E'\r\n'
      || 'BEGIN:VALARM' || E'\r\n' || 'ACTION:DISPLAY' || E'\r\n' || 'DESCRIPTION:Mañana: ' || ics_texto(t.datos ->> 'titulo') || E'\r\n'
      || 'TRIGGER:-P1D' || E'\r\n' || 'END:VALARM' || E'\r\n'
      || 'END:VEVENT' || E'\r\n';
  end loop;

  return sale || 'END:VCALENDAR' || E'\r\n';
end $$;

grant execute on function calendario(uuid) to anon, authenticated;
grant execute on function mi_calendario() to authenticated;
