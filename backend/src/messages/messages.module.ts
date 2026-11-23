import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './controllers/messages.controller';
import { Message } from './entities/message.entity';
import { MessagesGateway } from './gateways/messages.gateway';
import { MessagesService } from './services/messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Message])],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
