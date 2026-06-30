import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medication } from './entities/medication.entity';
import { MedicationMovement } from './entities/medication-movement.entity';
import { MedicationsService } from './services/medications.service';
import { MedicationsController } from './controllers/medications.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Medication, MedicationMovement])],
    providers: [MedicationsService],
    controllers: [MedicationsController],
})
export class MedicationsModule {}
