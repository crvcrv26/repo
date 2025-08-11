const mongoose = require('mongoose');

const adminPaymentSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  superAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // Format: "YYYY-MM"
    required: true
  },
  userCount: {
    type: Number,
    required: true,
    min: 0
  },
  perUserRate: {
    type: Number,
    required: true,
    min: 0
  },
  serviceRate: {
    type: Number,
    required: true,
    min: 0
  },
  // Proration fields
  isProrated: {
    type: Boolean,
    default: false
  },
  proratedDays: {
    type: Number,
    min: 0
  },
  totalDaysInMonth: {
    type: Number,
    min: 0
  },
  proratedServiceRate: {
    type: Number,
    min: 0
  },
  userAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  paymentProof: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentProof'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one payment per admin per month
adminPaymentSchema.index({ adminId: 1, month: 1 }, { unique: true });

// Virtual for payment period
adminPaymentSchema.virtual('paymentPeriod').get(function() {
  const [year, month] = this.month.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (this.isProrated && this.proratedDays) {
    const startDay = this.totalDaysInMonth - this.proratedDays + 1;
    const endDay = this.totalDaysInMonth;
    return `${startDay} ${monthNames[parseInt(month) - 1]} - ${endDay} ${monthNames[parseInt(month) - 1]} ${year}`;
  }
  
  return `${monthNames[parseInt(month) - 1]} ${year}`;
});

// Ensure virtuals are included in JSON output
adminPaymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('AdminPayment', adminPaymentSchema);
