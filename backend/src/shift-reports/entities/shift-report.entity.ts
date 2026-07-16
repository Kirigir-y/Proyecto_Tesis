import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ResidentIncident } from './resident-incident.entity';
import { ResidentHygiene } from './resident-hygiene.entity';
import { ResidentFeeding } from './resident-feeding.entity';
import { ResidentNightCare } from './resident-night-care.entity';

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

  // Rondas del turno noche (cada 2 horas, desde las 02:00): [{ hora, realizadoPor }]
  @Column({ type: 'jsonb', nullable: true })
  rondas: { hora: string; realizadoPor: string }[] | null;

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

  @OneToMany(() => ResidentNightCare, (nightCare) => nightCare.report, {
    cascade: true,
    eager: true,
  })
  nightCares: ResidentNightCare[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
