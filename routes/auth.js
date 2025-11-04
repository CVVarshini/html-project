const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// MySQL Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Duvijaa18@mepco',
    database: 'farmconnect',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// -------------------- Middleware --------------------
function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    next();
}


// Signup Route
router.post('/signup', async (req, res) => {
    const { name, email, phone, password, district } = req.body;
    if (!name || !email || !phone || !password || !district) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ? OR phone = ?',
            [email, phone]
        );
        if (users.length > 0) {
            return res.status(400).json({ success: false, message: 'Email or phone already exists' });
        }
        await connection.query(
            'INSERT INTO users (full_name, email, phone, password, district) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, password, district]
        );
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ? AND password = ?',
            [email, password]
        );
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }
        const user = users[0];
        req.session.userId = user.user_id;
        req.session.userName = user.full_name;
        req.session.userEmail = user.email;
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.user_id,
                name: user.full_name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Logout Route
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    });
});

// API to get user info + user's products with images (for dashboard)
router.get('/api/user', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userId = req.session.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        const [userRows] = await connection.query(
            'SELECT user_id, full_name, email, phone, district FROM users WHERE user_id = ?',
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];
        const [products] = await connection.query(
            'SELECT id, product_name, price, quantity, role, description FROM products WHERE user_id = ? ORDER BY id DESC',
            [userId]
        );
        for (let product of products) {
            const [images] = await connection.query(
                'SELECT image_url FROM product_images WHERE product_id = ?',
                [product.id]
            );
            product.images = images.map(img => img.image_url);
        }
        res.json({ success: true, user, products });
    } catch (error) {
        console.error('Error in /api/user:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// API to get all products (for home page)
router.get('/api/products/all', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [products] = await connection.query(`
            SELECT
                p.id, p.product_name, p.price, p.quantity, p.role, p.description,
                u.full_name as user_name, u.user_id as user_id
            FROM products p
            JOIN users u ON p.user_id = u.user_id
            ORDER BY p.id DESC
        `);
        for (let product of products) {
            const [images] = await connection.query(
                'SELECT image_url FROM product_images WHERE product_id = ?',
                [product.id]
            );
            product.images = images.map(img => img.image_url);
        }
        res.json({ success: true, products });
    } catch (error) {
        console.error('Error in /api/products/all:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Dashboard Route (for backward compatibility)
router.get('/dashboard', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userId = req.session.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        const [userRows] = await connection.query(
            'SELECT user_id, full_name, email, phone, district FROM users WHERE user_id = ?',
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];
        const [products] = await connection.query(
            'SELECT id, product_name, price, quantity, role, description FROM products WHERE user_id = ? ORDER BY id DESC',
            [userId]
        );
        for (let product of products) {
            const [images] = await connection.query(
                'SELECT image_url FROM product_images WHERE product_id = ?',
                [product.id]
            );
            product.images = images.map(img => img.image_url);
        }
        res.json({ success: true, user, products });
    } catch (error) {
        console.error('Error in /dashboard:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Change Password Route
router.post('/api/auth/change-password', requireLogin, async (req, res) => {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
        return res.status(400).json({ success: false, message: 'Both fields are required' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const [users] = await connection.query('SELECT * FROM users WHERE user_id = ?', [req.session.userId]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        const user = users[0];

        if (user.password !== old_password) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }
        if (user.password === new_password) {
            return res.status(400).json({ success: false, message: 'New password cannot be same as old password' });
        }

        await connection.query('UPDATE users SET password = ? WHERE user_id = ?', [new_password, req.session.userId]);
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    } finally {
        if (connection) connection.release();
    }
});


// Cart Routes
// Add product to cart
router.post('/api/cart/add', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const userId = req.session.userId;
    const { productId, quantity } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [product] = await connection.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (!product || product.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const [cart] = await connection.query('SELECT * FROM carts WHERE user_id = ?', [userId]);
        let cartId;
        if (!cart || cart.length === 0) {
            const [newCart] = await connection.query(
                'INSERT INTO carts (user_id) VALUES (?)',
                [userId]
            );
            cartId = newCart.insertId;
        } else {
            cartId = cart[0].id;
        }
        const [cartItem] = await connection.query(
            'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [cartId, productId]
        );
        if (cartItem && cartItem.length > 0) {
            await connection.query(
                'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
                [quantity, cartItem[0].id]
            );
        } else {
            await connection.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
                [cartId, productId, quantity]
            );
        }
        res.json({ success: true, message: 'Product added to cart' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ success: false, message: 'Failed to add product to cart' });
    } finally {
        if (connection) connection.release();
    }
});

// Get cart items with product details
router.get('/api/cart', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const userId = req.session.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        const [cartItems] = await connection.query(
            `SELECT
                ci.id AS cart_item_id,
                ci.quantity,
                p.id AS product_id,
                p.product_name,
                p.price,
                p.quantity AS product_quantity,
                u.user_id,
                u.full_name AS user_name,
                pi.image_url
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             JOIN users u ON p.user_id = u.user_id
             LEFT JOIN product_images pi ON p.id = pi.product_id
             WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = ?)`,
            [userId]
        );
        if (!cartItems || cartItems.length === 0) {
            return res.json({ success: true, cart: [] });
        }
        res.json({ success: true, cart: cartItems });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch cart' });
    } finally {
        if (connection) connection.release();
    }
});

// Update product quantity in cart
router.post('/api/cart/update', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const userId = req.session.userId;
    const { productId, change } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [cartItem] = await connection.query(`
            SELECT ci.*
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = ? AND ci.product_id = ?
        `, [userId, productId]);
        if (!cartItem || cartItem.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }
        const newQuantity = cartItem[0].quantity + change;
        if (newQuantity <= 0) {
            await connection.query('DELETE FROM cart_items WHERE id = ?', [cartItem[0].id]);
        } else {
            await connection.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQuantity, cartItem[0].id]);
        }
        res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Failed to update cart' });
    } finally {
        if (connection) connection.release();
    }
});

// Remove product from cart
router.post('/api/cart/remove', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const userId = req.session.userId;
    const { cartItemId } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query(
            'DELETE FROM cart_items WHERE id = ?',
            [cartItemId]
        );
        res.json({ success: true, message: 'Product removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, message: 'Failed to remove product from cart' });
    } finally {
        if (connection) connection.release();
    }
});

// Get cart item count
router.get('/api/cart/count', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const userId = req.session.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        const [countResult] = await connection.query(`
            SELECT SUM(ci.quantity) as count
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = ?
        `, [userId]);
        const count = countResult[0].count || 0;
        res.json({ success: true, count });
    } catch (error) {
        console.error('Error getting cart count:', error);
        res.status(500).json({ success: false, message: 'Failed to get cart count' });
    } finally {
        if (connection) connection.release();
    }
});

// Place Order Route
router.post('/api/orders/place', requireLogin, async (req, res) => {
  const { productId, quantity, fullName, phone, address, paymentMethod } = req.body;
  const userId = req.session.userId;

  if (!productId || !quantity || !fullName || !phone || !address || !paymentMethod) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Start transaction

    // 1. Check if product exists and has enough quantity
    const [productRows] = await connection.query(
      'SELECT * FROM products WHERE id = ? FOR UPDATE', // Lock row for update
      [productId]
    );
    if (productRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const product = productRows[0];
    if (product.quantity < quantity) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Insufficient product quantity' });
    }

    // 2. Calculate total
    const total = product.price * quantity;

    // 3. Create order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, created_at, status, total, address) VALUES (?, NOW(), ?, ?, ?)',
  [userId, 'pending', total, address]
    );
    const orderId = orderResult.insertId;

    // 4. Add product to order_products
    await connection.query(
      'INSERT INTO order_products (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [orderId, productId, quantity, product.price]
    );

    // 5. Reduce product quantity
    await connection.query(
      'UPDATE products SET quantity = quantity - ? WHERE id = ?',
      [quantity, productId]
    );

    // 6. Notify seller
    await connection.query(
  'INSERT INTO notifications (user_id, message, order_id) VALUES (?, ?, ?)',
  [
    product.user_id,
    `Your product "${product.product_name}" was purchased by ${fullName}. Quantity: ${quantity}Kg. Total: ₹${total}.`,
    orderId // Make sure you have the orderId available here
  ]
);


    await connection.commit(); // Commit transaction
    res.json({ success: true, message: 'Order placed successfully', orderId });
  } catch (error) {
    if (connection) await connection.rollback(); // Rollback on error
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});


// API to get a single product by ID (for checkout)
router.get('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    let connection;
    try {
        connection = await pool.getConnection();
        const [productRows] = await connection.query(
            `SELECT
                p.id, p.product_name, p.price, p.quantity, p.role, p.description,
                u.full_name as user_name, u.user_id as user_id
            FROM products p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.id = ?`,
            [productId]
        );
        if (productRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const product = productRows[0];
        const [images] = await connection.query(
            'SELECT image_url FROM product_images WHERE product_id = ?',
            [productId]
        );
        product.images = images.map(img => img.image_url);
        res.json({ success: true, product });
    } catch (error) {
        console.error('Error in /api/products/:id:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});
// API to get user's orders
router.get('/api/orders', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    const [orders] = await connection.query(
      `SELECT
          o.id, o.created_at, o.status, o.total, o.address,
          op.product_id, op.quantity, op.price,
          p.product_name, p.description,
          pi.image_url as product_image
      FROM orders o
      JOIN order_products op ON o.id = op.order_id
      JOIN products p ON op.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC`,
      [userId]
    );
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error in /api/orders:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});
// API to get user's notifications
router.get('/api/notifications', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    const [notifications] = await connection.query(
      'SELECT * FROM notifications WHERE user_id = ? and is_read!=True ORDER BY created_at DESC',
      [userId]
    );
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Error in /api/notifications:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});
router.post('/api/notifications/mark-read', requireLogin, async (req, res) => {
  const { notificationId } = req.body;
  const userId = req.session.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    // Mark notification as read
    await connection.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    // Update the order status to 'read'
    await connection.query(
      'UPDATE orders SET status = ? WHERE id = (SELECT order_id FROM notifications WHERE id = ? AND user_id = ?)',
      ['read', notificationId, userId]
    );
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/api/bills', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const { startDate, endDate } = req.query;
  let connection;
  try {
    connection = await pool.getConnection();
    // Query to fetch orders and their products as bills
    let query = `
      SELECT
        o.id AS bill_id,
        o.created_at AS date,
        CONCAT('Order #', o.id) AS description,
        SUM(op.price * op.quantity) AS amount,
        'Order' AS category,
        o.status AS status
      FROM orders o
      JOIN order_products op ON o.id = op.order_id
      WHERE o.user_id = ?
    `;
    const params = [userId];
    if (startDate && endDate) {
      query += ' AND o.created_at BETWEEN ? AND ?';
      params.push(new Date(startDate), new Date(endDate));
    }
    query += ' GROUP BY o.id'; // Group by order to aggregate amounts
    const [bills] = await connection.query(query, params);
    res.json({ success: true, bills });
  } catch (error) {
    console.error('Error in /api/bills:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});
router.get('/api/users', async (req, res) => {
  const currentUserId = req.query.currentUser;
  if (!currentUserId) {
    return res.status(400).json({ success: false, message: 'currentUser query parameter is required' });
  }

  let connection;
  try {
    console.log('currentUserId:', currentUserId);

    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT user_id, full_name FROM users WHERE user_id != ?',
      [currentUserId]
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;


