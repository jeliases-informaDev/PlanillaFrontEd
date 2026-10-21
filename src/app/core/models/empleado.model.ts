export interface Empleado {
  idEmpleado: number;
  tipoDocumento: string;
  nombresCompletos: string;
  dni: string; // número del documento de identidad
  idMarcador: string | null; // ID en el reloj biométrico (null = el documento)
  fechaNacimiento: string | null;
  fechaIngreso: string;
  cargo: string | null;
  area: string | null;
  correo: string | null;
  telefono: string | null;
  sueldoBase: number;
  horasJornada: number; // 8 = jornada completa; con menos horas el básico se paga proporcional
  banco: string | null;
  cuentaBancaria: string | null;
  bancoCts: string | null;
  cuentaCts: string | null;
  regimenLaboral: string;
  estado: string;
  sistemaPensionario: 'ONP' | 'AFP' | 'NINGUNO' | string; // NINGUNO = jubilado / no aportante
  afp: string | null;
  cuspp: string | null;
  tipoComisionAfp: 'FLUJO' | 'MIXTA' | string | null;
  asignacionFamiliar: boolean;
  fechaCese: string | null;
  motivoCese: string | null;
}

export interface TipoDocumento {
  codigo: string; // DNI, CE, PASAPORTE, PTP, CSR
  etiqueta: string;
  codigoSunat: string;
}
