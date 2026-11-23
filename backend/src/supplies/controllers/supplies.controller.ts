import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SuppliesService } from '../services/supplies.service';

@Controller('supply-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('cuidador')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Get()
  findAll() {
    return this.suppliesService.findAll();
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.suppliesService.create({
      ...body,
      updatedBy: req.user.username,
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.suppliesService.update(id, {
      ...body,
      updatedBy: req.user.username,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.suppliesService.remove(id);
    return { success: true };
  }
}
