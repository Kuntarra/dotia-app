// "Hoy" en fecha de Chile (YYYY-MM-DD), independiente de la zona horaria del
// servidor (Vercel corre en UTC) y del reloj del navegador del cliente. Sin
// esto, desde ~20:00-21:00 hora Chile la app cree que ya es mañana.
export function hoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

// Suma (o resta) días a una fecha YYYY-MM-DD. Ancla al mediodía UTC para que
// el cambio de día no se vea afectado por el horario de verano.
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
