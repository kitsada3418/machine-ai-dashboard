CREATE TABLE roles (
    value VARCHAR(50) PRIMARY KEY, 
    label VARCHAR(100) NOT NULL    
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, 
    role VARCHAR(50),
    permissions JSON, 
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- เพิ่ม Foreign Key ผูกกับตาราง roles
    -- หากมีการเปลี่ยนชื่อ value ใน roles ให้เปลี่ยนตาม (ON UPDATE CASCADE)
    -- หากตำแหน่งถูกลบ ให้ค่านี้กลายเป็น NULL แทน (ON DELETE SET NULL)
    FOREIGN KEY (role) REFERENCES roles(value) ON UPDATE CASCADE ON DELETE SET NULL);
    
    
CREATE TABLE login_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45), 
    status VARCHAR(20) NOT NULL, -- 'Success' หรือ 'Failed'
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE audit_logs (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL, 
    action_type VARCHAR(20) NOT NULL, 
    target_table VARCHAR(50) NOT NULL, 
    target_id VARCHAR(50), 
    old_value JSON, -- เก็บข้อมูลเดิมก่อนถูกแก้
    new_value JSON, -- เก็บข้อมูลที่อัปเดตไปใหม่
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


SET GLOBAL time_zone = '+07:00';
SET time_zone = '+07:00';

SELECT NOW(), CURDATE();

////////////////////////////////////////////////////////////////////

ALTER TABLE Machine 
ADD COLUMN pos_x INT DEFAULT 100,
ADD COLUMN pos_y INT DEFAULT 100,
ADD COLUMN scale FLOAT DEFAULT 1.0;


-- 2. สร้างตารางใหม่สำหรับเก็บข้อมูลห้อง (Rooms)
CREATE TABLE Factory_Room (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    pos_x INT DEFAULT 50,
    pos_y INT DEFAULT 50,
    width INT DEFAULT 350,
    height INT DEFAULT 250,
    color VARCHAR(20) DEFAULT '#f1f5f9'
);


-- 1. สร้างตารางบันทึกประวัติซ่อมบำรุง
CREATE TABLE IF NOT EXISTS Maintenance_Log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Mh_ID VARCHAR(50) NOT NULL,
    maint_type VARCHAR(100) NOT NULL,
    details TEXT,
    technician_name VARCHAR(100),
    maint_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. สร้างตารางการตั้งค่ารอบ PM
CREATE TABLE IF NOT EXISTS Machine_PM_Setting (
    Mh_ID VARCHAR(50) PRIMARY KEY,
    pm_condition VARCHAR(20) NOT NULL,
    target_value INT NOT NULL,
    pm_details TEXT
);


-- 1. เปลี่ยนชื่อคอลัมน์ และปรับชนิดข้อมูลให้รองรับรหัสพนักงาน (Emp_ID)
ALTER TABLE Maintenance_Log CHANGE COLUMN technician_name technician_id VARCHAR(50) NOT NULL;

-- 2. (แนะนำ) ผูก Foreign Key เชื่อมกับตาราง Emp (หากตาราง Emp มีคอลัมน์ Emp_ID เป็น Primary Key อยู่แล้ว)
ALTER TABLE Maintenance_Log 
ADD CONSTRAINT fk_maint_technician 
FOREIGN KEY (technician_id) REFERENCES Emp(Emp_ID) 
ON UPDATE CASCADE ON DELETE RESTRICT;