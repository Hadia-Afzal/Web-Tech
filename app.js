const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'lab-final-secret-key-2025',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        secure: false 
    }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_lab_final';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        console.log('📝 Using in-memory storage for demo purposes');
    });

// Import middleware and routes
const applyDiscount = require('./middleware/applyDiscount');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Routes
app.use('/', orderRoutes);
app.use('/admin', adminRoutes);

// Home page
app.get('/', (req, res) => {
    // Initialize cart if not exists
    if (!req.session.cart) {
        req.session.cart = {
            items: [],
            subtotal: 0,
            total: 0,
            discount: 0,
            discountCode: null
        };
    }
    
    res.render('index', {
        title: 'BeCallCenter - Premium Services',
        cart: req.session.cart
    });
});

// Products page (sample products)
app.get('/products', (req, res) => {
    const products = [
        { id: 1, name: 'Sales Support Package', price: 199.00, description: 'Professional sales team support' },
        { id: 2, name: 'Advertising Campaigns', price: 299.00, description: 'Complete campaign management' },
        { id: 3, name: '24/7 Help Desk', price: 149.00, description: 'Round-the-clock customer support' },
        { id: 4, name: 'Analytics Dashboard', price: 50.00, description: 'Performance tracking & insights' },
        { id: 5, name: 'Inbound Call Handling', price: 179.00, description: 'Professional call management' },
        { id: 6, name: 'Multi-Channel Support', price: 249.00, description: 'Unified customer support' }
    ];
    
    res.render('products', {
        title: 'Our Services - BeCallCenter',
        products: products,
        cart: req.session.cart
    });
});

// Add to cart route
app.post('/cart/add', (req, res) => {
    const { productId, name, price, quantity } = req.body;
    
    if (!req.session.cart) {
        req.session.cart = {
            items: [],
            subtotal: 0,
            total: 0,
            discount: 0,
            discountCode: null
        };
    }
    
    const cart = req.session.cart;
    const existingItem = cart.items.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += parseInt(quantity) || 1;
        existingItem.total = existingItem.price * existingItem.quantity;
    } else {
        const itemQty = parseInt(quantity) || 1;
        cart.items.push({
            productId,
            name,
            price: parseFloat(price),
            quantity: itemQty,
            total: parseFloat(price) * itemQty
        });
    }
    
    // Recalculate totals
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    
    // Apply any existing discount
    if (cart.discountCode === 'SAVE10') {
        cart.discount = cart.subtotal * 0.1;
        cart.total = cart.subtotal - cart.discount;
    } else {
        cart.discount = 0;
        cart.total = cart.subtotal;
    }
    
    res.redirect('/cart');
});

// Cart page
app.get('/cart', (req, res) => {
    const cart = req.session.cart || { items: [], subtotal: 0, total: 0 };
    
    res.render('cart', {
        title: 'Shopping Cart',
        cart: cart
    });
});

// Remove from cart
app.post('/cart/remove/:productId', (req, res) => {
    const { productId } = req.params;
    
    if (req.session.cart) {
        req.session.cart.items = req.session.cart.items.filter(item => item.productId !== productId);
        
        // Recalculate totals
        const cart = req.session.cart;
        cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
        
        if (cart.discountCode === 'SAVE10') {
            cart.discount = cart.subtotal * 0.1;
            cart.total = cart.subtotal - cart.discount;
        } else {
            cart.discount = 0;
            cart.total = cart.subtotal;
        }
    }
    
    res.redirect('/cart');
});

// Clear cart
app.post('/cart/clear', (req, res) => {
    req.session.cart = {
        items: [],
        subtotal: 0,
        total: 0,
        discount: 0,
        discountCode: null
    };
    
    res.redirect('/cart');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Order Preview: http://localhost:${PORT}/order/preview`);
    console.log(`📝 My Orders: http://localhost:${PORT}/my-orders`);
    console.log(`👑 Admin Orders: http://localhost:${PORT}/admin/orders?admin=true`);
});