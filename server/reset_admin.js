require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function resetAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const plainPassword = 'admin1234'; // รหัสผ่านใหม่ที่คุณต้องการใช้
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // อัปเดตหรือเพิ่มแอดมินใหม่
    await connection.query(
        `INSERT INTO users (username, password, role, permissions, status) 
         VALUES ('admin', ?, 'admin', '["dashboard", "graphs", "logs", "alarms", "report", "maintenance", "oee_dashboard", "layout", "free_layout", "supervisor", "manager", "user_management", "system_logs"]', 'Active')
         ON DUPLICATE KEY UPDATE password = ?`,
        [hashedPassword, hashedPassword]
    );

    console.log('✅ รีเซ็ตรหัสผ่านแอดมินสำเร็จ! Username: admin, Password: admin1234');
    process.exit();
}

resetAdmin();