export interface Concepto {
  idConcepto: number;
  codigo: string;
  descripcion: string;
  tipo: 'INGRESO' | 'DESCUENTO' | string;
  afectaRenta5ta: boolean;
  afectaEssalud: boolean;
}
