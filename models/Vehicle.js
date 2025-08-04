const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: [true, 'Please add vehicle number'],
    unique: true,
    uppercase: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: [true, 'Please add owner name'],
    trim: true
  },
  ownerPhone: {
    type: String,
    required: [true, 'Please add owner phone'],
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },
  ownerEmail: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  vehicleType: {
    type: String,
    enum: ['car', 'bike', 'truck', 'bus', 'tractor', 'other'],
    default: 'car'
  },
  make: {
    type: String,
    required: [true, 'Please add vehicle make'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Please add vehicle model'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Please add vehicle year']
  },
  color: {
    type: String,
    trim: true
  },
  engineNumber: {
    type: String,
    trim: true
  },
  chassisNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'recovered', 'failed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  location: {
    address: {
      type: String,
      required: [true, 'Please add vehicle location address']
    },
    city: {
      type: String,
      required: [true, 'Please add city']
    },
    state: {
      type: String,
      required: [true, 'Please add state']
    },
    pincode: {
      type: String,
      match: [/^[0-9]{6}$/, 'Please add a valid 6-digit pincode']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  financialDetails: {
    loanAmount: {
      type: Number,
      required: [true, 'Please add loan amount']
    },
    outstandingAmount: {
      type: Number,
      required: [true, 'Please add outstanding amount']
    },
    defaultAmount: {
      type: Number,
      required: [true, 'Please add default amount']
    },
    defaultDate: {
      type: Date,
      required: [true, 'Please add default date']
    },
    bankName: {
      type: String,
      trim: true
    },
    branchName: {
      type: String,
      trim: true
    }
  },
  recoveryDetails: {
    recoveredAt: {
      type: Date,
      default: null
    },
    recoveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    recoveryLocation: {
      address: String,
      city: String,
      state: String,
      coordinates: [Number]
    },
    recoveryNotes: {
      type: String,
      trim: true
    },
    recoveryPhotos: [{
      filename: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create text index for search
vehicleSchema.index({
  vehicleNumber: 'text',
  ownerName: 'text',
  ownerPhone: 'text',
  'location.address': 'text',
  'location.city': 'text',
  'location.state': 'text',
  make: 'text',
  model: 'text'
});

// Create compound index for efficient queries
vehicleSchema.index({ status: 1, assignedTo: 1 });
vehicleSchema.index({ status: 1, priority: 1 });
vehicleSchema.index({ 'location.city': 1, status: 1 });

// Virtual for vehicle's full name
vehicleSchema.virtual('fullVehicleName').get(function() {
  return `${this.make} ${this.model} ${this.year}`;
});

// Virtual for location string
vehicleSchema.virtual('locationString').get(function() {
  return `${this.location.address}, ${this.location.city}, ${this.location.state}`;
});

// Virtual for days since default
vehicleSchema.virtual('daysSinceDefault').get(function() {
  if (!this.financialDetails.defaultDate) return null;
  const now = new Date();
  const defaultDate = new Date(this.financialDetails.defaultDate);
  const diffTime = Math.abs(now - defaultDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
vehicleSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema); 