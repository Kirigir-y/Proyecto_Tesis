import { Injectable, BadRequestException, OnApplicationBootstrap } from '@nestjs/common'; // <-- Importamos Exception
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
      console.log('--- Creando usuarios por defecto en la base de datos ---');

      await this.create({
        username: 'admin',
        email: 'admin@hospital.com',
        password: 'admin123',
        role: Role.ADMIN,
      });

      await this.create({
        username: 'enfermera',
        email: 'enfermera@hospital.com',
        password: 'enfermera123',
        role: Role.ENFERMERO,
      });

      await this.create({
        username: 'tens',
        email: 'tens@hospital.com',
        password: 'tens123',
        role: Role.TENS,
      });

      await this.create({
        username: 'cuidador',
        email: 'cuidador@hospital.com',
        password: 'cuidador123',
        role: Role.CUIDADOR,
      });

      console.log('--- Usuarios creados con éxito ---');
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
}
