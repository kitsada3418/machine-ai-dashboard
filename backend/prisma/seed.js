"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
const SEED_PASSWORD = 'SmartFactory@123';
const LINES = ['Line A', 'Line B', 'Line C', 'Line D'];
const MACHINE_TYPES = ['Injection Molding', 'CNC', 'Assembly', 'Packaging'];
const MACHINE_COUNT = 30;
const MACHINE_NAME = 'Machine';
const STATUS_POOL = [
    client_1.MachineStatus.RUN,
    client_1.MachineStatus.RUN,
    client_1.MachineStatus.RUN,
    client_1.MachineStatus.IDLE,
    client_1.MachineStatus.IDLE,
    client_1.MachineStatus.STOP,
    client_1.MachineStatus.ALARM,
    client_1.MachineStatus.OFFLINE,
];
function buildMachines() {
    return Array.from({ length: MACHINE_COUNT }, (_, index) => {
        const machineNumber = index + 1;
        const machineCode = `M${String(machineNumber).padStart(3, '0')}`;
        return {
            machineCode,
            machineName: `${MACHINE_NAME} ${machineCode}`,
            lineName: LINES[index % LINES.length],
            machineType: MACHINE_TYPES[index % MACHINE_TYPES.length],
            mqttTopic: `factory/machine/${machineCode}/data`,
            status: STATUS_POOL[index % STATUS_POOL.length],
        };
    });
}
async function seedUsers() {
    const passwordHash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });
    const users = [
        { name: 'System Admin', email: 'admin@smartfactory.local', role: client_1.Role.ADMIN },
        { name: 'Factory Manager', email: 'manager@smartfactory.local', role: client_1.Role.MANAGER },
        { name: 'Maintenance Engineer', email: 'engineer@smartfactory.local', role: client_1.Role.ENGINEER },
        { name: 'Line Operator', email: 'operator@smartfactory.local', role: client_1.Role.OPERATOR },
        { name: 'Plant Viewer', email: 'viewer@smartfactory.local', role: client_1.Role.VIEWER },
    ];
    for (const user of users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
                name: user.name,
                email: user.email,
                passwordHash,
                role: user.role,
            },
        });
    }
    console.log(`Seeded ${users.length} users (password: ${SEED_PASSWORD})`);
}
async function seedMachines() {
    const machines = buildMachines();
    const machineIdByCode = new Map();
    for (const machine of machines) {
        const result = await prisma.machine.upsert({
            where: { machineCode: machine.machineCode },
            update: {},
            create: machine,
        });
        machineIdByCode.set(machine.machineCode, result.id);
    }
    console.log(`Seeded ${machines.length} machines`);
    return machineIdByCode;
}
async function seedWorkOrders(machineIdByCode) {
    const now = new Date();
    const runningMachineCodes = Array.from(machineIdByCode.keys()).filter((code) => {
        const machine = buildMachines().find((m) => m.machineCode === code);
        return machine?.status === client_1.MachineStatus.RUN;
    });
    const orders = [
        {
            jobNo: 'JOB-2026-001',
            workOrderNo: 'WO-2026-001',
            partNo: 'PN-1001',
            partName: 'Gear Housing',
            targetQty: 5000,
            actualQty: 2140,
            rejectQty: 12,
            status: client_1.JobStatus.RUNNING,
            startTime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
            machineCodes: runningMachineCodes.slice(0, 3),
        },
        {
            jobNo: 'JOB-2026-002',
            workOrderNo: 'WO-2026-002',
            partNo: 'PN-1002',
            partName: 'Sensor Bracket',
            targetQty: 3000,
            actualQty: 0,
            rejectQty: 0,
            status: client_1.JobStatus.WAITING,
            startTime: null,
            machineCodes: [runningMachineCodes[3]].filter(Boolean),
        },
        {
            jobNo: 'JOB-2026-003',
            workOrderNo: 'WO-2026-003',
            partNo: 'PN-1003',
            partName: 'Drive Shaft',
            targetQty: 8000,
            actualQty: 8000,
            rejectQty: 45,
            status: client_1.JobStatus.COMPLETED,
            startTime: new Date(now.getTime() - 30 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() - 8 * 60 * 60 * 1000),
            machineCodes: [runningMachineCodes[4]].filter(Boolean),
        },
        {
            jobNo: 'JOB-2026-004',
            workOrderNo: 'WO-2026-004',
            partNo: 'PN-1004',
            partName: 'Housing Cover',
            targetQty: 12000,
            actualQty: 6120,
            rejectQty: 33,
            status: client_1.JobStatus.RUNNING,
            startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
            machineCodes: runningMachineCodes.slice(0, 3),
        },
    ];
    for (const order of orders) {
        const workOrder = await prisma.workOrder.upsert({
            where: { jobNo: order.jobNo },
            update: {},
            create: {
                jobNo: order.jobNo,
                workOrderNo: order.workOrderNo,
                partNo: order.partNo,
                partName: order.partName,
                targetQty: order.targetQty,
                actualQty: order.actualQty,
                rejectQty: order.rejectQty,
                status: order.status,
                startTime: order.startTime,
                endTime: order.endTime,
            },
        });
        for (const machineCode of order.machineCodes) {
            const machineId = machineIdByCode.get(machineCode);
            if (!machineId) {
                continue;
            }
            await prisma.machineJob.upsert({
                where: { machineId_workOrderId: { machineId, workOrderId: workOrder.id } },
                update: {},
                create: {
                    machineId,
                    workOrderId: workOrder.id,
                    assignedTime: order.startTime ?? now,
                    completedTime: order.endTime ?? null,
                },
            });
        }
    }
    console.log(`Seeded ${orders.length} work orders with machine jobs`);
}
async function seedAlarms(machineIdByCode) {
    const existing = await prisma.alarm.count();
    if (existing > 0) {
        console.log('Alarms already seeded, skipping');
        return;
    }
    const now = new Date();
    const machineByStatus = (status) => Array.from(machineIdByCode.keys()).filter((code) => {
        const machine = buildMachines().find((m) => m.machineCode === code);
        return machine?.status === status;
    });
    const alarmMachines = machineByStatus(client_1.MachineStatus.ALARM);
    const activeSeeds = alarmMachines.slice(0, 2).map((code, index) => ({
        machineId: machineIdByCode.get(code),
        alarmCode: index === 0 ? 'OVR-001' : 'TEMP-001',
        severity: index === 0 ? client_1.AlarmSeverity.CRITICAL : client_1.AlarmSeverity.WARNING,
        message: index === 0
            ? 'Motor overload detected - current above limit'
            : 'Temperature above threshold (80C)',
        status: client_1.AlarmStatus.ACTIVE,
        startTime: new Date(now.getTime() - index * 20 * 60 * 1000),
        endTime: null,
    }));
    for (const alarm of activeSeeds) {
        await prisma.alarm.create({ data: alarm });
    }
    const historicalSeeds = [
        {
            machineId: machineIdByCode.get(machineByStatus(client_1.MachineStatus.RUN)[0]),
            alarmCode: 'TEMP-002',
            severity: client_1.AlarmSeverity.WARNING,
            message: 'Temperature spike above threshold (80C)',
            status: client_1.AlarmStatus.RESOLVED,
            startTime: new Date(now.getTime() - 5 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        },
        {
            machineId: machineIdByCode.get(machineByStatus(client_1.MachineStatus.RUN)[1]),
            alarmCode: 'DOWNTIME-001',
            severity: client_1.AlarmSeverity.INFO,
            message: 'Unplanned downtime recorded - 15 minutes',
            status: client_1.AlarmStatus.RESOLVED,
            startTime: new Date(now.getTime() - 26 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() - 25 * 60 * 60 * 1000 + 15 * 60 * 1000),
        },
    ];
    for (const alarm of historicalSeeds) {
        if (!alarm.machineId) {
            continue;
        }
        await prisma.alarm.create({ data: alarm });
    }
    console.log(`Seeded ${activeSeeds.length} active + ${historicalSeeds.length} historical alarms`);
}
async function seedMachineLogs(machineIdByCode) {
    const existing = await prisma.machineLog.count();
    if (existing > 0) {
        console.log('Machine logs already seeded, skipping');
        return;
    }
    const now = Date.now();
    const machines = Array.from(machineIdByCode.entries()).slice(0, 3);
    const intervalMinutes = 15;
    const points = 96;
    for (const [code, machineId] of machines) {
        let productionCount = 1000;
        for (let index = points - 1; index >= 0; index--) {
            const timestamp = new Date(now - index * intervalMinutes * 60 * 1000);
            const running = index % 4 !== 3;
            if (running) {
                productionCount += 15;
            }
            await prisma.machineLog.create({
                data: {
                    machineId,
                    status: running ? client_1.MachineStatus.RUN : client_1.MachineStatus.IDLE,
                    productionCount,
                    cycleTime: running ? 35 + (index % 5) : null,
                    temperature: 38 + (index % 7) * 1.5,
                    current: running ? 3.8 + (index % 4) * 0.3 : null,
                    voltage: 220 + (index % 3),
                    power: running ? 0.85 + (index % 5) * 0.03 : 0.1,
                    runtime: index * intervalMinutes,
                    downtime: running ? 0 : 15,
                    createdAt: timestamp,
                },
            });
        }
    }
    console.log(`Seeded ${machines.length * points} machine log rows (last 24h)`);
}
async function seedSettings() {
    const settings = [
        {
            key: 'mqtt.offline_threshold_minutes',
            value: '5',
            description: 'Minutes without heartbeat before a machine is marked OFFLINE',
        },
        {
            key: 'mqtt.heartbeat_interval_seconds',
            value: '30',
            description: 'Expected heartbeat interval from machine controllers',
        },
        {
            key: 'alarm.temperature_critical',
            value: '80',
            description: 'Temperature (C) threshold for CRITICAL alarm',
        },
        {
            key: 'dashboard.refresh_seconds',
            value: '5',
            description: 'Dashboard fallback refresh interval when WebSocket is unavailable',
        },
    ];
    for (const setting of settings) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting,
        });
    }
    console.log(`Seeded ${settings.length} settings`);
}
async function main() {
    await seedUsers();
    const machineIdByCode = await seedMachines();
    await seedWorkOrders(machineIdByCode);
    await seedAlarms(machineIdByCode);
    await seedMachineLogs(machineIdByCode);
    await seedSettings();
}
main()
    .then(async () => {
    console.log('Seed completed successfully');
    await prisma.$disconnect();
})
    .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map