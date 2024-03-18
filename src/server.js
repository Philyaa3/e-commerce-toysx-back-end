import express from 'express';
import path, {dirname, join} from 'path';
import cors from "cors";
import dotenv from 'dotenv';
import connectDatabase from "./Config/MongoDB.js";
import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/authRoutes.js";
import propertiesRoute from "./Routes/PropertiesRoute.js";
import {fileURLToPath} from "url";
import preferenceRouter from "./Routes/UserPreference.js";
import session from 'express-session';
import MongoStore from 'connect-mongo';
import attachIPToSession from "./Middlewares/authMiddleware.js";

dotenv.config();
connectDatabase();

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: "*", credentials: true}));

// Get the current module file path
const __filename = fileURLToPath(import.meta.url);
// Get the current module directory name
const __dirname = dirname(__filename);

app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Session setup
const sessionOptions = {
    secret: process.env.JWT_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URL,
        ttl: 24 * 60 * 60, // Время жизни сессии в секундах (в данном случае 24 часа)
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'strict', // Set sameSite attribute
        // secure: true, // Uncomment in production for HTTPS
    }
};

app.use(session(sessionOptions));
app.use(attachIPToSession);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', propertiesRoute);
app.use('/api/user/preference', preferenceRouter);

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
