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
// Корзина
authRouter.get('/users/:email/cart/init', authMiddleware, controller.initializeCart);
authRouter.post('/users/:email/cart/:id', authMiddleware, controller.addToCart);
authRouter.put('/users/:email/cart/increase/:id', authMiddleware, controller.increaseCartItem);
authRouter.put('/users/:email/cart/decrease/:id', authMiddleware, controller.decreaseCartItem);
authRouter.delete('/users/:email/cart/remove/:id', authMiddleware, controller.removeFromCart);

// Список желаний
authRouter.post('/users/:userId/wishlist', authMiddleware, controller.addToWishlist);
authRouter.delete('/users/:userId/wishlist/:itemId', authMiddleware, controller.removeFromWishlist);

export default authRouter;
