import express from 'express';
import User from "../Models/UserModel.js";

const preferenceRouter = express.Router();

function determineInterestType(heading) {
    // Проверяем, существует ли строка названия продукта
    if (!heading) {
        return null;
    }

    // Разбиваем строку названия продукта на слова
    const words = heading.split(' ');

    // Берем первое слово из названия продукта в качестве типа интереса
    const interestType = words[0].trim();

    return interestType;
}

function calculatePriceRange(price) {
    // Проверяем, существует ли строка цены
    if (!price) {
        return null;
    }

    // Преобразуем строку цены в число
    const priceValue = parseFloat(price.trim());

    // Возвращаем это число
    return { min: priceValue, max: priceValue };
}

preferenceRouter.post('/category', async (req, res) => {
    try {
        const {email, category} = req.body;

        // Находим пользователя в базе данных
        const user = await User.findOne({email});
        // Обновляем предпочтения пользователя
        const categoryPreference = user.preference.categoryPreference;
        if (categoryPreference.has(category)) {
            categoryPreference.set(category, categoryPreference.get(category) + 1);
        } else {
            categoryPreference.set(category, 1);
        }

        await user.save();

        res.status(200).json({success: true, message: 'Category preferences updated successfully.'});
    } catch (error) {
        console.error('Error updating category preferences:', error);
        res.status(500).json({success: false, message: 'Internal server error.'});
    }
});
preferenceRouter.post('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {email, altText, price, heading} = req.body;

        // Определение диапазона цен
        const priceRange = calculatePriceRange(price);

        // Определение типа интереса (interestType)
        const interestType = determineInterestType(heading);

        // Находим пользователя в базе данных
        const user = await User.findOne({email});

        // Проверяем, существует ли такой altText в ProductPreference
        const productPreference = user.preference.productPreference;
        const existingProduct = productPreference.find(product => product.altText === altText);

        // Если altText уже существует, обновляем данные
        if (existingProduct) {
            existingProduct.visitCount++;
            if (priceRange) {
                existingProduct.priceRange = priceRange;
            }
            if (interestType) {
                existingProduct.interestType = interestType;
            }
        } else {
            // Если altText не существует, создаем новую запись в ProductPreference
            productPreference.push({
                altText,
                visitCount: 1,
                priceRange: priceRange || {min: 0, max: 0},
                interestType: interestType || ''
            });
        }

        // Сохраняем обновленные предпочтения пользователя
        await user.save();

        res.status(200).json({success: true, message: 'Product preference updated successfully.'});
    } catch (error) {
        console.error('Error updating product preference:', error);
        res.status(500).json({success: false, message: 'Internal server error.'});
    }
});

export default preferenceRouter;
