import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ShiftReport } from '../entities/shift-report.entity';
import { ResidentIncident } from '../entities/resident-incident.entity';
import { ResidentHygiene } from '../entities/resident-hygiene.entity';
import { ResidentFeeding } from '../entities/resident-feeding.entity';
import { ShiftReportChange } from '../entities/shift-report-change.entity';

const FIELD_LABELS: Record<string, string> = {
  supervisor: 'Encargado de turno',
  caregivers: 'Cuidadores de turno',
  staff: 'Personal',
  notaAlimentacion: 'Nota de alimentación',
  notaAseo: 'Nota de aseo',
  notaNovedades: 'Nota de novedades',
};

@Injectable()
export class ShiftReportsService {
  constructor(
    @InjectRepository(ShiftReport)
    private readonly shiftReportRepository: Repository<ShiftReport>,
    @InjectRepository(ShiftReportChange)
    private readonly changeRepository: Repository<ShiftReportChange>,
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

  async findByDateAndShift(date: string, shift: string): Promise<ShiftReport | null> {
    return this.shiftReportRepository.findOne({ where: { date, shift } });
  }

  async getHistory(id: string): Promise<ShiftReportChange[]> {
    await this.findOne(id);
    return this.changeRepository.find({
      where: { reportId: id },
      order: { createdAt: 'DESC' },
    });
  }

  private summarizeChanges(
    before: ShiftReport | null,
    mainData: Record<string, any>,
    incidents: any[] | undefined,
    hygienes: any[] | undefined,
    feedings: any[] | undefined,
  ): string {
    if (!before) {
      return `Informe creado (${incidents?.length ?? 0} novedad(es), ${hygienes?.length ?? 0} registro(s) de aseo, ${feedings?.length ?? 0} registro(s) de alimentación).`;
    }

    const parts: string[] = [];
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      if (!(key in mainData)) continue;
      const oldVal = (before as any)[key] ?? '';
      const newVal = mainData[key] ?? '';
      if (oldVal !== newVal) parts.push(label);
    }

    const oldIncidents = before.incidents?.length ?? 0;
    const newIncidents = incidents !== undefined ? incidents.length : oldIncidents;
    if (newIncidents !== oldIncidents) parts.push(`novedades (${oldIncidents} → ${newIncidents})`);

    const oldHygienes = before.hygienes?.length ?? 0;
    const newHygienes = hygienes !== undefined ? hygienes.length : oldHygienes;
    if (newHygienes !== oldHygienes) parts.push(`aseo clínico (${oldHygienes} → ${newHygienes})`);

    const oldFeedings = before.feedings?.length ?? 0;
    const newFeedings = feedings !== undefined ? feedings.length : oldFeedings;
    if (newFeedings !== oldFeedings) parts.push(`alimentación (${oldFeedings} → ${newFeedings})`);

    return parts.length > 0 ? `Se actualizó: ${parts.join(', ')}.` : 'Se guardó el informe sin cambios detectados.';
  }

  async create(reportData: any, userRole?: string, changedBy?: string): Promise<ShiftReport> {
    // Solo puede existir un informe por fecha + turno: si ya hay uno, se edita en vez de duplicarlo.
    const existing = await this.findByDateAndShift(reportData.date, reportData.shift);
    if (existing) {
      return this.update(existing.id, reportData, userRole, changedBy);
    }

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

      const summary = this.summarizeChanges(null, mainData, incidents, hygienes, feedings);
      await queryRunner.manager.save(ShiftReportChange, queryRunner.manager.create(ShiftReportChange, {
        reportId: savedReport.id,
        action: 'creado',
        changedBy: changedBy || 'Sistema',
        summary,
      }));

      await queryRunner.commitTransaction();
      return this.findOne(savedReport.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, reportData: any, userRole?: string, changedBy?: string): Promise<ShiftReport> {
    const report = await this.findOne(id);
    const before: ShiftReport = { ...report };
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

      const summary = this.summarizeChanges(
        canEditIncidents ? before : { ...before, incidents: undefined as any },
        mainData,
        canEditIncidents ? incidents : undefined,
        hygienes,
        feedings,
      );
      await queryRunner.manager.save(ShiftReportChange, queryRunner.manager.create(ShiftReportChange, {
        reportId: id,
        action: 'editado',
        changedBy: changedBy || 'Sistema',
        summary,
      }));

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
