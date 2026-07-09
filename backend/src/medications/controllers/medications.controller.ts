import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { MedicationsService } from '../services/medications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('medications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'TENS', 'Enfermero')
export class MedicationsController {
    constructor(private readonly service: MedicationsService) {}

    @Get()
    findAll() { return this.service.findAll(); }

    @Get(':id')
    findOne(@Param('id') id: string) { return this.service.findOne(id); }

    @Post()
    create(@Body() dto: any) { return this.service.create(dto); }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

    @Delete(':id')
    remove(@Param('id') id: string) { return this.service.remove(id); }

    @Get(':id/movements')
    getMovements(@Param('id') id: string) { return this.service.getMovements(id); }

    @Post(':id/movements')
    addMovement(@Param('id') id: string, @Body() dto: any) {
        return this.service.addMovement(id, dto);
    }
}
