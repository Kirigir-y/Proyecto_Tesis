import {
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyItem } from '../entities/supply-item.entity';

const DEFAULT_ITEMS = [
  'Desodorante',
  'Jabón / Shampoo',
  'Pasta y cepillo de dientes',
  'Toallitas húmedas',
  'Alcohol gel',
  'Cotonitos / hisopos',
];

const STATUS_PRIORITY: Record<string, number> = {
  falta: 0,
  poco: 1,
  disponible: 2,
};

@Injectable()
export class SuppliesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(SupplyItem)
    private readonly supplyItemRepository: Repository<SupplyItem>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.supplyItemRepository.count();
    if (count === 0) {
      await this.supplyItemRepository.save(
        DEFAULT_ITEMS.map((name) =>
          this.supplyItemRepository.create({
            name,
            status: 'disponible',
            updatedBy: 'Sistema',
          }),
        ),
      );
    }
  }

  async findAll(): Promise<SupplyItem[]> {
    const items = await this.supplyItemRepository.find();
    return items.sort((a, b) => {
      const diff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }

  async findOne(id: string): Promise<SupplyItem> {
    const item = await this.supplyItemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Insumo con ID ${id} no encontrado`);
    }
    return item;
  }

  async create(data: Partial<SupplyItem>): Promise<SupplyItem> {
    const item = this.supplyItemRepository.create(data);
    return this.supplyItemRepository.save(item);
  }

  async update(id: string, data: Partial<SupplyItem>): Promise<SupplyItem> {
    const item = await this.findOne(id);
    Object.assign(item, data);
    return this.supplyItemRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.supplyItemRepository.remove(item);
  }
}
