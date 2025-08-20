const mongoose = require('mongoose');

const fileStorageSettingsSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'superAdmin', 'superSuperAdmin'],
    required: true,
    unique: true
  },
  totalRecordLimit: {
    type: Number,
    required: true,
    min: 1000, // Minimum 1k records
    max: 10000000 // Maximum 10M records
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create index for role
fileStorageSettingsSchema.index({ role: 1 });

// Ensure virtual fields are serialized
fileStorageSettingsSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

module.exports = mongoose.model('FileStorageSettings', fileStorageSettingsSchema);

