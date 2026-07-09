import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicationAdministration } from '../entities/medication-administration.entity';
import { ResidentMedication } from '../entities/resident-medication.entity';
import { ResidentsService } from './residents.service';

@Injectable()
export class MedicationsAdministrationService {
    constructor(
        @InjectRepository(MedicationAdministration)
        private readonly adminRepo: Repository<MedicationAdministration>,
        @InjectRepository(ResidentMedication)
        private readonly prescriptionRepo: Repository<ResidentMedication>,
        private readonly residentsService: ResidentsService,
    ) {}

    async findAll(): Promise<MedicationAdministration[]> {
        return this.adminRepo.find({
            order: { createdAt: 'DESC' },
            relations: ['prescription', 'prescription.resident', 'prescription.medication']
        });
    }

    async findByResident(residentId: string): Promise<MedicationAdministration[]> {
        return this.adminRepo.createQueryBuilder('admin')
            .leftJoinAndSelect('admin.prescription', 'presc')
            .leftJoinAndSelect('presc.resident', 'res')
            .leftJoinAndSelect('presc.medication', 'med')
            .where('res.id = :residentId', { residentId })
            .orderBy('admin.createdAt', 'DESC')
            .getMany();
    }

    async register(dto: {
        residentMedicationId: string;
        doseAdministered: number;
        dosageValue?: string;
        status: 'administrado' | 'rechazado' | 'omitido';
        administeredBy: string;
        administeredAt?: Date;
        notes?: string;
    }): Promise<MedicationAdministration> {
        const presc = await this.prescriptionRepo.findOne({
            where: { id: dto.residentMedicationId, active: true },
        });

        if (!presc) {
            throw new NotFoundException('La receta/prescripción seleccionada no existe o está inactiva');
        }

        // Si el estado es "administrado", debemos descontar stock
        if (dto.status === 'administrado') {
            if (presc.stock < dto.doseAdministered) {
                throw new BadRequestException(
                    `Stock insuficiente para administrar. Disponible: ${presc.stock}, Requerido: ${dto.doseAdministered}`
                );
            }

            // Descontamos stock usando el servicio existente de residentes para dejar trazabilidad del movimiento
            await this.residentsService.addMovement(presc.residentId, presc.id, {
                type: 'SALIDA',
                quantity: dto.doseAdministered,
                reason: 'Administración de dosis',
                performedBy: dto.administeredBy,
                notes: dto.notes,
            });
        }

        const admin = this.adminRepo.create({
            residentMedicationId: dto.residentMedicationId,
            doseAdministered: dto.doseAdministered,
            dosageValue: dto.dosageValue,
            status: dto.status,
            administeredBy: dto.administeredBy,
            administeredAt: dto.administeredAt ? new Date(dto.administeredAt) : new Date(),
            notes: dto.notes
        });

        const saved = await this.adminRepo.save(admin);
        
        // Cargar las relaciones para retornar el objeto completo
        const result = await this.adminRepo.findOne({
            where: { id: saved.id },
            relations: ['prescription', 'prescription.resident', 'prescription.medication']
        });

        if (!result) {
            throw new NotFoundException('No se pudo encontrar el registro de administración recién guardado');
        }

        return result;
    }

    async delete(id: string): Promise<void> {
        const admin = await this.adminRepo.findOne({
            where: { id },
            relations: ['prescription']
        });

        if (!admin) {
            throw new NotFoundException('El registro de administración no existe');
        }

        // Si se había administrado, devolvemos el stock a la prescripción del residente
        if (admin.status === 'administrado' && admin.prescription) {
            await this.residentsService.addMovement(admin.prescription.residentId, admin.prescription.id, {
                type: 'ENTRADA',
                quantity: admin.doseAdministered,
                reason: 'Anulación de administración',
                performedBy: 'Sistema',
                notes: `Anulación automática del registro del dia: ${admin.administeredAt?.toLocaleDateString()}`
            });
        }

        await this.adminRepo.remove(admin);
    }
}

