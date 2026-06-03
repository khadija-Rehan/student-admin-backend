const mongoose = require('mongoose')

const digiAuditLogSchema = new mongoose.Schema({
  type:        { type: String, required: true },
  category:    { type: String, required: true },
  title:       { type: String },
  description: { type: String },
  status:      { type: String },
  meta:        { type: Object },
  performedBy: { type: String, default: 'Admin' },
}, { timestamps: true })

module.exports = mongoose.models.DigiAuditLog || mongoose.model('DigiAuditLog', digiAuditLogSchema)
