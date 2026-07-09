import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CalendarService } from '../services/calendar.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) { }

  @Get()
  async findAll() {
    return await this.calendarService.findAll();
  }

  @Post('recurring')
  async createRecurring(@Body() body: any, @Request() req: any) {
    body.createdBy = req.user.username;
    return await this.calendarService.createRecurring(body);
  }

  @Get('priorities')
  async findPriorities() {
    return await this.calendarService.findPriorities();
  }

  @Put('reorder')
  async reorder(@Body() body: { ids: string[] }) {
    await this.calendarService.reorder(body.ids);
    return { success: true };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.calendarService.findOne(id);
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    body.createdBy = req.user.username;
    return await this.calendarService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.calendarService.update(id, body);
  }

  @Delete('recurring/:groupId')
  async removeRecurring(@Param('groupId') groupId: string) {
    await this.calendarService.removeRecurring(groupId);
    return { success: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.calendarService.remove(id);
    return { success: true };
  }
}
