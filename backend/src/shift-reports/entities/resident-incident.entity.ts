import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ShiftReport } from './shift-report.entity';

@Entity({ name: 'resident_incidents' })
export class ResidentIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  room: number; // 1 to 30

  @Column({ type: 'varchar', length: 5 })
  bed: string; // 'A' | 'B'

  @Column({ type: 'varchar', length: 50 })
  title: string; // 'Hospital' | 'Salida' | 'Novedad'

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => ShiftReport, (report) => report.incidents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: ShiftReport;

  @CreateDateColumn()
  createdAt: Date;
}
