const mongoose = require('mongoose');

const paymentProofSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proofType: {
    type: String,
    enum: ['screenshot', 'transaction_number'],
    required: true
  },
  proofImageUrl: {
    type: String,
    required: function() {
      return this.proofType === 'screenshot';
    }
  },
  proofImageName: {
    type: String,
    required: function() {
      return this.proofType === 'screenshot';
    }
  },
  transactionNumber: {
    type: String,
    required: function() {
      return this.proofType === 'transaction_number';
    }
  },
  paymentDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  resubmittedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
paymentProofSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for better performance
paymentProofSchema.index({ status: 1, reviewedAt: 1, proofType: 1 });
paymentProofSchema.index({ status: 1, reviewedAt: 1 });

module.exports = mongoose.model('PaymentProof', paymentProofSchema);
