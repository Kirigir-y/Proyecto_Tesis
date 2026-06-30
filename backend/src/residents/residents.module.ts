import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resident } from './entities/resident.entity';
import { ResidentMedication } from './entities/resident-medication.entity';
import { ResidentMedicationMovement } from './entities/resident-medication-movement.entity';
import { ResidentsService } from './services/residents.service';
import { ResidentsController } from './controllers/residents.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Resident, ResidentMedication, ResidentMedicationMovement])],
    controllers: [ResidentsController],
    providers: [ResidentsService],
    exports: [ResidentsService],
})
export class ResidentsModule {}
