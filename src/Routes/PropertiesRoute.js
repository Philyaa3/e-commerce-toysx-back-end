import express from 'express';


const router = express.Router();

// Properties setting

router.get('/predefinedKeys', (req, res) => {
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
