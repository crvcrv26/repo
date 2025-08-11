const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // The admin who will receive the payment
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // The user who needs to pay (auditor or field agent)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Role of the user (auditor or field agent)
  userRole: {
    type: String,
    enum: ['auditor', 'fieldAgent'],
    required: true
  },
  
  // Monthly payment amount assigned by admin
  monthlyAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Month and year for which payment is due
  paymentMonth: {
    type: Number, // 1-12
    required: true,
    min: 1,
    max: 12
  },
  
  paymentYear: {
    type: Number,
    required: true
  },
  
  // Period start and end dates
  periodStart: {
    type: Date,
    required: true
  },
  
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Due date (end of month based on user creation date)
  dueDate: {
    type: Date,
    required: true
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  
  // Actual payment date (when paid)
  paidDate: {
    type: Date,
    default: null
  },
  
  // Payment amount (actual amount paid)
  paidAmount: {
    type: Number,
    default: 0
  },
  
  // Whether the user was active during this month
  wasActive: {
    type: Boolean,
    default: true
  },
  
  // User creation date (to track if they were created during this month)
  userCreatedAt: {
    type: Date,
    required: true
  },
  
  // Whether user was deleted before due date
  wasDeleted: {
    type: Boolean,
    default: false
  },
  
  // User deletion date (if applicable)
  userDeletedAt: {
    type: Date,
    default: null
  },
  
  // Payment rate changes tracking
  rateChanges: [{
    oldAmount: Number,
    newAmount: Number,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Notes or comments
  notes: {
    type: String,
    default: ''
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
paymentSchema.index({ adminId: 1, userId: 1, paymentMonth: 1, paymentYear: 1 }, { unique: true });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ adminId: 1, status: 1 });
paymentSchema.index({ dueDate: 1, status: 1 });

// Virtual for payment period string
paymentSchema.virtual('paymentPeriod').get(function() {
  if (this.periodStart && this.periodEnd) {
    const startDate = new Date(this.periodStart);
    const endDate = new Date(this.periodEnd);
    
    const formatDate = (date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      return `${day} ${month}`;
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  
  // Fallback to month name if period dates not set
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[this.paymentMonth - 1]} ${this.paymentYear}`;
});

// Virtual for days overdue
paymentSchema.virtual('daysOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'pending') return 0;
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = today.getTime() - due.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
paymentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
