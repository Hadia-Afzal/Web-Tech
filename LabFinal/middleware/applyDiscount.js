module.exports = function applyDiscount(req, res, next) {
    // Check for coupon in query params or form data
    const coupon = req.query.coupon || req.body.coupon;
    
    if (coupon && coupon.trim().toUpperCase() === 'SAVE10') {
        console.log(`🎯 Discount applied: ${coupon}`);
        
        req.discount = {
            code: 'SAVE10',
            percentage: 10,
            applied: true,
            message: '10% discount applied!'
        };
        
        // Apply discount to cart session if exists
        if (req.session.cart) {
            const cart = req.session.cart;
            cart.discount = cart.subtotal * 0.1;
            cart.discountCode = 'SAVE10';
            cart.total = cart.subtotal - cart.discount;
            
            console.log(`💰 Discount amount: $${cart.discount.toFixed(2)}`);
            console.log(`💰 New total: $${cart.total.toFixed(2)}`);
        }
    } else {
        req.discount = {
            applied: false,
            message: coupon ? `Invalid coupon code: ${coupon}` : 'No coupon applied'
        };
        
        // Clear discount from cart if invalid coupon
        if (req.session.cart && req.session.cart.discountCode) {
            req.session.cart.discount = 0;
            req.session.cart.discountCode = null;
            req.session.cart.total = req.session.cart.subtotal;
        }
    }
    
    // Make discount available in all views
    res.locals.discount = req.discount;
    
    next();
};