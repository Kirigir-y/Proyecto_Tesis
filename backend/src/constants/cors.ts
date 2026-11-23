import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const parseOrigins = (value?: string): CorsOptions['origin'] => {
    const raw = (value ?? '').trim();
    if (!raw || raw === '*') return true;
    const list = raw.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
    return list.length === 1 ? list[0] : list;
};

export const CORS: CorsOptions = {
    origin: parseOrigins(process.env.CORS_ORIGIN),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
}
