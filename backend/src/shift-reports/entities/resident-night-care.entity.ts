import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ShiftReport } from './shift-report.entity';

// Actividades propias del turno noche: reemplazan a la tabla de Aseo Clínico del turno día
// (que no aplica de noche, salvo lubricación de piel, que se registra aquí directamente).
@Entity({ name: 'resident_night_cares' })
export class ResidentNightCare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  room: number; // 1 to 30

  @Column({ type: 'varchar', length: 5 })
  bed: string; // 'A' | 'B'

  @Column({ type: 'boolean', default: false })
  ordenCloset: boolean;

  @Column({ type: 'boolean', default: false })
  ordenCajasAseo: boolean;

  @Column({ type: 'boolean', default: false })
  cambioSabanas: boolean;

  @Column({ type: 'boolean', default: false })
  retiroBotellasHidratacion: boolean;

  @Column({ type: 'boolean', default: false })
  lubricacionPiel: boolean;

  @Column({ type: 'boolean', default: false })
  retiroOrinal: boolean; // Retiro de orinal clínico e inodoro portátil

  @Column({ type: 'boolean', default: false })
  aseoOrinal: boolean; // Aseo de orinal clínico e inodoro portátil

  @ManyToOne(() => ShiftReport, (report) => report.nightCares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: ShiftReport;

  @CreateDateColumn()
  createdAt: Date;
}
