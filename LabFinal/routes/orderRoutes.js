const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const applyDiscount = require('../middleware/applyDiscount');

// Task 1: Order Preview Route
router.get('/order/preview', applyDiscount, (req, res) => {
    const cart = req.session.cart || { items: [], subtotal: 0, total: 0 };
    
    if (!cart.items || cart.items.length === 0) {
        req.session.error = 'Your cart is empty. Please add items before checking out.';
        return res.redirect('/cart');
    }
    
    // Calculate tax for preview
    const taxableAmount = cart.subtotal - (cart.discount || 0);
    const tax = taxableAmount * 0.08;
    const totalWithTax = taxableAmount + tax;
    
    res.render('orderPreview', {
        title: 'Order Preview - BeCallCenter',
        cart: cart,
        discount: req.discount,
        tax: tax,
        totalWithTax: totalWithTax,
        error: req.session.error,
        success: req.session.success
    });
    
    // Clear session messages
    delete req.session.error;
    delete req.session.success;
});

// Task 1: Confirm Order Route
router.post('/order/confirm', applyDiscount, async (req, res) => {
    try {
        const cart = req.session.cart;
        
        if (!cart || !cart.items || cart.items.length === 0) {
            req.session.error = 'Cannot place order: Cart is empty';
            return res.redirect('/cart');
        }
        
        const { name, email, address, phone } = req.body;
        
        // Validate required fields
        if (!name || !email || !address || !phone) {
            req.session.error = 'Please fill all customer information fields';
            return res.redirect('/order/preview');
        }
        
        // Calculate final totals
        const taxableAmount = cart.subtotal - (cart.discount || 0);
        const tax = taxableAmount * 0.08;
        const total = taxableAmount + tax;
        
        // Create new order
        const order = new Order({
            customerEmail: email.toLowerCase().trim(),
            customerName: name.trim(),
            customerAddress: address.trim(),
            customerPhone: phone.trim(),
            items: cart.items,
            subtotal: cart.subtotal,
            discount: cart.discount || 0,
            discountCode: cart.discountCode || null,
            tax: tax,
            total: total,
            status: 'Placed'
        });
        
        // Save to database
        await order.save();
        
        console.log(`✅ Order placed successfully: ${order.orderId}`);
        
        // Clear cart session
        req.session.cart = {
            items: [],
            subtotal: 0,
            total: 0,
            discount: 0,
            discountCode: null
        };
        
        // Redirect to success page
        res.redirect(`/order/success/${order.orderId}`);
        
    } catch (error) {
        console.error('❌ Order confirmation error:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            req.session.error = `Validation error: ${messages.join(', ')}`;
        } else {
            req.session.error = 'Failed to place order. Please try again.';
        }
        
        res.redirect('/order/preview');
    }
});

// Order Success Page
router.get('/order/success/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        
        if (!order) {
            req.session.error = 'Order not found';
            return res.redirect('/');
        }
        
        res.render('orderSuccess', {
            title: 'Order Confirmed - BeCallCenter',
            order: order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        req.session.error = 'Error loading order details';
        res.redirect('/');
    }
});

// Task 3: My Orders - Form Page
router.get('/my-orders', (req, res) => {
    res.render('myOrders', {
        title: 'My Orders - BeCallCenter',
        orders: null,
        searched: false,
        email: '',
        message: ''
    });
});

// Task 3: My Orders - Search Results
router.post('/my-orders', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !email.trim()) {
            return res.render('myOrders', {
                title: 'My Orders - BeCallCenter',
                orders: [],
                searched: true,
                email: '',
                message: 'Please enter an email address to search for orders'
            });
        }
        
        const cleanEmail = email.toLowerCase().trim();
        
        // Search orders by email
        const orders = await Order.find({ 
            customerEmail: cleanEmail 
        })
        .sort({ createdAt: -1 })
        .limit(50);
        
        if (orders.length === 0) {
            return res.render('myOrders', {
                title: 'My Orders - BeCallCenter',
                orders: [],
                searched: true,
                email: cleanEmail,
                message: `No orders found for email: ${cleanEmail}`
            });
        }
        
        res.render('myOrders', {
            title: 'My Orders - BeCallCenter',
            orders: orders,
            searched: true,
            email: cleanEmail,
            message: `Found ${orders.length} order(s) for ${cleanEmail}`
        });
        
    } catch (error) {
        console.error('Error searching orders:', error);
        res.render('myOrders', {
            title: 'My Orders - BeCallCenter',
            orders: [],
            searched: true,
            email: req.body.email || '',
            message: 'An error occurred while searching for orders. Please try again.'
        });
    }
});

// Order Details Page
router.get('/order/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        
        if (!order) {
            req.session.error = 'Order not found';
            return res.redirect('/my-orders');
        }
        
        res.render('orderDetails', {
            title: `Order ${order.orderId} - BeCallCenter`,
            order: order
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        req.session.error = 'Error loading order details';
        res.redirect('/my-orders');
    }
});

module.exports = router;