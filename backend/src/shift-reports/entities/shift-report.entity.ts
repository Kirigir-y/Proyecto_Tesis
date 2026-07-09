import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ResidentIncident } from './resident-incident.entity';
import { ResidentHygiene } from './resident-hygiene.entity';
import { ResidentFeeding } from './resident-feeding.entity';

@Entity({ name: 'shift_reports' })
export class ShiftReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 10 })
  shift: string; // 'dia' | 'noche'

  @Column({ type: 'varchar', length: 255 })
  supervisor: string;

  @Column({ type: 'text', nullable: true })
  caregivers: string;

  @Column({ type: 'text', nullable: true })
  staff: string;

  @Column({ type: 'text', nullable: true })
  notaAlimentacion: string;

  @Column({ type: 'text', nullable: true })
  notaAseo: string;

  @Column({ type: 'text', nullable: true })
  notaNovedades: string;

  @OneToMany(() => ResidentIncident, (incident) => incident.report, {
    cascade: true,
    eager: true,
  })
  incidents: ResidentIncident[];

  @OneToMany(() => ResidentHygiene, (hygiene) => hygiene.report, {
    cascade: true,
    eager: true,
  })
  hygienes: ResidentHygiene[];

  @OneToMany(() => ResidentFeeding, (feeding) => feeding.report, {
    cascade: true,
    eager: true,
  })
  feedings: ResidentFeeding[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
