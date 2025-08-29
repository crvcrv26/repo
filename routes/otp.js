const express = require('express')
const router = express.Router()
const UserOTP = require('../models/UserOTP')
const User = require('../models/User')
const { authenticateToken, authorizeRole } = require('../middleware/auth')

// @desc    Generate OTP for a user (Admin only)
// @route   POST /api/otp/generate
// @access  Private (Admin)
router.post('/generate', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId } = req.body
    const adminId = req.user._id

    // Validate user exists, is not deleted, and is under admin's supervision
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user is deleted
    if (user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user is fieldAgent or auditor
    if (!['fieldAgent', 'auditor'].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'OTP can only be generated for field agents and auditors'
      })
    }

    // Check if user is under admin's supervision
    if (user.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only generate OTP for users under your supervision'
      })
    }

    // Invalidate any existing valid OTP for this user
    await UserOTP.updateMany(
      { userId, used: false, expiresAt: { $gt: new Date() } },
      { used: true }
    )

    // Generate new OTP
    const otpData = await UserOTP.createForUser(userId, adminId)

    res.json({
      success: true,
      message: 'OTP generated successfully',
      data: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        otp: otpData.otp,
        expiresAt: otpData.expiresAt,
        createdAt: otpData.createdAt
      }
    })
  } catch (error) {
    console.error('Generate OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @desc    View OTP for a user (Admin only)
// @route   GET /api/otp/view/:userId
// @access  Private (Admin)
router.get('/view/:userId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params
    const adminId = req.user._id

    // Validate user exists and is under admin's supervision
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user is under admin's supervision
    if (user.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view OTP for users under your supervision'
      })
    }

    // Find valid OTP for user
    const otpData = await UserOTP.findValidOTP(userId)

    if (!otpData) {
      return res.json({
        success: true,
        data: {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          hasValidOTP: false,
          message: 'No valid OTP found'
        }
      })
    }

    // Calculate remaining time
    const now = new Date()
    const remainingTime = Math.max(0, Math.floor((otpData.expiresAt - now) / 1000))

    res.json({
      success: true,
      data: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        hasValidOTP: true,
        otp: otpData.otp,
        expiresAt: otpData.expiresAt,
        createdAt: otpData.createdAt,
        remainingSeconds: remainingTime,
        isExpired: remainingTime <= 0
      }
    })
  } catch (error) {
    console.error('View OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @desc    Get all OTPs for admin's users
// @route   GET /api/otp/list
// @access  Private (Admin)
router.get('/list', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const adminId = req.user._id

    // Get all field agents and auditors under this admin, sorted alphabetically by name
    // Exclude deleted users
    const users = await User.find({
      createdBy: adminId,
      role: { $in: ['fieldAgent', 'auditor'] },
      isDeleted: { $ne: true } // Exclude deleted users
    }).select('name email role profileImage').sort({ name: 1 })

    // Get OTP data for each user
    const otpList = await Promise.all(
      users.map(async (user) => {
        const otpData = await UserOTP.findValidOTP(user._id)
        
        if (!otpData) {
          return {
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            profileImage: user.profileImage,
            hasValidOTP: false,
            message: 'No valid OTP'
          }
        }

        const now = new Date()
        const remainingTime = Math.max(0, Math.floor((otpData.expiresAt - now) / 1000))

        return {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          profileImage: user.profileImage,
          hasValidOTP: true,
          otp: otpData.otp,
          expiresAt: otpData.expiresAt,
          createdAt: otpData.createdAt,
          remainingSeconds: remainingTime,
          isExpired: remainingTime <= 0
        }
      })
    )

    res.json({
      success: true,
      data: otpList
    })
  } catch (error) {
    console.error('List OTPs error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @desc    Invalidate OTP for a user (Admin only)
// @route   DELETE /api/otp/invalidate/:userId
// @access  Private (Admin)
router.delete('/invalidate/:userId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params
    const adminId = req.user._id

    // Validate user exists, is not deleted, and is under admin's supervision
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user is deleted
    if (user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user is under admin's supervision
    if (user.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only invalidate OTP for users under your supervision'
      })
    }

    // Invalidate all valid OTPs for this user
    const result = await UserOTP.updateMany(
      { userId, used: false, expiresAt: { $gt: new Date() } },
      { used: true }
    )

    res.json({
      success: true,
      message: 'OTP invalidated successfully',
      data: {
        userId: user._id,
        userName: user.name,
        invalidatedCount: result.modifiedCount
      }
    })
  } catch (error) {
    console.error('Invalidate OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @desc    Verify OTP for login
// @route   POST /api/otp/verify
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { emailOrPhone, otp } = req.body

    if (!emailOrPhone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email/Phone and OTP are required'
      })
    }

    // Find user by email or phone (exclude deleted users)
    const user = await User.findOne({
      $or: [
        { email: emailOrPhone },
        { phone: emailOrPhone }
      ],
      isDeleted: { $ne: true } // Exclude deleted users
    })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user is fieldAgent or auditor
    if (!['fieldAgent', 'auditor'].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'OTP verification is only for field agents and auditors'
      })
    }

    // Find valid OTP for user
    const otpData = await UserOTP.findValidOTP(user._id)

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: 'No valid OTP found. Please ask your admin to generate a new OTP.'
      })
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      })
    }

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please ask your admin to generate a new OTP.'
      })
    }

    // Mark OTP as used
    await otpData.markAsUsed()

    // Invalidate any existing session first (single-session-per-user)
    user.invalidateSession();
    
    // Update last login and add to login history
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Save user to update session info
    await user.save();

    // Generate JWT token with session token
    const token = user.getSignedJwtToken();
    
    // Save again to persist the new session token
    await user.save();

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

module.exports = router 