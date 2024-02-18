import mongoose from 'mongoose';
const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        roles: [
            {
                type: String,
                ref: "Role"
            }
        ],
        cart: {
            type: String,
            ref: 'Cart',
        },
        wishlist: {
            type: String,
            ref: 'Wishlist',
        },
        preference: {
            categoryPreference: {
                type: Map,
                of: Number,
                default: {}
            },
            productPreference: [
                {
                    altText: {
                        type: String,
                        required: true
                    },
                    visitCount: {
                        type: Number,
                        default: 0
                    },
                    priceRange: {
                        min: {
                            type: Number,
                            default: 0
                        },
                        max: {
                            type: Number,
                            default: 0
                        }
                    },
                    interestType: {
                        type: String,
                        default: ''
                    }
                }
            ]
        },
    },
    {
        timestamps: true,
    }
);


const User = mongoose.model('User', userSchema);

export default User;
