const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for product image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'products');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/products - Get all products with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured,
      inStock
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    if (inStock === 'true') {
      filter.inStock = true;
      filter.stockQuantity = { $gt: 0 };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate('seller', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// GET /api/products/categories - Get all product categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: 'active' });
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// GET /api/products/:id - Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email profilePicture')
      .populate('reviews.user', 'name profilePicture');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

// POST /api/products - Create new product (teachers only)
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can create products' });
    }

    const {
      name,
      description,
      price,
      category,
      stockQuantity,
      specifications,
      tags
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and category are required'
      });
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];
    const mainImage = images.length > 0 ? images[0] : 'images/default-course.jpg';

    // Parse specifications and tags if they're strings
    let parsedSpecifications = {};
    let parsedTags = [];

    if (specifications) {
      try {
        parsedSpecifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
      } catch (e) {
        console.warn('Invalid specifications format, using empty object');
      }
    }

    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : [];
      }
    }

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      image: mainImage,
      images,
      stockQuantity: parseInt(stockQuantity) || 0,
      inStock: parseInt(stockQuantity) > 0,
      seller: req.user.id,
      sellerName: req.user.name,
      specifications: parsedSpecifications,
      tags: parsedTags,
      status: 'active' // Auto-approve for teachers
    });

    await product.save();

    res.status(201).json({
      success: true,
      product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// PUT /api/products/:id - Update product (seller only)
router.put('/:id', upload.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if user is the seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only update your own products' });
    }

    const {
      name,
      description,
      price,
      category,
      stockQuantity,
      specifications,
      tags,
      featured
    } = req.body;

    // Update fields if provided
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = parseFloat(price);
    if (category) product.category = category;
    if (stockQuantity !== undefined) {
      product.stockQuantity = parseInt(stockQuantity);
      product.inStock = parseInt(stockQuantity) > 0;
    }
    if (featured !== undefined) product.featured = featured === 'true';

    // Handle specifications
    if (specifications) {
      try {
        product.specifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
      } catch (e) {
        console.warn('Invalid specifications format, keeping existing');
      }
    }

    // Handle tags
    if (tags) {
      try {
        product.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        product.tags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : [];
      }
    }

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
      product.images = [...product.images, ...newImages];
      if (!product.image || product.image === 'images/default-course.jpg') {
        product.image = newImages[0];
      }
    }

    await product.save();

    res.json({
      success: true,
      product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product (seller only)
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if user is the seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own products' });
    }

    // Soft delete by setting status to inactive
    product.status = 'inactive';
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// POST /api/products/:id/reviews - Add product review
router.post('/:id/reviews', async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Rating and comment are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    product.reviews.push({
      user: req.user.id,
      rating: parseInt(rating),
      comment,
      createdAt: new Date()
    });

    // Recalculate average rating
    product.calculateAverageRating();
    await product.save();

    // Populate the new review for response
    await product.populate('reviews.user', 'name profilePicture');

    res.status(201).json({
      success: true,
      review: product.reviews[product.reviews.length - 1],
      message: 'Review added successfully'
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ success: false, message: 'Failed to add review' });
  }
});

// PUT /api/products/:id/reviews/:reviewId - Update product review
router.put('/:id/reviews/:reviewId', async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check if user owns this review
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only update your own reviews' });
    }

    // Update review
    if (rating) review.rating = parseInt(rating);
    if (comment) review.comment = comment;

    // Recalculate average rating
    product.calculateAverageRating();
    await product.save();

    res.json({
      success: true,
      review,
      message: 'Review updated successfully'
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ success: false, message: 'Failed to update review' });
  }
});

// DELETE /api/products/:id/reviews/:reviewId - Delete product review
router.delete('/:id/reviews/:reviewId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check if user owns this review
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own reviews' });
    }

    // Remove review
    product.reviews.pull(req.params.reviewId);

    // Recalculate average rating
    product.calculateAverageRating();
    await product.save();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
});

module.exports = router;
