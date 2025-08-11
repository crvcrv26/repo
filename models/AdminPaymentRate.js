const mongoose = require('mongoose');

const adminPaymentRateSchema = new mongoose.Schema({
  perUserRate: {
    type: Number,
    required: [true, 'Per user rate is required'],
    min: [0, 'Per user rate cannot be negative']
  },
  serviceRate: {
    type: Number,
    required: [true, 'Service rate is required'],
    min: [0, 'Service rate cannot be negative']
  },
  effectiveFrom: {
    type: Date,
    required: [true, 'Effective from date is required'],
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure only one active rate at a time
adminPaymentRateSchema.index({ isActive: 1 });

module.exports = mongoose.model('AdminPaymentRate', adminPaymentRateSchema);
