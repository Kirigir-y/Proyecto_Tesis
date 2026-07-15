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

    // Cápsulas actualmente disponibles para administrar/retirar de este residente
    // (independiente del catálogo). Baja 1 a 1 con cada retiro o dosis administrada.
    @Column({ type: 'float', default: 0 })
    stock: number;

    // Paquetes/envases completos en reserva para este residente. Cuando "stock" (cápsulas)
    // llega a 0, se abre automáticamente 1 paquete de esta reserva: se resta 1 aquí y se
    // suma medication.unitsPerPackage a "stock".
    @Column({ type: 'int', default: 0 })
    stockPaquetes: number;

    @CreateDateColumn()
    createdAt: Date;
}
