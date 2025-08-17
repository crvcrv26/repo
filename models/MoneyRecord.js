const mongoose = require('mongoose');

const moneyRecordSchema = new mongoose.Schema({
  registration_number: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  bill_date: {
    type: Date,
    required: true
  },
  bank: {
    type: String,
    required: true,
    trim: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    trim: true
  },
  yard_name: {
    type: String,
    required: true,
    trim: true
  },
  repo_bill_amount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  repo_payment_status: {
    type: String,
    required: true,
    trim: true,
    default: 'Payment Due'
  },
  total_bill_amount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  loan_number: {
    type: String,
    required: true,
    trim: true
  },
  customer_name: {
    type: String,
    required: true,
    trim: true
  },
  load: {
    type: String,
    default: '',
    trim: true
  },
  load_details: {
    type: String,
    default: '',
    trim: true
  },
  confirmed_by: {
    type: String,
    required: true,
    trim: true
  },
  repo_date: {
    type: Date,
    required: true
  },
  service_tax: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  payment_to_repo_team: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // Field agent assignment
  field_agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Bookkeeping/meta fields
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source_excel_file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MoneyExcelFile',
    required: false
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for performance
moneyRecordSchema.index({ registration_number: 'text' });
moneyRecordSchema.index({ bill_date: -1 });
moneyRecordSchema.index({ registration_number: 1, bill_date: -1 });
moneyRecordSchema.index({ bank: 1 });
moneyRecordSchema.index({ status: 1 });
moneyRecordSchema.index({ repo_payment_status: 1 });
moneyRecordSchema.index({ created_by: 1 });
moneyRecordSchema.index({ field_agent: 1 });

module.exports = mongoose.model('MoneyRecord', moneyRecordSchema);
