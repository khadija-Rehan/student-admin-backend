const router = require('express').Router()
const {
  getDigiStudents, getDigiStudentById, getDigiStats, deleteDigiStudent,
  updateDigiChallan,
  getDigiScholarships, updateScholarshipStatus,
  getDigiChallans, getDigiChallanStats, challanInquiry, markChallanPaid,
  updateTestScore, getDashboardStats,
  getTelemarketing, getTeleStats, updateTeleStatus, deleteTeleEntry, clearTeleList, addUnpaidChallans, addTeleNote,
  getApplications, getMonthlyStats,
  getDigiCourses,
  updateDigiStudent, generateDigiChallan,
} = require('../controllers/digiController')
const { verifyToken } = require('../middleware/auth')

router.use(verifyToken)

// Dashboard
router.get('/dashboard-stats',           getDashboardStats)

// Students
router.get('/students',                  getDigiStudents)
router.get('/students/:id',              getDigiStudentById)
router.put('/students/:id',              updateDigiStudent)
router.get('/stats',                     getDigiStats)
router.patch('/students/:id/test',       updateTestScore)
router.delete('/students/:id',           deleteDigiStudent)

// Applications
router.get('/applications',              getApplications)

// Scholarships
router.get('/scholarships',              getDigiScholarships)
router.patch('/scholarships/:id/status', updateScholarshipStatus)

// Challans
router.get('/challans',                  getDigiChallans)
router.get('/challan-stats',             getDigiChallanStats)
router.post('/challan-inquiry',          challanInquiry)
router.post('/challan-mark-paid',        markChallanPaid)
router.patch('/challans/:id',            updateDigiChallan)
router.post('/generate-challan',         generateDigiChallan)

// Telemarketing
router.get('/telemarketing',             getTelemarketing)
router.get('/telemarketing/stats',       getTeleStats)
router.patch('/telemarketing/:id',       updateTeleStatus)
router.delete('/telemarketing/clear',    clearTeleList)
router.delete('/telemarketing/:id',      deleteTeleEntry)
router.post('/telemarketing/add-unpaid', addUnpaidChallans)
router.post('/telemarketing/:id/notes',  addTeleNote)

// Reports
router.get('/monthly-stats',             getMonthlyStats)

// Courses
router.get('/courses',                   getDigiCourses)

module.exports = router
