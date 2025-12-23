import express from 'express';
import { login, logout, register } from '../controllers/AuthController.js';
import { checkAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);

router.post('/login', login);
router.post('/logout', checkAuth, logout);


export default router;