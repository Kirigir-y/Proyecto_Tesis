import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Medication } from './medication.entity';

@Entity({ name: 'medication_movements' })
export class MedicationMovement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    medicationId: string;

    @ManyToOne(() => Medication, m => m.movements, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'medicationId' })
    medication: Medication;

    // ENTRADA | SALIDA | AJUSTE
    @Column({ type: 'varchar', length: 30 })
    type: string;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'int' })
    previousStock: number;

    @Column({ type: 'int' })
    newStock: number;

    @Column({ type: 'varchar', length: 200, nullable: true })
    reason: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    performedBy: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    residentName: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;
}
