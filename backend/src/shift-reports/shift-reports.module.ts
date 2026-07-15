import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftReportsController } from './controllers/shift-reports.controller';
import { ShiftReportsService } from './services/shift-reports.service';
import { ShiftReport } from './entities/shift-report.entity';
import { ResidentIncident } from './entities/resident-incident.entity';
import { ResidentHygiene } from './entities/resident-hygiene.entity';
import { ResidentFeeding } from './entities/resident-feeding.entity';
import { ShiftReportChange } from './entities/shift-report-change.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftReport, ResidentIncident, ResidentHygiene, ResidentFeeding, ShiftReportChange])],
  controllers: [ShiftReportsController],
  providers: [ShiftReportsService],
  exports: [ShiftReportsService],
})
export class ShiftReportsModule { }
