import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { VisitLog } from '../entities/visit-log.entity';

@Injectable()
export class VisitLogsService {
  constructor(
    @InjectRepository(VisitLog)
    private readonly visitLogRepository: Repository<VisitLog>,
  ) {}

  async findAll(date?: string): Promise<VisitLog[]> {
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      return this.visitLogRepository.find({
        where: { horaInicio: Between(start, end) },
        order: { horaInicio: 'DESC' },
      });
    }
    return this.visitLogRepository.find({ order: { horaInicio: 'DESC' } });
  }

  async findByResident(residentId: string): Promise<VisitLog[]> {
    return this.visitLogRepository.find({
      where: { residentId },
      order: { horaInicio: 'DESC' },
    });
  }

  async findOne(id: string): Promise<VisitLog> {
    const log = await this.visitLogRepository.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Registro con ID ${id} no encontrado`);
    }
    return log;
  }

  async create(data: Partial<VisitLog>): Promise<VisitLog> {
    const log = this.visitLogRepository.create(data);
    return this.visitLogRepository.save(log);
  }

  async update(id: string, data: Partial<VisitLog>): Promise<VisitLog> {
    const log = await this.findOne(id);
    Object.assign(log, data);
    return this.visitLogRepository.save(log);
  }

  async remove(id: string): Promise<void> {
    const log = await this.findOne(id);
    await this.visitLogRepository.remove(log);
  }
}
