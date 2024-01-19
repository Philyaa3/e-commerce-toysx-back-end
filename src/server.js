import express from 'express';
import path, {dirname, join} from 'path';
import cors from "cors";
import dotenv from 'dotenv';
import connectDatabase from "./Config/MongoDB.js";
import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/authRoutes.js";
import propertiesRoute from "./Routes/PropertiesRoute.js";
import {fileURLToPath} from "url";

dotenv.config();
connectDatabase();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({origin: "*"}))
// Get the current module file path
const __filename = fileURLToPath(import.meta.url);
// Get the current module directory name
const __dirname = dirname(__filename);
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', propertiesRoute);

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});