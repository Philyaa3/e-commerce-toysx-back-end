import express from 'express';
import requireAuth from "../Middlewares/authMiddleware.js";


const router = express.Router();

// Properties setting

router.get('/predefinedKeys', requireAuth, (req, res) => {
    const predefinedKeys = [
        'Color',
        'Manufacturer',
        'Size',
        'Material',
        'Weight',
        'Dimensions',
        'Country of Origin',
    ];
    res.json(predefinedKeys);
});

export default router;
