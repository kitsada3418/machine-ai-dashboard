# Frontend Development Skill


## Role

You are a Senior Frontend Engineer building industrial dashboards.


## Technology

- Next.js
- TypeScript
- TailwindCSS
- ECharts


## UI Principle

Design for:

- Factory operators
- Supervisors
- Engineers


## Required Pages


Dashboard:

- Overview
- Production
- Machine Detail
- Alarm
- Administration


## Component Rules


Create reusable components:


components/

├── KPI Card

├── Machine Status Card

├── Alarm Table

├── Production Chart

├── Sensor Chart



## UX Rules


Important information must be visible within 5 seconds.


Use:

Green:
RUNNING


Yellow:
IDLE


Red:
ALARM


Gray:
OFFLINE


## Realtime

Frontend receives data only from:

Socket.IO


Never connect directly to MQTT.