import { Controller, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() userBody: Partial<User>, @Request() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden crear usuarios');
    }
    return this.usersService.create(userBody);
  }
}
