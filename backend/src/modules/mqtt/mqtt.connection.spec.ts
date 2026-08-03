import { EventEmitter } from 'events';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MqttClient } from 'mqtt';
import { PrismaService } from '../prisma/prisma.service';
import { MqttService } from './mqtt.service';

jest.mock('mqtt', () => {
  const actual = jest.requireActual('mqtt');
  return {
    ...actual,
    connect: jest.fn(),
  };
});

describe('MqttService connection lifecycle', () => {
  let service: MqttService;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mqtt = require('mqtt') as {
    connect: jest.Mock;
  };
  let fakeClient: EventEmitter & Pick<MqttClient, 'subscribe' | 'end'>;
  let connectOptions: Record<string, unknown> | undefined;

  const prisma = {
    machine: { findUnique: jest.fn(), update: jest.fn() },
    machineLog: { create: jest.fn() },
    alarm: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const eventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    fakeClient = Object.assign(new EventEmitter(), {
      subscribe: jest.fn((_topics: string[], cb: () => void) => cb()),
      end: jest.fn(),
    });
    connectOptions = undefined;
    mqtt.connect.mockImplementation((url: string, options: unknown) => {
      connectOptions = options as Record<string, unknown>;
      return fakeClient;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string> = {
                MQTT_URL: 'mqtt://localhost:1883',
                MQTT_USERNAME: 'backend',
                MQTT_PASSWORD: 'secret',
              };
              return values[key];
            }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MqttService>(MqttService);
    service.onModuleInit();
  });

  it('connects with the configured URL, credentials and reconnect period', () => {
    expect(mqtt.connect).toHaveBeenCalledWith(
      'mqtt://localhost:1883',
      expect.objectContaining({
        username: 'backend',
        password: 'secret',
        reconnectPeriod: 5000,
        keepalive: 60,
      }),
    );
  });

  it('subscribes to data, alarm and heartbeat topics on connect', () => {
    fakeClient.emit('connect');
    expect(fakeClient.subscribe).toHaveBeenCalledWith(
      [
        'factory/machine/+/data',
        'factory/machine/+/alarm',
        'factory/machine/+/heartbeat',
      ],
      expect.any(Function),
    );
  });

  it('re-uses the same client when the broker reconnects', () => {
    const before = mqtt.connect.mock.calls.length;
    fakeClient.emit('connect');
    fakeClient.emit('reconnect');
    fakeClient.emit('offline');
    fakeClient.emit('error', new Error('connection reset'));
    expect(mqtt.connect.mock.calls.length).toBe(before);
    expect(connectOptions).toBeDefined();
  });

  it('resubscribes after a broker restart cycle', () => {
    fakeClient.emit('connect');
    expect(fakeClient.subscribe).toHaveBeenCalledTimes(1);
    fakeClient.emit('close');
    fakeClient.emit('reconnect');
    fakeClient.emit('connect');
    expect(fakeClient.subscribe).toHaveBeenCalledTimes(2);
  });

  it('disposes the client on module destroy', () => {
    service.onModuleDestroy();
    expect(fakeClient.end).toHaveBeenCalledWith(true);
  });

  it('processes messages arriving after reconnect', async () => {
    prisma.machine.findUnique.mockResolvedValue({ id: 'machine-1' });
    prisma.machineLog.create.mockResolvedValue({});
    fakeClient.emit('connect');
    fakeClient.emit('reconnect');
    fakeClient.emit('connect');
    fakeClient.emit(
      'message',
      'factory/machine/M001/data',
      Buffer.from(
        JSON.stringify({
          machine_id: 'M001',
          status: 'RUN',
          production_count: 5,
        }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(prisma.machine.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { machineCode: 'M001' } }),
    );
  });
});
