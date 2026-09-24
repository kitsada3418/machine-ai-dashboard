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

