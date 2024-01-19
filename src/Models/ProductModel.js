import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    _id:{
        type: String,
    },
    isLiked:{
        type: Boolean,
    },
    heading: {
        type: String,
        required: true,
    },
    altText: [{
        type: String,
        required: true,
    }],
    oldPrice: {
        type: String,
    },
    price: {
        type: String,
        required: true,
    },
    inStock: {
        type: Boolean,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    imagePath: [
        {
            type: String,
            required: true,
        },
    ],
    properties: [
        {
            key: {
                type: String,
                required: true,
            },
            value: {
                type: String,
                required: true,
            },
        },
    ],
});

const ProductModel = mongoose.model('Product', productSchema);

export default ProductModel;