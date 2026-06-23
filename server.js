const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// MongoDB (Digikhyber) — connect on startup
const connectMongo = require('./src/config/mongodb')
connectMongo().catch(err => console.error('MongoDB startup error:', err.message))

// Routes
app.use('/api/auth',          require('./src/routes/auth'))
app.use('/api/students',      require('./src/routes/students'))
app.use('/api/challans',      require('./src/routes/challans'))
app.use('/api/scholarships',  require('./src/routes/scholarships'))
app.use('/api/payments',      require('./src/routes/payments'))
app.use('/api/telemarketing', require('./src/routes/telemarketing'))
app.use('/api/users',         require('./src/routes/users'))
app.use('/api/reports',       require('./src/routes/reports'))
app.use('/api/digikhyber',    require('./src/routes/digikhyber'))

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'EduAdmin API is running!', version: '1.0.0' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
