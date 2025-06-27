// Force hover effects to work immediately
// This script ensures navigation hover effects work regardless of CSS issues

console.log('🔧 Force Hover: Initializing...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForceHover);
} else {
    initForceHover();
}

function initForceHover() {
    console.log('🔧 Force Hover: Setting up navigation hover effects...');
    
    // Force hover effects on navigation links
    const navLinks = document.querySelectorAll('.main-nav a');
    
    if (navLinks.length === 0) {
        console.warn('⚠️ No navigation links found');
        return;
    }
    
    console.log(`✅ Found ${navLinks.length} navigation links`);
    
    navLinks.forEach((link, index) => {
        console.log(`Setting up hover for link ${index + 1}: ${link.textContent.trim()}`);
        
        // Remove any existing event listeners by cloning the element
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        // Add mouseenter event
        newLink.addEventListener('mouseenter', function() {
            console.log(`🖱️ Hover IN: ${this.textContent.trim()}`);
            
            // Apply hover styles directly
            this.style.setProperty('background-color', '#F5F5F5', 'important');
            this.style.setProperty('color', '#2E7D32', 'important');
            this.style.setProperty('transform', 'translateX(5px)', 'important');
            this.style.setProperty('transition', 'all 0.3s ease', 'important');
            this.style.setProperty('box-shadow', '0 2px 8px rgba(46, 125, 50, 0.15)', 'important');
            
            // Apply to icon
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.setProperty('transform', 'translateX(3px)', 'important');
                icon.style.setProperty('color', '#2E7D32', 'important');
                icon.style.setProperty('transition', 'all 0.3s ease', 'important');
            }
        });
        
        // Add mouseleave event
        newLink.addEventListener('mouseleave', function() {
            console.log(`🖱️ Hover OUT: ${this.textContent.trim()}`);
            
            // Only reset if not active
            if (!this.parentElement.classList.contains('active')) {
                this.style.removeProperty('background-color');
                this.style.removeProperty('color');
                this.style.removeProperty('transform');
                this.style.removeProperty('box-shadow');
                
                const icon = this.querySelector('i');
                if (icon) {
                    icon.style.removeProperty('transform');
                    icon.style.removeProperty('color');
                }
            }
        });
        
        // Add click event for navigation
        newLink.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            console.log(`🖱️ Click: ${this.textContent.trim()} → ${href}`);
            
            if (href && href !== '#' && !href.startsWith('javascript:')) {
                // Remove active from all
                document.querySelectorAll('.main-nav li').forEach(li => {
                    li.classList.remove('active');
                });
                
                // Add active to current
                this.parentElement.classList.add('active');
                
                // Navigate
                window.location.href = href;
            }
        });
    });
    
    // Also set up button hover effects
    setupButtonHovers();
    
    // Test hover effects immediately
    setTimeout(testHoverEffects, 1000);
}

function setupButtonHovers() {
    const buttons = document.querySelectorAll('.btn, .btn-primary, .btn-outline');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.setProperty('transform', 'translateY(-2px)', 'important');
            this.style.setProperty('box-shadow', '0 4px 12px rgba(0,0,0,0.15)', 'important');
            this.style.setProperty('transition', 'all 0.3s ease', 'important');
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.removeProperty('transform');
            this.style.removeProperty('box-shadow');
        });
    });
}

function testHoverEffects() {
    console.log('🧪 Testing hover effects...');
    
    const firstNavLink = document.querySelector('.main-nav a');
    if (firstNavLink) {
        console.log('🧪 Simulating hover on first navigation link...');
        
        // Simulate hover
        firstNavLink.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        
        setTimeout(() => {
            firstNavLink.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            console.log('✅ Hover test completed');
        }, 2000);
    }
}

// Add visual indicator that the script is working
function addVisualIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: #2E7D32;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        z-index: 10000;
        font-family: monospace;
    `;
    indicator.textContent = '✅ Hover Effects Active';
    document.body.appendChild(indicator);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 3000);
}

// Add the indicator when script loads
setTimeout(addVisualIndicator, 500);

console.log('✅ Force Hover: Script loaded successfully');
