const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

// GET /api/orders - Get user's orders
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Build filter
    const filter = { user: req.user.id };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate('items.product', 'name image category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name image category seller')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required' });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address) {
      return res.status(400).json({ success: false, message: 'Shipping address is required' });
    }

    // Validate and process order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(400).json({ 
          success: false, 
          message: `Product not found: ${item.productId}` 
        });
      }

      if (!product.inStock || product.stockQuantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for product: ${product.name}` 
        });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.image,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal
      });

      // Update product stock
      product.stockQuantity -= item.quantity;
      if (product.stockQuantity === 0) {
        product.inStock = false;
      }
      await product.save();
    }

    // Calculate totals (simplified - no tax/shipping for now)
    const tax = 0;
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const total = subtotal + tax + shipping;

    // Create order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      subtotal,
      tax,
      shipping,
      total,
      paymentMethod: paymentMethod || 'credit_card',
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await order.save();

    // Add initial status to history
    order.updateStatus('pending', 'Order created');
    await order.save();

    res.status(201).json({
      success: true,
      order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// PUT /api/orders/:id/status - Update order status (admin/seller only)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // For now, only allow the order owner to cancel
    if (status === 'cancelled' && order.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own orders' });
    }

    // Update status
    order.updateStatus(status, note || '');
    await order.save();

    res.json({
      success: true,
      order,
      message: `Order ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// POST /api/orders/:id/cancel - Cancel order
router.post('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own orders' });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order cannot be cancelled in current status' 
      });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stockQuantity += item.quantity;
        product.inStock = true;
        await product.save();
      }
    }

    // Update order status
    order.updateStatus('cancelled', 'Cancelled by customer');
    await order.save();

    res.json({
      success: true,
      order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});

// GET /api/orders/stats/summary - Get order statistics for dashboard
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      totalSpent
    ] = await Promise.all([
      Order.countDocuments({ user: userId }),
      Order.countDocuments({ user: userId, status: { $in: ['pending', 'confirmed', 'processing'] } }),
      Order.countDocuments({ user: userId, status: 'delivered' }),
      Order.aggregate([
        { $match: { user: userId, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent: totalSpent[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order statistics' });
  }
});

module.exports = router;
