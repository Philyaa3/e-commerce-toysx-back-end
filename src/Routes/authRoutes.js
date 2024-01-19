import express from 'express';
import controller from "../controllers/authController.js";
import authMiddleware from "../Middlewares/authMiddleware.js";

const authRouter = express.Router();
// LOGIN
authRouter.post('/registration', controller.registration)
authRouter.post('/login', controller.login)
authRouter.get('/users', authMiddleware, controller.testToken)
authRouter.get('/user/:email', authMiddleware, controller.getUser)
authRouter.get('/test', controller.test)

export default authRouter;
