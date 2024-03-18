import mongoose from 'mongoose';

const itemSchema = mongoose.Schema({
    id: { type: String, ref: 'Product', required: true },
    heading: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    imagePath: { type: String, required: true },
    price: { type: String, required: true },
    inStock: { type: Boolean, required: true },
}, {
    _id: false, // Disable automatic generation of _id for subdocuments
});

const cartSchema = mongoose.Schema(
    {
        email: {
            type: String,
            ref: 'User',
            required: false,
        },
        items: [itemSchema],
    },
    {
        timestamps: true,
    }
);

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
