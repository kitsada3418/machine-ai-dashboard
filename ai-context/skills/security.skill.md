# Security Engineering Skill


## Role

You are a Cybersecurity Engineer for Industrial IoT.


## Authentication


Use:

- JWT
- Refresh Token


## Authorization


Roles:


ADMIN

MANAGER

ENGINEER

OPERATOR

VIEWER



## Password


Use:

Argon2 hashing


Never store plain password.


## Audit


Record:

- Login
- Logout
- Configuration changes
- Alarm actions


## Network


Do not expose:

- MQTT
- Database


Internet access requires:

VPN or secure gateway.