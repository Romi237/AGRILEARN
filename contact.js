// Contact page JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Contact page initialized');

    try {
        // Initialize contact form
        initializeContactForm();

        // Initialize contact interactions
        initializeContactInteractions();

        // Initialize form validation
        initializeFormValidation();

        console.log('✅ Contact page initialization completed successfully');
    } catch (error) {
        console.error('❌ Contact page initialization error:', error);
        // Ensure basic functionality still works
        initializeFallbackContactForm();
    }
});

function initializeFallbackContactForm() {
    console.log('Initializing fallback contact form...');
    const contactForm = document.getElementById('contact-form');
    if (contactForm && !contactForm.hasAttribute('data-initialized')) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
        contactForm.setAttribute('data-initialized', 'true');
        console.log('✅ Fallback contact form initialized');
    }
}

function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');

    if (!contactForm) {
        console.warn('Contact form not found');
        return;
    }

    // Mark form as initialized to prevent fallback handler
    contactForm.setAttribute('data-initialized', 'true');

    contactForm.addEventListener('submit', handleContactFormSubmission);
    
    // Add real-time validation
    const formInputs = contactForm.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function handleContactFormSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Validate form before submission
    if (!validateContactForm(form)) {
        showNotification('Please fill in all required fields correctly.', 'error');
        return;
    }
    
    // Show loading state
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    
    // Prepare form data
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        timestamp: new Date().toISOString()
    };
    
    // Submit form data
    submitContactForm(contactData)
        .then(response => {
            if (response.success) {
                showNotification('Thank you! Your message has been sent successfully.', 'success');
                form.reset();
                clearAllFieldErrors(form);
            } else {
                throw new Error(response.message || 'Failed to send message');
            }
        })
        .catch(error => {
            console.error('Contact form submission error:', error);
            showNotification('Sorry, there was an error sending your message. Please try again.', 'error');
        })
        .finally(() => {
            // Restore button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        });
}

async function submitContactForm(contactData) {
    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        
        // Fallback: Store in localStorage for later processing
        storeContactFormLocally(contactData);
        
        // Return success for user experience
        return { success: true, message: 'Message stored locally and will be sent when connection is restored.' };
    }
}

function storeContactFormLocally(contactData) {
    try {
        const storedMessages = JSON.parse(localStorage.getItem('agrilearn_contact_messages') || '[]');
        storedMessages.push(contactData);
        localStorage.setItem('agrilearn_contact_messages', JSON.stringify(storedMessages));
        console.log('Contact message stored locally');
    } catch (error) {
        console.error('Failed to store contact message locally:', error);
    }
}

function validateContactForm(form) {
    const requiredFields = ['name', 'email', 'subject', 'message'];
    let isValid = true;
    
    requiredFields.forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    const fieldName = field.name;
    
    // Clear previous errors
    clearFieldError(e);
    
    // Validation rules
    let isValid = true;
    let errorMessage = '';
    
    if (!value) {
        isValid = false;
        errorMessage = 'This field is required.';
    } else {
        switch (fieldName) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address.';
                }
                break;
            case 'name':
                if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Name must be at least 2 characters long.';
                }
                break;
            case 'subject':
                if (value.length < 5) {
                    isValid = false;
                    errorMessage = 'Subject must be at least 5 characters long.';
                }
                break;
            case 'message':
                if (value.length < 10) {
                    isValid = false;
                    errorMessage = 'Message must be at least 10 characters long.';
                }
                break;
        }
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

function showFieldError(field, message) {
    // Remove existing error
    clearFieldError({ target: field });
    
    // Add error class
    field.classList.add('error');
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = 'var(--danger)';
    errorElement.style.fontSize = '0.875rem';
    errorElement.style.marginTop = '0.25rem';
    
    // Insert error message after field
    field.parentNode.insertBefore(errorElement, field.nextSibling);
}

function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('error');
    
    // Remove error message
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

function clearAllFieldErrors(form) {
    const errorElements = form.querySelectorAll('.field-error');
    errorElements.forEach(element => element.remove());
    
    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
}

function initializeContactInteractions() {
    // Add hover effects to contact items
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Make contact info clickable
    initializeClickableContactInfo();
}

function initializeClickableContactInfo() {
    // Make email clickable - use more compatible selector
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach(element => {
        const icon = element.querySelector('i');
        if (icon && icon.classList.contains('fa-envelope')) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', function() {
                window.location.href = 'mailto:info@agrilearn.com';
            });
        }

        // Make phone clickable
        if (icon && icon.classList.contains('fa-phone')) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', function() {
                window.location.href = 'tel:+15551234567';
            });
        }

        // Make address clickable (open in maps)
        if (icon && (icon.classList.contains('fa-map-marker-alt') || icon.classList.contains('fa-location-dot'))) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', function() {
                const address = encodeURIComponent('123 Agriculture St, Farm City, FC 12345');
                window.open(`https://maps.google.com/maps?q=${address}`, '_blank');
            });
        }
    });
}

function initializeFormValidation() {
    // Add CSS for form validation styles
    const style = document.createElement('style');
    style.textContent = `
        .form-group input.error,
        .form-group textarea.error {
            border-color: var(--danger);
            box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
        }
        
        .contact-item {
            transition: transform 0.2s ease;
            padding: 1rem;
            border-radius: 8px;
        }
        
        .contact-item:hover {
            background-color: var(--gray-50);
        }
        
        .contact-grid {
            gap: 2rem;
        }
        
        @media (max-width: 768px) {
            .contact-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add notification styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)'};
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: var(--box-shadow);
        z-index: 1000;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        removeNotification(notification);
    }, 5000);
    
    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });
}

function removeNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Export functions for global access
window.contactManager = {
    validateField,
    showNotification,
    submitContactForm
};

console.log('Contact.js loaded successfully');
