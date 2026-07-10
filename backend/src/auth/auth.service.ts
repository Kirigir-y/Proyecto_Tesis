import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/services/users.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async login(username: string, pass: string) {
        const startTime = Date.now();
        this.logger.log(`[LOGIN] Intento de login iniciado para: "${username}"`);

        if (!username || !pass) {
            this.logger.warn(`[LOGIN] FALLIDO - Faltan credenciales (username: ${!!username}, password: ${!!pass})`);
            throw new BadRequestException('Debe ingresar usuario y contraseña');
        }

        this.logger.debug(`[LOGIN] Buscando usuario por username: "${username}"`);
        const user = await this.usersService.findByUsername(username);

        if (!user) {
            this.logger.warn(`[LOGIN] FALLIDO - Usuario no encontrado: "${username}" (${Date.now() - startTime}ms)`);
            throw new UnauthorizedException('Usuario o contraseña incorrectos');
        }

        this.logger.debug(`[LOGIN] Usuario encontrado: id=${user.id}, username="${user.username}", role="${user.role}"`);
        this.logger.debug(`[LOGIN] Verificando contraseña para usuario id=${user.id}`);

        const isPasswordValid = await bcrypt.compare(pass, user.password);
        if (!isPasswordValid) {
            this.logger.warn(`[LOGIN] FALLIDO - Contraseña incorrecta para usuario id=${user.id}, username="${user.username}" (${Date.now() - startTime}ms)`);
            throw new UnauthorizedException('Usuario o contraseña incorrectos');
        }

        this.logger.debug(`[LOGIN] Contraseña válida, generando token JWT para usuario id=${user.id}`);
        const payload = { sub: user.id, username: user.username, role: user.role };
        const accessToken = await this.jwtService.signAsync(payload);

        this.logger.log(`[LOGIN] EXITOSO - Usuario id=${user.id}, username="${user.username}", role="${user.role}" (${Date.now() - startTime}ms)`);

        return {
            access_token: accessToken,
            user: { id: user.id, username: user.username, role: user.role },
        };
    }
}
