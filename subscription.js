// Subscription management for AgriLearn
document.addEventListener('DOMContentLoaded', function() {
    initializeSubscription();
});

function initializeSubscription() {
    setupBillingToggle();
    setupPlanSelection();
    setupPaymentModal();
    loadCurrentSubscription();
}

function setupBillingToggle() {
    const billingToggle = document.getElementById('billing-toggle');
    
    if (billingToggle) {
        billingToggle.addEventListener('change', function() {
            toggleBillingPeriod(this.checked);
        });
    }
}

function toggleBillingPeriod(isYearly) {
    const monthlyPrices = document.querySelectorAll('.monthly-price');
    const yearlyPrices = document.querySelectorAll('.yearly-price');
    const yearlySavings = document.querySelectorAll('.yearly-savings');
    
    if (isYearly) {
        monthlyPrices.forEach(price => price.style.display = 'none');
        yearlyPrices.forEach(price => price.style.display = 'inline');
        yearlySavings.forEach(saving => saving.style.display = 'block');
    } else {
        monthlyPrices.forEach(price => price.style.display = 'inline');
        yearlyPrices.forEach(price => price.style.display = 'none');
        yearlySavings.forEach(saving => saving.style.display = 'none');
    }
}

function setupPlanSelection() {
    const planButtons = document.querySelectorAll('[data-plan]');
    
    planButtons.forEach(button => {
        button.addEventListener('click', function() {
            const planType = this.dataset.plan;
            const isYearly = document.getElementById('billing-toggle').checked;
            
            openPaymentModal(planType, isYearly);
        });
    });
}

function openPaymentModal(planType, isYearly) {
    const modal = document.getElementById('payment-modal');
    const selectedPlan = document.getElementById('selected-plan');
    const selectedBilling = document.getElementById('selected-billing');
    const totalAmount = document.getElementById('total-amount');
    
    // Plan pricing
    const pricing = {
        premium: {
            monthly: 29.99,
            yearly: 23.99
        },
        pro: {
            monthly: 49.99,
            yearly: 39.99
        }
    };
    
    const planPrice = pricing[planType][isYearly ? 'yearly' : 'monthly'];
    const billingPeriod = isYearly ? 'Yearly' : 'Monthly';
    
    // Update modal content
    selectedPlan.textContent = planType.charAt(0).toUpperCase() + planType.slice(1);
    selectedBilling.textContent = billingPeriod;
    totalAmount.textContent = `$${planPrice}/${isYearly ? 'year' : 'month'}`;
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function setupPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancel-payment');
    const paymentForm = document.getElementById('payment-form');
    
    // Close modal handlers
    [closeBtn, cancelBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                closePaymentModal();
            });
        }
    });
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closePaymentModal();
        }
    });
    
    // Payment form submission
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment(this);
        });
        
        // Format card number input
        const cardNumberInput = document.getElementById('card-number');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', function() {
                formatCardNumber(this);
            });
        }
        
        // Format expiry date input
        const expiryInput = document.getElementById('expiry');
        if (expiryInput) {
            expiryInput.addEventListener('input', function() {
                formatExpiryDate(this);
            });
        }
        
        // Format CVV input
        const cvvInput = document.getElementById('cvv');
        if (cvvInput) {
            cvvInput.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '').slice(0, 4);
            });
        }
    }
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset form
    const form = document.getElementById('payment-form');
    if (form) {
        form.reset();
    }
}

function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = value.slice(0, 19); // Max 16 digits + 3 spaces
}

function formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    input.value = value;
}

function processPayment(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.textContent = 'Processing Payment...';
    submitButton.disabled = true;
    
    // Get form data
    const formData = new FormData(form);
    const paymentData = {
        cardNumber: formData.get('card-number'),
        expiry: formData.get('expiry'),
        cvv: formData.get('cvv'),
        cardholderName: formData.get('cardholder-name'),
        plan: document.getElementById('selected-plan').textContent,
        billing: document.getElementById('selected-billing').textContent,
        amount: document.getElementById('total-amount').textContent
    };
    
    // Validate payment data
    if (!validatePaymentData(paymentData)) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        return;
    }
    
    // Simulate payment processing
    setTimeout(() => {
        // Reset button
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        // Process successful payment
        handleSuccessfulPayment(paymentData);
        
    }, 3000);
}

function validatePaymentData(data) {
    // Basic validation
    const cardNumber = data.cardNumber.replace(/\s/g, '');
    
    if (cardNumber.length < 13 || cardNumber.length > 19) {
        window.AgriLearn.showNotification('Please enter a valid card number', 'error');
        return false;
    }
    
    if (!data.expiry.match(/^\d{2}\/\d{2}$/)) {
        window.AgriLearn.showNotification('Please enter a valid expiry date (MM/YY)', 'error');
        return false;
    }
    
    if (data.cvv.length < 3 || data.cvv.length > 4) {
        window.AgriLearn.showNotification('Please enter a valid CVV', 'error');
        return false;
    }
    
    if (!data.cardholderName.trim()) {
        window.AgriLearn.showNotification('Please enter the cardholder name', 'error');
        return false;
    }
    
    return true;
}

function handleSuccessfulPayment(paymentData) {
    // Update user subscription in localStorage
    const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
    user.subscription = paymentData.plan.toLowerCase();
    user.subscriptionExpiry = calculateExpiryDate(paymentData.billing);
    user.paymentMethod = `**** **** **** ${paymentData.cardNumber.slice(-4)}`;
    
    localStorage.setItem('agrilearn_user', JSON.stringify(user));
    
    // Close modal
    closePaymentModal();
    
    // Show success message
    window.AgriLearn.showNotification(`Successfully upgraded to ${paymentData.plan} plan!`, 'success');
    
    // Update page content
    setTimeout(() => {
        updateSubscriptionDisplay(user);
    }, 1000);
}

function calculateExpiryDate(billingPeriod) {
    const now = new Date();
    if (billingPeriod === 'Yearly') {
        now.setFullYear(now.getFullYear() + 1);
    } else {
        now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
}

function updateSubscriptionDisplay(user) {
    // Update current plan badge
    const planBadge = document.querySelector('.current-plan-badge .plan-name');
    if (planBadge) {
        planBadge.textContent = `${user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)} Plan`;
    }
    
    // Update subscription card
    const subscriptionCard = document.querySelector('.subscription-card');
    if (subscriptionCard) {
        const planType = subscriptionCard.querySelector('h3');
        const planCost = subscriptionCard.querySelector('.detail-value');
        const nextBilling = subscriptionCard.querySelectorAll('.detail-value')[3];
        
        if (planType) {
            planType.textContent = `Current Plan: ${user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)}`;
        }
        
        if (planCost) {
            const cost = user.subscription === 'premium' ? '$29.99' : '$49.99';
            planCost.textContent = cost;
        }
        
        if (nextBilling) {
            const expiryDate = new Date(user.subscriptionExpiry);
            nextBilling.textContent = expiryDate.toLocaleDateString();
        }
    }
    
    // Update action button
    const actionButton = document.querySelector('.subscription-actions .btn');
    if (actionButton) {
        if (user.subscription === 'pro') {
            actionButton.textContent = 'Manage Plan';
        } else {
            actionButton.textContent = 'Upgrade to Pro';
        }
    }
}

function loadCurrentSubscription() {
    const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
    
    if (user.subscription && user.subscription !== 'free') {
        updateSubscriptionDisplay(user);
    }
}

// Subscription management functions
function cancelSubscription() {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
        const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
        user.subscriptionStatus = 'cancelled';
        localStorage.setItem('agrilearn_user', JSON.stringify(user));
        
        window.AgriLearn.showNotification('Subscription cancelled. You will retain access until your current billing period ends.', 'info');
    }
}

function pauseSubscription() {
    if (confirm('Would you like to pause your subscription? You can resume it anytime.')) {
        const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
        user.subscriptionStatus = 'paused';
        localStorage.setItem('agrilearn_user', JSON.stringify(user));
        
        window.AgriLearn.showNotification('Subscription paused successfully.', 'success');
    }
}

// Export functions
window.cancelSubscription = cancelSubscription;
window.pauseSubscription = pauseSubscription;