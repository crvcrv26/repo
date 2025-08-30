const mongoose = require('mongoose');

const backOfficeNumberSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
backOfficeNumberSchema.index({ adminId: 1, isActive: 1 });
backOfficeNumberSchema.index({ adminId: 1, order: 1 });

// Ensure maximum 4 active numbers per admin
backOfficeNumberSchema.pre('save', async function(next) {
  if (this.isActive && this.isNew) {
    const activeCount = await this.constructor.countDocuments({
      adminId: this.adminId,
      isActive: true
    });
    
    if (activeCount >= 4) {
      return next(new Error('Maximum 4 back office numbers allowed per admin'));
    }
  }
  next();
});

module.exports = mongoose.model('BackOfficeNumber', backOfficeNumberSchema);
