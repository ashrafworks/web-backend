import Booking from "../models/bookingModel.js";
import { asyncHandler } from "./asyncHandler.js";

export const generateBookingId = () => {
  const prefix = "BK";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};


export const calculatePricing = (
  pricePerNight,
  checkIn,
  checkOut,
  totalNightsForDiscount = 7
) => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const totalNights = Math.ceil(
    (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
  );

  const subtotal = pricePerNight * totalNights;
  const serviceFee = subtotal * 0.15; // 15% service fee

  let discount = 0;
  if (totalNights >= totalNightsForDiscount) {
    discount = subtotal * 0.1; // 10% discount for long stays
  }

  const totalAmount = subtotal + serviceFee - discount;

  return {
    pricePerNight,
    totalNights,
    subtotal: parseFloat(subtotal.toFixed(2)),
    serviceFee: parseFloat(serviceFee.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};


export const autoCompleteBookings = asyncHandler(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookingsToComplete = await Booking.updateMany(
    {
      checkOut: { $lt: today },
      bookingStatus: "confirmed",
    },
    {
      $set: { bookingStatus: "completed" },
    }
  );

  return bookingsToComplete;
});
