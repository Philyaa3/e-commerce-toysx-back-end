import User from "../Models/UserModel.js";
import Role from "../Models/RoleModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {serialize} from 'cookie';

const generateAccessToken = (id, roles, username, email) => {
    const payload = {
        id,
        roles,
        username,
        email,
    };
    return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "1h"});
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
            return res.status(400).json({ message: "Login error", error: error.message });
        }
    }

    async getUser(req, res) {
        try {
            const email = req.params.email
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