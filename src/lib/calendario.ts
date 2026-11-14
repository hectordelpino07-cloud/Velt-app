// Calendario del profesorado: el horario y las tareas en Google Calendar, el
// calendario del iPhone u Outlook, con aviso antes. Funciona sin app en las tiendas.
//  · Con cuenta: un enlace privado que su calendario consulta solo cada pocas
//    horas (función `calendario` de supabase/calendario.sql).
//  · En la demo: se descarga el horario como archivo .ics.
//  · Cada tarea puede añadirse sola a Google Calendar con un toque.
import { useEffect, useState } from 'react';
import { DIAS, esClase, esLugar, Espacio, Franja, Semana } from '../data/centro';
import { useSesion } from './sesion';
import { supabase } from './supabase';

const URL_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CLAVE = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Enlace privado de la persona que ha entrado (null en la demo o si aún no existe)
export function useEnlaceCalendario() {
  const { miembro } = useSesion();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const con = !!miembro && !!supabase;
  useEffect(() => {
    if (!con || !supabase) return;
    let vivo = true;
    supabase.rpc('mi_calendario').then(({ data, error: e }) => {
      if (!vivo) return;
      if (e || !data) setError(true);
      else setToken(data as string);
    });
    return () => {
      vivo = false;
    };
  }, [con]);
  if (!token || !URL_SUPABASE || !CLAVE) return { listo: false, error, https: '', webcal: '', google: '' };
  const https = `${URL_SUPABASE}/rest/v1/rpc/calendario?token=${token}&apikey=${CLAVE}`;
  const webcal = https.replace(/^https:/, 'webcal:');
  return { listo: true, error, https, webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` };
}

const dos = (n: number) => String(n).padStart(2, '0');
const fechaIcs = (d: Date) => `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}`;
const texto = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

// Una tarea en Google Calendar, ya rellena: solo hay que pulsar «Guardar»
export function enlaceGoogleTarea(t: { titulo: string; fecha?: string | null; hora: string | null; porque?: string }) {
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `Tarea: ${t.titulo}`, details: t.porque ?? '', ctz: 'Europe/Madrid' });
  if (t.fecha) {
    const f = t.fecha.replace(/-/g, '');
    if (t.hora) {
      const [h, m] = t.hora.split(':').map(Number);
      const fin = new Date(2000, 0, 1, h, m + 30);
      p.set('dates', `${f}T${dos(h)}${dos(m)}00/${f}T${dos(fin.getHours())}${dos(fin.getMinutes())}00`);
    } else {
      const d = new Date(Number(f.slice(0, 4)), Number(f.slice(4, 6)) - 1, Number(f.slice(6, 8)) + 1);
      p.set('dates', `${f}/${fechaIcs(d)}`);
    }
  }
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// El horario semanal como archivo .ics, repetido cada semana hasta fin de curso
export function horarioIcs(nombre: string, semana: Semana | undefined, franjas: Franja[], espacios: Espacio[]) {
  const hoy = new Date();
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const finCurso = `${hoy.getFullYear() + (hoy.getMonth() >= 6 ? 1 : 0)}0630T235959Z`;
  const lugar = (id: string) => espacios.find((e) => e.id === id)?.nombre ?? '';
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VELT//Escolar//ES', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:VELT · ${texto(nombre)}`, 'X-WR-TIMEZONE:Europe/Madrid'];
  DIAS.forEach((_, d) =>
    franjas.forEach((f) => {
      const h = semana?.[d]?.[f.id];
      let titulo = '';
      let sitio = '';
      if (esClase(h)) {
        titulo = `${h.materia} · ${h.grupo}`;
        sitio = lugar(h.espacio);
      } else if (h === 'guardia') titulo = 'Guardia';
      else if (esLugar(h) && h.motivo === 'Guardia de recreo') {
        titulo = 'Guardia de recreo';
        sitio = lugar(h.lugar);
      }
      if (!titulo) return;
      const dia = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + d);
      lineas.push(
        'BEGIN:VEVENT',
        `UID:velt-${d}-${f.id}-${fechaIcs(dia)}@velt`,
        `DTSTAMP:${ahora}`,
        `DTSTART;TZID=Europe/Madrid:${fechaIcs(dia)}T${f.inicio.replace(':', '')}00`,
        `DTEND;TZID=Europe/Madrid:${fechaIcs(dia)}T${f.fin.replace(':', '')}00`,
        `RRULE:FREQ=WEEKLY;UNTIL=${finCurso}`,
        `SUMMARY:${texto(titulo)}`,
        ...(sitio ? [`LOCATION:${texto(sitio)}`] : []),
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${texto(titulo)}`,
        'TRIGGER:-PT10M',
        'END:VALARM',
        'END:VEVENT',
      );
    }),
  );
  lineas.push('END:VCALENDAR');
  return lineas.join('\r\n') + '\r\n';
}

// Descarga un archivo en la web (en el móvil lo abre el calendario)
export function descargar(nombreArchivo: string, contenido: string) {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
