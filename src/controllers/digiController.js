const DigiUser         = require('../models/DigiUser')
const DigiScholarship  = require('../models/DigiScholarship')
const DigiChallan      = require('../models/DigiChallan')
const DigiTeleChallan  = require('../models/DigiTeleChallan')
const connectMongo     = require('../config/mongodb')

const getDigiStudents = async (req, res) => {
  try {
    await connectMongo()

    const {
      page      = 1,
      limit     = 10,
      search    = '',
      verified,
      testPassed,
      city,
      course,
      gender,
      qualification,
    } = req.query

    const query = {}

    if (search) {
      query.$or = [
        { fullName:   { $regex: search, $options: 'i' } },
        { cnic:       { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
        { mobile:     { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { city:       { $regex: search, $options: 'i' } },
      ]
    }

    if (verified   !== undefined) query.isVerified = verified   === 'true'
    if (testPassed !== undefined) query.testPassed = testPassed === 'true'
    if (city)          query.city          = { $regex: city,          $options: 'i' }
    if (course)        query.courses       = { $in: [new RegExp(course, 'i')] }
    if (gender)        query.gender        = { $regex: gender,        $options: 'i' }
    if (qualification) query.qualification = { $regex: qualification, $options: 'i' }

    const total = await DigiUser.countDocuments(query)
    const users = await DigiUser.find(query)
      .select('-password -verifyToken -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))

    // Join challan data for each student
    const userIds = users.map(u => u._id.toString())
    const challans = await DigiChallan.find({ userId: { $in: userIds } })
    const challanMap = {}
    challans.forEach(c => {
      if (!challanMap[c.userId]) challanMap[c.userId] = c
    })

    const data = users.map(u => ({
      ...u.toObject(),
      challan: challanMap[u._id.toString()] || null,
    }))

    res.json({
      success: true,
      data,
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const getDigiStudentById = async (req, res) => {
  try {
    await connectMongo()

    const user = await DigiUser.findById(req.params.id)
      .select('-password -verifyToken -resetPasswordToken -resetPasswordExpire')

    if (!user) return res.status(404).json({ success: false, message: 'Student not found.' })

    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const getDigiStats = async (req, res) => {
  try {
    await connectMongo()

    const [total, verified, testPassed, cities] = await Promise.all([
      DigiUser.countDocuments(),
      DigiUser.countDocuments({ isVerified: true }),
      DigiUser.countDocuments({ testPassed: true }),
      DigiUser.distinct('city'),
    ])

    res.json({
      success: true,
      data: {
        total,
        verified,
        unverified: total - verified,
        testPassed,
        totalCities: cities.length,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── SCHOLARSHIPS ─────────────────────────────────────────────
const getDigiScholarships = async (req, res) => {
  try {
    await connectMongo()
    const { page = 1, limit = 10, search = '', status } = req.query
    const query = {}

    if (search) {
      query.$or = [
        { fullName:   { $regex: search, $options: 'i' } },
        { cnic:       { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
      ]
    }
    if (status) query.status = status

    const total = await DigiScholarship.countDocuments(query)
    const data  = await DigiScholarship.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))

    res.json({ success: true, data, total, page: parseInt(page), totalPages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── CHALLANS ─────────────────────────────────────────────────
const getDigiChallans = async (req, res) => {
  try {
    await connectMongo()
    const { page = 1, limit = 10, search = '', paid, dateFrom, dateTo } = req.query
    const query = {}

    if (paid !== undefined && paid !== '') query.paid = paid === 'true'
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
      if (dateTo)   query.createdAt.$lte = new Date(dateTo + 'T23:59:59')
    }

    const total = await DigiChallan.countDocuments(query)
    let challans = await DigiChallan.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))

    // Get student names by joining with User
    const userIds = [...new Set(challans.map(c => c.userId))]
    const users   = await DigiUser.find({ _id: { $in: userIds } })
      .select('fullName cnic email rollNumber courses')

    const userMap = {}
    users.forEach(u => { userMap[u._id.toString()] = u })

    const data = challans.map(c => ({
      ...c.toObject(),
      student: userMap[c.userId] || null,
    }))

    // Search by student name/cnic after join
    const filtered = search
      ? data.filter(c =>
          c.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          c.student?.cnic?.includes(search) ||
          c.challanId?.toLowerCase().includes(search.toLowerCase())
        )
      : data

    res.json({ success: true, data: filtered, total, page: parseInt(page), totalPages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const getDigiChallanStats = async (req, res) => {
  try {
    await connectMongo()
    const [total, paid, unpaid, totalAmount, paidAmount] = await Promise.all([
      DigiChallan.countDocuments(),
      DigiChallan.countDocuments({ paid: true }),
      DigiChallan.countDocuments({ paid: false }),
      DigiChallan.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]),
      DigiChallan.aggregate([{ $match: { paid: true } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    ])
    res.json({
      success: true,
      data: {
        total, paid, unpaid,
        totalAmount:  totalAmount[0]?.sum  || 0,
        paidAmount:   paidAmount[0]?.sum   || 0,
        collectionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── UPDATE SCHOLARSHIP STATUS (approve/reject) ───────────────
const updateScholarshipStatus = async (req, res) => {
  try {
    await connectMongo()
    const { status } = req.body
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' })
    }
    const doc = await DigiScholarship.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
    if (!doc) return res.status(404).json({ success: false, message: 'Scholarship not found.' })
    res.json({ success: true, message: `Scholarship ${status}.`, data: doc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── UPDATE TEST SCORE ────────────────────────────────────────
const updateTestScore = async (req, res) => {
  try {
    await connectMongo()
    const { testScore, testPassed } = req.body
    const doc = await DigiUser.findByIdAndUpdate(
      req.params.id,
      { testScore, testPassed },
      { new: true }
    ).select('-password')
    if (!doc) return res.status(404).json({ success: false, message: 'Student not found.' })

    // Auto-create challan when student passes test (if not already exists)
    if (testPassed === true || testPassed === 'true') {
      const existingChallan = await DigiChallan.findOne({ userId: doc._id.toString() })
      if (!existingChallan) {
        const challanId = 'CH-' + Date.now()
        await DigiChallan.create({
          userId: doc._id.toString(),
          challanId,
          amount: 3250,
          paid: false,
        })
      }
    }

    res.json({ success: true, message: 'Test score updated.', data: doc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── CHALLAN INQUIRY ──────────────────────────────────────────
const challanInquiry = async (req, res) => {
  try {
    await connectMongo()
    const { challanId } = req.body
    if (!challanId) return res.status(400).json({ success: false, message: 'Challan ID required.' })

    const challan = await DigiChallan.findOne({ challanId })
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' })

    const user = await DigiUser.findById(challan.userId).select('fullName cnic mobile fatherName rollNumber email')

    res.json({
      success: true,
      data: {
        challanId:  challan.challanId,
        amount:     challan.amount,
        paid:       challan.paid,
        psid:       challan.psid,
        txnId:      challan.txnId,
        txnDate:    challan.txnDate,
        branchCode: challan.branchCode,
        student:    user,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DASHBOARD STATS (combined) ───────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    await connectMongo()
    const [
      totalStudents, verified, testPassed,
      totalChallans, paidChallans, unpaidChallans, revenueAgg,
      totalScholarships, pendingScholarships, approvedScholarships,
    ] = await Promise.all([
      DigiUser.countDocuments(),
      DigiUser.countDocuments({ isVerified: true }),
      DigiUser.countDocuments({ testPassed: true }),
      DigiChallan.countDocuments(),
      DigiChallan.countDocuments({ paid: true }),
      DigiChallan.countDocuments({ paid: false }),
      DigiChallan.aggregate([{ $match: { paid: true } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
      DigiScholarship.countDocuments(),
      DigiScholarship.countDocuments({ status: 'pending' }),
      DigiScholarship.countDocuments({ status: 'approved' }),
    ])

    const totalRevenue     = revenueAgg[0]?.sum || 0
    const collectionRate   = totalChallans > 0 ? Math.round((paidChallans / totalChallans) * 100) : 0

    res.json({
      success: true,
      data: {
        totalStudents, verified, unverified: totalStudents - verified, testPassed,
        totalChallans, paidChallans, unpaidChallans, totalRevenue, collectionRate,
        totalScholarships, pendingScholarships, approvedScholarships,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE DIGI STUDENT ──────────────────────────────────────
const deleteDigiStudent = async (req, res) => {
  try {
    await connectMongo()
    const user = await DigiUser.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'Student not found.' })

    // Also delete related challans
    await DigiChallan.deleteMany({ userId: req.params.id })

    res.json({ success: true, message: 'Student deleted successfully.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET ALL COURSES (from students) ─────────────────────────
const getDigiCourses = async (req, res) => {
  try {
    await connectMongo()
    const result = await DigiUser.aggregate([
      { $unwind: '$courses' },
      { $group: { _id: '$courses', students: { $sum: 1 } } },
      { $sort: { students: -1 } },
    ])
    const courses = result.map(r => ({ name: r._id, students: r.students }))
    res.json({ success: true, data: courses })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── UPDATE CHALLAN ──────────────────────────────────────────
const updateDigiChallan = async (req, res) => {
  try {
    await connectMongo()
    const { paid, psid, txnId, amount } = req.body
    const update = {}
    if (paid     !== undefined) update.paid     = paid
    if (psid     !== undefined) update.psid     = psid
    if (txnId    !== undefined) update.txnId    = txnId
    if (amount   !== undefined) update.amount   = amount
    if (paid === true)          update.txnDate  = new Date()

    const doc = await DigiChallan.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!doc) return res.status(404).json({ success: false, message: 'Challan not found.' })
    res.json({ success: true, message: 'Challan updated.', data: doc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── MARK CHALLAN PAID ────────────────────────────────────────
const markChallanPaid = async (req, res) => {
  try {
    await connectMongo()
    const { challanId, txnId, method } = req.body
    if (!challanId) return res.status(400).json({ success: false, message: 'Challan ID required.' })

    const challan = await DigiChallan.findOneAndUpdate(
      { challanId },
      { paid: true, txnId: txnId || null, txnDate: new Date() },
      { new: true }
    )
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' })

    res.json({ success: true, message: 'Challan marked as paid.', data: challan })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── TELEMARKETING ────────────────────────────────────────────
const getTelemarketing = async (req, res) => {
  try {
    await connectMongo()
    const { status, page = 1, limit = 10 } = req.query
    const query = {}
    if (status && status !== 'all') query.status = status

    const total = await DigiTeleChallan.countDocuments(query)
    const data  = await DigiTeleChallan.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))

    res.json({ success: true, data, total, page: parseInt(page), totalPages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const getTeleStats = async (req, res) => {
  try {
    await connectMongo()
    const [total, pending, called, resolved, unreachable] = await Promise.all([
      DigiTeleChallan.countDocuments(),
      DigiTeleChallan.countDocuments({ status: 'pending'     }),
      DigiTeleChallan.countDocuments({ status: 'called'      }),
      DigiTeleChallan.countDocuments({ status: 'resolved'    }),
      DigiTeleChallan.countDocuments({ status: 'unreachable' }),
    ])
    const conversionRate = total > 0 ? Math.round((resolved / total) * 100) : 0
    res.json({ success: true, data: { total, pending, called, resolved, unreachable, conversionRate } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const updateTeleStatus = async (req, res) => {
  try {
    await connectMongo()
    const { status, adminNote } = req.body
    const doc = await DigiTeleChallan.findByIdAndUpdate(
      req.params.id,
      { status, ...(adminNote && { adminNote }) },
      { new: true }
    )
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' })
    res.json({ success: true, message: 'Status updated.', data: doc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const deleteTeleEntry = async (req, res) => {
  try {
    await connectMongo()
    await DigiTeleChallan.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Deleted.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const clearTeleList = async (req, res) => {
  try {
    await connectMongo()
    await DigiTeleChallan.deleteMany({})
    res.json({ success: true, message: 'List cleared.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const addUnpaidChallans = async (req, res) => {
  try {
    await connectMongo()
    const unpaid = await DigiChallan.find({ paid: false })
    let added = 0
    for (const challan of unpaid) {
      const exists = await DigiTeleChallan.findOne({ originalChallanId: challan._id })
      if (exists) continue
      const user = await DigiUser.findById(challan.userId).select('fullName rollNumber mobile email city')
      if (!user) continue
      await DigiTeleChallan.create({
        originalChallanId: challan._id,
        originalUserId:    challan.userId,
        challanData: { challanId: challan.challanId, amount: challan.amount, paid: false },
        userData:    { fullName: user.fullName, rollNumber: user.rollNumber, phone: user.mobile, email: user.email, city: user.city },
        status:      'pending',
        assignedDate: new Date(),
      })
      added++
    }
    res.json({ success: true, message: `${added} unpaid challans added.`, added })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const addTeleNote = async (req, res) => {
  try {
    await connectMongo()
    const { text, admin } = req.body
    const doc = await DigiTeleChallan.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { text, date: new Date(), admin: admin || 'Admin' } } },
      { new: true }
    )
    res.json({ success: true, data: doc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── APPLICATIONS (unverified students) ───────────────────────
const getApplications = async (req, res) => {
  try {
    await connectMongo()
    const { page = 1, limit = 10, search = '', status } = req.query
    const query = {}

    if (search) {
      query.$or = [
        { fullName:   { $regex: search, $options: 'i' } },
        { cnic:       { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ]
    }
    // Filter: unverified = pending, verified = approved
    if (status === 'pending')  query.isVerified = false
    if (status === 'approved') query.isVerified = true

    const total = await DigiUser.countDocuments(query)
    const data  = await DigiUser.find(query)
      .select('-password -verifyToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))

    res.json({ success: true, data, total, page: parseInt(page), totalPages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── REPORTS (monthly revenue from challans) ──────────────────
const getMonthlyStats = async (req, res) => {
  try {
    await connectMongo()
    const year = new Date().getFullYear()

    const [monthly, courseStats] = await Promise.all([
      DigiChallan.aggregate([
        { $match: { paid: true, createdAt: { $gte: new Date(`${year}-01-01`) } } },
        { $group: {
          _id:      { $month: '$createdAt' },
          revenue:  { $sum: '$amount' },
          challans: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      DigiUser.aggregate([
        { $unwind: '$courses' },
        { $group: { _id: '$courses', students: { $sum: 1 } } },
        { $sort: { students: -1 } },
        { $limit: 10 },
      ]),
    ])

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const formattedMonthly = months.map((month, i) => {
      const found = monthly.find(m => m._id === i + 1)
      return { month, revenue: found?.revenue || 0, challans: found?.challans || 0 }
    })

    res.json({
      success: true,
      data: {
        monthly: formattedMonthly,
        courses: courseStats.map(c => ({ course: c._id, students: c.students })),
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const updateDigiStudent = async (req, res) => {
  try {
    await connectMongo()
    const { id } = req.params
    const updatedData = req.body

    const student = await DigiUser.findByIdAndUpdate(id, updatedData, { new: true })
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' })
    }

    res.json({ success: true, message: 'Student updated successfully.', data: student })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const generateDigiChallan = async (req, res) => {
  try {
    await connectMongo()
    const { userId } = req.body
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' })

    const user = await DigiUser.findById(userId).select('-password -verifyToken -resetPasswordToken -resetPasswordExpire')
    if (!user) return res.status(404).json({ success: false, message: 'Student not found.' })

    let challan = await DigiChallan.findOne({ userId: userId.toString() })
    if (!challan) {
      const challanId = Date.now().toString().slice(-5) + Math.floor(Math.random()*1000).toString().padStart(3,'0')
      challan = new DigiChallan({ userId: userId.toString(), challanId, amount: 3250, paid: false })
      await challan.save()
    }

    // Try to get filled HTML from Digikhyber-backend (uses actual challan-template.html)
    try {
      const digiApiUrl = process.env.DIGI_API_URL || 'https://digikhyber-backend.onrender.com/api'
      const apiKey     = process.env.ADMIN_API_KEY || '123456789'
      const controller = new AbortController()
      const timeout    = setTimeout(() => controller.abort(), 25000)
      const response   = await fetch(`${digiApiUrl}/admin/generate-challan-html`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body:    JSON.stringify({ userId }),
        signal:  controller.signal,
      })
      clearTimeout(timeout)
      if (response.ok) {
        const result = await response.json()
        if (result.data?.html) {
          return res.json({ success: true, status: 'success', data: result.data })
        }
      }
    } catch (_) { /* fallback below */ }

    // Fallback: return student+challan data for frontend template
    res.json({
      success: true, status: 'success',
      data: {
        challanNumber: challan.challanId,
        amount:        challan.amount,
        paid:          challan.paid,
        student: {
          fullName:   user.fullName,
          fatherName: user.fatherName,
          mobile:     user.mobile,
          email:      user.email,
          cnic:       user.cnic,
          courses:    user.courses || [],
          rollNumber: user.rollNumber,
        },
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  getDigiStudents, getDigiStudentById, getDigiStats, deleteDigiStudent,
  updateDigiChallan,
  getDigiScholarships, updateScholarshipStatus,
  getDigiChallans, getDigiChallanStats, challanInquiry, markChallanPaid,
  updateTestScore, getDashboardStats,
  getTelemarketing, getTeleStats, updateTeleStatus, deleteTeleEntry, clearTeleList, addUnpaidChallans, addTeleNote,
  getApplications, getMonthlyStats,
  getDigiCourses,
  updateDigiStudent, generateDigiChallan,
}

