const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Adjust the path to your database configuration file

// Add product to cart
router.post('/add', async (req, res) => {
    try {
        const userId = req.userId; // Use userId from the session set in auth.js
        const { productId, quantity } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
        }

        const connection = await pool.getConnection();

        // Check if product exists
        const [product] = await connection.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (!product || product.length === 0) {
            connection.release();
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check if user already has a cart
        const [cart] = await connection.query('SELECT * FROM carts WHERE user_id = ?', [userId]);

        let cartId;
        if (!cart || cart.length === 0) {
            // Create new cart if it doesn't exist
            const [newCart] = await connection.query(
                'INSERT INTO carts (user_id) VALUES (?)',
                [userId]
            );
            cartId = newCart.insertId;
        } else {
            cartId = cart[0].id;
        }

        // Check if product already exists in cart
        const [cartItem] = await connection.query(
            'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [cartId, productId]
        );

        if (cartItem && cartItem.length > 0) {
            // Update quantity if product exists
            await connection.query(
                'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
                [quantity, cartItem[0].id]
            );
        } else {
            // Add new product to cart
            await connection.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
                [cartId, productId, quantity]
            );
        }

        connection.release();
        res.json({ success: true, message: 'Product added to cart' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ success: false, message: 'Failed to add product to cart' });
    }
});

// Get cart items with product details
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
        }

        const connection = await pool.getConnection();

        // Get cart items with product details
        const [cartItems] = await connection.query(`
            SELECT ci.id, ci.quantity, p.*, pi.image_url
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = ?)
        `, [userId]);

        connection.release();

        if (!cartItems || cartItems.length === 0) {
            return res.json({ success: true, cart: [] });
        }

        res.json({ success: true, cart: cartItems });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch cart' });
    }
});

// Update product quantity in cart
router.post('/update', async (req, res) => {
    try {
        const userId = req.userId;
        const { productId, change } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
        }

        const connection = await pool.getConnection();

        // Get the cart item
        const [cartItem] = await connection.query(`
            SELECT ci.*
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = ? AND ci.product_id = ?
        `, [userId, productId]);

        if (!cartItem || cartItem.length === 0) {
            connection.release();
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        // Update quantity
        const newQuantity = cartItem[0].quantity + change;

        if (newQuantity <= 0) {
            // Remove item if quantity is 0 or less
            await connection.query('DELETE FROM cart_items WHERE id = ?', [cartItem[0].id]);
        } else {
            // Update quantity
            await connection.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQuantity, cartItem[0].id]);
        }

        connection.release();
        res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Failed to update cart' });
    }
});

// Remove product from cart
router.post('/remove', async (req, res) => {
    try {
        const userId = req.userId;
        const { productId } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
        }

        const connection = await pool.getConnection();

        // Remove product from cart
        await connection.query(`
            DELETE ci FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = ? AND ci.product_id = ?
        `, [userId, productId]);

        connection.release();
        res.json({ success: true, message: 'Product removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, message: 'Failed to remove product from cart' });
    }
});

// Get cart item count
router.get('/count', async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
        }

        const connection = await pool.getConnection();

        // Get cart item count
        const [countResult] = await connection.query(`
            SELECT SUM(ci.quantity) as count
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = ?
        `, [userId]);

        connection.release();

        const count = countResult[0].count || 0;
        res.json({ success: true, count });
    } catch (error) {
        console.error('Error getting cart count:', error);
        res.status(500).json({ success: false, message: 'Failed to get cart count' });
    }
});

module.exports = router;
