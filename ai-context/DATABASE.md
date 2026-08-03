# Database Design


## users


Fields:

id
name
email
password_hash
role
created_at
updated_at


---

## machines


Fields:

id
machine_code
machine_name
line_name
machine_type
mqtt_topic
status
created_at
updated_at


---

## machine_logs


Store realtime machine data.


Fields:

id
machine_id
status
production_count
cycle_time
temperature
current
voltage
power
runtime
downtime
created_at


---

## work_orders


Production jobs.


Fields:

id
job_no
work_order_no
part_no
part_name
target_qty
actual_qty
reject_qty
status
start_time
end_time


---

## machine_jobs


Relation between machine and job.


Fields:

id
machine_id
work_order_id
assigned_time
completed_time


---

## alarms


Current and historical alarms.


Fields:

id
machine_id
alarm_code
severity
message
status
start_time
end_time


---

## audit_logs


System activity.


Fields:

id
user_id
action
description
created_at


---

# Database Rules


- Use UUID primary key
- Use foreign keys
- Add indexes
- Store timestamps
- Support data history