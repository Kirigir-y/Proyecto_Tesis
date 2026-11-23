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
import { Message } from '../entities/message.entity';


@WebSocketGateway({ cors: CORS, namespace: '/messages' })
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(private readonly jwtService: JwtService) { }


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

  broadcastMessage(message: Message) {
    this.server.emit('message:new', message);
  }

  broadcastPinned(pinned: Message[]) {
    this.server.emit('message:pinned', pinned);
  }
}
