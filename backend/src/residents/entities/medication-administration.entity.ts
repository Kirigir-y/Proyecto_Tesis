import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ResidentMedication } from './resident-medication.entity';

@Entity({ name: 'medication_administrations' })
export class MedicationAdministration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    residentMedicationId: string;

    @ManyToOne(() => ResidentMedication, { onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'residentMedicationId' })
    prescription: ResidentMedication;

    // Cantidad física descontada de inventario (ej: 1 comprimido, 0.5 comprimido)
    @Column({ type: 'float', default: 1 })
    doseAdministered: number; 

    // Cantidad clínica administrada (ej: "500 mg", "1.5 g", "10 ml")
    @Column({ type: 'varchar', length: 50, nullable: true })
    dosageValue: string;

    @Column({ type: 'varchar', length: 30 })
    status: 'administrado' | 'rechazado' | 'omitido';

    @Column({ type: 'varchar', length: 150 })
    administeredBy: string; // Nombre del cuidador o profesional de salud

    // Fecha y hora clínica de administración (que puede diferir de la creación del registro)
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    administeredAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;
}
