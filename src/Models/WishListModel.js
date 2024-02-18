import mongoose from 'mongoose';

const wishlistSchema = mongoose.Schema(
    {
        userId: {
            type: String,
            ref: 'User',
            required: true,
        },
        items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }],
    },
    {
        timestamps: true,
    }
);

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;