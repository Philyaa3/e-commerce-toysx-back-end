import express from 'express';
import ProductModel from '../models/ProductModel.js';
import multer from "multer";
import mongoose from "mongoose";
import {v4 as uuidv4} from 'uuid';
import User from "../Models/UserModel.js";

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
            return res.status(400).json({message: 'Invalid ObjectId'});
        }
        const product = await ProductModel.findOne({_id: req.params.id});

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({message: 'Product not found'});
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// Add a new product
router.post('/', upload.array('imagePath', 5), async (req, res) => {
    try {
        console.log('Request Body:', req.body);  // Log the request body
        const {heading, altText, oldPrice, price, inStock, category, properties} = req.body;
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
router.put('/:id', async (req, res) => {
    try {
        // Check if req.params.id is not a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({message: 'Invalid ID'});
        }

        const updatedProduct = await ProductModel.findByIdAndUpdate(
            req.params.id,
            {$set: req.body},
            {new: true}
        );

        if (!updatedProduct) {
            // Handle the case where the product is not found
            return res.status(404).json({message: 'Product not found'});
        }

        res.json({message: 'Product updated successfully', product: updatedProduct});
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/updateIsLiked/:id', async (req, res) => {
    try {
        const {id} = req.params;
        const {isLiked} = req.body;

        // Найти продукт в базе данных по идентификатору
        const product = await ProductModel.findById(id);

        if (!product) {
            return res.status(404).json({message: 'Продукт не найден'});
        }

        // Обновить статус isLiked
        product.isLiked = isLiked;

        // Сохранить обновленный продукт
        await product.save();

        return res.status(200).json({message: 'Статус isLiked успешно обновлен'});
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Внутренняя ошибка сервера'});
    }
});


// Delete a product by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedProduct = await ProductModel.findByIdAndRemove(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({message: 'Product not found'});
        }
        res.json({message: 'Product deleted successfully'});
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Веса для каждого критерия
const weights = {
    categoryViews: 0.4,
    productViews: 0.3,
    priceRange: 0.2,
    interestType: 0.3,
};

// Эндпоинт для получения отфильтрованного массива рекомендуемых продуктов
router.get('/recommendations/:email', async (req, res) => {
    try {
        const {email} = req.params;

        // Находим пользователя в базе данных
        const user = await User.findOne({email});
        if (!user) {
            return res.status(404).json({success: false, message: 'User not found'});
        }

        // Получаем критерии для фильтрации из свойства preference
        const categoryPreference = user.preference.categoryPreference;
        const userProductPreference = user.preference.productPreference;

        // Получаем список всех продуктов
        const allProducts = await ProductModel.find();

        // Вычисляем среднее значение ценового диапазона из всех productPreference
        const priceRanges = userProductPreference.map(pref => {
            return (pref.priceRange.min + pref.priceRange.max) / 2;
        });
        const averagePriceRange = priceRanges.reduce((acc, curr) => acc + curr, 0) / priceRanges.length;
        let topCategories = [];
        let maxCounts = [0, 0]; // Массив для двух наибольших чисел

        for (const [category, count] of categoryPreference) {
            if (count > maxCounts[0]) {
                maxCounts = [count, maxCounts[0]]; // Обновляем максимальные значения
                topCategories = [category]; // Обновляем массив категорий
            } else if (count > maxCounts[1]) {
                maxCounts[1] = count; // Обновляем второе максимальное значение
                topCategories.push(category); // Добавляем категорию к массиву
            }
        }
        let maxVisitCount = 0;
        let topAltText = '';

        userProductPreference.forEach(pref => {
            if (pref.visitCount > maxVisitCount) {
                maxVisitCount = pref.visitCount;
                topAltText = pref.altText;
            }
        });

        // Фильтрация продуктов на основе критериев и вычисление MatchScore
        const recommendationProducts = allProducts.filter(product => {
            // Убираем условие topCategories.includes(product.category)
            let matchScore = 0;
            console.log('Initial matchScore:', matchScore);

            matchScore += weights.categoryViews;
            console.log('MatchScore after categoryViews:', matchScore);

            // Увеличиваем matchScore, если цена продукта находится в определенном отклонении от среднего значения ценового диапазона
            const priceRangeDeviation = 1000;
            if (Math.abs(product.price - averagePriceRange) <= priceRangeDeviation) {
                matchScore += weights.priceRange;
                console.log('Price condition met. Updated matchScore:', matchScore);
            } else {
                console.log('Price condition not met. matchScore remains:', matchScore);
            }

            // Учет типа интереса
            const interestType = product.heading.split(' ')[0];
            const userInterestTypes = userProductPreference.map(pref => pref.interestType);
            console.log('Interest type:', interestType);
            userInterestTypes.forEach(userInterestType => {
                if (interestType === userInterestType) {
                    matchScore += weights.interestType;
                    console.log('Interest type condition met for type:', userInterestType, '. Updated matchScore:', matchScore);
                } else {
                    console.log('Interest type condition not met for type:', userInterestType, '. matchScore remains:', matchScore);
                }
            });

            console.log('Product altText:', product.altText);
            console.log('Top altText:', topAltText);

            // Перебираем все значения в массиве product.altText
            product.altText.forEach(altText => {
                if (altText === topAltText) {
                    matchScore += weights.productViews;
                    console.log('AltText condition met for altText:', altText, '. Updated matchScore:', matchScore);
                } else {
                    console.log('AltText condition not met for altText:', altText, '. matchScore remains:', matchScore);
                }
            });

            // Добавляем свойство matchScore к объекту продукта
            product.matchScore = matchScore;

            // Нормализация значения
            const totalWeights = weights.categoryViews + weights.priceRange + weights.interestType + weights.productViews;
            matchScore /= totalWeights;
            console.log('Final normalized matchScore:', matchScore);

            const thresholdScore = 0.5;
            return matchScore >= thresholdScore;
        });
        recommendationProducts.sort((a, b) => b.matchScore - a.matchScore);
        res.status(200).json({success: true, recommendationProducts});
    } catch
        (error) {
        console.error('Error fetching recommendation products:', error);
        res.status(500).json({success: false, message: 'Internal server error'});
    }
});


export default router;