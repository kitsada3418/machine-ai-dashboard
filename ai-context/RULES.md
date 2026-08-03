# Development Rules


## General


Always follow clean architecture.

Do not create quick hacks.

Write production-ready code.


---

# Backend Rules


Use:

- NestJS Modules
- DTO Validation
- Prisma ORM
- Dependency Injection


Required:

- Swagger API documentation
- Error handling
- Logging


Never:

- Use any type
- Put business logic in controllers


---

# Frontend Rules


Use:

- Next.js App Router
- TypeScript
- TailwindCSS


Components must be reusable.


Required:

- Loading state
- Error state
- Empty state


---

# Security Rules


Required:

- JWT Authentication
- Password Hashing
- RBAC
- Input Validation


---

# MQTT Rules


Frontend must never connect directly to MQTT.


Flow:


MQTT

↓

Backend

↓

WebSocket

↓

Frontend


---

# Deployment Rules


Must run using Docker Compose.


Compatible with:

- Raspberry Pi 5 ARM64


---

# Code Quality


Before finishing any feature:

- Test
- Check TypeScript errors
- Update documentation