import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/services/users.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async login(usernameOrEmail: string, pass: string) {
        let user = await this.usersService.findByUsername(usernameOrEmail);
        if (!user) {
            user = await this.usersService.findByEmail(usernameOrEmail);
        }
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado o contraseña incorrectos');
        }
        const isPasswordValid = await bcrypt.compare(pass, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Usuario o contraseña incorrecta');
        }
        const payload = { sub: user.id, username: user.username, role: user.role };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: { id: user.id, username: user.username, role: user.role },
        };
    }
}