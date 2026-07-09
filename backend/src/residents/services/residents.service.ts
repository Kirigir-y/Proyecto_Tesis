import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resident } from '../entities/resident.entity';
import { ResidentMedication } from '../entities/resident-medication.entity';
import { ResidentMedicationMovement } from '../entities/resident-medication-movement.entity';
import { CalendarEvent } from '../../calendar/entities/calendar-event.entity';

@Injectable()
export class ResidentsService {
    constructor(
        @InjectRepository(Resident)
        private readonly residentRepo: Repository<Resident>,
        @InjectRepository(ResidentMedication)
        private readonly prescriptionRepo: Repository<ResidentMedication>,
        @InjectRepository(ResidentMedicationMovement)
        private readonly movRepo: Repository<ResidentMedicationMovement>,
        @InjectRepository(CalendarEvent)
        private readonly calendarRepo: Repository<CalendarEvent>,
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

    private async attachReplenishmentAlerts(prescriptions: ResidentMedication[]): Promise<any[]> {
        const now = new Date();
        const alerts = await this.calendarRepo.find({
            where: {
                type: 'Retiro de medicamento',
                completed: false
            }
        });

        return prescriptions.map(p => {
            const activeAlerts = alerts.filter(a => 
                a.residentMedicationId === p.id && 
                new Date(a.startDate).getTime() <= now.getTime()
            );

            const item = { ...p } as any;
            if (activeAlerts.length > 0) {
                // Ordenar por fecha más antigua que requiere reponer
                activeAlerts.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                const dateStr = new Date(activeAlerts[0].startDate).toLocaleDateString('es-CL');
                item.needsReplenishment = true;
                item.replenishmentMessage = `¡Se requiere reposición! Programada desde el ${dateStr}`;
                item.replenishmentEventId = activeAlerts[0].id;
            } else {
                item.needsReplenishment = false;
            }
            return item;
        });
    }

    async getPrescriptions(residentId: string): Promise<any[]> {
        await this.findOne(residentId);
        const list = await this.prescriptionRepo.find({
            where: { residentId, active: true },
            order: { createdAt: 'ASC' },
        });
        return this.attachReplenishmentAlerts(list);
    }

    // Todos los medicamentos recetados activos (para la vista de inventario)
    async getAllPrescriptions(): Promise<any[]> {
        const list = await this.prescriptionRepo.find({
            where: { active: true },
            relations: ['resident'],
            order: { residentId: 'ASC', createdAt: 'ASC' },
        });
        return this.attachReplenishmentAlerts(list);
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
