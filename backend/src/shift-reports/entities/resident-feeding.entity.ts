import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ShiftReport } from './shift-report.entity';

@Entity({ name: 'resident_feedings' })
export class ResidentFeeding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  room: number; // 1 to 30

  @Column({ type: 'varchar', length: 5 })
  bed: string; // 'A' | 'B'

  // ── Turno día ─────────────────────────────────────────────────────────────
  @Column({ type: 'int', default: 100 })
  desayuno: number; // Percentage (0 to 100)

  @Column({ type: 'int', default: 100 })
  merienda: number; // Percentage (0 to 100)

  @Column({ type: 'int', default: 100 })
  almuerzo: number; // Percentage (0 to 100)

  @Column({ type: 'int', default: 100 })
  once: number; // Percentage (0 to 100)

  @Column({ type: 'int', default: 100 })
  cena: number; // Percentage (0 to 100)

  // ── Turno noche ───────────────────────────────────────────────────────────
  // Solo aplica a residentes con Resident.requiereColacionNocturna = true.
  @Column({ type: 'int', nullable: true })
  colacionNocturna: number | null; // Percentage (0 to 100)

  @ManyToOne(() => ShiftReport, (report) => report.feedings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: ShiftReport;

  @CreateDateColumn()
  createdAt: Date;
}
