import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ShiftReport } from './shift-report.entity';

@Entity({ name: 'resident_hygiene' })
export class ResidentHygiene {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  room: number; // 1 to 30

  @Column({ type: 'varchar', length: 5 })
  bed: string; // 'A' | 'B'

  @Column({ type: 'boolean', default: false })
  aseoCavidades: boolean;

  @Column({ type: 'boolean', default: false })
  corteCapilar: boolean;

  @Column({ type: 'boolean', default: false })
  corteUnas: boolean;

  @Column({ type: 'boolean', default: false })
  aseoBucal: boolean;

  @Column({ type: 'boolean', default: false })
  aseoPerineal: boolean;

  @Column({ type: 'boolean', default: false })
  banoDucha: boolean;

  @Column({ type: 'boolean', default: false })
  afeitado: boolean;

  @Column({ type: 'boolean', default: false })
  lubricacion: boolean;

  @ManyToOne(() => ShiftReport, (report) => report.hygienes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: ShiftReport;

  @CreateDateColumn()
  createdAt: Date;
}
