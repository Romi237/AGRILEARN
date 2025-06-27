// Debug helper script to identify and fix common issues
// This script helps diagnose navigation and interaction problems

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Debug Helper: Starting diagnostics...');
    
    // Check for common issues
    checkCSSLoading();
    checkJavaScriptErrors();
    checkNavigationElements();
    checkHoverEffects();
    
    // Set up debugging tools
    setupDebugTools();
});

function checkCSSLoading() {
    console.log('📋 Checking CSS loading...');
    
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach((sheet, index) => {
        if (sheet.sheet) {
            console.log(`✅ CSS ${index + 1} loaded: ${sheet.href}`);
        } else {
            console.error(`❌ CSS ${index + 1} failed to load: ${sheet.href}`);
        }
    });
}

function checkJavaScriptErrors() {
    console.log('📋 Checking JavaScript errors...');
    
    // Override console.error to catch errors
    const originalError = console.error;
    console.error = function(...args) {
        console.log('🚨 JavaScript Error detected:', ...args);
        originalError.apply(console, args);
    };
    
    // Check for missing global objects
    const requiredGlobals = ['authManager', 'navigationUtils'];
    requiredGlobals.forEach(global => {
        if (typeof window[global] !== 'undefined') {
            console.log(`✅ Global object available: ${global}`);
        } else {
            console.warn(`⚠️ Global object missing: ${global}`);
        }
    });
}

function checkNavigationElements() {
    console.log('📋 Checking navigation elements...');
    
    // Check sidebar navigation
    const sidebarNav = document.querySelector('.main-nav');
    if (sidebarNav) {
        console.log('✅ Sidebar navigation found');
        
        const navLinks = sidebarNav.querySelectorAll('a');
        console.log(`📊 Found ${navLinks.length} navigation links`);
        
        navLinks.forEach((link, index) => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            console.log(`  ${index + 1}. ${text} → ${href}`);
        });
    } else {
        console.error('❌ Sidebar navigation not found');
    }
    
    // Check mobile navigation
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
        console.log('✅ Mobile navigation found');
    } else {
        console.warn('⚠️ Mobile navigation not found');
    }
}

function checkHoverEffects() {
    console.log('📋 Checking hover effects...');
    
    const navLinks = document.querySelectorAll('.main-nav a');
    
    navLinks.forEach((link, index) => {
        // Test hover effect
        const originalBg = getComputedStyle(link).backgroundColor;
        
        // Simulate hover
        link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        
        setTimeout(() => {
            const hoverBg = getComputedStyle(link).backgroundColor;
            
            if (originalBg !== hoverBg) {
                console.log(`✅ Hover effect working on link ${index + 1}`);
            } else {
                console.warn(`⚠️ Hover effect not working on link ${index + 1}`);
            }
            
            // Reset
            link.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        }, 100);
    });
}

function setupDebugTools() {
    console.log('🔧 Setting up debug tools...');
    
    // Add debug panel to page
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        max-width: 300px;
        display: none;
    `;
    
    debugPanel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold;">🔧 Debug Panel</div>
        <button onclick="window.debugHelper.testNavigation()" style="margin: 2px; padding: 5px;">Test Navigation</button>
        <button onclick="window.debugHelper.testHover()" style="margin: 2px; padding: 5px;">Test Hover</button>
        <button onclick="window.debugHelper.showInfo()" style="margin: 2px; padding: 5px;">Show Info</button>
        <button onclick="document.getElementById('debug-panel').style.display='none'" style="margin: 2px; padding: 5px;">Close</button>
        <div id="debug-output" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Add keyboard shortcut to show debug panel
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Create debug helper object
    window.debugHelper = {
        testNavigation: function() {
            const output = document.getElementById('debug-output');
            output.innerHTML = '<div>Testing navigation...</div>';
            
            const navLinks = document.querySelectorAll('.main-nav a');
            navLinks.forEach((link, index) => {
                const href = link.getAttribute('href');
                const isClickable = href && href !== '#';
                output.innerHTML += `<div>Link ${index + 1}: ${isClickable ? '✅' : '❌'} ${href}</div>`;
            });
        },
        
        testHover: function() {
            const output = document.getElementById('debug-output');
            output.innerHTML = '<div>Testing hover effects...</div>';
            
            const navLinks = document.querySelectorAll('.main-nav a');
            navLinks.forEach((link, index) => {
                link.style.backgroundColor = 'var(--gray-100)';
                link.style.color = 'var(--primary-color)';
                link.style.transform = 'translateX(3px)';
                
                setTimeout(() => {
                    link.style.backgroundColor = '';
                    link.style.color = '';
                    link.style.transform = '';
                }, 1000);
                
                output.innerHTML += `<div>Tested hover on link ${index + 1}</div>`;
            });
        },
        
        showInfo: function() {
            const output = document.getElementById('debug-output');
            output.innerHTML = `
                <div><strong>Page Info:</strong></div>
                <div>URL: ${window.location.href}</div>
                <div>User Agent: ${navigator.userAgent.substring(0, 50)}...</div>
                <div>Screen: ${screen.width}x${screen.height}</div>
                <div>Viewport: ${window.innerWidth}x${window.innerHeight}</div>
            `;
        }
    };
    
    console.log('✅ Debug tools ready! Press Ctrl+Shift+D to open debug panel');
}

// Export for global access
window.debugHelper = window.debugHelper || {};

console.log('🔧 Debug Helper: Ready! Press Ctrl+Shift+D to open debug panel');
