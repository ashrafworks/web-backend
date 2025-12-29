import express from 'express';
import { allUsers, getUser } from '../controllers/UserController.js';
import { authorizeAdmim, checkAuth } from '../middlewares/authMiddleware.js';


const router = express.Router(); 

router.get('/user', checkAuth, getUser);
router.get('/all-users', checkAuth, authorizeAdmim, allUsers);


export default router;
