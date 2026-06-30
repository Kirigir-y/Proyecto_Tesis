import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ResidentsService } from '../services/residents.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

// Lectura básica (findAll/findOne/findByRoom) queda abierta a cualquier rol autenticado,
// porque Novedades (aseo/alimentación) necesita resolver nombres de residentes por habitación/cama
// incluso para el rol 'cuidador'. La gestión de fichas y medicamentos sí queda restringida.
@Controller('residents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResidentsController {
    constructor(private readonly service: ResidentsService) {}

    @Get()
    findAll() { return this.service.findAll(); }

    // Rutas estáticas antes de /:id para evitar conflictos de parámetro
    @Get('medications/inventory')
    @Roles('admin', 'TENS', 'Enfermero')
    getAllPrescriptions() { return this.service.getAllPrescriptions(); }

    @Get('room/:room')
    findByRoom(@Param('room') room: string) { return this.service.findByRoom(Number(room)); }

    @Get(':id')
    findOne(@Param('id') id: string) { return this.service.findOne(id); }

    @Post()
    @Roles('admin', 'TENS', 'Enfermero')
    create(@Body() body: any) { return this.service.create(body); }

    @Put(':id')
    @Roles('admin', 'TENS', 'Enfermero')
    update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

    @Delete(':id')
    @Roles('admin', 'TENS', 'Enfermero')
    async remove(@Param('id') id: string) {
        await this.service.remove(id);
        return { success: true };
    }

    // ── Prescriptions ─────────────────────────────────────────────────────────

    @Get(':id/medications')
    @Roles('admin', 'TENS', 'Enfermero')
    getPrescriptions(@Param('id') id: string) { return this.service.getPrescriptions(id); }

    @Post(':id/medications')
    @Roles('admin', 'TENS', 'Enfermero')
    addPrescription(@Param('id') id: string, @Body() body: any) {
        return this.service.addPrescription(id, body);
    }

    @Delete(':id/medications/:prescId')
    @Roles('admin', 'TENS', 'Enfermero')
    removePrescription(@Param('id') id: string, @Param('prescId') prescId: string) {
        return this.service.removePrescription(id, prescId);
    }

    // ── Movimientos de inventario por residente ───────────────────────────────

    @Get(':id/medications/:prescId/movements')
    @Roles('admin', 'TENS', 'Enfermero')
    getMovements(@Param('id') id: string, @Param('prescId') prescId: string) {
        return this.service.getMovements(id, prescId);
    }

    @Post(':id/medications/:prescId/movements')
    @Roles('admin', 'TENS', 'Enfermero')
    addMovement(@Param('id') id: string, @Param('prescId') prescId: string, @Body() body: any) {
        return this.service.addMovement(id, prescId, body);
    }
}
