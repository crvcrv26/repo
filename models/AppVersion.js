const mongoose = require('mongoose');

const appVersionSchema = new mongoose.Schema({
  appType: {
    type: String,
    enum: ['main', 'emergency'],
    required: true
  },
  version: {
    type: String,
    required: true
  },
  versionCode: {
    type: Number,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  features: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  downloadCount: {
    type: Number,
    default: 0
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

// Ensure only one active version per app type
appVersionSchema.index({ appType: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Update the updatedAt field before saving
appVersionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AppVersion', appVersionSchema);
