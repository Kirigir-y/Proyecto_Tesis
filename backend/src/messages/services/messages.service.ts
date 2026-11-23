import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Message } from '../entities/message.entity';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async findRecent(limit: number = DEFAULT_LIMIT): Promise<Message[]> {
    const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const messages = await this.messageRepository.find({
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
    return messages.reverse();
  }

  async create(data: {
    senderId: string;
    senderUsername: string;
    senderRole: string;
    content: string;
  }): Promise<Message> {
    const message = this.messageRepository.create(data);
    return this.messageRepository.save(message);
  }

  async findPinned(): Promise<Message[]> {
    return this.messageRepository.find({
      where: { pinned: true },
      order: { pinOrder: 'ASC', pinnedAt: 'ASC' },
    });
  }

  async pin(id: string, username: string): Promise<Message[]> {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException('El mensaje no existe.');

    if (!message.pinned) {
      const pinned = await this.findPinned();
      message.pinned = true;
      message.pinOrder = pinned.length + 1;
      message.pinnedBy = username;
      message.pinnedAt = new Date();
      await this.messageRepository.save(message);
    }
    return this.findPinned();
  }

  async unpin(id: string): Promise<Message[]> {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException('El mensaje no existe.');

    if (message.pinned) {
      message.pinned = false;
      message.pinOrder = null;
      message.pinnedBy = null;
      message.pinnedAt = null;
      await this.messageRepository.save(message);
      await this.renumber((await this.findPinned()).map((m) => m.id));
    }
    return this.findPinned();
  }

  async reorder(ids: string[]): Promise<Message[]> {
    if (!Array.isArray(ids)) throw new BadRequestException('Debe indicar el orden de los mensajes fijados.');
    const pinned = await this.findPinned();
    const pinnedIds = new Set(pinned.map((m) => m.id));
    const requested = ids.filter((id, i) => pinnedIds.has(id) && ids.indexOf(id) === i);
    const rest = pinned.map((m) => m.id).filter((id) => !requested.includes(id));
    await this.renumber([...requested, ...rest]);
    return this.findPinned();
  }

  private async renumber(orderedIds: string[]) {
    if (orderedIds.length === 0) return;
    const messages = await this.messageRepository.find({ where: { id: In(orderedIds) } });
    const byId = new Map(messages.map((m) => [m.id, m]));
    const updated = orderedIds
      .map((id, index) => {
        const m = byId.get(id);
        if (m) m.pinOrder = index + 1;
        return m;
      })
      .filter((m): m is Message => !!m);
    await this.messageRepository.save(updated);
  }
}
