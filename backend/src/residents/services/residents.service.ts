import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resident } from '../entities/resident.entity';
import { ResidentMedication } from '../entities/resident-medication.entity';
import { ResidentMedicationMovement } from '../entities/resident-medication-movement.entity';
import { CalendarEvent } from '../../calendar/entities/calendar-event.entity';
import { Medication } from '../../medications/entities/medication.entity';

const MIN_RESIDENT_AGE = 60;

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
        @InjectRepository(Medication)
        private readonly medicationRepo: Repository<Medication>,
    ) {}

    // ── Residents CRUD ────────────────────────────────────────────────────────

    private calculateAge(fechaNacimiento: string): number {
        const birth = new Date(fechaNacimiento);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }

    private validateMinimumAge(fechaNacimiento: string | null | undefined): void {
        if (!fechaNacimiento) {
            throw new BadRequestException('La fecha de nacimiento es obligatoria.');
        }
        if (this.calculateAge(fechaNacimiento) < MIN_RESIDENT_AGE) {
            throw new BadRequestException(`El residente debe tener al menos ${MIN_RESIDENT_AGE} años.`);
        }
    }

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
        this.validateMinimumAge(data.fechaNacimiento);
        if (data.estado === 'Fallecido') {
            throw new BadRequestException('No se puede crear un residente con estado "Fallecido". Cree el residente activo y luego edítelo.');
        }
        return this.residentRepo.save(this.residentRepo.create(data));
    }

    async update(id: string, data: Partial<Resident>): Promise<Resident> {
        const r = await this.findOne(id);
        if (data.fechaNacimiento !== undefined && data.fechaNacimiento !== r.fechaNacimiento) {
            this.validateMinimumAge(data.fechaNacimiento);
        }
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

    // Corrige recetas que hayan quedado con cápsulas en 0 teniendo stock (paquetes)
    // disponible (ej: datos de antes de este ajuste, o una reposición que no alcanzó a
    // abrir el paquete). "Si hay stock, hay cápsulas".
    private async healPackageRollover(prescriptions: ResidentMedication[]): Promise<void> {
        for (const p of prescriptions) {
            const unitsPerPackage = p.medication?.unitsPerPackage ?? 0;
            if (unitsPerPackage > 0 && p.stock <= 0 && p.stockPaquetes > 0) {
                this.openPackagesIfNeeded(p, unitsPerPackage);
                await this.prescriptionRepo.save(p);
            }
        }
    }

    async getPrescriptions(residentId: string): Promise<any[]> {
        await this.findOne(residentId);
        const list = await this.prescriptionRepo.find({
            where: { residentId, active: true },
            order: { createdAt: 'ASC' },
        });
        await this.healPackageRollover(list);
        return this.attachReplenishmentAlerts(list);
    }

    // Todos los medicamentos recetados activos (para la vista de inventario)
    async getAllPrescriptions(): Promise<any[]> {
        const list = await this.prescriptionRepo.find({
            where: { active: true },
            relations: ['resident'],
            order: { residentId: 'ASC', createdAt: 'ASC' },
        });
        await this.healPackageRollover(list);
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

    // Si las cápsulas están en 0 (o quedan bajo cero) y hay stock (paquetes) disponible,
    // abre automáticamente los paquetes que hagan falta: cada paquete trae las cápsulas
    // designadas en el catálogo (unitsPerPackage). "Si hay stock, hay cápsulas".
    private openPackagesIfNeeded(presc: ResidentMedication, unitsPerPackage: number): number {
        let packagesOpened = 0;
        while (presc.stock <= 0 && presc.stockPaquetes > 0) {
            presc.stockPaquetes -= 1;
            presc.stock += unitsPerPackage;
            packagesOpened++;
        }
        return packagesOpened;
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

        const med = await this.medicationRepo.findOne({ where: { id: presc.medicationId } });
        const unitsPerPackage = med?.unitsPerPackage ?? 0;

        let prevValue: number;
        let newValue: number;
        let rolloverNote = '';

        if (dto.type === 'ENTRADA') {
            // El retiro de medicamento repone Stock (paquetes completos), no las cápsulas
            // en uso día a día. Cada paquete lleva las cápsulas designadas en el catálogo.
            prevValue = presc.stockPaquetes;
            presc.stockPaquetes += dto.quantity;

            if (unitsPerPackage > 0) {
                const packagesOpened = this.openPackagesIfNeeded(presc, unitsPerPackage);
                if (packagesOpened > 0) {
                    rolloverNote = `Se abrió ${packagesOpened} paquete(s) automáticamente al reponer stock (cápsulas: ${presc.stock}, quedan ${presc.stockPaquetes} paquete(s) en stock).`;
                }
            }
            newValue = presc.stockPaquetes;
        } else {
            prevValue = presc.stock;

            if (unitsPerPackage > 0) {
                // Cada administración resta cápsulas. Cuando llegan a 0, se abre
                // automáticamente 1 paquete del Stock del residente.
                const totalAvailable = presc.stock + presc.stockPaquetes * unitsPerPackage;
                if (dto.quantity > totalAvailable) {
                    throw new BadRequestException(`Stock insuficiente. Disponible: ${totalAvailable} (cápsulas + stock).`);
                }

                presc.stock -= dto.quantity;
                const packagesOpened = this.openPackagesIfNeeded(presc, unitsPerPackage);
                if (packagesOpened > 0) {
                    rolloverNote = `Se abrió ${packagesOpened} paquete(s) del stock del residente (queda stock: ${presc.stockPaquetes}).`;
                }
            } else {
                if (dto.quantity > presc.stock) {
                    throw new BadRequestException(`Stock insuficiente. Disponible: ${presc.stock}`);
                }
                presc.stock -= dto.quantity;
            }
            newValue = presc.stock;
        }

        await this.prescriptionRepo.save(presc);

        const mov = new ResidentMedicationMovement();
        mov.residentMedicationId = prescId;
        mov.type = dto.type;
        mov.quantity = dto.quantity;
        mov.previousStock = prevValue;
        mov.newStock = newValue;
        if (dto.reason) mov.reason = dto.reason;
        if (dto.performedBy) mov.performedBy = dto.performedBy;
        const notes = rolloverNote ? (dto.notes ? `${dto.notes} — ${rolloverNote}` : rolloverNote) : dto.notes;
        if (notes) mov.notes = notes;
        return this.movRepo.save(mov);
    }
}
