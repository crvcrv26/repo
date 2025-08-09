const mongoose = require('mongoose');

const moneyExcelFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalRows: {
    type: Number,
    default: 0
  },
  processedRows: {
    type: Number,
    default: 0
  },
  insertedRows: {
    type: Number,
    default: 0
  },
  updatedRows: {
    type: Number,
    default: 0
  },
  skippedRows: {
    type: Number,
    default: 0
  },
  failedRows: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'partial'],
    default: 'processing'
  },
  dedupeEnabled: {
    type: Boolean,
    default: false
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  errorMessage: {
    type: String,
    default: null
  },
  errors: [{
    row: Number,
    reason: String
  }]
}, {
  timestamps: {
    createdAt: 'uploaded_at',
    updatedAt: 'updated_at'
  }
});

// Index for queries
moneyExcelFileSchema.index({ uploadedBy: 1, uploaded_at: -1 });
moneyExcelFileSchema.index({ status: 1 });

module.exports = mongoose.model('MoneyExcelFile', moneyExcelFileSchema);
