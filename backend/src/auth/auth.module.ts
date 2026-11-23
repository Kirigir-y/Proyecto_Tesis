import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "src/users/users.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { getJwtSecret } from "./jwt-secret";

@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            global: true,
            useFactory: () => ({
                secret: getJwtSecret(),
                signOptions: { expiresIn: '1d' },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService],
})
export class AuthModule { }
