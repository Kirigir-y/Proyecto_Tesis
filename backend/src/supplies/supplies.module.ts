import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesController } from './controllers/supplies.controller';
import { SuppliesService } from './services/supplies.service';
import { SupplyItem } from './entities/supply-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupplyItem])],
  controllers: [SuppliesController],
  providers: [SuppliesService],
})
export class SuppliesModule {}
