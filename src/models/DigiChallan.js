const mongoose = require('mongoose')

const digiChallanSchema = new mongoose.Schema({
  userId:              { type: String },
  challanId:           { type: String },
  amount:              { type: Number },
  paid:                { type: Boolean, default: false },
  branchCode:          { type: Number },
  txnId:               { type: Number },
  txnDate:             { type: Date   },
  path:                { type: String },
  secondEnrollChallan: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.models.Challan || mongoose.model('Challan', digiChallanSchema)
