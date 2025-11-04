const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require("../config/db");
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer config for product images
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Add a product
router.post("/products", upload.array("images", 5), async (req, res) => {
    try {
        const { productName, price, quantity, description } = req.body;
        const userId = req.session.userId;

        // Save product details to the database
        const [result] = await pool.query(
            "INSERT INTO products (user_id, product_name, price, quantity, description) VALUES (?, ?, ?, ?, ?)",
            [userId, productName, price, quantity, description]
        );

        const productId = result.insertId;

        // Save image URLs to the database
        if (req.files && req.files.length > 0) {
            const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
            for (const url of imageUrls) {
                await pool.query(
                    "INSERT INTO product_images (product_id, image_url) VALUES (?, ?)",
                    [productId, url]
                );
            }
        }

        res.json({ success: true, message: "Product added successfully!" });
    } catch (err) {
        console.error("Error adding product:", err);
        res.status(500).json({ success: false, message: "Error adding product" });
    }
});

// Get all products
router.get("/products/all", async (req, res) => {
    try {
        const [products] = await pool.query(`
            SELECT p.*, pi.image_url
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
        `);

        // Group images by product
        const productsWithImages = products.reduce((acc, product) => {
            const existingProduct = acc.find(p => p.id === product.id);
            if (existingProduct) {
                existingProduct.images.push(product.image_url);
            } else {
                acc.push({
                    ...product,
                    images: product.image_url ? [product.image_url] : []
                });
            }
            return acc;
        }, []);

        res.json({ success: true, products: productsWithImages });
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ success: false, message: "Error fetching products" });
    }
});

module.exports = router;
