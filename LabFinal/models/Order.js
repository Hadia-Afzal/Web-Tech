const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerAddress: {
        type: String,
        required: true,
        trim: true
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true
    },
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number,
        total: Number
    }],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    discountCode: {
        type: String,
        default: null
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Placed', 'Processing', 'Delivered', 'Cancelled'],
        default: 'Placed'
    },
    statusHistory: [{
        status: String,
        changedAt: { 
            type: Date, 
            default: Date.now 
        },
        note: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate order ID before saving
orderSchema.pre('save', function(next) {
    if (!this.orderId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.orderId = `ORD${timestamp}${random}`.substring(0, 15);
    }
    this.updatedAt = Date.now();
    next();
});

// Add status to history when status changes
orderSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            note: `Status changed to ${this.status}`
        });
    }
    next();
});

// Calculate tax before saving
orderSchema.pre('save', function(next) {
    if (this.isModified('subtotal') || this.isModified('discount')) {
        const taxableAmount = this.subtotal - this.discount;
        this.tax = taxableAmount * 0.08; // 8% tax
        this.total = taxableAmount + this.tax;
    }
    next();
});

// Virtual for formatted date
orderSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
});

module.exports = mongoose.model('Order', orderSchema);