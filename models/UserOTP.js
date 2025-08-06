const mongoose = require('mongoose')

const userOTPSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  otp: {
    type: String,
    required: true,
    length: 4
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Index for efficient queries
userOTPSchema.index({ userId: 1, used: 1, expiresAt: 1 })
userOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // Auto-delete expired OTPs

// Method to check if OTP is valid
userOTPSchema.methods.isValid = function() {
  return !this.used && new Date() < this.expiresAt
}

// Method to mark OTP as used
userOTPSchema.methods.markAsUsed = function() {
  this.used = true
  return this.save()
}

// Static method to generate OTP
userOTPSchema.statics.generateOTP = function() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// Static method to create OTP for user
userOTPSchema.statics.createForUser = function(userId, generatedBy) {
  const otp = this.generateOTP()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
  
  return this.create({
    userId,
    otp,
    expiresAt,
    generatedBy
  })
}

// Static method to find valid OTP for user
userOTPSchema.statics.findValidOTP = function(userId) {
  return this.findOne({
    userId,
    used: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 })
}

module.exports = mongoose.model('UserOTP', userOTPSchema) 