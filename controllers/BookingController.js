import Booking from "../models/bookingModel.js";
import Property from "../models/propertyModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  autoCompleteBookings,
  calculatePricing,
  generateBookingId,
} from "../utils/helpers.js";

// Get already booked dates for a property
export const getBookingDates = asyncHandler(async (req, res) => { 
  const { propertyId } = req.params;

  if (!propertyId) {
    const error = new Error("Property ID is required");
    error.statusCode = 400;
    throw error;
  }

  const bookings = await Booking.find({ propertyId }).select(
    "checkIn checkOut"
  );

  // Generate all dates between checkIn and checkOut for each booking
  const bookedDates = [];

  bookings.forEach((booking) => {
    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      bookedDates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
  });

  return res.status(200).json({
    success: true,
    data: { bookedDates },
  });
});

// Create new booking
export const createBooking = asyncHandler(async (req, res) => {
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
    lastFourDigits,
  } = req.body;

  // Validate required fields
  if (
    !propertyId ||
    !checkIn ||
    !checkOut ||
    !totalGuests ||
    !adults ||
    !contactInfo
  ) {
    const error = new Error("Please fill all required fields");
    error.statusCode = 400;
    throw error;
  }

  // Check if property exists
  const property = await Property.findById(propertyId);
  if (!property) {
    const error = new Error("Property not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if dates are valid
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkInDate < today) {
    const error = new Error("Check-in date cannot be in the past");
    error.statusCode = 400;
    throw error;
  }

  if (checkOutDate <= checkInDate) {
    const error = new Error("Check-out date must be after check-in date");
    error.statusCode = 400;
    throw error;
  }

  // Check if property is already booked for these dates
  const existingBooking = await Booking.findOne({
    propertyId,
    bookingStatus: { $in: ["pending", "confirmed"] },
    $or: [
      {
        checkIn: { $lte: checkInDate },
        checkOut: { $gt: checkInDate },
      },
      {
        checkIn: { $lt: checkOutDate },
        checkOut: { $gte: checkOutDate },
      },
      {
        checkIn: { $gte: checkInDate },
        checkOut: { $lte: checkOutDate },
      },
    ],
  });

  if (existingBooking) {
    const error = new Error(
      "This property is already booked for the selected dates"
    );
    error.statusCode = 409;
    throw error;
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
      paymentStatus: "succeeded",
      lastFourDigits: lastFourDigits || "4242",
      paymentDate: new Date(),
    },
    bookingStatus: "confirmed",
    messageToHost: messageToHost || "",
    bookingId,
  });

  // Populate property and user details
  await booking.populate("propertyId", "name address images pricePerNight");
  await booking.populate("userId", "name email avatar");

  res.status(201).json({
    success: true,
    message: "Booking has been successfully created!",
    data: {
      bookingId: booking.bookingId,
      booking,
    },
  });
});

// Get user's all bookings
export const getUserBookings = asyncHandler(async (req, res) => {
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
    .populate("propertyId", "name address images pricePerNight")
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
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single booking by bookingId
export const getBookingById = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  if (!bookingId) {
    const error = new Error("Booking ID is required");
    error.statusCode = 400;
    throw error;
  }

  // Auto-complete if needed
  await autoCompleteBookings();

  let booking;

  // Admin can view any booking, user can only view their own
  if (userRole === "admin") {
    booking = await Booking.findOne({ bookingId })
      .populate("propertyId", "name address images pricePerNight host")
      .populate("userId", "name email avatar phone");
  } else {
    booking = await Booking.findOne({ bookingId, userId })
      .populate("propertyId", "name address images pricePerNight")
      .populate("userId", "name email avatar phone");
  }

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// Cancel booking (User can cancel their own, Admin can cancel any)
export const cancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  if (!bookingId) {
    const error = new Error("Booking ID is required");
    error.statusCode = 400;
    throw error;
  }

  let booking;

  // Admin can cancel any booking, user can only cancel their own
  if (userRole === "admin") {
    booking = await Booking.findOne({ bookingId });
  } else {
    booking = await Booking.findOne({ bookingId, userId });
  }

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if booking can be cancelled (only for users, admin can always cancel)
  if (userRole !== "admin" && !booking.canBeCancelled()) {
    const error = new Error(
      "This booking cannot be cancelled (less than 24 hours left before check-in or it is already cancelled)"
    );
    error.statusCode = 400;
    throw error;
  }

  // Check if already cancelled
  if (booking.bookingStatus === "cancelled") {
    const error = new Error("This booking is already cancelled");
    error.statusCode = 400;
    throw error;
  }

  booking.bookingStatus = "cancelled";
  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Booking has been cancelled successfully",
    data: booking,
  });
});

// Get property bookings (for property owners)
export const getPropertyBookings = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;
  const userId = req.user._id;

  if (!propertyId) {
    const error = new Error("Property ID is required");
    error.statusCode = 400;
    throw error;
  }

  // Auto-complete expired bookings
  await autoCompleteBookings();

  // Check if property exists
  const property = await Property.findById(propertyId);
  if (!property) {
    const error = new Error("Property not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if user owns this property
  if (property.host.toString() !== userId.toString()) {
    const error = new Error("You do not own this property");
    error.statusCode = 403;
    throw error;
  }

  const bookings = await Booking.find({ propertyId })
    .populate("userId", "name email avatar phone")
    .sort({ checkIn: -1 });

  return res.status(200).json({
    success: true,
    data: bookings,
  });
});

// Check availability for dates
export const checkAvailability = asyncHandler(async (req, res) => {
  const { propertyId, checkIn, checkOut } = req.query;

  if (!propertyId || !checkIn || !checkOut) {
    const error = new Error(
      "PropertyId, check-in, and check-out are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // Validate dates
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    const error = new Error("Invalid date format");
    error.statusCode = 400;
    throw error;
  }

  if (checkOutDate <= checkInDate) {
    const error = new Error("Check-out date must be after check-in date");
    error.statusCode = 400;
    throw error;
  }

  const existingBooking = await Booking.findOne({
    propertyId,
    bookingStatus: { $in: ["pending", "confirmed"] },
    $or: [
      {
        checkIn: { $lte: checkInDate },
        checkOut: { $gt: checkInDate },
      },
      {
        checkIn: { $lt: checkOutDate },
        checkOut: { $gte: checkOutDate },
      },
      {
        checkIn: { $gte: checkInDate },
        checkOut: { $lte: checkOutDate },
      },
    ],
  });

  return res.status(200).json({
    success: true,
    available: !existingBooking,
    message: existingBooking
      ? "Property is booked for the selected dates"
      : "Property is available",
  });
});

// ========== ADMIN ONLY FUNCTIONS ==========

// Get all bookings (Admin only)
export const getAllBookings = asyncHandler(async (req, res) => {
  const { status, date, page = 1, limit = 50, propertyId } = req.query;

  // Check if user is admin
  if (req.user.role !== "admin") {
    const error = new Error("Only admin can view all bookings");
    error.statusCode = 403;
    throw error;
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
    
    if (isNaN(filterDate.getTime())) {
      const error = new Error("Invalid date format");
      error.statusCode = 400;
      throw error;
    }

    const nextDay = new Date(filterDate);
    nextDay.setDate(nextDay.getDate() + 1);

    query.$or = [
      {
        checkIn: {
          $gte: filterDate,
          $lt: nextDay,
        },
      },
      {
        checkOut: {
          $gte: filterDate,
          $lt: nextDay,
        },
      },
    ];
  }

  const bookings = await Booking.find(query)
    .populate("userId", "name email avatar phone")
    .populate("propertyId", "name address images")
    .sort({ checkIn: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Booking.countDocuments(query);

  return res.status(200).json({
    success: true,
    data: bookings,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get today's bookings (Admin only)
export const getTodayBookings = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    const error = new Error("Only admin can view today's bookings");
    error.statusCode = 403;
    throw error;
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
          $lt: tomorrow,
        },
      },
      {
        checkOut: {
          $gte: today,
          $lt: tomorrow,
        },
      },
    ],
  })
    .populate("userId", "name email avatar phone")
    .populate("propertyId", "name address images")
    .sort({ checkIn: 1 });

  res.status(200).json({
    success: true,
    data: bookings,
    count: bookings.length,
  });
});

// Get upcoming bookings (Admin only)
export const getUpcomingBookings = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    const error = new Error("Only admin can view upcoming bookings");
    error.statusCode = 403;
    throw error;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await Booking.find({
    checkIn: { $gt: today },
    bookingStatus: { $in: ["confirmed", "pending"] },
  })
    .populate("userId", "name email avatar phone")
    .populate("propertyId", "name address images")
    .sort({ checkIn: 1 })
    .limit(50);

  return res.status(200).json({
    success: true,
    data: bookings,
    count: bookings.length,
  });
});

// Get booking statistics (Admin only)
export const getBookingStats = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    const error = new Error("Only admin can view booking statistics");
    error.statusCode = 403;
    throw error;
  }

  // Auto-complete expired bookings
  await autoCompleteBookings();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    todayCheckIns,
    todayCheckOuts,
    upcomingBookings,
  ] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ bookingStatus: "confirmed" }),
    Booking.countDocuments({ bookingStatus: "cancelled" }),
    Booking.countDocuments({
      checkIn: {
        $gte: today,
        $lt: tomorrow,
      },
    }),
    Booking.countDocuments({
      checkOut: {
        $gte: today,
        $lt: tomorrow,
      },
    }),
    Booking.countDocuments({
      checkIn: { $gt: today },
      bookingStatus: { $in: ["confirmed", "pending"] },
    }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      todayCheckIns,
      todayCheckOuts,
      upcomingBookings,
    },
  });
});