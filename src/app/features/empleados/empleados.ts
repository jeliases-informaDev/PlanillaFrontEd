import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { API_URL } from '../../core/config/api.config';
import { Empleado, TipoDocumento } from '../../core/models/empleado.model';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { hoyISO, quitar, upsert } from '../../core/utils/lista';

interface Regimen {
  idRegimen: number;
  nombre: string;
}

interface Afp {
  idAfp: number;
  nombre: string;
}

const FORMULARIO_VACIO = {
  tipoDocumento: 'DNI' as string,
  nombres: '',
  apellidos: '',
  dni: '',
  idMarcador: '',
  fechaNacimiento: '',
  fechaIngreso: '',
  cargo: '',
  area: '',
  correo: '',
  telefono: '',
  sueldoBase: null as number | null,
  horasJornada: 8 as number,
  banco: '',
  cuentaBancaria: '',
  bancoCts: '',
  cuentaCts: '',
  supervisor: '',
  sede: '',
  cartera: '',
  fechaFinContrato: '',
  idRegimen: null as number | null,
  sistemaPensionario: 'ONP' as string,
  idAfp: null as number | null,
  cuspp: '',
  tipoComisionAfp: 'FLUJO' as string,
  asignacionFamiliar: false
};

@Component({
  selector: 'app-empleados',
  imports: [FormsModule, DecimalPipe, DatePipe, RouterLink],
  templateUrl: './empleados.html',
  styleUrl: './empleados.css',
})
export class Empleados implements OnInit {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);

  protected empleados = signal<Empleado[]>([]);
  protected regimenes = signal<Regimen[]>([]);
  protected afps = signal<Afp[]>([]);
  protected tiposDocumento = signal<TipoDocumento[]>([]);
  protected recienLlegados = signal<ReadonlySet<number>>(new Set());
  protected error = signal('');
  protected guardando = signal(false);
  protected mostrarExtras = signal(false);
  protected form = { ...FORMULARIO_VACIO };
  /** Persona que se está editando en el formulario de arriba (null = registrando una nueva). */
  protected editando = signal<Empleado | null>(null);

  ngOnInit(): void {
    this.http.get<Regimen[]>(`${API_URL}/regimenes`).subscribe((r) => this.regimenes.set(r));
    this.http.get<Afp[]>(`${API_URL}/afps`).subscribe((a) => this.afps.set(a));
    this.http.get<TipoDocumento[]>(`${API_URL}/empleados/tipos-documento`).subscribe((t) => this.tiposDocumento.set(t));

    // Carga inicial y cada vez que el socket se (re)conecta: así la lista siempre está al día
    this.realtime.alConectar$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
    this.cargar();

    this.realtime.watch<Empleado>('empleados').pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evento) => {
      if (evento.accion === 'ELIMINADO') {
        this.empleados.update((lista) => quitar(lista, evento.data.idEmpleado, (e) => e.idEmpleado));
        return;
      }
      this.empleados.update((lista) => upsert(lista, evento.data, (e) => e.idEmpleado));
      this.resaltar(evento.data.idEmpleado);
    });
  }

  private cargar(): void {
    this.http.get<Empleado[]>(`${API_URL}/empleados`).subscribe({
      next: (lista) => this.empleados.set(lista),
      error: () => this.error.set('No se pudo cargar la lista de empleados.')
    });
  }

  private resaltar(id: number): void {
    this.recienLlegados.update((s) => new Set(s).add(id));
    setTimeout(() => {
      this.recienLlegados.update((s) => {
        const copia = new Set(s);
        copia.delete(id);
        return copia;
      });
    }, 4000);
  }

  protected auth = inject(AuthService);
  protected mostrarCesados = signal(false);
  protected visibles = computed(() => this.mostrarCesados() ? this.empleados() : this.empleados().filter((e) => e.estado !== 'CESADO'));

  protected cesar(e: Empleado): void {
    const fecha = window.prompt(`Último día trabajado de ${e.nombresCompletos} (aaaa-mm-dd):`, hoyISO());
    if (fecha === null) return;
    const motivo = window.prompt('Motivo del cese (renuncia, fin de contrato, despido…):', '') ?? '';
    this.error.set('');
    this.http.post<Empleado>(`${API_URL}/empleados/${e.idEmpleado}/cesar`, { fechaCese: fecha, motivo }).subscribe({
      error: (err: HttpErrorResponse) => this.error.set(err.error?.mensaje ?? 'No se pudo registrar el cese.')
    });
  }

  protected reactivar(e: Empleado): void {
    if (!confirm(`¿Reactivar a ${e.nombresCompletos}?`)) return;
    this.error.set('');
    this.http.post<Empleado>(`${API_URL}/empleados/${e.idEmpleado}/reactivar`, {}).subscribe({
      error: (err: HttpErrorResponse) => this.error.set(err.error?.mensaje ?? 'No se pudo reactivar.')
    });
  }

  /** Carga a la persona en el formulario de arriba; al guardar se actualiza solo ese registro. */
  protected editar(e: Empleado): void {
    this.error.set('');
    this.editando.set(e);
    this.mostrarExtras.set(true);
    this.form = {
      ...FORMULARIO_VACIO,
      tipoDocumento: e.tipoDocumento,
      nombres: e.nombres ?? '',
      apellidos: e.apellidos ?? '',
      dni: e.dni,
      idMarcador: e.idMarcador ?? '',
      fechaNacimiento: e.fechaNacimiento ?? '',
      fechaIngreso: e.fechaIngreso,
      cargo: e.cargo ?? '',
      area: e.area ?? '',
      correo: e.correo ?? '',
      telefono: e.telefono ?? '',
      sueldoBase: e.sueldoBase,
      horasJornada: e.horasJornada ?? 8,
      banco: e.banco ?? '',
      cuentaBancaria: e.cuentaBancaria ?? '',
      bancoCts: e.bancoCts ?? '',
      cuentaCts: e.cuentaCts ?? '',
      supervisor: e.supervisor ?? '',
      sede: e.sede ?? '',
      cartera: e.cartera ?? '',
      fechaFinContrato: e.fechaFinContrato ?? '',
      idRegimen: this.regimenes().find((r) => r.nombre === e.regimenLaboral)?.idRegimen ?? null,
      sistemaPensionario: e.sistemaPensionario ?? 'ONP',
      idAfp: this.afps().find((a) => a.nombre === e.afp)?.idAfp ?? null,
      cuspp: e.cuspp ?? '',
      tipoComisionAfp: e.tipoComisionAfp ?? 'FLUJO',
      asignacionFamiliar: !!e.asignacionFamiliar
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.form = { ...FORMULARIO_VACIO };
  }

  /** Limpieza: borra a un trabajador ingresado por error (el backend lo rechaza si ya tiene boletas). */
  protected eliminar(e: Empleado): void {
    if (!confirm(`¿Borrar a ${e.nombresCompletos}? Se borran también sus asistencias, movimientos y horarios. Si ya tiene boletas procesadas no se podrá (usa «Cesar»).`)) return;
    this.error.set('');
    this.http.delete<void>(`${API_URL}/empleados/${e.idEmpleado}`).subscribe({
      next: () => {
        if (this.editando()?.idEmpleado === e.idEmpleado) this.cancelarEdicion();
      },
      error: (err: HttpErrorResponse) => this.error.set(err.error?.mensaje ?? 'No se pudo borrar al empleado.')
    });
  }

  protected editarSueldo(e: Empleado): void {
    const v = window.prompt(`Nuevo sueldo base de ${e.nombresCompletos} (actual S/ ${e.sueldoBase}):`, String(e.sueldoBase));
    if (v === null) return;
    const sueldo = Number(v.replace(',', '.'));
    if (!(sueldo > 0)) {
      this.error.set('El sueldo debe ser un número mayor a cero.');
      return;
    }
    this.error.set('');
    this.http.put<Empleado>(`${API_URL}/empleados/${e.idEmpleado}`, { sueldoBase: sueldo }).subscribe({
      error: (err: HttpErrorResponse) => this.error.set(err.error?.mensaje ?? 'No se pudo cambiar el sueldo.')
    });
  }

  protected patronDocumento(): string {
    return this.form.tipoDocumento === 'DNI' ? '[0-9]{8}' : '[A-Za-z0-9]{6,15}';
  }

  protected largoDocumento(): number {
    return this.form.tipoDocumento === 'DNI' ? 8 : 15;
  }

  protected registrar(): void {
    this.error.set('');
    this.guardando.set(true);
    // Si es ONP no se envía AFP ni CUSPP aunque el usuario los haya llenado antes de cambiar de opción;
    // las fechas vacías van como null (un texto vacío no es una fecha)
    const esAfp = this.form.sistemaPensionario === 'AFP';
    const cuerpo = {
      ...this.form,
      idAfp: esAfp ? this.form.idAfp : null,
      cuspp: esAfp ? this.form.cuspp : '',
      fechaNacimiento: this.form.fechaNacimiento || null,
      fechaFinContrato: this.form.fechaFinContrato || null
    };
    // Nuevo: POST. En edición: PUT al mismo registro (el backend conserva lo que no cambie)
    const enEdicion = this.editando();
    const peticion = enEdicion
      ? this.http.put<Empleado>(`${API_URL}/empleados/${enEdicion.idEmpleado}`, cuerpo)
      : this.http.post<Empleado>(`${API_URL}/empleados`, cuerpo);
    peticion.subscribe({
      next: () => {
        // La fila aparece o cambia por el evento en tiempo real (igual que en las demás pantallas abiertas)
        this.form = { ...FORMULARIO_VACIO };
        this.editando.set(null);
        this.guardando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.mensaje ?? (enEdicion ? 'No se pudieron guardar los cambios.' : 'No se pudo registrar el empleado.'));
        this.guardando.set(false);
      }
    });
  }
}
