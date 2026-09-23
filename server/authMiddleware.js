const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error('JWT_SECRET is not set. Configure it in server/.env before starting.');
}

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

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

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access Denied: ไม่มีสิทธิ์ดำเนินการ' });
    }
    next();
};

const getActionBy = (req) => req.user?.username || 'System';

module.exports = { SECRET_KEY, authenticateToken, requireRole, getActionBy };
