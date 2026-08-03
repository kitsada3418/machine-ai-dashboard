# MQTT Communication Specification


## Broker

Mosquitto


## Topic Structure


Machine Data

factory/machine/{machine_id}/data


Alarm

factory/machine/{machine_id}/alarm


Heartbeat

factory/machine/{machine_id}/heartbeat



---

# Machine Data Payload


{
 "machine_id":"M001",
 "status":"RUN",
 "production_count":1250,
 "cycle_time":35,
 "runtime":3600,
 "downtime":120,
 "temperature":42,
 "current":4.2,
 "voltage":220,
 "power":0.9,
 "timestamp":123456789
}



---

# Machine Status


RUN

IDLE

STOP

ALARM

OFFLINE


---

# MQTT Security


Each machine requires:

username

password


Example:


machine_M001


Permission:

Publish:

factory/machine/M001/#


No access to other machines.


---

# Heartbeat


Each device must send heartbeat periodically.


If no heartbeat:

5 minutes:

Status = OFFLINE