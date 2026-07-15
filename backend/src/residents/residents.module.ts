import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resident } from './entities/resident.entity';
import { ResidentMedication } from './entities/resident-medication.entity';
import { ResidentMedicationMovement } from './entities/resident-medication-movement.entity';
import { MedicationAdministration } from './entities/medication-administration.entity';
import { CalendarEvent } from '../calendar/entities/calendar-event.entity';
import { Medication } from '../medications/entities/medication.entity';
import { ResidentsService } from './services/residents.service';
import { MedicationsAdministrationService } from './services/medications-administration.service';
import { ResidentsController } from './controllers/residents.controller';
import { MedicationsAdministrationController } from './controllers/medications-administration.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Resident, ResidentMedication, ResidentMedicationMovement, MedicationAdministration, CalendarEvent, Medication])],
    controllers: [ResidentsController, MedicationsAdministrationController],
    providers: [ResidentsService, MedicationsAdministrationService],
    exports: [ResidentsService],
})
export class ResidentsModule {}
