import express from 'express';
import ProductModel from '../models/ProductModel.js';
import requireAuth from "../Middlewares/authMiddleware.js";
import multer from "multer";
import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/uploads/itemImages/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({
    storage: storage,
});

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await ProductModel.find();
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
    try {
        console.log('Received id:', req.params.id);

        // Check if req.params.id is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid ObjectId' });
        }
        const product = await ProductModel.findOne({ _id: req.params.id });

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



// Add a new product
router.post('/', requireAuth, upload.array('imagePath', 5), async (req, res) => {
    try {
        console.log('Request Body:', req.body);  // Log the request body
        const { heading, altText, oldPrice, price, inStock, category, properties } = req.body;
        const imagePath = req.files.map(file => `/uploads/itemImages/${file.filename}`);
        const receivedProperties = JSON.parse(req.body.properties);

        const newProduct = new ProductModel({
            _id: uuidv4(),
            heading,
            altText,
            oldPrice,
            price,
            inStock,
            category,
            properties: receivedProperties,
            imagePath,
        });

        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        if (error instanceof multer.MulterError) {
            console.error('Multer Error:', error);
            res.status(400).send('Bad Request');
        } else {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }
});


// Update a product by ID
router.put('/:id', requireAuth, async (req, res) => {
    try {
        // Check if req.params.id is not a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }

        const updatedProduct = await ProductModel.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        if (!updatedProduct) {
            // Handle the case where the product is not found
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



// Delete a product by ID
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const deletedProduct = await ProductModel.findByIdAndRemove(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;