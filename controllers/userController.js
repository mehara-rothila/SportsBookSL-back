// controllers/userController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Facility = require('../models/Facility');
const Booking = require('../models/Booking');
const FinancialAidApplication = require('../models/FinancialAidApplication');
const Donation = require('../models/Donation'); // Make sure to import the Donation model
const fs = require('fs');
const path = require('path');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar,
        sportPreferences: user.sportPreferences,
        createdAt: user.createdAt,
        role: user.role,
    });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    // Fields that can be updated
    const { name, email, phone, address, sportPreferences } = req.body;
    
    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (sportPreferences) user.sportPreferences = sportPreferences;
    
    const updatedUser = await user.save();
    
    res.status(200).json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        avatar: updatedUser.avatar,
        sportPreferences: updatedUser.sportPreferences,
        createdAt: updatedUser.createdAt,
        role: updatedUser.role,
    });
});

/**
 * @desc    Update user avatar
 * @route   PUT /api/users/profile/avatar
 * @access  Private
 */
const updateUserAvatar = asyncHandler(async (req, res) => {
    // Check if file was uploaded
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    // Delete old avatar if it exists and is not the default
    if (user.avatar && user.avatar !== '/images/default-avatar.png') {
        try {
            const oldAvatarPath = path.join(__dirname, '..', 'public', user.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
                console.log(`Previous avatar deleted: ${oldAvatarPath}`);
            }
        } catch (err) {
            console.error('Error deleting previous avatar:', err);
            // Continue even if delete fails
        }
    }
    
    // Update user with new avatar path
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await user.save();
    
    res.status(200).json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        avatar: updatedUser.avatar,
        sportPreferences: updatedUser.sportPreferences,
        createdAt: updatedUser.createdAt,
        role: updatedUser.role,
    });
});

/**
 * @desc    Remove user avatar
 * @route   DELETE /api/users/profile/avatar
 * @access  Private
 */
const removeUserAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    // Delete avatar file if it exists and is not the default
    if (user.avatar && user.avatar !== '/images/default-avatar.png') {
        try {
            const avatarPath = path.join(__dirname, '..', 'public', user.avatar);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
                console.log(`Avatar deleted: ${avatarPath}`);
            }
        } catch (err) {
            console.error('Error deleting avatar file:', err);
            // Continue even if delete fails
        }
    }
    
    // Reset avatar to null
    user.avatar = null;
    const updatedUser = await user.save();
    
    res.status(200).json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        avatar: updatedUser.avatar,
        sportPreferences: updatedUser.sportPreferences,
        createdAt: updatedUser.createdAt,
        role: updatedUser.role,
    });
});

/**
 * @desc    Get user bookings
 * @route   GET /api/users/bookings
 * @access  Private
 */
const getUserBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id })
        .populate('facility', 'name location images')
        .populate('trainer', 'name specialization avatar')
        .sort({ date: -1 });
    
    res.status(200).json(bookings);
});

/**
 * @desc    Get user favorites
 * @route   GET /api/users/favorites
 * @access  Private
 */
const getUserFavorites = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('favorites');
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    res.status(200).json(user.favorites || []);
});

/**
 * @desc    Add a facility to favorites
 * @route   POST /api/users/favorites
 * @access  Private
 */
const addFavorite = asyncHandler(async (req, res) => {
    const { facilityId } = req.body;
    
    if (!facilityId) {
        res.status(400);
        throw new Error('Facility ID is required');
    }
    
    // Check if facility exists
    const facility = await Facility.findById(facilityId);
    if (!facility) {
        res.status(404);
        throw new Error('Facility not found');
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    // Check if already in favorites
    if (user.favorites.includes(facilityId)) {
        res.status(400);
        throw new Error('Facility already in favorites');
    }
    
    // Add to favorites
    user.favorites.push(facilityId);
    await user.save();
    
    // Get updated favorites with populated data
    const updatedUser = await User.findById(req.user._id).populate('favorites');
    
    res.status(200).json(updatedUser.favorites);
});

/**
 * @desc    Remove a facility from favorites
 * @route   DELETE /api/users/favorites/:facilityId
 * @access  Private
 */
const removeFavorite = asyncHandler(async (req, res) => {
    const { facilityId } = req.params;
    
    if (!facilityId) {
        res.status(400);
        throw new Error('Facility ID is required');
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    // Check if the facility is in favorites
    if (!user.favorites.includes(facilityId)) {
        res.status(400);
        throw new Error('Facility not in favorites');
    }
    
    // Remove from favorites
    user.favorites = user.favorites.filter(
        (favId) => favId.toString() !== facilityId
    );
    await user.save();
    
    // Get updated favorites with populated data
    const updatedUser = await User.findById(req.user._id).populate('favorites');
    
    res.status(200).json(updatedUser.favorites);
});

/**
 * @desc    Get user financial aid applications
 * @route   GET /api/users/financial-aid
 * @access  Private
 */
const getUserFinancialAidApps = asyncHandler(async (req, res) => {
    const applications = await FinancialAidApplication.find({ user: req.user._id })
        .sort({ createdAt: -1 });
    
    res.status(200).json(applications);
});

/**
 * @desc    Get user donation history
 * @route   GET /api/users/donations/history
 * @access  Private
 */
const getUserDonationHistory = asyncHandler(async (req, res) => {
    const donations = await Donation.find({ donor: req.user._id })
        .populate('athlete', 'name')
        .sort({ donationDate: -1 });
    
    res.status(200).json(donations);
});

module.exports = {
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    removeUserAvatar,
    getUserBookings,
    getUserFavorites,
    addFavorite,
    removeFavorite,
    getUserFinancialAidApps,
    getUserDonationHistory,
};