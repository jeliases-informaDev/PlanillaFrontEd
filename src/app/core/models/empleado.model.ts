export interface Empleado {
  idEmpleado: number;
  tipoDocumento: string;
  nombresCompletos: string;
  dni: string; // número del documento de identidad
  fechaNacimiento: string | null;
  fechaIngreso: string;
  cargo: string | null;
  area: string | null;
  correo: string | null;
  telefono: string | null;
  sueldoBase: number;
  banco: string | null;
  cuentaBancaria: string | null;
  bancoCts: string | null;
  cuentaCts: string | null;
  regimenLaboral: string;
  estado: string;
  sistemaPensionario: 'ONP' | 'AFP' | string;
  afp: string | null;
  cuspp: string | null;
  asignacionFamiliar: boolean;
}

export interface TipoDocumento {
  codigo: string; // DNI, CE, PASAPORTE, PTP, CSR
  etiqueta: string;
  codigoSunat: string;
}
