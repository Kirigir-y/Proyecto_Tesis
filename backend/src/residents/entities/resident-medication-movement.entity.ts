import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ResidentMedication } from './resident-medication.entity';

@Entity({ name: 'resident_medication_movements' })
export class ResidentMedicationMovement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    residentMedicationId: string;

    @ManyToOne(() => ResidentMedication, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'residentMedicationId' })
    prescription: ResidentMedication;

    @Column({ type: 'varchar', length: 20 })
    type: string; // ENTRADA | SALIDA

    @Column({ type: 'float' })
    quantity: number;

    @Column({ type: 'float', nullable: true })
    previousStock: number | null;

    @Column({ type: 'float', nullable: true })
    newStock: number | null;

    @Column({ type: 'varchar', length: 200, nullable: true })
    reason: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    performedBy: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;
}
