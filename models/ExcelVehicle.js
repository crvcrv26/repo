const mongoose = require('mongoose');

const excelVehicleSchema = new mongoose.Schema({
  excel_file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExcelFile',
    required: [true, 'Excel file reference is required']
  },
  registration_number: {
    type: String,
    maxlength: 100,
    default: null
  },
  first_confirmer_name: {
    type: String,
    maxlength: 100,
    default: null
  },
  first_confirmer_no: {
    type: String,
    maxlength: 20,
    default: null
  },
  second_confirmer_name: {
    type: String,
    maxlength: 100,
    default: null
  },
  second_confirmer_no: {
    type: String,
    maxlength: 20,
    default: null
  },
  third_confirmer_name: {
    type: String,
    maxlength: 100,
    default: null
  },
  third_confirmer_no: {
    type: String,
    maxlength: 20,
    default: null
  },
  loan_number: {
    type: String,
    maxlength: 100,
    default: null
  },
  make: {
    type: String,
    maxlength: 100,
    default: null
  },
  chasis_number: {
    type: String,
    maxlength: 100,
    default: null
  },
  engine_number: {
    type: String,
    maxlength: 100,
    default: null
  },
  emi: {
    type: String,
    maxlength: 100,
    default: null
  },
  pos: {
    type: String,
    maxlength: 100,
    default: null
  },
  bucket: {
    type: String,
    maxlength: 100,
    default: null
  },
  customer_name: {
    type: String,
    maxlength: 100,
    default: null
  },
  address: {
    type: String,
    maxlength: 255,
    default: null
  },
  branch: {
    type: String,
    maxlength: 100,
    default: null
  },
  sec_17: {
    type: String,
    maxlength: 100,
    default: null
  },
  seasoning: {
    type: String,
    maxlength: 100,
    default: null
  },
  tbr: {
    type: String,
    maxlength: 100,
    default: null
  },
  allocation: {
    type: String,
    maxlength: 100,
    default: null
  },
  model: {
    type: String,
    maxlength: 100,
    default: null
  },
  product_name: {
    type: String,
    maxlength: 100,
    default: null
  },
  rowNumber: {
    type: Number,
    required: [true, 'Row number is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
excelVehicleSchema.index({ excel_file: 1, isActive: 1 }); // For listing vehicles by file
excelVehicleSchema.index({ registration_number: 1, excel_file: 1, isActive: 1 }); // For vehicle lookup
excelVehicleSchema.index({ loan_number: 1, excel_file: 1, isActive: 1 }); // For loan lookup
excelVehicleSchema.index({ chasis_number: 1, engine_number: 1, isActive: 1 }); // For vehicle identification
excelVehicleSchema.index({ customer_name: 1, branch: 1, isActive: 1 }); // For customer lookup
excelVehicleSchema.index({ branch: 1, bucket: 1, isActive: 1 }); // For branch analytics
excelVehicleSchema.index({ createdAt: -1, excel_file: 1, isActive: 1 }); // For recent uploads

// Text index for search functionality with weights
excelVehicleSchema.index({
  registration_number: 'text',
  customer_name: 'text',
  loan_number: 'text',
  chasis_number: 'text',
  engine_number: 'text',
  make: 'text',
  model: 'text',
  branch: 'text',
  address: 'text'
}, {
  weights: {
    registration_number: 10,
    loan_number: 10,
    chasis_number: 8,
    engine_number: 8,
    customer_name: 6,
    make: 4,
    model: 4,
    branch: 2,
    address: 1
  },
  name: 'VehicleTextIndex'
});

module.exports = mongoose.model('ExcelVehicle', excelVehicleSchema); 