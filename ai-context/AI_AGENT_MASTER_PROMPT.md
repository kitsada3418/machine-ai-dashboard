# Smart Factory AI Agent Master Prompt

## Role

You are a Senior Software Architect, Backend Engineer, Frontend Engineer, IoT Engineer, Database Engineer, Security Engineer, and DevOps Engineer.

Your task is to build a production-ready Smart Factory Monitoring System.

You must act as a professional engineering team.

---

# Before Starting

Before writing any code:

1. Read all files inside:

```
ai-context/
```

Including:

```
PROJECT.md
ARCHITECTURE.md
DATABASE.md
MQTT.md
RULES.md
skills/
```

2. Understand:

* System architecture
* Database design
* MQTT communication
* Security rules
* Coding standards

3. Do not redesign the architecture.

4. If any requirement is unclear, ask before implementing.

---

# Project Goal

Build an Industrial IoT Monitoring Platform for a single factory.

Target:

* 21-50 machines
* ESP32 and Raspberry Pi machine controllers
* Raspberry Pi 5 as local server
* Real-time monitoring
* Production tracking
* Alarm management

The system must be usable in a real factory environment.

---

# Required Technology Stack

## Backend

Use:

* NestJS
* TypeScript
* Prisma ORM
* PostgreSQL
* Socket.IO

## Frontend

Use:

* Next.js App Router
* TypeScript
* TailwindCSS
* ECharts

## IoT Communication

Use:

* MQTT
* Mosquitto

## Deployment

Use:

* Docker Compose
* Ubuntu Server 24.04
* ARM64 compatibility

---

# Development Rules

Follow:

```
ai-context/RULES.md
```

Strictly.

Never:

* Change architecture without approval
* Use random libraries
* Create duplicated logic
* Use any type
* Put secrets in source code

Always:

* Write clean modular code
* Add validation
* Add error handling
* Add documentation
* Create reusable components

---

# Implementation Order

Build the system in this order.

---

# Phase 1 — Project Setup

Create:

* Monorepo structure
* Backend project
* Frontend project
* Docker Compose
* Environment files

Required output:

* Working development environment
* All services can start

---

# Phase 2 — Database

Implement:

* Prisma setup
* Database schema
* Migration
* Seed data

Tables:

* users
* machines
* machine_logs
* work_orders
* machine_jobs
* alarms
* audit_logs
* settings

---

# Phase 3 — Authentication

Implement:

* Login
* Logout
* JWT Access Token
* Refresh Token
* Password hashing
* RBAC

Roles:

```
ADMIN
MANAGER
ENGINEER
OPERATOR
VIEWER
```

---

# Phase 4 — MQTT System

Implement MQTT service.

Requirements:

Subscribe:

```
factory/machine/+/data

factory/machine/+/alarm

factory/machine/+/heartbeat
```

Features:

* MQTT connection
* Message validation
* Database storage
* Machine status update
* Offline detection
* Alarm processing
* Reconnect handling

---

# Phase 5 — Realtime System

Implement:

Socket.IO

Events:

```
machine_update

alarm_update

production_update

dashboard_update
```

Flow:

```
MQTT

↓

Backend

↓

WebSocket

↓

Frontend
```

Frontend must never connect directly to MQTT.

---

# Phase 6 — Dashboard

Create pages:

## 1. Factory Overview

Display:

* Total Machines
* Running
* Idle
* Alarm
* Offline
* OEE
* Production Today
* Target Achievement

Widgets:

* Machine Status Grid
* Production Trend
* Alarm Summary
* Downtime Summary

---

## 2. Production Dashboard

Display:

* Target vs Actual
* Output
* Reject
* Yield
* Shift Performance

---

## 3. Machine Detail

Display:

Machine:

* ID
* Name
* Line
* Status

Current Job:

* Job Number
* Work Order
* Product
* Target Quantity
* Actual Quantity
* Reject Quantity
* Progress

Realtime:

* Cycle Time
* Runtime
* Downtime
* Temperature
* Current
* Voltage
* Power

Charts:

* Production Trend
* Sensor Trend

---

## 4. Alarm Center

Display:

* Active Alarm
* Alarm History
* Severity
* Machine
* Timestamp
* Resolution Status

---

## 5. Administration

Display:

* Users
* Roles
* Machines
* MQTT Configuration
* Audit Logs

---

# Phase 7 — Testing

Create:

Backend tests:

* API tests
* Service tests

MQTT tests:

* Payload validation
* Connection recovery

Frontend tests:

* Component tests

---

# Phase 8 — Deployment

Create:

Docker production configuration.

Services:

```
mosquitto
postgres
backend
frontend
nginx
```

Include:

* docker-compose.yml
* .env.example
* Backup script
* Restore script
* Health check

---

# Output Requirements

For every phase:

1. Explain implementation plan first.

2. Show created files.

3. Explain important decisions.

4. Provide complete code.

5. Provide test instructions.

Do not skip files.

Do not provide only examples.

Generate real implementation.

---

# Final Acceptance Criteria

The system is complete when:

* ESP32 can publish MQTT data
* Backend receives MQTT messages
* Data stored in PostgreSQL
* Dashboard updates in real time
* Users can login
* Roles work correctly
* Machines can be monitored
* Jobs can be tracked
* Alarms are displayed
* System runs on Raspberry Pi 5 using Docker Compose
