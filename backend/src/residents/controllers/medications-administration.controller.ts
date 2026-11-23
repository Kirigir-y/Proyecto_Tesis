import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MedicationsAdministrationService } from '../services/medications-administration.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

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
    @UseGuards(RolesGuard)
    @Roles('admin', 'TENS')
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
    @UseGuards(RolesGuard)
    @Roles('admin', 'TENS')
    async remove(@Param('id') id: string) {
        await this.adminService.delete(id);
        return { success: true };
    }
}

