// Marketplace functionality
let currentUser = null;
let products = [];
let cart = JSON.parse(localStorage.getItem('agrilearn_cart') || '[]');
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeMarketplace();
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('agrilearn_user'));
    const token = localStorage.getItem('agrilearn_token');
    
    if (user && token) {
        currentUser = user;
        updateHeaderForLoggedInUser();
    } else {
        updateHeaderForGuest();
    }
}

function updateHeaderForLoggedInUser() {
    const authButtons = document.getElementById('auth-buttons');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar = document.getElementById('user-avatar');
    
    if (authButtons) authButtons.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (userAvatar) {
        userAvatar.classList.remove('hidden');
        const avatarImg = userAvatar.querySelector('img');
        if (currentUser.profilePicture && avatarImg) {
            avatarImg.src = currentUser.profilePicture.startsWith('http') 
                ? currentUser.profilePicture 
                : `http://localhost:5000${currentUser.profilePicture}`;
        }
    }
}

function updateHeaderForGuest() {
    const authButtons = document.getElementById('auth-buttons');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar = document.getElementById('user-avatar');
    
    if (authButtons) authButtons.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (userAvatar) userAvatar.classList.add('hidden');
}

async function initializeMarketplace() {
    // Initialize marketplace state with existing cart
    marketplaceState.cart = cart;
    marketplaceState.updateCartUI();

    await loadProducts();
    setupEventListeners();
}

function setupEventListeners() {
    // Search functionality
    const headerSearch = document.getElementById('header-search');
    const productSearch = document.getElementById('product-search');
    const categoryFilter = document.getElementById('category-filter');
    
    if (headerSearch) {
        headerSearch.addEventListener('input', debounce(performSearch, 300));
        headerSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (productSearch) {
        productSearch.addEventListener('input', debounce(applyFilters, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
}

async function loadProducts() {
    try {
        marketplaceState.setLoading(true);

        // Use the real API with authentication
        const data = await marketplaceAPI.getProducts(marketplaceState.filters);

        if (data.success) {
            products = data.products || [];
            marketplaceState.setProducts(data.products, data.pagination);
        } else {
            // Fallback to demo data
            products = getDemoProducts();
            marketplaceState.setProducts(products);
        }

        filteredProducts = [...products];
        renderProducts();

    } catch (error) {
        console.error('Error loading products:', error);
        marketplaceState.setError('Failed to load products');

        // Use demo data as fallback
        products = getDemoProducts();
        marketplaceState.setProducts(products);
        filteredProducts = [...products];
        renderProducts();
    } finally {
        marketplaceState.setLoading(false);
    }
}

function getDemoProducts() {
    return [
        {
            id: 'premium-seeds',
            name: 'Premium Organic Seeds',
            description: 'High-quality organic vegetable seeds for sustainable farming.',
            price: 29.99,
            category: 'seeds',
            image: 'images/product1.jpg',
            inStock: true,
            seller: 'GreenThumb Farms',
            rating: 4.8,
            reviews: 156
        },
        {
            id: 'garden-tools',
            name: 'Professional Garden Tools Set',
            description: 'Complete set of durable garden tools for all your farming needs.',
            price: 89.99,
            category: 'tools',
            image: 'images/product2.jpeg',
            inStock: true,
            seller: 'ToolMaster Pro',
            rating: 4.6,
            reviews: 89
        },
        {
            id: 'organic-fertilizer',
            name: 'Organic Fertilizer',
            description: 'Natural fertilizer to boost crop growth and soil health.',
            price: 45.99,
            category: 'fertilizers',
            image: 'images/product3.jpg',
            inStock: true,
            seller: 'EcoGrow Solutions',
            rating: 4.7,
            reviews: 203
        },
        {
            id: 'irrigation-system',
            name: 'Smart Irrigation System',
            description: 'Automated irrigation system for efficient water management.',
            price: 299.99,
            category: 'equipment',
            image: 'images/product4.jpeg',
            inStock: true,
            seller: 'AquaTech Systems',
            rating: 4.9,
            reviews: 67
        },
        {
            id: 'greenhouse-kit',
            name: 'Portable Greenhouse Kit',
            description: 'Easy-to-assemble greenhouse for year-round growing.',
            price: 199.99,
            category: 'equipment',
            image: 'images/default-course.jpg',
            inStock: true,
            seller: 'GrowSpace Inc',
            rating: 4.5,
            reviews: 124
        },
        {
            id: 'soil-tester',
            name: 'Digital Soil pH Tester',
            description: 'Accurate digital soil testing device for optimal growing conditions.',
            price: 39.99,
            category: 'tools',
            image: 'images/default-course.jpg',
            inStock: true,
            seller: 'PrecisionGrow',
            rating: 4.4,
            reviews: 78
        }
    ];
}

function renderProducts() {
    const productsGrid = document.getElementById('products-grid');
    const noProducts = document.getElementById('no-products');
    
    if (!productsGrid) return;
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '';
        if (noProducts) noProducts.classList.remove('hidden');
        return;
    }
    
    if (noProducts) noProducts.classList.add('hidden');
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" data-category="${product.category}">
            <img src="${product.image}" alt="${product.name}" class="product-image" 
                 onerror="this.src='images/default-course.jpg'">
            <div class="product-content">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="product-meta">
                    <div class="product-rating">
                        <span class="stars">${generateStars(product.rating)}</span>
                        <span class="rating-text">${product.rating} (${product.reviews} reviews)</span>
                    </div>
                    <div class="product-seller">
                        <i class="fas fa-store"></i> ${product.seller}
                    </div>
                </div>
                <div class="product-actions">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="addToCart('${product.id}')"
                                ${!product.inStock ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i>
                            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="contactSeller('${product.id}')" title="Contact Seller">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

function performSearch() {
    const headerSearch = document.getElementById('header-search');
    const productSearch = document.getElementById('product-search');
    
    if (headerSearch && headerSearch.value) {
        if (productSearch) productSearch.value = headerSearch.value;
    }
    
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('product-search')?.value.toLowerCase() || '';
    const category = document.getElementById('category-filter')?.value || '';
    
    filteredProducts = products.filter(product => {
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.seller.toLowerCase().includes(searchTerm);
            
        const matchesCategory = !category || product.category === category;
        
        return matchesSearch && matchesCategory;
    });
    
    renderProducts();
}

function showLoading(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced Cart functionality
function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId || p._id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    if (!product.inStock) {
        showNotification('Product is out of stock', 'error');
        return;
    }

    if (quantity > product.stockQuantity) {
        showNotification(`Only ${product.stockQuantity} items available`, 'error');
        return;
    }

    // Use the new state management
    marketplaceState.addToCart(product, quantity);

    // Update button state temporarily
    const button = document.querySelector(`[onclick="addToCart('${productId}')"]`);
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Added!';
        button.disabled = true;

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1500);
    }
}

function removeFromCart(productId) {
    marketplaceState.removeFromCart(productId);
}

// Enhanced View functionality
function viewProduct(productId) {
    const product = products.find(p => p.id === productId || p._id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    // Create modal for product details
    const modal = document.createElement('div');
    modal.className = 'product-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${product.name}</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="product-details-grid">
                    <div class="product-image-section">
                        <img src="${product.image}" alt="${product.name}" class="product-detail-image">
                        <div class="product-badges">
                            ${product.inStock ? '<span class="badge in-stock">In Stock</span>' : '<span class="badge out-of-stock">Out of Stock</span>'}
                            ${product.featured ? '<span class="badge featured">Featured</span>' : ''}
                        </div>
                    </div>
                    <div class="product-info-section">
                        <div class="price-section">
                            <span class="current-price">$${product.price}</span>
                            ${product.originalPrice ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
                        </div>
                        <div class="rating-section">
                            <div class="stars">${generateStars(product.rating || 0)}</div>
                            <span class="rating-text">(${product.reviews || 0} reviews)</span>
                        </div>
                        <div class="seller-info">
                            <p><strong>Seller:</strong> ${product.seller}</p>
                            <p><strong>Category:</strong> ${product.category}</p>
                            <p><strong>Stock:</strong> ${product.stockQuantity || 'N/A'} available</p>
                        </div>
                        <div class="description-section">
                            <h3>Description</h3>
                            <p>${product.description}</p>
                        </div>
                        <div class="action-buttons">
                            <div class="quantity-selector">
                                <label for="quantity">Quantity:</label>
                                <input type="number" id="quantity" min="1" max="${product.stockQuantity || 1}" value="1">
                            </div>
                            <button class="btn btn-primary" onclick="addToCartFromModal('${product.id || product._id}')" ${!product.inStock ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                            <button class="btn btn-secondary" onclick="contactSeller('${product.seller}', '${product.name}')">
                                <i class="fas fa-envelope"></i> Contact Seller
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.close-modal').onclick = () => closeModal(modal);
    modal.onclick = (e) => {
        if (e.target === modal) closeModal(modal);
    };
}

function closeModal(modal) {
    modal.remove();
}

function addToCartFromModal(productId) {
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    addToCart(productId, quantity);
}

// Enhanced Contact functionality
function contactSeller(sellerName, productName) {
    const modal = document.createElement('div');
    modal.className = 'contact-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Contact Seller</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <form id="contactForm" class="contact-form">
                    <div class="form-group">
                        <label for="sellerName">Seller:</label>
                        <input type="text" id="sellerName" value="${sellerName}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="productName">Product:</label>
                        <input type="text" id="productName" value="${productName}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="buyerName">Your Name:</label>
                        <input type="text" id="buyerName" required>
                    </div>
                    <div class="form-group">
                        <label for="buyerEmail">Your Email:</label>
                        <input type="email" id="buyerEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="subject">Subject:</label>
                        <select id="subject" required>
                            <option value="">Select a subject</option>
                            <option value="product-inquiry">Product Inquiry</option>
                            <option value="price-negotiation">Price Negotiation</option>
                            <option value="bulk-order">Bulk Order</option>
                            <option value="shipping-info">Shipping Information</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="message">Message:</label>
                        <textarea id="message" rows="5" placeholder="Enter your message here..." required></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal(this.closest('.contact-modal'))">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Message
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.close-modal').onclick = () => closeModal(modal);
    modal.onclick = (e) => {
        if (e.target === modal) closeModal(modal);
    };

    // Handle form submission
    modal.querySelector('#contactForm').onsubmit = (e) => {
        e.preventDefault();
        sendContactMessage(modal);
    };
}

async function sendContactMessage(modal) {
    const formData = {
        seller: modal.querySelector('#sellerName').value,
        product: modal.querySelector('#productName').value,
        buyerName: modal.querySelector('#buyerName').value,
        buyerEmail: modal.querySelector('#buyerEmail').value,
        subject: modal.querySelector('#subject').value,
        message: modal.querySelector('#message').value,
        timestamp: new Date().toISOString()
    };

    try {
        // Use simulated API if available, otherwise use real API
        let response;
        if (window.simulateContactAPI) {
            response = await window.simulateContactAPI(formData);
        } else {
            const apiResponse = await fetch('/api/contact-seller', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (apiResponse.ok) {
                response = { success: true };
            } else {
                throw new Error('Failed to send message');
            }
        }

        if (response.success) {
            showNotification('Message sent successfully!', 'success');
            closeModal(modal);
        } else {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message. Please try again.', 'error');
    }
}

function updateQuantity(productId, change) {
    const item = marketplaceState.cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = item.quantity + change;
        marketplaceState.updateQuantity(productId, newQuantity);
    }
}

function updateCartCount() {
    // This is now handled by marketplaceState.updateCartUI()
    marketplaceState.updateCartUI();
}

function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');

    if (cartSidebar && cartOverlay) {
        const isOpen = cartSidebar.classList.contains('open');

        if (isOpen) {
            cartSidebar.classList.remove('open');
            cartOverlay.classList.remove('show');
        } else {
            cartSidebar.classList.add('open');
            cartOverlay.classList.add('show');
            renderCartItems();
        }
    }
}

function renderCartItems() {
    const cartContent = document.getElementById('cart-content');
    const cartTotalAmount = document.getElementById('cart-total-amount');

    if (!cartContent) return;

    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h4>Your cart is empty</h4>
                <p>Add some products to get started!</p>
            </div>
        `;
        if (cartTotalAmount) cartTotalAmount.textContent = '0.00';
        return;
    }

    cartContent.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image"
                 onerror="this.src='images/default-course.jpg'">
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span style="margin: 0 0.5rem; font-weight: bold;">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-sm" onclick="removeFromCart('${item.id}')"
                            style="margin-left: auto; color: #dc3545;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Update total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotalAmount) cartTotalAmount.textContent = total.toFixed(2);
}

async function checkout() {
    if (marketplaceState.cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }

    if (!currentUser) {
        showNotification('Please login to checkout', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    try {
        // For now, we'll use a simple checkout without address collection
        // In a real app, you'd collect shipping/billing address first
        const orderData = {
            items: marketplaceState.cart.map(item => ({
                productId: item.id,
                quantity: item.quantity
            })),
            shippingAddress: {
                fullName: currentUser?.name || 'Demo User',
                address: '123 Demo Street',
                city: 'Demo City',
                state: 'Demo State',
                zipCode: '12345',
                country: 'United States'
            },
            paymentMethod: 'credit_card'
        };

        const data = await marketplaceAPI.createOrder(orderData);

        if (data.success) {
            showNotification('Order placed successfully!', 'success');
            marketplaceState.clearCart();
            toggleCart();
        } else {
            throw new Error(data.message || 'Checkout failed');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification(`Checkout failed: ${error.message}`, 'error');
    }
}

// Seller contact functionality
function contactSeller(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    if (!currentUser) {
        showNotification('Please login to contact sellers', 'error');
        return;
    }

    // Create contact modal if it doesn't exist
    let contactModal = document.getElementById('contact-seller-modal');
    if (!contactModal) {
        contactModal = document.createElement('div');
        contactModal.id = 'contact-seller-modal';
        contactModal.className = 'modal';
        contactModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close-btn" onclick="closeContactModal()">&times;</span>
                <h2><i class="fas fa-envelope"></i> Contact Seller</h2>

                <div class="product-info" style="display: flex; gap: 15px; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <img id="contact-product-image" src="" alt="" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <h4 id="contact-product-name"></h4>
                        <p id="contact-seller-name" style="color: #666; margin: 5px 0;"></p>
                        <p id="contact-product-price" style="font-weight: bold; color: #28a745;"></p>
                    </div>
                </div>

                <form id="contact-seller-form" onsubmit="sendSellerMessage(event)">
                    <div class="form-group">
                        <label for="contact-subject">Subject:</label>
                        <input type="text" id="contact-subject" class="form-control" required placeholder="Enter message subject">
                    </div>

                    <div class="form-group">
                        <label for="contact-message">Message:</label>
                        <textarea id="contact-message" class="form-control" rows="5" required
                                  placeholder="Write your message to the seller..."></textarea>
                    </div>

                    <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-outline" onclick="closeContactModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Message
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(contactModal);
    }

    // Populate modal with product information
    document.getElementById('contact-product-image').src = product.image;
    document.getElementById('contact-product-name').textContent = product.name;
    document.getElementById('contact-seller-name').textContent = `Seller: ${product.seller}`;
    document.getElementById('contact-product-price').textContent = `$${product.price.toFixed(2)}`;

    // Set default subject
    document.getElementById('contact-subject').value = `Inquiry about ${product.name}`;
    document.getElementById('contact-message').value = '';

    // Store product ID for form submission
    contactModal.dataset.productId = productId;

    contactModal.style.display = 'block';
}

function closeContactModal() {
    const modal = document.getElementById('contact-seller-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function sendSellerMessage(event) {
    event.preventDefault();

    const modal = document.getElementById('contact-seller-modal');
    const productId = modal.dataset.productId;
    const product = products.find(p => p.id === productId);

    const subject = document.getElementById('contact-subject').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    if (!subject || !message) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('agrilearn_token');
        const messageData = {
            to: product.seller,
            subject: subject,
            content: message,
            productId: productId,
            productName: product.name
        };

        const response = await fetch('http://localhost:5000/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(messageData)
        });

        if (response.ok) {
            showNotification('Message sent successfully!', 'success');
            closeContactModal();
        } else {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        // For demo purposes, show success message
        showNotification('Message sent to seller! (Demo mode)', 'success');
        closeContactModal();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1002;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// Enhanced loadProducts function to include products from product builder
async function loadProductsFromBuilder() {
    try {
        // Load products from localStorage (created by product builder)
        const localProducts = JSON.parse(localStorage.getItem('marketplaceProducts') || '[]');

        // Filter only published products
        const publishedProducts = localProducts.filter(p => p.status === 'published');

        // Add to existing products array
        publishedProducts.forEach(product => {
            // Check if product already exists
            const existingIndex = products.findIndex(p => p.id === product.id);
            if (existingIndex >= 0) {
                products[existingIndex] = product; // Update existing
            } else {
                products.push(product); // Add new
            }
        });

        // Refresh display
        displayProducts(products);
        updateFilters();

    } catch (error) {
        console.error('Error loading products from builder:', error);
    }
}

// Call this function when marketplace loads to include builder products
document.addEventListener('DOMContentLoaded', function() {
    // Load builder products after initial load
    setTimeout(() => {
        loadProductsFromBuilder();
    }, 1000);
});

// Logout functionality
function logout() {
    localStorage.removeItem('agrilearn_user');
    localStorage.removeItem('agrilearn_token');
    window.location.href = 'login.html';
}
