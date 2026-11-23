import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getJwtSecret } from '../../auth/jwt-secret';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CORS } from '../../constants';
import { ShiftReport } from '../entities/shift-report.entity';

@WebSocketGateway({ cors: CORS, namespace: '/shift-reports' })
export class ShiftReportsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ShiftReportsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      this.logger.warn(`Conexión rechazada (sin token): ${client.id}`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: getJwtSecret(),
      });
      client.data.user = payload;
    } catch {
      this.logger.warn(`Conexión rechazada (token inválido): ${client.id}`);
      client.disconnect(true);
    }
  }

  broadcastUpdated(report: ShiftReport, changedBy?: string) {
    this.server.emit('shift-report:updated', {
      id: report.id,
      date: report.date,
      shift: report.shift,
      changedBy,
    });
  }
}
