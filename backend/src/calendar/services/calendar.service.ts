import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CalendarEvent } from '../entities/calendar-event.entity';

// Una actividad periódica no puede repetirse indefinidamente ("por mil años"): se limita a 10 años.
const MAX_RECURRENCE_YEARS = 10;

// Los eventos de vencimiento de medicamento son virtuales (calculados desde el catálogo,
// no existen en la tabla calendar_events) y se identifican con este prefijo de id.
const isVirtualEventId = (id: string) => id.startsWith('virtual-');

const toLocalDateString = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Los turnos empiezan a las 08:00 (turno día) y a las 20:00 (turno noche). El turno noche
// cruza la medianoche, así que entre las 00:00 y las 07:59 todavía pertenece al turno noche
// que comenzó el día ANTERIOR — no al día calendario en curso.
const getShiftInfo = (now: Date): { date: string; shift: 'dia' | 'noche' } => {
  const hour = now.getHours();
  if (hour >= 8 && hour < 20) {
    return { date: toLocalDateString(now), shift: 'dia' };
  }
  if (hour >= 20) {
    return { date: toLocalDateString(now), shift: 'noche' };
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return { date: toLocalDateString(yesterday), shift: 'noche' };
};

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

import { Medication } from '../../medications/entities/medication.entity';
import { Resident } from '../../residents/entities/resident.entity';
import { ResidentMedication } from '../../residents/entities/resident-medication.entity';
import { ShiftReport } from '../../shift-reports/entities/shift-report.entity';
import { ResidentIncident } from '../../shift-reports/entities/resident-incident.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(Medication)
    private readonly medRepo: Repository<Medication>,
    @InjectRepository(Resident)
    private readonly residentRepo: Repository<Resident>,
    @InjectRepository(ResidentMedication)
    private readonly residentMedicationRepo: Repository<ResidentMedication>,
    @InjectRepository(ShiftReport)
    private readonly shiftReportRepo: Repository<ShiftReport>,
    @InjectRepository(ResidentIncident)
    private readonly residentIncidentRepo: Repository<ResidentIncident>,
  ) { }

  async findAll(): Promise<CalendarEvent[]> {
    const dbEvents = await this.calendarEventRepository.find({
      order: { startDate: 'ASC' },
    });

    const residents = await this.residentRepo.find();
    const residentsMap = new Map(residents.map(r => [r.id, r]));

    const populatedEvents = dbEvents.map(event => {
      if (event.residentId && residentsMap.has(event.residentId)) {
        (event as any).resident = residentsMap.get(event.residentId);
      }
      return event;
    });

    const meds = await this.medRepo.find();
    const virtualEvents = meds
      .filter(m => m.expirationDate)
      .map(m => {
        const ev = new CalendarEvent();
        ev.id = `virtual-exp-${m.id}`;
        ev.title = `⚠️ Vencimiento: ${m.name}`;
        ev.description = `Vencimiento del lote ${m.lotNumber || 'N/A'} del catálogo de medicamentos.`;
        ev.type = 'Vencimiento de Medicamento';
        ev.startDate = new Date(`${m.expirationDate}T09:00:00`);
        ev.endDate = new Date(`${m.expirationDate}T18:00:00`);
        ev.completed = false;
        ev.priority = 25;
        ev.createdBy = 'Sistema';
        return ev;
      });

    return [...populatedEvents, ...virtualEvents].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async findOne(id: string): Promise<CalendarEvent> {
    const event = await this.calendarEventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }
    if (event.residentId) {
      (event as any).resident = await this.residentRepo.findOne({ where: { id: event.residentId } });
    }
    return event;
  }

  private validateDateOrder(startDate?: Date | string | null, endDate?: Date | string | null): void {
    if (!startDate || !endDate) return;
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      throw new BadRequestException('La fecha de término no puede ser anterior a la fecha de inicio.');
    }
  }

  // En un evento "Retiro de medicamento" el residente nunca es opcional ni editable a mano:
  // se deriva siempre del medicamento de inventario seleccionado, ignorando cualquier
  // residentId que haya llegado desde el cliente. Además, el retiro solo se realiza en
  // horario diurno (08:00 a 19:59) — de noche no hay quien lo gestione en la farmacia.
  private async applyRetiroResidentLink(data: Partial<CalendarEvent>): Promise<void> {
    if (data.type !== 'Retiro de medicamento') return;

    if (!data.residentMedicationId) {
      throw new BadRequestException('Debe seleccionar el medicamento de inventario del residente para un retiro de medicamento.');
    }

    const presc = await this.residentMedicationRepo.findOne({ where: { id: data.residentMedicationId } });
    if (!presc) {
      throw new BadRequestException('El medicamento de inventario seleccionado no existe.');
    }

    data.residentId = presc.residentId;

    if (data.startDate) {
      const hour = new Date(data.startDate).getHours();
      if (hour < 8 || hour >= 20) {
        throw new BadRequestException('El retiro de medicamento solo puede programarse en horario diurno (08:00 a 19:59).');
      }
    }
  }

  async create(data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    await this.applyRetiroResidentLink(data);
    this.validateDateOrder(data.startDate, data.endDate);
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
    if (isVirtualEventId(id)) {
      throw new BadRequestException('No se pueden editar los vencimientos de medicamento: se generan automáticamente desde el catálogo.');
    }

    await this.applyRetiroResidentLink(data);

    const event = await this.findOne(id);
    const wasCompleted = event.completed;

    const newStartDate = data.startDate ?? event.startDate;
    const newEndDate = data.endDate !== undefined ? data.endDate : event.endDate;
    this.validateDateOrder(newStartDate, newEndDate);

    let saved: CalendarEvent;
    if (event.recurrenceGroupId) {
      // startDate/endDate/completed son propios de cada repetición puntual;
      // el resto de campos (título, tipo, descripción, ubicación, residente, etc.)
      // se propaga a todas las repeticiones de la misma actividad periódica.
      const { startDate, endDate, completed, ...sharedFields } = data;
      Object.assign(event, data);
      saved = await this.calendarEventRepository.save(event);

      if (Object.keys(sharedFields).length > 0) {
        await this.calendarEventRepository.update(
          { recurrenceGroupId: event.recurrenceGroupId, id: Not(event.id) },
          sharedFields,
        );
      }
    } else {
      Object.assign(event, data);
      saved = await this.calendarEventRepository.save(event);
    }

    // Al completar un "Retiro de medicamento" queda constancia en Novedades,
    // en el bloque del residente al que pertenece el retiro.
    if (!wasCompleted && saved.completed && saved.type === 'Retiro de medicamento') {
      try {
        await this.createRetiroNovedad(saved);
      } catch (err) {
        console.error('No se pudo crear la novedad automática del retiro de medicamento:', err);
      }
    }

    return saved;
  }

  private async createRetiroNovedad(event: CalendarEvent): Promise<void> {
    if (!event.residentId) return;

    const resident = await this.residentRepo.findOne({ where: { id: event.residentId } });
    if (!resident || resident.room == null || !resident.bed) return;

    let medicationLabel = event.title;
    if (event.residentMedicationId) {
      const presc = await this.residentMedicationRepo.findOne({ where: { id: event.residentMedicationId } });
      if (presc?.medication) {
        const { name, dosage, dosageUnit } = presc.medication;
        medicationLabel = `${name}${dosage ? ` ${dosage}${dosageUnit ?? ''}` : ''}`;
      }
    }

    const { date, shift } = getShiftInfo(new Date());

    let report = await this.shiftReportRepo.findOne({ where: { date, shift } });
    if (!report) {
      report = await this.shiftReportRepo.save(
        this.shiftReportRepo.create({ date, shift, supervisor: event.createdBy || 'Sistema' }),
      );
    }

    const incident = this.residentIncidentRepo.create({
      room: resident.room,
      bed: resident.bed,
      title: 'Novedad',
      description: `Se realizó el retiro de medicamento: ${medicationLabel}.`,
      report,
    });
    await this.residentIncidentRepo.save(incident);
  }

  async remove(id: string): Promise<void> {
    if (isVirtualEventId(id)) {
      throw new BadRequestException('No se pueden eliminar los vencimientos de medicamento: se generan automáticamente desde el catálogo.');
    }
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
    residentId?: string | null;
  }): Promise<CalendarEvent[]> {
    const groupId = crypto.randomUUID();
    const [hours, minutes] = data.startTime.split(':').map(Number);
    const priority = calculatePriority(data.title, data.description ?? '', data.type);

    if (data.type === 'Retiro de medicamento' && (hours < 8 || hours >= 20)) {
      throw new BadRequestException('El retiro de medicamento solo puede programarse en horario diurno (08:00 a 19:59).');
    }

    const current = new Date(`${data.startDate}T00:00:00`);
    const end = new Date(`${data.recurrenceEndDate}T23:59:59`);

    if (end < current) {
      throw new BadRequestException('La fecha de término de la repetición no puede ser anterior a la fecha de inicio.');
    }

    const maxEnd = new Date(current);
    maxEnd.setFullYear(maxEnd.getFullYear() + MAX_RECURRENCE_YEARS);
    if (end > maxEnd) {
      throw new BadRequestException(`Una actividad periódica no puede repetirse por más de ${MAX_RECURRENCE_YEARS} años.`);
    }

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
          residentId: data.residentId ?? null,
          priority,
        }),
      );

      current.setDate(current.getDate() + 7);

    }
    return await this.calendarEventRepository.save(events);

  }

}
