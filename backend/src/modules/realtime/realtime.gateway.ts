import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { AlarmSeverity, AlarmStatus, MachineStatus } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/interfaces/jwt-payload.interface';

export interface MachineUpdatePayload {
  machineId: string;
  machineCode: string;
  status: MachineStatus;
  productionCount?: number | null;
  cycleTime?: number | null;
  runtime?: number | null;
  downtime?: number | null;
  temperature?: number | null;
  current?: number | null;
  voltage?: number | null;
  power?: number | null;
  timestamp: string;
}

export interface AlarmUpdatePayload {
  machineId: string;
  machineCode: string;
  alarmCode: string;
  severity: AlarmSeverity;
  message: string;
  status: AlarmStatus;
  timestamp: string;
}

export interface ProductionUpdatePayload {
  machineId: string;
  machineCode: string;
  productionCount: number;
  cycleTime?: number | null;
  runtime?: number | null;
  downtime?: number | null;
  timestamp: string;
}

export interface DashboardUpdatePayload {
  total: number;
  running: number;
  idle: number;
  stop: number;
  alarm: number;
  offline: number;
  activeAlarms: number;
  timestamp: string;
}

export const SOCKET_EVENTS = {
  MACHINE_UPDATE: 'machine_update',
  ALARM_UPDATE: 'alarm_update',
  PRODUCTION_UPDATE: 'production_update',
  DASHBOARD_UPDATE: 'dashboard_update',
} as const;

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }
      this.jwtService
        .verifyAsync<JwtPayload>(token, {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        })
        .then((payload) => {
          if (payload.type !== 'access') {
            next(new Error('Unauthorized'));
            return;
          }
          (socket.data as Record<string, unknown>).user = {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
          } satisfies AuthenticatedUser;
          next();
        })
        .catch(() => {
          next(new Error('Unauthorized'));
        });
    });
  }

  handleConnection(socket: Socket): void {
    const user = (socket.data as { user?: AuthenticatedUser }).user;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    this.logger.log(`Socket connected: ${socket.id} (${user.email})`);
  }

  broadcastMachineUpdate(payload: MachineUpdatePayload): void {
    this.server.emit(SOCKET_EVENTS.MACHINE_UPDATE, payload);
  }

  broadcastAlarmUpdate(payload: AlarmUpdatePayload): void {
    this.server.emit(SOCKET_EVENTS.ALARM_UPDATE, payload);
  }

  broadcastProductionUpdate(payload: ProductionUpdatePayload): void {
    this.server.emit(SOCKET_EVENTS.PRODUCTION_UPDATE, payload);
  }

  broadcastDashboardUpdate(payload: DashboardUpdatePayload): void {
    this.server.emit(SOCKET_EVENTS.DASHBOARD_UPDATE, payload);
  }
}
