import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getPropertyBookings,
  checkAvailability,
  getAllBookings,
  getTodayBookings,
  getUpcomingBookings,
  getBookingStats
} from '../controllers/BookingController.js';

import { checkAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ========== USER ROUTES ==========


router.post('/', checkAuth, createBooking);


router.get('/', checkAuth, getUserBookings);


router.get('/check-availability', checkAvailability);

router.get('/:bookingId', checkAuth, getBookingById);

router.put('/:bookingId/cancel', checkAuth, cancelBooking);

router.get('/property/:propertyId', checkAuth, getPropertyBookings);

// ========== ADMIN ROUTES ==========

router.get('/admin/all', checkAuth, getAllBookings);

router.get('/admin/today', checkAuth, getTodayBookings);

router.get('/admin/upcoming', checkAuth, getUpcomingBookings);

router.get('/admin/stats', checkAuth, getBookingStats);

export default router;