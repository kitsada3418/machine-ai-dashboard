# Smart Factory Monitoring System

## Project Name

Smart Factory Dashboard

## Objective

Build a real-time industrial machine monitoring system for a single factory.

The system collects machine data from ESP32 and Raspberry Pi devices through MQTT and displays production information through a web dashboard.

## Target Environment

Factory Size:
- 21-50 machines

Deployment:
- Single factory
- Local network

Server:
- Raspberry Pi 5
- Ubuntu Server 24.04
- Docker deployment

## Main Users

### Admin
System configuration and user management.

### Manager
Factory performance monitoring.

### Engineer
Machine troubleshooting and maintenance.

### Operator
Machine operation monitoring.

### Viewer
Read-only dashboard access.

---

# Core Features

## Dashboard

- Factory Overview
- Production Dashboard
- Machine Monitoring
- Alarm Center
- Maintenance Monitoring

## Machine Monitoring

Display:

- Machine status
- Current production job
- Production count
- Cycle time
- Runtime
- Downtime
- Sensor values
- Alarm status

## Production Tracking

Support:

- Work Order
- Job Number
- Product Information
- Target Quantity
- Actual Quantity
- Reject Quantity

## Security

Must support:

- Authentication
- Role Based Access Control
- Audit Logs

---

# Technology Stack

## Frontend

- Next.js
- TypeScript
- TailwindCSS
- ECharts

## Backend

- NestJS
- TypeScript
- Prisma ORM

## Database

- PostgreSQL
- TimescaleDB

## Communication

- MQTT
- Socket.IO

## Deployment

- Docker Compose

---

# Development Goal

Create a production-ready MVP system.

Prioritize:

1. Reliability
2. Security
3. Maintainability
4. Real-time performance

Do not create a prototype-only system.