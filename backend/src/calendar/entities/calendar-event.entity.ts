import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'calendar_events' })
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'Visita médica' | 'Control de signos vitales' | 'Actividad recreativa' | 'Cumpleaños' | 'Capacitación' | 'Otro'

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 100 })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  recurrenceGroupId: string | null;

  @Column({ type: 'uuid', nullable: true })
  residentMedicationId: string | null;

  @Column({ type: 'uuid', nullable: true })
  residentId: string | null;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;
}
