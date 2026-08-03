import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { connect, MqttClient } from 'mqtt';
import { createTestApp } from './utils';
import { PrismaService } from '../src/modules/prisma/prisma.service';

/**
 * Integration tests against the real Mosquitto broker (docker compose).
 * Requires `docker compose up -d` (mosquitto + postgres) and backend env vars.
 */
describe('MQTT broker integration (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let publisher: MqttClient;
  let machineId: string;
  let previousStatus: string;

  const TOPIC_PREFIX = 'factory/machine';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    publisher = connect('mqtt://127.0.0.1:1883', {
      username: 'machine_M001',
      password: 'M001@SmartFactory',
      clientId: 'e2e-publisher',
      connectTimeout: 10_000,
    });
    await new Promise<void>((resolve, reject) => {
      publisher.once('connect', () => resolve());
      publisher.once('error', reject);
    });
    const machine = await prisma.machine.findUniqueOrThrow({
      where: { machineCode: 'M001' },
    });
    machineId = machine.id;
    previousStatus = machine.status;
  });

  afterAll(async () => {
    publisher.end(true);
    await prisma.machine.update({
      where: { id: machineId },
      data: { status: previousStatus as never },
    });
    await app.close();
  });

  const publish = (topic: string, payload: unknown): Promise<void> =>
    new Promise((resolve, reject) => {
      publisher.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) =>
        error ? reject(error) : resolve(),
      );
    });

  const waitFor = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  it('processes a machine data message end-to-end', async () => {
    const before = await prisma.machineLog.count({
      where: { machineId },
    });
    await publish(`${TOPIC_PREFIX}/M001/data`, {
      machine_id: 'M001',
      status: 'RUN',
      production_count: 77,
      cycle_time: 42.5,
      temperature: 55.0,
      timestamp: Math.floor(Date.now() / 1000),
    });
    await waitFor(1500);
    const after = await prisma.machineLog.count({ where: { machineId } });
    expect(after).toBeGreaterThan(before);
    const machine = await prisma.machine.findUniqueOrThrow({
      where: { id: machineId },
    });
    expect(machine.status).toBe('RUN');
    await prisma.machineLog.deleteMany({
      where: { machineId, productionCount: 77 },
    });
  });

  it('processes a machine alarm message end-to-end', async () => {
    await publish(`${TOPIC_PREFIX}/M001/alarm`, {
      machine_id: 'M001',
      alarm_code: 'E2E-ALM',
      severity: 'CRITICAL',
      message: 'E2E alarm from real broker',
      timestamp: Math.floor(Date.now() / 1000),
    });
    await waitFor(1500);
    const alarms = await prisma.alarm.findMany({
      where: { machineId, alarmCode: 'E2E-ALM' },
      orderBy: { startTime: 'desc' },
    });
    expect(alarms.length).toBeGreaterThan(0);
    expect(alarms[0]?.status).toBe('ACTIVE');
    await prisma.alarm.deleteMany({
      where: { machineId, alarmCode: 'E2E-ALM' },
    });
  });

  it('processes a heartbeat message and refreshes the machine timestamp', async () => {
    await prisma.machine.update({
      where: { id: machineId },
      data: { updatedAt: new Date(Date.now() - 60_000) },
    });
    await publish(`${TOPIC_PREFIX}/M001/heartbeat`, {
      machine_id: 'M001',
      timestamp: Math.floor(Date.now() / 1000),
    });
    await waitFor(1500);
    const machine = await prisma.machine.findUniqueOrThrow({
      where: { id: machineId },
    });
    expect(machine.updatedAt.getTime()).toBeGreaterThan(Date.now() - 30_000);
  });

  it('ignores a malformed payload and logs no data row', async () => {
    const before = await prisma.machineLog.count({
      where: { machineId },
    });
    await publish(`${TOPIC_PREFIX}/M001/data`, {
      machine_id: 'M001',
      status: 'INVALID_STATUS',
    });
    await waitFor(1500);
    const after = await prisma.machineLog.count({ where: { machineId } });
    expect(after).toBe(before);
  });

  it('rejects a payload whose machine_id does not match the topic', async () => {
    const before = await prisma.machineLog.count({
      where: { machineId },
    });
    await publish(`${TOPIC_PREFIX}/M001/data`, {
      machine_id: 'M002',
      status: 'RUN',
      production_count: 1,
    });
    await waitFor(1500);
    const after = await prisma.machineLog.count({ where: { machineId } });
    expect(after).toBe(before);
  });
});
