import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { VisitLogsService } from '../services/visit-logs.service';

@Controller('visit-logs')
@UseGuards(JwtAuthGuard)
export class VisitLogsController {
  constructor(private readonly visitLogsService: VisitLogsService) {}

  @Get()
  findAll(@Query('date') date?: string) {
    return this.visitLogsService.findAll(date);
  }

  @Get('resident/:residentId')
  findByResident(@Param('residentId') residentId: string) {
    return this.visitLogsService.findByResident(residentId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('cuidador')
  create(@Body() body: any, @Request() req: any) {
    return this.visitLogsService.create({
      ...body,
      registradoPor: req.user.username,
    });
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('cuidador')
  update(@Param('id') id: string, @Body() body: any) {
    return this.visitLogsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('cuidador')
  async remove(@Param('id') id: string) {
    await this.visitLogsService.remove(id);
    return { success: true };
  }
}
