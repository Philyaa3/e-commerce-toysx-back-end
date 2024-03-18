import express from 'express';
import controller from "../controllers/authController.js";

const authRouter = express.Router();
// LOGIN
authRouter.post('/registration', controller.registration)
authRouter.post('/login', controller.login)
authRouter.get('/user/:email', controller.getUser)
// Корзина
authRouter.get('/users/cart/init', controller.initializeCart);
authRouter.post('/users/cart/:id', controller.initializeCart, controller.addToCart);
authRouter.put('/users/cart/increase/:id', controller.initializeCart, controller.increaseCartItem);
authRouter.put('/users/cart/decrease/:id', controller.initializeCart, controller.initializeCart, controller.decreaseCartItem);
authRouter.delete('/users/cart/remove/:id', controller.initializeCart, controller.removeFromCart);

// Список желаний
authRouter.post('/users/:userId/wishlist', controller.addToWishlist);
authRouter.delete('/users/:userId/wishlist/:itemId', controller.removeFromWishlist);

export default authRouter;
