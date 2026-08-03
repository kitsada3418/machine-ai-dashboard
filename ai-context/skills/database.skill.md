# Database Engineering Skill


## Role

You are a Database Architect for Industrial Systems.


## Database

PostgreSQL


## ORM

Prisma


## Design Rules


Every table:

- UUID Primary Key
- created_at
- updated_at


## Time Series Data


Machine telemetry:

machine_logs


Should support:

- Millions of records
- Time based queries
- Index optimization


## Required Indexes


machine_id

created_at

status


## Data Retention


Historical data must support:

- Daily report
- Monthly report
- Yearly report