import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resident } from './resident.entity';
import { Medication } from '../../medications/entities/medication.entity';

@Entity({ name: 'resident_medications' })
export class ResidentMedication {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    residentId: string;

    @ManyToOne(() => Resident, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'residentId' })
    resident: Resident;

    @Column({ type: 'uuid' })
    medicationId: string;

    @ManyToOne(() => Medication, { onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'medicationId' })
    medication: Medication;

    // Instrucciones de administración: "1 comprimido cada 8 horas con alimentos"
    @Column({ type: 'text', nullable: true })
    instructions: string;

    // Frecuencia resumida para mostrar en la tabla: "c/8h", "Diario", "S/N"
    @Column({ type: 'varchar', length: 80, nullable: true })
    frequency: string;

    @Column({ type: 'date', nullable: true })
    startDate: string;

    @Column({ type: 'boolean', default: true })
    active: boolean;

    // Stock propio del residente para este medicamento (independiente del catálogo)
    @Column({ type: 'float', default: 0 })
    stock: number;

    @CreateDateColumn()
    createdAt: Date;
}
