import { Controller, Get } from '@nestjs/common';

export const SERVICE_ID = 'eleam-backend';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { service: SERVICE_ID, ok: true };
  }
}
