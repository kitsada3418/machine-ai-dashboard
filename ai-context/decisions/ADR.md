# Architecture Decisions


## ADR-001


Decision:

Use MQTT as machine communication.


Reason:

Industrial IoT standard.

Do not replace MQTT with REST.


---


## ADR-002


Decision:

Frontend communicates through WebSocket.

Never connect directly to MQTT.