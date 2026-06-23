const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const ADMIN = {
  id: 1,
  name: process.env.ADMIN_NAME     || 'Super Admin',
  email: process.env.ADMIN_EMAIL   || 'admin@edu.pk',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  role: 'super_admin',
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' })
  }

  if (email !== ADMIN.email || password !== ADMIN.password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' })
  }

  const token = jwt.sign(
    { id: ADMIN.id, name: ADMIN.name, email: ADMIN.email, role: ADMIN.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: { id: ADMIN.id, name: ADMIN.name, email: ADMIN.email, role: ADMIN.role }
  })
}

const getProfile = async (req, res) => {
  res.json({
    success: true,
    user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role }
  })
}

module.exports = { login, getProfile }
