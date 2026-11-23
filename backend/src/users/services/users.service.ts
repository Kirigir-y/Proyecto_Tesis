import { Injectable, BadRequestException, NotFoundException, ForbiddenException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '../enums/role.enum';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

  async onApplicationBootstrap() {
    const count = await this.userRepository.count();
    if (count === 0) {
      const password = process.env.ADMIN_INITIAL_PASSWORD?.trim() || 'admin123';

      await this.create({
        username: 'admin',
        email: null,
        password,
        role: Role.ADMIN,
      });

      console.log('--- Usuario administrador inicial creado: usuario "admin" ---');
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async create(userBody: Partial<User>): Promise<User> {
    if (!userBody.username) {
      throw new BadRequestException('El nombre de usuario es obligatorio para crear un usuario');
    }
    if (!userBody.password) {
      throw new BadRequestException('La contraseña es obligatoria para crear un usuario');
    }

    const existingUser = await this.findByUsername(userBody.username);
    if (existingUser) {
      throw new BadRequestException('El nombre de usuario ya está en uso');
    }

    if (userBody.email) {
      const existingEmail = await this.userRepository.findOne({ where: { email: userBody.email } });
      if (existingEmail) {
        throw new BadRequestException('El email ya está en uso');
      }
    }

    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(userBody.password, saltOrRounds);

    const newUserConfig = {
      ...userBody,
      password: hashedPassword, // Sobrescribimos la plana con la segura
    };

    const newUser = this.userRepository.create(newUserConfig);
    return await this.userRepository.save(newUser);
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return await this.userRepository.find({
      select: ['id', 'username', 'email', 'role', 'active'],
      order: { username: 'ASC' },
    });
  }

  async update(id: string, data: Partial<User>): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (data.username && data.username !== user.username) {
      const existing = await this.findByUsername(data.username);
      if (existing) {
        throw new BadRequestException('El nombre de usuario ya está en uso');
      }
    }

    const { password, ...rest } = data;
    Object.assign(user, rest);

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    const saved = await this.userRepository.save(user);
    const { password: _omit, ...safe } = saved;
    return safe;
  }

  async remove(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.userRepository.remove(user);
  }
}
