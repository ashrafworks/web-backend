import express from 'express';
import { allUsers, getUser } from '../controllers/UserController.js';
import { authorizeAdmim, checkAuth } from '../middlewares/authMiddleware.js';


const router = express.Router(); 

router.post('/user', checkAuth, getUser);
router.post('/all-users', checkAuth, authorizeAdmim, allUsers);


export default router;
