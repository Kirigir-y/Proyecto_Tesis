import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MedicationMovement } from './medication-movement.entity';

@Entity({ name: 'medications' })
export class Medication {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ── Identificación ──────────────────────────────────────────────────────
    @Column({ type: 'varchar', length: 200 })
    name: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    activeIngredient: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    dosage: string;          // valor numérico: "500", "250", "125"

    @Column({ type: 'varchar', length: 30, nullable: true })
    dosageUnit: string;      // unidad: "mg", "ml", "mcg", "UI", "g"

    @Column({ type: 'varchar', length: 100, nullable: true })
    lotNumber: string;

    // ── Presentación y vía ──────────────────────────────────────────────────
    @Column({ type: 'varchar', length: 100, nullable: true })
    presentation: string;    // Comprimido, Jarabe, Inyectable, etc.

    @Column({ type: 'varchar', length: 100, nullable: true })
    route: string;           // Oral, IV, IM, Tópico, etc.

    // ── Información clínica ─────────────────────────────────────────────────
    @Column({ type: 'text', nullable: true })
    indication: string;      // para qué sirve / indicación terapéutica

    @Column({ type: 'varchar', length: 200, nullable: true })
    prescribedBy: string;    // médico prescriptor

    @Column({ type: 'varchar', length: 200, nullable: true })
    specialConditions: string; // refrigerar, proteger de luz, etc.

    // ── Inventario ──────────────────────────────────────────────────────────
    @Column({ type: 'int', default: 0 })
    stock: number;

    @Column({ type: 'int', nullable: true })
    minStock: number;

    @Column({ type: 'int', nullable: true })
    unitsPerPackage: number; // unidades por caja/envase

    @Column({ type: 'varchar', length: 100, nullable: true })
    location: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    supplier: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    registeredBy: string;

    // ── Fechas ──────────────────────────────────────────────────────────────
    @Column({ type: 'date', nullable: true })
    entryDate: string;

    @Column({ type: 'date', nullable: true })
    expirationDate: string;

    // ── Estado ──────────────────────────────────────────────────────────────
    @Column({ type: 'varchar', length: 30, default: 'Disponible' })
    estado: string;

    @OneToMany(() => MedicationMovement, m => m.medication)
    movements: MedicationMovement[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
