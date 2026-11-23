import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ShiftReportsService } from '../services/shift-reports.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ShiftReportsGateway } from '../gateways/shift-reports.gateway';

@Controller('shift-reports')
@UseGuards(JwtAuthGuard)
export class ShiftReportsController {
  constructor(
    private readonly shiftReportsService: ShiftReportsService,
    private readonly shiftReportsGateway: ShiftReportsGateway,
  ) {}

  @Get()
  async findAll() {
    return await this.shiftReportsService.findAll();
  }

  @Get('by-date')
  async findByDateAndShift(@Query('date') date: string, @Query('shift') shift: string) {
    return await this.shiftReportsService.findByDateAndShift(date, shift);
  }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles('admin', 'Enfermero')
  async getHistory(@Param('id') id: string) {
    return await this.shiftReportsService.getHistory(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.shiftReportsService.findOne(id);
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const user = req.user;

    // Autofill supervisor logic
    if (user.role !== 'admin') {
      body.supervisor = user.username;
    } else if (!body.supervisor) {
      body.supervisor = user.username;
    }

    const report = await this.shiftReportsService.create(body, user.role, user.username);
    this.shiftReportsGateway.broadcastUpdated(report, user.username);
    return report;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const user = req.user;

    // Autofill supervisor logic
    if (user.role !== 'admin') {
      body.supervisor = user.username;
    } else if (!body.supervisor) {
      body.supervisor = user.username;
    }

    const report = await this.shiftReportsService.update(id, body, user.role, user.username);
    this.shiftReportsGateway.broadcastUpdated(report, user.username);
    return report;
  }
}
