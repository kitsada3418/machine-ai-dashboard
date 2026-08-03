# System Architecture


## High Level Architecture


ESP32 / Raspberry Pi Machine Controller

          |
          |
          MQTT

          |

Mosquitto MQTT Broker

          |

          |

NestJS Backend

          |

    +-------------+

    |             |

PostgreSQL     Socket.IO

                  |

                  |

            Next.js Dashboard



---

# Component Description


## MQTT Broker

Role:

- Receive machine data
- Manage device connections
- Route messages


## Backend

Responsibilities:

- MQTT subscriber
- Business logic
- Authentication
- API
- WebSocket


## Database

Store:

- Machine information
- Production history
- Alarm history
- User activity


## Frontend

Display:

- Real-time dashboard
- Machine status
- Reports


---

# Data Flow


Machine

↓

MQTT Publish

↓

MQTT Broker

↓

Backend Subscriber

↓

Validate Data

↓

Save Database

↓

Broadcast WebSocket

↓

Dashboard Update


---

# Deployment


Raspberry Pi 5:

Docker Containers:

- mosquitto
- postgres
- backend
- frontend
- nginx


All services must run locally.