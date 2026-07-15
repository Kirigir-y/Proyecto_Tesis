import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ShiftReport } from './shift-report.entity';

@Entity({ name: 'shift_report_changes' })
export class ShiftReportChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reportId: string;

  @ManyToOne(() => ShiftReport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: ShiftReport;

  @Column({ type: 'varchar', length: 20 })
  action: string; // 'creado' | 'editado'

  @Column({ type: 'varchar', length: 150 })
  changedBy: string;

  @Column({ type: 'text' })
  summary: string;

  @CreateDateColumn()
  createdAt: Date;
}
