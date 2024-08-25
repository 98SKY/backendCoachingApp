const express = require('express');
const router = express.Router();
const instituteRoutes = require('../controllers/instituteController');
const userRoutes = require('../controllers/userController')
const Routes = require('../controllers/authController');
const loginRoutes = require('../controllers/loginController');
const dashBoardRoutes = require('../controllers/dashBoard');

router.post('/login', loginRoutes.login);
// router.get('/get-user/:id', userRoutes.getUserById);
router.post('/recoverPassword', loginRoutes.recoverPassword);
router.get('/instituteName', instituteRoutes.usefulData);
router.post('/users-inInstitute', instituteRoutes.getUsersByCoachingId);
router.post('/user-profile', userRoutes.getUserData);
router.post('/detailsOfUser', userRoutes.getUserCategoryData);
router.post('/verify-otp', loginRoutes.verifyOtp);
router.post('/dashBoardCount', dashBoardRoutes.dashboardCounts);
router.post('/register', instituteRoutes.registerInstitute);
router.get('/courses', instituteRoutes.courseName);

module.exports = router;