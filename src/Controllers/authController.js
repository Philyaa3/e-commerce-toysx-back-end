import User from "../Models/UserModel.js";
import Role from "../Models/RoleModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {serialize} from 'cookie';
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

            // Устанавливаем токен в cookie
            const token = generateAccessToken(user._id, user.roles, user.username, user.email);
            const cookieSerialized = serialize('token', token, {
                httpOnly: true,
                maxAge: 60 * 60, // Время жизни cookie в секундах (в данном случае 1 час)
                path: '/',
                sameSite: 'strict',
                // secure: process.env.NODE_ENV === 'production', // Установите true в продакшене для HTTPS
            });

            res.setHeader('Set-Cookie', [cookieSerialized]);

            return res.status(200).json({
                token,
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

            const token = generateAccessToken(user._id, user.roles, user.username, user.email);

            // Устанавливаем токен в cookie
            const cookieSerialized = serialize('token', token, {
                httpOnly: true,
                maxAge: 60 * 60, // Время жизни cookie в секундах (в данном случае 1 час)
                path: '/',
                sameSite: 'strict',
                // secure: process.env.NODE_ENV === 'production', // Установите true в продакшене для HTTPS
            });

            res.setHeader('Set-Cookie', [cookieSerialized]);

            return res.json({token, roles: user.roles, username: user.username, email: user.email});
        } catch (e) {
            console.error('Error during login:', error);
            return res.status(400).json({message: "Login error", error: error.message});
        }
    }

    async getUser(req, res) {
        try {
            const email = getUserEmailFromRequest(req);
            const user = await User.findOne({email})

            // Устанавливаем токен в cookie
            const token = req.headers.authorization.split(' ')[1];
            const cookieSerialized = serialize('token', token, {
                httpOnly: true,
                maxAge: 60 * 60, // Время жизни cookie в секундах (в данном случае 1 час)
                path: '/',
                sameSite: 'strict',
                // secure: process.env.NODE_ENV === 'production', // Установите true в продакшене для HTTPS
            },);

            res.setHeader('Set-Cookie', [cookieSerialized]);

            res.status(200).json({
                email: user.email,
                roles: user.roles,
                createdAt: user.createdAt,
                username: user.username
            });
        } catch (e) {
            res.status(400).json({message: "Smth was wrong"})
        }
    }

    async changePassword(req, res) {
        try {
            const user = await User.findOne({email})
            const {currentPassword, newPassword} = req.body;

            if (!user) {
                return res.status(404).json({message: "User not found"});
            }

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
            const email = getUserEmailFromRequest(req);
            const user = await User.findOne({email: email});

            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            let cart;

            if (user.cart) {
                cart = await Cart.findById(user.cart);

                if (!cart) {
                    // If the cart is not found, create a new one
                    cart = new Cart({email: user.email, items: []});
                    await cart.save();
                    user.cart = cart.id;
                    await user.save();
                }
            } else {
                // If user.cart is not defined, create a new cart
                cart = new Cart({email: user.email, items: []});
                await cart.save();
                user.cart = cart.id;
                await user.save();
            }

            res.status(200).json({message: 'Cart initialized successfully', cart});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Failed to initialize cart'});
        }
    }


    async addToCart(req, res) {
        const {email, id} = req.params;
        const {heading, imagePath, price, quantity, inStock} = req.body;
        console.log('Received quantity:', quantity);

        try {
            // Поиск пользователя по email
            const user = await User.findOne({email});

            if (!user) {
                return res.status(404).json({error: 'Пользователь не найден'});
            }

            // Поиск корзины пользователя
            let cart = await Cart.findOne({email: user.email});

            // Если корзины нет, создаем новую
            if (!cart) {
                cart = new Cart({
                    email: user.email,
                    items: [],
                });
            }

            // Проверка наличия товара в корзине
            const existingItemIndex = cart.items.findIndex(item => item.id === id);

            if (existingItemIndex !== -1) {
                // Если товар уже есть в корзине, увеличиваем количество
                cart.items[existingItemIndex].quantity += quantity;
            } else {
                // Если товара нет в корзине, добавляем новый
                cart.items.push({
                    id,
                    heading,
                    imagePath,
                    price,
                    quantity,
                    inStock,
                });
            }

            // Сохраняем обновленную корзину
            await cart.save();

            res.status(200).json({success: true, message: 'Товар добавлен в корзину'});
        } catch (error) {
            console.error('Ошибка при добавлении товара в корзину:', error.message);
            res.status(500).json({error: 'Ошибка сервера'});
        }
    };

    async decreaseCartItem(req, res) {
        try {
            const {email, id} = req.params;

            const user = await User.findOne({email: email});

            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            let cart = await Cart.findOne({email: user.email});

            if (!cart) {
                return res.status(404).json({message: 'Cart not found'});
            }

            // Find the index of the item in the cart
            const existingItemIndex = cart.items.findIndex(item => item.id === id);

            if (existingItemIndex !== -1) {
                // If the item is found in the cart, decrease the quantity by 1
                cart.items[existingItemIndex].quantity -= 1;

                // If the quantity is 0, remove the item from the cart
                if (cart.items[existingItemIndex].quantity === 0) {
                    cart.items.splice(existingItemIndex, 1);
                }
            }

            await cart.save();

            res.status(200).json({message: 'Item quantity decreased successfully'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Failed to decrease item quantity in cart'});
        }
    }

    async increaseCartItem(req, res) {
        try {
            const {email, id} = req.params;

            const user = await User.findOne({email: email});

            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            let cart = await Cart.findOne({email: user.email});

            if (!cart) {
                return res.status(404).json({message: 'Cart not found'});
            }

            // Find the index of the item in the cart
            const existingItemIndex = cart.items.findIndex(item => item.id === id);

            if (existingItemIndex !== -1) {
                // If the item is found in the cart, increase the quantity by 1
                cart.items[existingItemIndex].quantity += 1;
            }

            await cart.save();

            res.status(200).json({message: 'Item quantity increased successfully'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Failed to increase item quantity in cart'});
        }
    }


    async removeFromCart(req, res) {
        try {
            const {email, id} = req.params;

            // Поиск пользователя по email
            const user = await User.findOne({email: email});

            // Если пользователь не найден, вернуть ошибку
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Поиск корзины пользователя
            let cart = await Cart.findOne({email: user.email});

            // Если корзина не найдена, вернуть ошибку
            if (!cart) {
                return res.status(404).json({message: 'Cart not found'});
            }

            // Удаление товара из корзины
            cart.items = cart.items.filter((item) => item.id !== id);
            await cart.save();

            res.status(200).json({message: 'Item removed from cart successfully'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Failed to remove item from cart'});
        }
    }

    async addToWishlist(req, res) {
        try {
            const userEmail = getUserEmailFromRequest(req);
            const itemId = req.params.itemId;

            // Поиск пользователя по email
            const user = await User.findOne({email: userEmail});

            // Если пользователь не найден, вернуть ошибку
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Поиск списка желаний пользователя
            let wishlist = await Wishlist.findById(user.wishlist);

            // Если список желаний не существует, создать новый
            if (!wishlist) {
                wishlist = new Wishlist({userId, items: []});
                await wishlist.save();
                user.wishlist = wishlist._id;
                await user.save();
            }

            // Добавление товара в список желаний
            wishlist.items.push(itemId);
            await wishlist.save();

            res.status(200).json({message: 'Item added to wishlist successfully'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Failed to add item to wishlist'});
        }
    }

    async removeFromWishlist(req, res) {
        try {
            const userEmail = getUserEmailFromRequest(req);
            const itemId = req.params.itemId;

            // Поиск пользователя по email
            const user = await User.findOne({email: userEmail});

            // Если пользователь не найден, вернуть ошибку
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Поиск списка желаний пользователя
            const wishlist = await Wishlist.findById(user.wishlist);

            // Если список желаний не найден, вернуть ошибку
            if (!wishlist) {
                return res.status(404).json({message: 'Wishlist not found'});
            }

            // Удаление товара из списка желаний
            wishlist.items = wishlist.items.filter((item) => item.toString() !== itemId);
            await wishlist.save();

            res.status(200).json({message: 'Item removed from wishlist successfully'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Failed to remove item from wishlist'});
        }
    }

    async testToken(req, res) {
        try {
            res.json("server works")
        } catch (e) {

        }
    }

    async test(req, res) {
        res.json({message: "TEST IS SUCCESSFUL"})
    }
}

export default new authController();