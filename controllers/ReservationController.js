import Reservation from "../models/reservationModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkAvailability = asyncHandler(async (req, res) => {
  const { checkInDate, checkOutDate } = req.body;

  if (!checkInDate || !checkOutDate) {
    throw {
      statusCode: 400,
      message: "Check-in or check-out dates are important",
    };
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  // Validate dates
  if (checkOut <= checkIn) {
    throw {
      statusCode: 400,
      message: "Your date is not valid please enter a valid date",
    };
  }

  const isAvailable = await Reservation.checkAvailability(checkIn, checkOut);

  res.status(200).json({
    success: true,
    available: isAvailable,
    message: isAvailable ? "Property is available" : "Property already booked",
  });
});

export const create = asyncHandler(async (req, res) => {
  const {
    userId,
    userName,
    userEmail,
    userPhone,
    checkInDate,
    checkOutDate,
    numberOfGuests,
    pricePerNight,
    propertyAddress,
    specialRequests,
  } = req.body;

  // Validate required fields
  if (
    !userId ||
    !userName ||
    !userEmail ||
    !userPhone ||
    !checkInDate ||
    !checkOutDate ||
    !numberOfGuests ||
    !pricePerNight
  ) {
    throw {
      statusCode: 400,
      message: "please enter a required fields",
    };
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  // Check availability
  const isAvailable = await Reservation.checkAvailability(checkIn, checkOut);

  if (!isAvailable) {
    throw {
      statusCode: 400,
      message: "Property already booked",
    };
  }

  // Calculate nights and total price
  const diffTime = Math.abs(checkOut - checkIn);
  const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const totalPrice = numberOfNights * pricePerNight;

  // Create reservation
  const reservation = new Reservation({
    userId,
    userName,
    userEmail,
    userPhone,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests,
    numberOfNights,
    pricePerNight,
    totalPrice,
    propertyAddress: propertyAddress || "Main Property Address",
    specialRequests: specialRequests || "",
    paymentStatus: "pending",
    reservationStatus: "pending",
  });

  await reservation.save();

  res.status(201).json({
    success: true,
    message: "Reservation successfully created",
    reservation,
  });
});

export const allReservations = asyncHandler(async (req, res) => {
  const { status, paymentStatus, page = 1, limit = 10 } = req.query;

  const query = {};

  if (status) {
    query.reservationStatus = status;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  const skip = (page - 1) * limit;

  const reservations = await Reservation.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("userId", "name email");

  const total = await Reservation.countDocuments(query);

  res.status(200).json({
    success: true,
    reservations,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

export const getUserReservations = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  const reservations = await Reservation.find({ userId: _id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    reservations,
  });
});
