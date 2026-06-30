import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ShiftReport } from '../entities/shift-report.entity';
import { ResidentIncident } from '../entities/resident-incident.entity';
import { ResidentHygiene } from '../entities/resident-hygiene.entity';
import { ResidentFeeding } from '../entities/resident-feeding.entity';

@Injectable()
export class ShiftReportsService {
  constructor(
    @InjectRepository(ShiftReport)
    private readonly shiftReportRepository: Repository<ShiftReport>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  async findAll(): Promise<ShiftReport[]> {
    return await this.shiftReportRepository.find({
      order: {
        date: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<ShiftReport> {
    const report = await this.shiftReportRepository.findOne({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException(`Shift report with ID ${id} not found`);
    }
    return report;
  }

  async create(reportData: any, userRole?: string): Promise<ShiftReport> {
    const { incidents, hygienes, feedings, ...mainData } = reportData;
    // El rol 'cuidador' solo puede manipular aseo y alimentación; las novedades quedan vacías.
    const canEditIncidents = userRole !== 'cuidador';
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newReport = queryRunner.manager.create(ShiftReport, mainData as Partial<ShiftReport>);
      const savedReport = await queryRunner.manager.save(ShiftReport, newReport);

      if (canEditIncidents && incidents && incidents.length > 0) {
        const incidentEntities = incidents.map((incident: any) =>
          queryRunner.manager.create(ResidentIncident, { ...incident, report: savedReport })
        );
        await queryRunner.manager.save(ResidentIncident, incidentEntities);
      }

      if (hygienes && hygienes.length > 0) {
        const hygieneEntities = hygienes.map((hygiene: any) =>
          queryRunner.manager.create(ResidentHygiene, { ...hygiene, report: savedReport })
        );
        await queryRunner.manager.save(ResidentHygiene, hygieneEntities);
      }

      if (feedings && feedings.length > 0) {
        const feedingEntities = feedings.map((feeding: any) =>
          queryRunner.manager.create(ResidentFeeding, { ...feeding, report: savedReport })
        );
        await queryRunner.manager.save(ResidentFeeding, feedingEntities);
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedReport.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, reportData: any, userRole?: string): Promise<ShiftReport> {
    const report = await this.findOne(id);
    const { incidents, hygienes, feedings, ...mainData } = reportData;
    // El rol 'cuidador' solo puede manipular aseo y alimentación; las novedades existentes no se tocan.
    const canEditIncidents = userRole !== 'cuidador';
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      Object.assign(report, mainData);
      await queryRunner.manager.save(ShiftReport, report);

      if (canEditIncidents) {
        await queryRunner.manager.delete(ResidentIncident, { report: { id } });
      }
      await queryRunner.manager.delete(ResidentHygiene, { report: { id } });
      await queryRunner.manager.delete(ResidentFeeding, { report: { id } });

      if (canEditIncidents && incidents && incidents.length > 0) {
        const incidentEntities = incidents.map((incident: any) =>
          queryRunner.manager.create(ResidentIncident, { ...incident, report })
        );
        await queryRunner.manager.save(ResidentIncident, incidentEntities);
      }

      if (hygienes && hygienes.length > 0) {
        const hygieneEntities = hygienes.map((hygiene: any) =>
          queryRunner.manager.create(ResidentHygiene, { ...hygiene, report })
        );
        await queryRunner.manager.save(ResidentHygiene, hygieneEntities);
      }

      if (feedings && feedings.length > 0) {
        const feedingEntities = feedings.map((feeding: any) =>
          queryRunner.manager.create(ResidentFeeding, { ...feeding, report })
        );
        await queryRunner.manager.save(ResidentFeeding, feedingEntities);
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
