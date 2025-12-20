const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Simple admin authentication middleware
const isAdmin = (req, res, next) => {
    // For demo purposes, using query parameter
    // In production, use proper authentication (JWT, sessions, etc.)
    if (req.query.admin === 'true' || req.session.isAdmin) {
        next();
    } else {
        res.status(403).render('error', {
            title: 'Access Denied',
            message: 'Administrator access required',
            error: { status: 403 }
        });
    }
};

// Task 4: Admin Orders List
router.get('/orders', isAdmin, async (req, res) => {
    try {
        const { status, email, page = 1, limit = 20 } = req.query;
        
        let query = {};
        
        // Filter by status if provided
        if (status && status !== 'all') {
            query.status = status;
        }
        
        // Filter by email if provided
        if (email && email.trim()) {
            query.customerEmail = email.toLowerCase().trim();
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Get orders with pagination
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
        
        // Get total count for pagination
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limitNum);
        
        // Get status counts for dashboard
        const statusCounts = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const statusStats = {};
        statusCounts.forEach(stat => {
            statusStats[stat._id] = stat.count;
        });
        
        res.render('adminOrders', {
            title: 'Admin - Order Management',
            orders: orders,
            currentPage: pageNum,
            totalPages: totalPages,
            totalOrders: totalOrders,
            statusStats: statusStats,
            filters: {
                status: status || 'all',
                email: email || '',
                limit: limitNum
            }
        });
        
    } catch (error) {
        console.error('Error loading admin orders:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Failed to load orders',
            error: error
        });
    }
});

// Task 4: Update Order Status (with validation)
router.post('/orders/:orderId/status', isAdmin, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, note } = req.body;
        
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found' 
            });
        }
        
        // Task 4: Validate status transition
        const validTransitions = {
            'Placed': ['Processing', 'Cancelled'],
            'Processing': ['Delivered', 'Cancelled'],
            'Delivered': [], // Final state
            'Cancelled': []  // Final state
        };
        
        const currentStatus = order.status;
        const allowedNextStatuses = validTransitions[currentStatus];
        
        if (!allowedNextStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status transition. Cannot change from ${currentStatus} to ${status}.`,
                currentStatus: currentStatus,
                allowedNextStatuses: allowedNextStatuses
            });
        }
        
        // Update order status
        order.status = status;
        
        // Add to status history
        order.statusHistory.push({
            status: status,
            note: note || `Status changed to ${status}`,
            changedAt: new Date()
        });
        
        await order.save();
        
        res.json({
            success: true,
            orderId: order.orderId,
            status: order.status,
            message: `Order status updated to ${status}`
        });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
});

// Admin Login (simple demo)
router.get('/login', (req, res) => {
    res.render('adminLogin', {
        title: 'Admin Login'
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple demo authentication
    if (username === 'admin' && password === 'admin123') {
        req.session.isAdmin = true;
        res.redirect('/admin/orders');
    } else {
        res.render('adminLogin', {
            title: 'Admin Login',
            error: 'Invalid credentials'
        });
    }
});

// Admin Logout
router.get('/logout', (req, res) => {
    req.session.isAdmin = false;
    res.redirect('/');
});

// Admin Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        // Get recent orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Get order statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const ordersToday = await Order.countDocuments({
            createdAt: { $gte: today }
        });
        
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total' }
                }
            }
        ]);
        
        res.render('adminDashboard', {
            title: 'Admin Dashboard',
            recentOrders: recentOrders,
            stats: {
                ordersToday: ordersToday,
                totalOrders: totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Failed to load dashboard',
            error: error
        });
    }
});

module.exports = router;