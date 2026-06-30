import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent } from '../entities/calendar-event.entity';

const HIGH_PRIORITY_KEYWORDS = [
  'urgente', 'emergencia', 'caída', 'caida', 'dolor', 'hospital',
  'sangrado', 'fiebre', 'crisis', 'desimpactación', 'desimpactacion',
  'curación', 'curacion', 'úlcera', 'ulcera', 'escara', 'sonda',
];

const MEDIUM_PRIORITY_KEYWORDS = [
  'médica', 'medica', 'medicamento', 'control', 'signos vitales',
  'procedimiento', 'capacitación', 'capacitacion', 'glicemia',
  'presión arterial', 'presion arterial', 'aseo',
];

function calculatePriority(title: string, description: string, type: string): number {
  const text = `${title} ${description ?? ''} ${type}`.toLowerCase();

  if (HIGH_PRIORITY_KEYWORDS.some((k) => text.includes(k))) return 30;
  if (MEDIUM_PRIORITY_KEYWORDS.some((k) => text.includes(k))) return 20;

  switch (type) {
    case 'Visita médica':
    case 'Control de signos vitales':
      return 20;
    case 'Capacitación':
      return 15;
    case 'Cumpleaños':
    case 'Actividad recreativa':
      return 5;
    default:
      return 10;
  }
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepository: Repository<CalendarEvent>,
  ) { }

  async findAll(): Promise<CalendarEvent[]> {
    return await this.calendarEventRepository.find({
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CalendarEvent> {
    const event = await this.calendarEventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }
    return event;
  }

  async create(data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    if (data.priority === undefined) {
      data.priority = calculatePriority(data.title ?? '', data.description ?? '', data.type ?? '');
    }
    const event = this.calendarEventRepository.create(data);
    return await this.calendarEventRepository.save(event);
  }

  async findPriorities(): Promise<CalendarEvent[]> {
    const now = new Date();

    // fin de la semana actual (domingo 23:59:59), la semana empieza el lunes
    const diaSemana = now.getDay(); // 0=domingo, 1=lunes ... 6=sábado
    const diasHastaDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
    const finSemana = new Date(now);
    finSemana.setDate(now.getDate() + diasHastaDomingo);
    finSemana.setHours(23, 59, 59, 999);

    return await this.calendarEventRepository
      .createQueryBuilder('event')
      .where('event.startDate <= :finSemana', { finSemana })
      .andWhere('(event.endDate >= :now OR (event.endDate IS NULL AND event.startDate >= :now))', { now })
      .andWhere('event.completed = false')
      .orderBy('event.priority', 'DESC')
      .addOrderBy('event.startDate', 'ASC')
      .getMany();
  }

  async reorder(ids: string[]): Promise<void> {
    const total = ids.length;
    await Promise.all(
      ids.map((id, index) =>
        this.calendarEventRepository.update(id, { priority: (total - index) * 100 }),
      ),
    );
  }

  async update(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const event = await this.findOne(id);
    Object.assign(event, data);
    return await this.calendarEventRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.calendarEventRepository.remove(event);
  }

  async removeRecurring(recurrenceGroupId: string): Promise<void> {
    await this.calendarEventRepository.delete({ recurrenceGroupId });
  }

  async createRecurring(data: {
    title: string;
    type: string;
    description?: string;
    location?: string;
    startDate: string;
    startTime: string;
    recurrenceEndDate: string;
    createdBy: string;
  }): Promise<CalendarEvent[]> {
    const groupId = crypto.randomUUID();
    const [hours, minutes] = data.startTime.split(':').map(Number);
    const priority = calculatePriority(data.title, data.description ?? '', data.type);

    const current = new Date(`${data.startDate}T00:00:00`);
    const end = new Date(`${data.recurrenceEndDate}T23:59:59`);

    const events: CalendarEvent[] = [];
    while (current <= end) {
      const eventDate = new Date(current);
      eventDate.setHours(hours, minutes, 0, 0);

      events.push(
        this.calendarEventRepository.create({
          title: data.title,
          type: data.type,
          description: data.description,
          location: data.location,
          startDate: eventDate,
          createdBy: data.createdBy,
          recurrenceGroupId: groupId,
          priority,
        }),
      );

      current.setDate(current.getDate() + 7);

    }
    return await this.calendarEventRepository.save(events);

  }

}
