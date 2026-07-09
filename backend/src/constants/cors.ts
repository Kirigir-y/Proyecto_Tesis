import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

export const CORS: CorsOptions = {
    origin: process.env.CORS_ORIGIN || true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
}