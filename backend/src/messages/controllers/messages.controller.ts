import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MessagesGateway } from '../gateways/messages.gateway';
import { MessagesService } from '../services/messages.service';


const PIN_ROLES = ['admin', 'Enfermero', 'TENS'];

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly messagesGateway: MessagesGateway,
  ) { }

  @Get()
  findRecent(@Query('limit') limit?: string) {
    return this.messagesService.findRecent(limit ? Number(limit) : undefined);
  }

  @Get('pinned')
  findPinned() {
    return this.messagesService.findPinned();
  }

  @Put('pinned/order')
  @UseGuards(RolesGuard)
  @Roles(...PIN_ROLES)
  async reorderPinned(@Body('ids') ids: string[]) {
    const pinned = await this.messagesService.reorder(ids);
    this.messagesGateway.broadcastPinned(pinned);
    return pinned;
  }

  @Post()
  async create(@Body('content') content: string, @Request() req: any) {
    if (!content || !content.trim()) {
      throw new BadRequestException('El mensaje no puede estar vacío');
    }

    const message = await this.messagesService.create({
      senderId: req.user.sub,
      senderUsername: req.user.username,
      senderRole: req.user.role,
      content: content.trim(),
    });

    this.messagesGateway.broadcastMessage(message);
    return message;
  }

  @Patch(':id/pin')
  @UseGuards(RolesGuard)
  @Roles(...PIN_ROLES)
  async pin(@Param('id') id: string, @Request() req: any) {
    const pinned = await this.messagesService.pin(id, req.user.username);
    this.messagesGateway.broadcastPinned(pinned);
    return pinned;
  }

  @Patch(':id/unpin')
  @UseGuards(RolesGuard)
  @Roles(...PIN_ROLES)
  async unpin(@Param('id') id: string) {
    const pinned = await this.messagesService.unpin(id);
    this.messagesGateway.broadcastPinned(pinned);
    return pinned;
  }
}
