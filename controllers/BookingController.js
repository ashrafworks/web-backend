import Booking from '../models/bookingModel.js';
import Property from '../models/propertyModel.js';
import { v4 as uuidv4 } from 'uuid';

// Helper function to generate unique booking ID
const generateBookingId = () => {
  const prefix = 'BK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Helper function to calculate pricing
const calculatePricing = (pricePerNight, checkIn, checkOut, totalNightsForDiscount = 7) => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const totalNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  
  const subtotal = pricePerNight * totalNights;
  const serviceFee = subtotal * 0.15; // 15% service fee
  
  let discount = 0;
  if (totalNights >= totalNightsForDiscount) {
    discount = subtotal * 0.10; // 10% discount for long stays
  }
  
  const totalAmount = subtotal + serviceFee - discount;
  
  return {
    pricePerNight,
    totalNights,
    subtotal: parseFloat(subtotal.toFixed(2)),
    serviceFee: parseFloat(serviceFee.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2))
  };
};

// Auto-complete bookings based on checkout date
export const autoCompleteBookings = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bookingsToComplete = await Booking.updateMany(
      {
        checkOut: { $lt: today },
        bookingStatus: 'confirmed'
      },
      {
        $set: { bookingStatus: 'completed' }
      }
    );
    
    return bookingsToComplete;
  } catch (error) {
    console.error('Auto-complete bookings error:', error);
    throw error;
  }
};

// Create new booking
export const createBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const {
      propertyId,
      checkIn,
      checkOut,
      totalGuests,
      adults,
      children,
      pets,
      contactInfo,
      messageToHost,
      paymentIntentId,
      lastFourDigits
    } = req.body;
    
    // Validate required fields
    if (!propertyId || !checkIn || !checkOut || !totalGuests || !adults || !contactInfo) {
      return res.status(400).json({
        success: false,
        message: 'Sab required fields fill karo please'
      });
    }
    
    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property nahi mili'
      });
    }
    
    // Check if dates are valid
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date past mai nahi ho sakti'
      });
    }
    
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date check-in ke baad honi chahiye'
      });
    }
    
    // Check if property is already booked for these dates
    const existingBooking = await Booking.findOne({
      propertyId,
      bookingStatus: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          checkIn: { $lte: checkInDate },
          checkOut: { $gt: checkInDate }
        },
        {
          checkIn: { $lt: checkOutDate },
          checkOut: { $gte: checkOutDate }
        },
        {
          checkIn: { $gte: checkInDate },
          checkOut: { $lte: checkOutDate }
        }
      ]
    });
    
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Ye property in dates pe already booked hai'
      });
    }
    
    // Calculate pricing
    const pricing = calculatePricing(
      property.pricePerNight,
      checkIn,
      checkOut,
      property.totalNightsForDiscount || 7
    );
    
    // Generate unique booking ID
    const bookingId = generateBookingId();
    
    // Create booking
    const booking = await Booking.create({
      userId,
      propertyId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalGuests,
      adults,
      children: children || 0,
      pets: pets || 0,
      contactInfo,
      pricing,
      paymentInfo: {
        paymentIntentId: paymentIntentId || `pi_fake_${Date.now()}`,
        paymentStatus: 'succeeded',
        lastFourDigits: lastFourDigits || '4242',
        paymentDate: new Date()
      },
      bookingStatus: 'confirmed',
      messageToHost: messageToHost || '',
      bookingId
    });
    
    // Populate property and user details
    await booking.populate('propertyId', 'name address images pricePerNight');
    await booking.populate('userId', 'name email avatar');
    
    res.status(201).json({
      success: true,
      message: 'Booking successfully create ho gayi!',
      data: {
        bookingId: booking.bookingId,
        booking
      }
    });
    
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Booking create karne mai error aa gaya',
      error: error.message
    });
  }
};

// Get user's all bookings
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 50 } = req.query;
    
    // Auto-complete expired bookings
    await autoCompleteBookings();
    
    const query = { userId };
    
    // Filter by status if provided
    if (status) {
      query.bookingStatus = status;
    }
    
    const bookings = await Booking.find(query)
      .populate('propertyId', 'name address images pricePerNight')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Booking.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Bookings fetch karne mai error',
      error: error.message
    });
  }
};

// Get single booking by bookingId
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    // Auto-complete if needed
    await autoCompleteBookings();
    
    let booking;
    
    // Admin can view any booking, user can only view their own
    if (userRole === 'admin') {
      booking = await Booking.findOne({ bookingId })
        .populate('propertyId', 'name address images pricePerNight host')
        .populate('userId', 'name email avatar phone');
    } else {
      booking = await Booking.findOne({ bookingId, userId })
        .populate('propertyId', 'name address images pricePerNight')
        .populate('userId', 'name email avatar phone');
    }
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking nahi mili'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
    
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Booking fetch karne mai error',
      error: error.message
    });
  }
};

// Cancel booking (User can cancel their own, Admin can cancel any)
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let booking;
    
    // Admin can cancel any booking, user can only cancel their own
    if (userRole === 'admin') {
      booking = await Booking.findOne({ bookingId });
    } else {
      booking = await Booking.findOne({ bookingId, userId });
    }
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking nahi mili'
      });
    }
    
    // Check if booking can be cancelled (only for users, admin can always cancel)
    if (userRole !== 'admin' && !booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Ye booking cancel nahi ho sakti (check-in se 24 hours se kam time bacha hai ya already cancelled hai)'
      });
    }
    
    // Check if already cancelled
    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Ye booking already cancelled hai'
      });
    }
    
    booking.bookingStatus = 'cancelled';
    await booking.save();
    
    res.status(200).json({
      success: true,
      message: 'Booking cancel ho gayi',
      data: booking
    });
    
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Booking cancel karne mai error',
      error: error.message
    });
  }
};

// Get property bookings (for property owners)
export const getPropertyBookings = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id;
    
    // Auto-complete expired bookings
    await autoCompleteBookings();
    
    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property nahi mili'
      });
    }
    
    // Check if user owns this property
    if (property.host.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Tumhari property nahi hai ye'
      });
    }
    
    const bookings = await Booking.find({ propertyId })
      .populate('userId', 'name email avatar phone')
      .sort({ checkIn: -1 });
    
    res.status(200).json({
      success: true,
      data: bookings
    });
    
  } catch (error) {
    console.error('Get property bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Property bookings fetch karne mai error',
      error: error.message
    });
  }
};

// Check availability for dates
export const checkAvailability = async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut } = req.query;
    
    if (!propertyId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'PropertyId, checkIn aur checkOut required hain'
      });
    }
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    const existingBooking = await Booking.findOne({
      propertyId,
      bookingStatus: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          checkIn: { $lte: checkInDate },
          checkOut: { $gt: checkInDate }
        },
        {
          checkIn: { $lt: checkOutDate },
          checkOut: { $gte: checkOutDate }
        },
        {
          checkIn: { $gte: checkInDate },
          checkOut: { $lte: checkOutDate }
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      available: !existingBooking,
      message: existingBooking ? 'In dates pe property booked hai' : 'Property available hai'
    });
    
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Availability check karne mai error',
      error: error.message
    });
  }
};

// ========== ADMIN ONLY FUNCTIONS ==========

// Get all bookings (Admin only)
export const getAllBookings = async (req, res) => {
  try {
    const { status, date, page = 1, limit = 50, propertyId } = req.query;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sirf admin hi sab bookings dekh sakta hai'
      });
    }
    
    // Auto-complete expired bookings
    await autoCompleteBookings();
    
    const query = {};
    
    // Filter by status
    if (status) {
      query.bookingStatus = status;
    }
    
    // Filter by property
    if (propertyId) {
      query.propertyId = propertyId;
    }
    
    // Filter by date
    if (date) {
      const filterDate = new Date(date);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.$or = [
        {
          checkIn: {
            $gte: filterDate,
            $lt: nextDay
          }
        },
        {
          checkOut: {
            $gte: filterDate,
            $lt: nextDay
          }
        }
      ];
    }
    
    const bookings = await Booking.find(query)
      .populate('userId', 'name email avatar phone')
      .populate('propertyId', 'name address images')
      .sort({ checkIn: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Booking.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Bookings fetch karne mai error',
      error: error.message
    });
  }
};

// Get today's bookings (Admin only)
export const getTodayBookings = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sirf admin hi today bookings dekh sakta hai'
      });
    }
    
    // Auto-complete expired bookings
    await autoCompleteBookings();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find bookings where check-in or check-out is today
    const bookings = await Booking.find({
      $or: [
        {
          checkIn: {
            $gte: today,
            $lt: tomorrow
          }
        },
        {
          checkOut: {
            $gte: today,
            $lt: tomorrow
          }
        }
      ]
    })
      .populate('userId', 'name email avatar phone')
      .populate('propertyId', 'name address images')
      .sort({ checkIn: 1 });
    
    res.status(200).json({
      success: true,
      data: bookings,
      count: bookings.length
    });
    
  } catch (error) {
    console.error('Get today bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Today bookings fetch karne mai error',
      error: error.message
    });
  }
};

// Get upcoming bookings (Admin only)
export const getUpcomingBookings = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sirf admin hi upcoming bookings dekh sakta hai'
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bookings = await Booking.find({
      checkIn: { $gt: today },
      bookingStatus: { $in: ['confirmed', 'pending'] }
    })
      .populate('userId', 'name email avatar phone')
      .populate('propertyId', 'name address images')
      .sort({ checkIn: 1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: bookings,
      count: bookings.length
    });
    
  } catch (error) {
    console.error('Get upcoming bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Upcoming bookings fetch karne mai error',
      error: error.message
    });
  }
};

// Get booking statistics (Admin only)
export const getBookingStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sirf admin stats dekh sakta hai'
      });
    }
    
    // Auto-complete expired bookings
    await autoCompleteBookings();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalBookings,
      confirmedBookings,
      pendingBookings,
      todayCheckIns,
      todayCheckOuts,
      upcomingBookings
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ bookingStatus: 'confirmed' }),
      Booking.countDocuments({ bookingStatus: 'pending' }),
      Booking.countDocuments({
        checkIn: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      }),
      Booking.countDocuments({
        checkOut: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      }),
      Booking.countDocuments({
        checkIn: { $gt: today },
        bookingStatus: { $in: ['confirmed', 'pending'] }
      })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        todayCheckIns,
        todayCheckOuts,
        upcomingBookings
      }
    });
    
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Stats fetch karne mai error',
      error: error.message
    });
  }
};