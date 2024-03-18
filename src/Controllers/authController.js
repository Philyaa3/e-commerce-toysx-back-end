import User from "../Models/UserModel.js";
import Role from "../Models/RoleModel.js";
import bcrypt from "bcryptjs";
import { serialize } from 'cookie';
import Wishlist from "../Models/WishListModel.js";
import Cart from "../Models/CartModel.js";

const generateAccessToken = (id, roles, username, email) => {
    const payload = {
        id,
        roles,
        username,
        email,
    };
    return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "1h"});
};

const getUserEmailFromRequest = (req) => {
    return req.user.email;
};

class authController {
    async registration(req, res) {
        try {
            const {username, email, password} = req.body
            const candidate = await User.findOne({email})
            if (candidate) {
                return res.status(400).json({message: "User with current username already exists"})
            }
            const hashedPassword = bcrypt.hashSync(password, 12)
            let userRole = await Role.findOne({value: "USER"});

            // Если роль не найдена, создаем роль "USER"
            if (!userRole) {
                userRole = new Role({value: "USER"});
                await userRole.save();
            }

            const user = new User({
                username,
                email,
                password: hashedPassword,
                roles: [userRole.value],
            });
            await user.save()

            // Set session cookie
            req.session.user = user;

            return res.status(200).json({
                email: user.email,
                username: user.username,
                message: "User was successfully created"
            });
        } catch (e) {
            console.error('Error during registration:', e);
            res.status(400).json({message: "Registration error"})
        }
    }

    async login(req, res) {
        try {
            const {email, password} = req.body
            const user = await User.findOne({email})
            if (!user)
                return res.status(400).json({message: "User undefined"})
            if (!bcrypt.compareSync(password, user.password))
                return res.status(401).json({message: "incorrect credentials"})

            // Set session cookie
            req.session.user = user;

            return res.json({roles: user.roles, username: user.username, email: user.email});
        } catch (e) {
            console.error('Error during login:', error);
            return res.status(400).json({message: "Login error", error: error.message});
        }
    }

    async getUser(req, res) {
        try {
            const user = req.session.user;

            res.status(200).json({
                email: user.email,
                roles: user.roles,
                createdAt: user.createdAt,
                username: user.username
            });
        } catch (e) {
            res.status(400).json({message: "Something went wrong"})
        }
    }

    async changePassword(req, res) {
        try {
            const user = req.session.user;
            const {currentPassword, newPassword} = req.body;

            if (!bcrypt.compareSync(currentPassword, user.password)) {
                return res.status(401).json({message: "Incorrect current password"});
            }

            user.password = bcrypt.hashSync(newPassword, 12);
            await user.save();

            return res.status(200).json({message: "Password updated successfully"});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: "Failed to update password"});
        }
    }

    async initializeCart(req, res) {
        try {
            const sessionId = req.sessionID;
            let cart;

            // Поиск корзины пользователя по SessionID
            cart = await Cart.findOne({ sessionId });

            // Если корзина не найдена, создаем новую
            if (!cart) {
                cart = new Cart({
                    sessionId,
                    items: []
                });
                await cart.save();

                // Сохранение корзины в сессию
                req.session.cart = cart;
            }

            // Возвращаем инициализированную корзину
            res.status(200).json({ message: 'Cart initialized successfully', cart });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to initialize cart' });
        }
    }

    async addToCart(req, res) {
        try {
            // Получение текущей корзины из сессии
            const sessionCart = req.session.cart || { items: [] };

            // Получение информации о товаре из запроса
            const { id, heading, imagePath, price, quantity, inStock } = req.body;

            // Добавление товара в корзину
            sessionCart.items.push({
                id,
                heading,
                imagePath,
                price,
                quantity,
                inStock,
            });

            // Сохранение обновленной корзины в сессию
            req.session.cart = sessionCart;

            return res.status(200).json({ success: true, message: 'Товар добавлен в корзину' });
        } catch (error) {
            console.error('Ошибка при добавлении товара в корзину:', error.message);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
    }

    async decreaseCartItem(req, res) {
        const { email, id } = req.params;
        const { quantity } = req.body;

        try {
            // Поиск пользователя по электронной почте или сессии, в зависимости от наличия электронной почты
            const user = email ? await User.findOne({ email }) : null;
            const sessionId = req.sessionID;

            // Поиск корзины пользователя
            let cart;
            if (user) {
                cart = await Cart.findOne({ email: user.email });
            } else {
                cart = await Cart.findOne({ sessionId });
            }

            if (!cart) {
                return res.status(404).json({ error: 'Корзина не найдена' });
            }

            // Найдем индекс элемента в корзине с тем же ID
            const existingItemIndex = cart.items.findIndex(item => item.id === id);

            if (existingItemIndex !== -1) {
                // Уменьшаем количество товара на 1
                cart.items[existingItemIndex].quantity -= 1;

                // Если количество становится нулевым, удаляем товар из корзины
                if (cart.items[existingItemIndex].quantity === 0) {
                    cart.items.splice(existingItemIndex, 1);
                }
            }

            await cart.save();

            res.status(200).json({ message: 'Количество товара уменьшено успешно' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при уменьшении количества товара в корзине' });
        }
    }


    async increaseCartItem(req, res) {
        const { email, id } = req.params;
        const { quantity } = req.body;

        try {
            // Поиск пользователя по электронной почте или сессии, в зависимости от наличия электронной почты
            const user = email ? await User.findOne({ email }) : null;
            const sessionId = req.sessionID;

            // Поиск корзины пользователя
            let cart;
            if (user) {
                cart = await Cart.findOne({ email: user.email });
            } else {
                cart = await Cart.findOne({ sessionId });
            }

            if (!cart) {
                return res.status(404).json({ error: 'Корзина не найдена' });
            }
            const existingItem = cart.items.find(item => item.id === id);

            if (existingItem) {
                existingItem.quantity += 1;
                await cart.save();
            }

            res.status(200).json({ message: 'Количество товара увеличено успешно' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при увеличении количества товара в корзине' });
        }
    }

    async removeFromCart(req, res) {
        const { email, id } = req.params;

        try {
            if (!email) {
                const sessionId = req.sessionID;
                let sessionCart = req.session.cart || { sessionId, items: [] };

                sessionCart.items = sessionCart.items.filter(item => item.id !== id);

                req.session.cart = sessionCart;
                return res.status(200).json({ success: true, message: 'Товар удален из корзины' });
            }

            let cart = await Cart.findOne({ email });

            if (!cart) {
                return res.status(404).json({ error: 'Корзина не найдена' });
            }

            cart.items = cart.items.filter(item => item.id !== id);
            await cart.save();

            res.status(200).json({ message: 'Товар удален из корзины успешно' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при удалении товара из корзины' });
        }
    }

    async initializeWishlist(req, res) {
        try {
            const sessionId = req.sessionID;
            let wishlist;

            // Check if the session wishlist exists
            if (req.session.wishlist) {
                wishlist = req.session.wishlist;
            } else {
                wishlist = { sessionId, items: [] };
                req.session.wishlist = wishlist;
            }

            // Return the initialized wishlist
            res.status(200).json({ message: 'Wishlist initialized successfully', wishlist });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to initialize wishlist' });
        }
    }

    async addToWishlist(req, res) {
        try {
            const sessionId = req.sessionID;
            const itemId = req.params.itemId;

            // Use session ID as wishlist identifier for unauthenticated users
            let wishlist = req.session.wishlist || { sessionId, items: [] };

            // Add the item to the wishlist
            wishlist.items.push(itemId);
            req.session.wishlist = wishlist;

            res.status(200).json({ message: 'Item added to wishlist successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to add item to wishlist' });
        }
    }

    async removeFromWishlist(req, res) {
        try {
            const sessionId = req.sessionID;
            const itemId = req.params.itemId;

            // Use session ID as wishlist identifier for unauthenticated users
            let wishlist = req.session.wishlist || { sessionId, items: [] };

            // Remove the item from the wishlist
            wishlist.items = wishlist.items.filter((item) => item.toString() !== itemId);
            req.session.wishlist = wishlist;

            res.status(200).json({ message: 'Item removed from wishlist successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to remove item from wishlist' });
        }
    }

}

export default new authController();