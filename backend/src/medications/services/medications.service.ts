import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medication } from '../entities/medication.entity';
import { MedicationMovement } from '../entities/medication-movement.entity';

@Injectable()
export class MedicationsService {
    constructor(
        @InjectRepository(Medication)
        private readonly medicationRepo: Repository<Medication>,
        @InjectRepository(MedicationMovement)
        private readonly movementRepo: Repository<MedicationMovement>,
    ) {}

    private computeEstado(med: Medication): string {
        if (med.stock === 0) return 'Agotado';
        if (med.expirationDate) {
            const exp = new Date(med.expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < 0) return 'Vencido';
            if (diffDays <= 30) return 'Por Vencer';
        }
        if (med.minStock && med.stock <= med.minStock) return 'Stock Bajo';
        return 'Disponible';
    }

    async findAll(): Promise<Medication[]> {
        const meds = await this.medicationRepo.find({ order: { createdAt: 'DESC' } });
        return meds.map(m => ({ ...m, estado: this.computeEstado(m) }));
    }

    async findOne(id: string): Promise<Medication> {
        const med = await this.medicationRepo.findOne({ where: { id } });
        if (!med) throw new NotFoundException('Medicamento no encontrado');
        return { ...med, estado: this.computeEstado(med) };
    }

    async create(dto: Partial<Medication>): Promise<Medication> {
        const med = this.medicationRepo.create(dto);
        const saved = await this.medicationRepo.save(med);

        if (saved.stock > 0) {
            const initMov = new MedicationMovement();
            initMov.medicationId = saved.id;
            initMov.type = 'ENTRADA';
            initMov.quantity = saved.stock;
            initMov.previousStock = 0;
            initMov.newStock = saved.stock;
            initMov.reason = 'Stock inicial';
            await this.movementRepo.save(initMov);
        }

        return { ...saved, estado: this.computeEstado(saved) };
    }

    async update(id: string, dto: Partial<Medication>): Promise<Medication> {
        const med = await this.medicationRepo.findOne({ where: { id } });
        if (!med) throw new NotFoundException('Medicamento no encontrado');

        const changes: string[] = [];
        if (dto.lotNumber !== undefined && dto.lotNumber !== med.lotNumber) {
            changes.push(`Lote: "${med.lotNumber ?? 'Sin lote'}" -> "${dto.lotNumber ?? 'Sin lote'}"`);
        }
        if (dto.expirationDate !== undefined && dto.expirationDate !== med.expirationDate) {
            changes.push(`Vencimiento: "${med.expirationDate ?? 'Sin fecha'}" -> "${dto.expirationDate ?? 'Sin fecha'}"`);
        }

        Object.assign(med, dto);
        const saved = await this.medicationRepo.save(med);

        if (changes.length > 0) {
            const movement = new MedicationMovement();
            movement.medicationId = id;
            movement.type = 'MODIFICACION';
            movement.quantity = 0;
            movement.previousStock = med.stock;
            movement.newStock = med.stock;
            movement.reason = 'Modificación de lote / vencimiento';
            movement.notes = changes.join(', ');
            movement.performedBy = dto.registeredBy || 'Enfermero/a';
            await this.movementRepo.save(movement);
        }

        return { ...saved, estado: this.computeEstado(saved) };
    }

    async remove(id: string): Promise<void> {
        const med = await this.medicationRepo.findOne({ where: { id } });
        if (!med) throw new NotFoundException('Medicamento no encontrado');
        await this.medicationRepo.remove(med);
    }

    async getMovements(medicationId: string): Promise<MedicationMovement[]> {
        await this.findOne(medicationId);
        return this.movementRepo.find({
            where: { medicationId },
            order: { createdAt: 'DESC' },
        });
    }

    async addMovement(medicationId: string, dto: {
        type: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
        quantity: number;
        reason?: string;
        performedBy?: string;
        residentName?: string;
        notes?: string;
    }): Promise<MedicationMovement> {
        const med = await this.medicationRepo.findOne({ where: { id: medicationId } });
        if (!med) throw new NotFoundException('Medicamento no encontrado');

        const previousStock = med.stock;
        let newStock: number;

        if (dto.type === 'ENTRADA') {
            newStock = previousStock + dto.quantity;
        } else if (dto.type === 'SALIDA') {
            if (dto.quantity > previousStock) {
                throw new BadRequestException(`Stock insuficiente. Disponible: ${previousStock}`);
            }
            newStock = previousStock - dto.quantity;
        } else {
            // AJUSTE: quantity es el nuevo stock total
            newStock = dto.quantity;
        }

        med.stock = newStock;
        med.estado = this.computeEstado(med);
        await this.medicationRepo.save(med);

        const movement = new MedicationMovement();
        movement.medicationId = medicationId;
        movement.type = dto.type;
        movement.quantity = dto.type === 'AJUSTE' ? Math.abs(newStock - previousStock) : dto.quantity;
        movement.previousStock = previousStock;
        movement.newStock = newStock;
        if (dto.reason) movement.reason = dto.reason;
        if (dto.performedBy) movement.performedBy = dto.performedBy;
        if (dto.residentName) movement.residentName = dto.residentName;
        if (dto.notes) movement.notes = dto.notes;

        return this.movementRepo.save(movement);
    }
}
