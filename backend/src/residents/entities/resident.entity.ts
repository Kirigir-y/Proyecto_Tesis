import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'residents' })
export class Resident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  rut: string;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: string;

  @Column({ type: 'int', nullable: true })
  room: number;

  @Column({ type: 'varchar', length: 5, nullable: true })
  bed: string; // 'A' | 'B'

  @Column({ type: 'varchar', length: 30, default: 'Activo' })
  estado: string; // 'Activo' | 'Hospital' | 'Salida temporal' | 'Fallecido'

  @Column({ type: 'boolean', default: false })
  requiereDesimpactacion: boolean;

  @Column({ type: 'text', nullable: true })
  diagnostico: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
