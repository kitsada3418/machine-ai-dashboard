const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Middleware สำหรับตรวจสอบสิทธิ์ Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // ดึงค่าจาก Bearer Token

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: ไม่พบ Token ยืนยันตัวตน' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Access Denied: Token ไม่ถูกต้องหรือหมดอายุ' });
        }
        req.user = user; 
        next(); 
    });
};

// ==========================================
// 1. ระบบ Login & บันทึก Login Logs (ห้ามใส่ authenticateToken)
// ==========================================
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    let userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';
    if (userIp === '::1' || userIp === '::ffff:127.0.0.1') {
        userIp = '127.0.0.1 (Localhost)';
    }

    const pool = req.app.get('pool');

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            await pool.query('INSERT INTO login_logs (username, ip_address, status) VALUES (?, ?, ?)', [username, userIp, 'Failed']);
            return res.status(401).json({ message: 'ไม่พบชื่อผู้ใช้งานนี้' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            await pool.query('INSERT INTO login_logs (username, ip_address, status) VALUES (?, ?, ?)', [username, userIp, 'Failed']);
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        if (user.status !== 'Active') {
            await pool.query('INSERT INTO login_logs (username, ip_address, status) VALUES (?, ?, ?)', [username, userIp, 'Blocked']);
            return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน' });
        }

        await pool.query('INSERT INTO login_logs (username, ip_address, status) VALUES (?, ?, ?)', [username, userIp, 'Success']);
        
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, permissions: user.permissions }, SECRET_KEY, { expiresIn: '8h' });
        

        res.json({ 
            message: 'เข้าสู่ระบบสำเร็จ', 
            token, role: user.role,
            permissions: user.permissions});

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 2. จัดการ Roles (ต้องใช้ authenticateToken)
// ==========================================
router.get('/roles', authenticateToken, async (req, res) => {
    const pool = req.app.get('pool');
    try {
        const [roles] = await pool.query('SELECT * FROM roles');
        res.json(roles);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.post('/roles', authenticateToken, async (req, res) => {
    const { value, label } = req.body;
    const pool = req.app.get('pool');
    try {
        await pool.query('INSERT INTO roles (value, label) VALUES (?, ?)', [value, label]);
        res.status(201).json({ message: 'เพิ่มตำแหน่งสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาด หรือมีตำแหน่งนี้อยู่แล้ว' });
    }
});

// ==========================================
// 3. จัดการ Users & บันทึก Audit Logs (ต้องใช้ authenticateToken)
// ==========================================
router.get('/users', authenticateToken, async (req, res) => {
    const pool = req.app.get('pool');
    try {
        const [users] = await pool.query('SELECT id, username, role, permissions, status, created_at FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.post('/users', authenticateToken, async (req, res) => {
    const { username, password, role, permissions } = req.body;
    const pool = req.app.get('pool');
    const actionBy = req.body.actionBy || req.user?.username || 'System'; 

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const permissionsJson = JSON.stringify(permissions);

        const [result] = await pool.query(
            'INSERT INTO users (username, password, role, permissions) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role, permissionsJson]
        );

        await pool.query(
            `INSERT INTO audit_logs (username, action_type, target_table, target_id, new_value) VALUES (?, ?, ?, ?, ?)`,
            [actionBy, 'INSERT', 'users', result.insertId, JSON.stringify({ username, role, permissions })]
        );

        res.status(201).json({ message: 'สร้างผู้ใช้งานสำเร็จ' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'ชื่อผู้ใช้งานนี้มีในระบบแล้ว' });
        res.status(500).send('Server Error');
    }
});

router.delete('/users/:id', authenticateToken, async (req, res) => {
    const userId = req.params.id;
    const pool = req.app.get('pool');
    const actionBy = req.query.actionBy || req.user?.username || 'System';

    try {
        const [oldData] = await pool.query('SELECT username, role FROM users WHERE id = ?', [userId]);
        if (oldData.length === 0) return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });

        await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        await pool.query(
            `INSERT INTO audit_logs (username, action_type, target_table, target_id, old_value) VALUES (?, ?, ?, ?, ?)`,
            [actionBy, 'DELETE', 'users', userId, JSON.stringify(oldData[0])]
        );

        res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 4. ดึงข้อมูล Logs ไปแสดงผล (ต้องใช้ authenticateToken)
// ==========================================
router.get('/logs/login', authenticateToken, async (req, res) => {
    const pool = req.app.get('pool');
    try {
        const [logs] = await pool.query('SELECT * FROM login_logs ORDER BY login_time DESC LIMIT 100');
        res.json(logs);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.get('/logs/audit', authenticateToken, async (req, res) => {
    const pool = req.app.get('pool');
    try {
        const [logs] = await pool.query('SELECT * FROM audit_logs ORDER BY action_time DESC LIMIT 100');
        res.json(logs);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.put('/users/:id/reset-password', authenticateToken, async (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    const actionBy = req.body.actionBy || req.user?.username || 'admin';
    const pool = req.app.get('pool');

    try {
        if (!newPassword) {
            return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านใหม่' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const [result] = await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้' });
        }

        await pool.query(
            `INSERT INTO audit_logs (username, action_type, target_table, target_id, new_value) VALUES (?, ?, ?, ?, ?)`,
            [actionBy, 'UPDATE_PASSWORD', 'users', userId, JSON.stringify({ message: 'Reset password' })]
        );

        res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).send('Server Error');
    }
});

router.put('/users/:id', authenticateToken, async (req, res) => {
    const userId = req.params.id;
    const { role, permissions } = req.body;
    const actionBy = req.body.actionBy || req.user?.username || 'admin';
    const pool = req.app.get('pool');

    try {
        const permissionsJson = JSON.stringify(permissions);

        const [oldData] = await pool.query('SELECT username, role, permissions FROM users WHERE id = ?', [userId]);
        if (oldData.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้' });
        }

        await pool.query(
            'UPDATE users SET role = ?, permissions = ? WHERE id = ?',
            [role, permissionsJson, userId]
        );

        await pool.query(
            `INSERT INTO audit_logs (username, action_type, target_table, target_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                actionBy, 
                'UPDATE', 
                'users', 
                userId, 
                JSON.stringify(oldData[0]), 
                JSON.stringify({ role, permissions })
            ]
        );

        res.json({ message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ' });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;