import { Injectable, BadRequestException } from '@nestjs/common'; // <-- Importamos Exception
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async create(userBody: Partial<User>): Promise<User> {
    if (!userBody.password) {
      throw new BadRequestException('La contraseña es obligatoria para crear un usuario');
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
