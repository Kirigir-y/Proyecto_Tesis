import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitLogsController } from './controllers/visit-logs.controller';
import { VisitLogsService } from './services/visit-logs.service';
import { VisitLog } from './entities/visit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VisitLog])],
  controllers: [VisitLogsController],
  providers: [VisitLogsService],
})
export class VisitLogsModule {}
