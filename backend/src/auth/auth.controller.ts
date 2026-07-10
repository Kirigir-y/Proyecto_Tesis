import { Controller, HttpCode, HttpStatus, Logger, Post, Body, Ip, Headers } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async signIn(
        @Body() signInDto: Record<string, any>,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ) {
        this.logger.log(`[LOGIN] POST /auth/login recibido - usuario: "${signInDto.username}", ip: ${ip}, user-agent: ${userAgent}`);

        if (!signInDto.username) {
            this.logger.warn(`[LOGIN] Petición sin username - ip: ${ip}`);
        }
        if (!signInDto.password) {
            this.logger.warn(`[LOGIN] Petición sin password - usuario: "${signInDto.username}", ip: ${ip}`);
        }

        try {
            const result = await this.authService.login(signInDto.username, signInDto.password);
            this.logger.log(`[LOGIN] Respuesta 200 enviada - usuario: "${signInDto.username}", ip: ${ip}`);
            return result;
        } catch (error) {
            this.logger.error(`[LOGIN] Respuesta de error - usuario: "${signInDto.username}", ip: ${ip}, error: ${error.message}`);
            throw error;
        }
    }
}
