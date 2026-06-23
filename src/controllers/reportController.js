const getDashboardStats = async (req, res) => {
  res.json({ success: true, data: {
    totalEnrollments: 0, pendingEnrollments: 0, approvedEnrollments: 0,
    rejectedApplications: 0, paidChallans: 0, unpaidChallans: 0,
    totalRevenue: 0, scholarshipApplications: 0, activeUsers: 0,
  }})
}

const getMonthlyRevenue = async (req, res) => {
  res.json({ success: true, data: [] })
}

module.exports = { getDashboardStats, getMonthlyRevenue }
