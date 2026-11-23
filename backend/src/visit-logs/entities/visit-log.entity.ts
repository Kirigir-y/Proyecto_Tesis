import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Resident } from '../../residents/entities/resident.entity';

@Entity({ name: 'visit_logs' })
export class VisitLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  residentId: string;

  @ManyToOne(() => Resident, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'residentId' })
  resident: Resident;

  @Column({ type: 'varchar', length: 10 })
  type: 'visita' | 'salida';

  @Column({ type: 'timestamp' })
  horaInicio: Date;

  @Column({ type: 'timestamp', nullable: true })
  horaFin: Date | null;

  @Column({ type: 'varchar', length: 150 })
  personaNombre: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  personaRelacion: string | null;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ type: 'varchar', length: 150 })
  registradoPor: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
