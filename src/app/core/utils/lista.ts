/** Inserta el elemento o reemplaza el que tenga la misma clave. Devuelve una lista nueva (para signals). */
export function upsert<T>(lista: readonly T[], item: T, clave: (x: T) => unknown): T[] {
  const k = clave(item);
  const i = lista.findIndex((x) => clave(x) === k);
  if (i === -1) return [...lista, item];
  const copia = [...lista];
  copia[i] = item;
  return copia;
}

export function quitar<T>(lista: readonly T[], id: unknown, clave: (x: T) => unknown): T[] {
  return lista.filter((x) => clave(x) !== id);
}

/** Periodo actual en formato AAAA-MM (el que usa el backend). */
export function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

/** Fecha de hoy en formato AAAA-MM-DD (para <input type="date">). */
export function hoyISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}
