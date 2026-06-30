import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resident } from '../entities/resident.entity';
import { ResidentMedication } from '../entities/resident-medication.entity';
import { ResidentMedicationMovement } from '../entities/resident-medication-movement.entity';

@Injectable()
export class ResidentsService {
    constructor(
        @InjectRepository(Resident)
        private readonly residentRepo: Repository<Resident>,
        @InjectRepository(ResidentMedication)
        private readonly prescriptionRepo: Repository<ResidentMedication>,
        @InjectRepository(ResidentMedicationMovement)
        private readonly movRepo: Repository<ResidentMedicationMovement>,
    ) {}

    // ── Residents CRUD ────────────────────────────────────────────────────────

    async findAll(): Promise<Resident[]> {
        return this.residentRepo.find({ order: { room: 'ASC', bed: 'ASC' } });
    }

    async findOne(id: string): Promise<Resident> {
        const r = await this.residentRepo.findOne({ where: { id } });
        if (!r) throw new NotFoundException(`Residente con ID ${id} no encontrado`);
        return r;
    }

    async findByRoom(room: number): Promise<Resident[]> {
        return this.residentRepo.find({ where: { room }, order: { bed: 'ASC' } });
    }

    async create(data: Partial<Resident>): Promise<Resident> {
        return this.residentRepo.save(this.residentRepo.create(data));
    }

    async update(id: string, data: Partial<Resident>): Promise<Resident> {
        const r = await this.findOne(id);
        Object.assign(r, data);
        return this.residentRepo.save(r);
    }

    async remove(id: string): Promise<void> {
        const r = await this.findOne(id);
        await this.residentRepo.remove(r);
    }

    // ── Prescriptions ─────────────────────────────────────────────────────────

    async getPrescriptions(residentId: string): Promise<ResidentMedication[]> {
        await this.findOne(residentId);
        return this.prescriptionRepo.find({
            where: { residentId, active: true },
            order: { createdAt: 'ASC' },
        });
    }

    // Todos los medicamentos recetados activos (para la vista de inventario)
    async getAllPrescriptions(): Promise<ResidentMedication[]> {
        return this.prescriptionRepo.find({
            where: { active: true },
            relations: ['resident'],
            order: { residentId: 'ASC', createdAt: 'ASC' },
        });
    }

    async addPrescription(residentId: string, dto: {
        medicationId: string;
        instructions?: string;
        frequency?: string;
        startDate?: string;
    }): Promise<ResidentMedication> {
        await this.findOne(residentId);

        const existing = await this.prescriptionRepo.findOne({
            where: { residentId, medicationId: dto.medicationId, active: true },
        });
        if (existing) throw new BadRequestException('Este medicamento ya está asignado a este residente.');

        const presc = new ResidentMedication();
        presc.residentId = residentId;
        presc.medicationId = dto.medicationId;
        if (dto.instructions) presc.instructions = dto.instructions;
        if (dto.frequency) presc.frequency = dto.frequency;
        if (dto.startDate) presc.startDate = dto.startDate;
        presc.stock = 0;
        return this.prescriptionRepo.save(presc);
    }

    async removePrescription(residentId: string, prescId: string): Promise<void> {
        const presc = await this.prescriptionRepo.findOne({ where: { id: prescId, residentId } });
        if (!presc) throw new NotFoundException('Prescripción no encontrada');
        presc.active = false;
        await this.prescriptionRepo.save(presc);
    }

    // ── Movimientos de inventario por residente ───────────────────────────────

    async getMovements(residentId: string, prescId: string): Promise<ResidentMedicationMovement[]> {
        const presc = await this.prescriptionRepo.findOne({ where: { id: prescId, residentId } });
        if (!presc) throw new NotFoundException('Prescripción no encontrada');
        return this.movRepo.find({
            where: { residentMedicationId: prescId },
            order: { createdAt: 'DESC' },
        });
    }

    async addMovement(residentId: string, prescId: string, dto: {
        type: 'ENTRADA' | 'SALIDA';
        quantity: number;
        reason?: string;
        performedBy?: string;
        notes?: string;
    }): Promise<ResidentMedicationMovement> {
        const presc = await this.prescriptionRepo.findOne({
            where: { id: prescId, residentId, active: true },
        });
        if (!presc) throw new NotFoundException('Prescripción no encontrada');

        if (dto.type === 'SALIDA' && dto.quantity > presc.stock) {
            throw new BadRequestException(`Stock insuficiente. Disponible: ${presc.stock}`);
        }

        const prev = presc.stock;
        presc.stock = dto.type === 'ENTRADA' ? prev + dto.quantity : prev - dto.quantity;
        await this.prescriptionRepo.save(presc);

        const mov = new ResidentMedicationMovement();
        mov.residentMedicationId = prescId;
        mov.type = dto.type;
        mov.quantity = dto.quantity;
        mov.previousStock = prev;
        mov.newStock = presc.stock;
        if (dto.reason) mov.reason = dto.reason;
        if (dto.performedBy) mov.performedBy = dto.performedBy;
        if (dto.notes) mov.notes = dto.notes;
        return this.movRepo.save(mov);
    }
}
