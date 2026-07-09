import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MedicationsAdministrationService } from '../services/medications-administration.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('medications-administration')
@UseGuards(JwtAuthGuard)
export class MedicationsAdministrationController {
    constructor(
        private readonly adminService: MedicationsAdministrationService
    ) {}

    @Get()
    async getAll() {
        return this.adminService.findAll();
    }

    @Get('resident/:residentId')
    async getByResident(@Param('residentId') residentId: string) {
        return this.adminService.findByResident(residentId);
    }

    @Post()
    async register(@Body() body: {
        residentMedicationId: string;
        doseAdministered: number;
        dosageValue?: string;
        status: 'administrado' | 'rechazado' | 'omitido';
        administeredAt?: Date;
        notes?: string;
    }, @Request() req: any) {
        const username = req.user?.username || 'Sistema';
        return this.adminService.register({
            ...body,
            administeredBy: username,
        });
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.adminService.delete(id);
        return { success: true };
    }
}

