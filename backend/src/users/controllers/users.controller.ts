import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  async create(@Body() userBody: Partial<User>, @Request() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden crear usuarios');
    }
    const user = await this.usersService.create(userBody);
    const { password, ...safe } = user;
    return safe;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<User>) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.usersService.remove(id, req.user.sub);
    return { success: true };
  }
}
