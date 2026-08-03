-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'ENGINEER', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('RUN', 'IDLE', 'STOP', 'ALARM', 'OFFLINE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('WAITING', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlarmSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlarmStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" UUID NOT NULL,
    "machine_code" TEXT NOT NULL,
    "machine_name" TEXT NOT NULL,
    "line_name" TEXT NOT NULL,
    "machine_type" TEXT NOT NULL,
    "mqtt_topic" TEXT NOT NULL,
    "status" "MachineStatus" NOT NULL DEFAULT 'OFFLINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_logs" (
    "id" UUID NOT NULL,
    "machine_id" UUID NOT NULL,
    "status" "MachineStatus" NOT NULL,
    "production_count" INTEGER NOT NULL DEFAULT 0,
    "cycle_time" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "current" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "power" DOUBLE PRECISION,
    "runtime" INTEGER NOT NULL DEFAULT 0,
    "downtime" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" UUID NOT NULL,
    "job_no" TEXT NOT NULL,
    "work_order_no" TEXT NOT NULL,
    "part_no" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "target_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER NOT NULL DEFAULT 0,
    "reject_qty" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'WAITING',
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_jobs" (
    "id" UUID NOT NULL,
    "machine_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "assigned_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_time" TIMESTAMP(3),

    CONSTRAINT "machine_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarms" (
    "id" UUID NOT NULL,
    "machine_id" UUID NOT NULL,
    "alarm_code" TEXT NOT NULL,
    "severity" "AlarmSeverity" NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "status" "AlarmStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alarms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "machines_machine_code_key" ON "machines"("machine_code");

-- CreateIndex
CREATE UNIQUE INDEX "machines_mqtt_topic_key" ON "machines"("mqtt_topic");

-- CreateIndex
CREATE INDEX "machines_status_idx" ON "machines"("status");

-- CreateIndex
CREATE INDEX "machines_line_name_idx" ON "machines"("line_name");

-- CreateIndex
CREATE INDEX "machine_logs_machine_id_created_at_idx" ON "machine_logs"("machine_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "machine_logs_created_at_idx" ON "machine_logs"("created_at");

-- CreateIndex
CREATE INDEX "machine_logs_status_idx" ON "machine_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_job_no_key" ON "work_orders"("job_no");

-- CreateIndex
CREATE INDEX "work_orders_work_order_no_idx" ON "work_orders"("work_order_no");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_orders_start_time_idx" ON "work_orders"("start_time");

-- CreateIndex
CREATE INDEX "machine_jobs_machine_id_assigned_time_idx" ON "machine_jobs"("machine_id", "assigned_time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "machine_jobs_machine_id_work_order_id_key" ON "machine_jobs"("machine_id", "work_order_id");

-- CreateIndex
CREATE INDEX "alarms_machine_id_start_time_idx" ON "alarms"("machine_id", "start_time" DESC);

-- CreateIndex
CREATE INDEX "alarms_status_idx" ON "alarms"("status");

-- CreateIndex
CREATE INDEX "alarms_severity_idx" ON "alarms"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "machine_logs" ADD CONSTRAINT "machine_logs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_jobs" ADD CONSTRAINT "machine_jobs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_jobs" ADD CONSTRAINT "machine_jobs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarms" ADD CONSTRAINT "alarms_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
