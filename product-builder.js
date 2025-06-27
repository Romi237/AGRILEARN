// Product Builder JavaScript
class ProductBuilder {
    constructor() {
        this.currentProduct = {
            id: null,
            name: '',
            category: '',
            description: '',
            price: 0,
            originalPrice: null,
            stockQuantity: 0,
            image: null,
            seller: 'NANSHIE ROMUALD', // Current user
            featured: false,
            inStock: true,
            rating: 0,
            reviews: 0,
            createdAt: new Date().toISOString(),
            status: 'draft' // draft, published
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupImageUpload();
        this.updatePreview();
        this.loadDrafts();
    }

    setupEventListeners() {
        // Form field listeners for live preview
        const fields = ['productName', 'category', 'description', 'price', 'originalPrice', 'stockQuantity'];
        
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('input', () => this.updatePreview());
                element.addEventListener('change', () => this.updatePreview());
            }
        });

        // Form submission
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.publishProduct();
        });
    }

    setupImageUpload() {
        const uploadArea = document.createElement('div');
        uploadArea.className = 'image-upload';
        uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <p>Click to upload or drag and drop</p>
            <p style="font-size: 0.9rem; color: var(--text-light);">PNG, JPG, GIF up to 5MB</p>
            <input type="file" id="imageUpload" accept="image/*" style="display: none;">
        `;

        // Insert after pricing section
        const pricingSection = document.querySelector('.form-section:last-child');
        const imageSection = document.createElement('div');
        imageSection.className = 'form-section';
        imageSection.innerHTML = `
            <h3 class="section-title">
                <i class="fas fa-image"></i>
                Product Image
            </h3>
        `;
        imageSection.appendChild(uploadArea);
        pricingSection.parentNode.insertBefore(imageSection, pricingSection.nextSibling);

        // Event listeners for image upload
        const fileInput = document.getElementById('imageUpload');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });
    }

    handleImageUpload(file) {
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('File size must be less than 5MB', 'error');
            return;
        }

        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentProduct.image = e.target.result;
            this.updateImagePreview();
            this.updatePreview();
        };
        reader.readAsDataURL(file);
    }

    updateImagePreview() {
        const uploadArea = document.querySelector('.image-upload');
        const previewImage = document.getElementById('previewImage');
        
        if (this.currentProduct.image) {
            // Update upload area
            uploadArea.innerHTML = `
                <img src="${this.currentProduct.image}" class="image-preview" alt="Product preview">
                <p style="margin-top: 1rem;">Click to change image</p>
                <input type="file" id="imageUpload" accept="image/*" style="display: none;">
            `;
            
            // Re-attach event listener
            const fileInput = document.getElementById('imageUpload');
            uploadArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleImageUpload(e.target.files[0]);
                }
            });
            
            // Update preview panel
            previewImage.innerHTML = `<img src="${this.currentProduct.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="Product">`;
        }
    }

    updatePreview() {
        // Get form values
        const name = document.getElementById('productName').value || 'Product Name';
        const category = document.getElementById('category').value || 'Category';
        const description = document.getElementById('description').value || 'Product description will appear here...';
        const price = parseFloat(document.getElementById('price').value) || 0;
        const originalPrice = parseFloat(document.getElementById('originalPrice').value) || null;
        const stockQuantity = parseInt(document.getElementById('stockQuantity').value) || 0;

        // Update current product
        this.currentProduct.name = name;
        this.currentProduct.category = category;
        this.currentProduct.description = description;
        this.currentProduct.price = price;
        this.currentProduct.originalPrice = originalPrice;
        this.currentProduct.stockQuantity = stockQuantity;
        this.currentProduct.inStock = stockQuantity > 0;

        // Update preview elements
        document.getElementById('previewTitle').textContent = name;
        document.getElementById('previewCategory').textContent = category;
        document.getElementById('previewDescription').textContent = description;
        document.getElementById('previewStock').textContent = `${stockQuantity} in stock`;
        
        // Update price display
        const priceElement = document.getElementById('previewPrice');
        if (originalPrice && originalPrice > price) {
            priceElement.innerHTML = `
                $${price.toFixed(2)}
                <span style="text-decoration: line-through; color: #999; font-size: 0.9rem; margin-left: 0.5rem;">
                    $${originalPrice.toFixed(2)}
                </span>
            `;
        } else {
            priceElement.textContent = `$${price.toFixed(2)}`;
        }
    }

    validateForm() {
        const requiredFields = ['productName', 'category', 'description', 'price', 'stockQuantity'];
        const errors = [];

        requiredFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (!element.value.trim()) {
                errors.push(`${element.previousElementSibling.textContent.replace(' *', '')} is required`);
            }
        });

        if (this.currentProduct.price <= 0) {
            errors.push('Price must be greater than 0');
        }

        if (this.currentProduct.stockQuantity < 0) {
            errors.push('Stock quantity cannot be negative');
        }

        if (this.currentProduct.originalPrice && this.currentProduct.originalPrice <= this.currentProduct.price) {
            errors.push('Original price must be greater than current price');
        }

        return errors;
    }

    async saveAsDraft() {
        const errors = this.validateForm();
        if (errors.length > 0) {
            this.showNotification(errors[0], 'error');
            return;
        }

        this.currentProduct.status = 'draft';
        this.currentProduct.id = this.currentProduct.id || this.generateId();

        try {
            // Save to localStorage for now (replace with API call later)
            const drafts = JSON.parse(localStorage.getItem('productDrafts') || '[]');
            const existingIndex = drafts.findIndex(d => d.id === this.currentProduct.id);
            
            if (existingIndex >= 0) {
                drafts[existingIndex] = { ...this.currentProduct };
            } else {
                drafts.push({ ...this.currentProduct });
            }
            
            localStorage.setItem('productDrafts', JSON.stringify(drafts));
            this.showNotification('Product saved as draft!', 'success');
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showNotification('Failed to save draft', 'error');
        }
    }

    async publishProduct() {
        const errors = this.validateForm();
        if (errors.length > 0) {
            this.showNotification(errors[0], 'error');
            return;
        }

        if (!this.currentProduct.image) {
            this.showNotification('Please upload a product image', 'error');
            return;
        }

        this.currentProduct.status = 'published';
        this.currentProduct.id = this.currentProduct.id || this.generateId();

        try {
            // For now, save to localStorage (replace with API call later)
            const products = JSON.parse(localStorage.getItem('marketplaceProducts') || '[]');
            const existingIndex = products.findIndex(p => p.id === this.currentProduct.id);
            
            if (existingIndex >= 0) {
                products[existingIndex] = { ...this.currentProduct };
            } else {
                products.push({ ...this.currentProduct });
            }
            
            localStorage.setItem('marketplaceProducts', JSON.stringify(products));
            
            // Remove from drafts if it exists
            const drafts = JSON.parse(localStorage.getItem('productDrafts') || '[]');
            const filteredDrafts = drafts.filter(d => d.id !== this.currentProduct.id);
            localStorage.setItem('productDrafts', JSON.stringify(filteredDrafts));
            
            this.showNotification('Product published successfully!', 'success');
            
            // Redirect to marketplace after a delay
            setTimeout(() => {
                window.location.href = 'marketplace.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error publishing product:', error);
            this.showNotification('Failed to publish product', 'error');
        }
    }

    resetForm() {
        if (confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
            document.getElementById('productForm').reset();
            this.currentProduct = {
                id: null,
                name: '',
                category: '',
                description: '',
                price: 0,
                originalPrice: null,
                stockQuantity: 0,
                image: null,
                seller: 'NANSHIE ROMUALD',
                featured: false,
                inStock: true,
                rating: 0,
                reviews: 0,
                createdAt: new Date().toISOString(),
                status: 'draft'
            };
            
            // Reset image upload area
            const uploadArea = document.querySelector('.image-upload');
            uploadArea.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <p>Click to upload or drag and drop</p>
                <p style="font-size: 0.9rem; color: var(--text-light);">PNG, JPG, GIF up to 5MB</p>
                <input type="file" id="imageUpload" accept="image/*" style="display: none;">
            `;
            
            this.setupImageUpload();
            this.updatePreview();
        }
    }

    loadDrafts() {
        // This could be expanded to show a list of drafts for editing
        const drafts = JSON.parse(localStorage.getItem('productDrafts') || '[]');
        console.log('Available drafts:', drafts.length);
    }

    generateId() {
        return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Utility functions
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Initialize the product builder when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.productBuilder = new ProductBuilder();
});

// Global functions for button clicks
function saveAsDraft() {
    window.productBuilder.saveAsDraft();
}

function publishProduct() {
    window.productBuilder.publishProduct();
}

function resetForm() {
    window.productBuilder.resetForm();
}

// API simulation for contact seller (to be replaced with real API)
window.simulateContactAPI = function(formData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate API call
            console.log('Contact message sent:', formData);

            // Save to localStorage for demo purposes
            const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
            messages.push({
                ...formData,
                id: 'msg_' + Date.now(),
                status: 'sent',
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('contactMessages', JSON.stringify(messages));

            resolve({ success: true, message: 'Message sent successfully' });
        }, 1000);
    });
};
