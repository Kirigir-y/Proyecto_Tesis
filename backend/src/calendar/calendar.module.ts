import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './controllers/calendar.controller';
import { CalendarService } from './services/calendar.service';
import { CalendarEvent } from './entities/calendar-event.entity';
import { Medication } from '../medications/entities/medication.entity';
import { Resident } from '../residents/entities/resident.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarEvent, Medication, Resident])],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule { }
