// Resources page functionality
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeResources();
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('agrilearn_user'));
    const token = localStorage.getItem('agrilearn_token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    if (user.role !== 'teacher') {
        alert('Access denied. This page is only accessible to teachers.');
        window.location.href = 'student-dashboard.html';
        return;
    }

    // Update user name in header
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.name;
    }
}

function initializeResources() {
    // Initialize weather data
    loadWeatherData();
    
    // Initialize news feed
    loadNews();
    
    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.onclick.toString().match(/showTab\('(.+?)'\)/)[1];
            showTab(tabName);
        });
    });
}

function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    const activeButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

function calculateFertilizer() {
    const fieldArea = parseFloat(document.getElementById('field-area').value);
    const cropType = document.getElementById('crop-type').value;
    const soilType = document.getElementById('soil-type').value;
    
    if (!fieldArea || fieldArea <= 0) {
        alert('Please enter a valid field area');
        return;
    }
    
    // Fertilizer recommendations based on crop and soil type
    const fertilizerRates = {
        wheat: { N: 120, P: 60, K: 40 },
        corn: { N: 150, P: 80, K: 60 },
        rice: { N: 100, P: 50, K: 50 },
        soybeans: { N: 40, P: 60, K: 80 },
        vegetables: { N: 180, P: 100, K: 120 }
    };
    
    const soilModifiers = {
        clay: { N: 1.1, P: 1.2, K: 0.9 },
        loam: { N: 1.0, P: 1.0, K: 1.0 },
        sandy: { N: 1.2, P: 0.8, K: 1.1 },
        silt: { N: 1.0, P: 1.1, K: 0.95 }
    };
    
    const baseRates = fertilizerRates[cropType];
    const modifiers = soilModifiers[soilType];
    
    const nitrogenNeeded = Math.round(fieldArea * baseRates.N * modifiers.N);
    const phosphorusNeeded = Math.round(fieldArea * baseRates.P * modifiers.P);
    const potassiumNeeded = Math.round(fieldArea * baseRates.K * modifiers.K);
    
    const resultDiv = document.getElementById('fertilizer-result');
    const detailsDiv = document.getElementById('fertilizer-details');
    
    detailsDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center;">
                <h4 style="color: #2e7d32; margin: 0 0 10px 0;">Nitrogen (N)</h4>
                <div style="font-size: 1.5rem; font-weight: bold; color: #2e7d32;">${nitrogenNeeded} kg</div>
                <div style="font-size: 0.9rem; color: #666;">For ${fieldArea} hectares</div>
            </div>
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; text-align: center;">
                <h4 style="color: #f57c00; margin: 0 0 10px 0;">Phosphorus (P)</h4>
                <div style="font-size: 1.5rem; font-weight: bold; color: #f57c00;">${phosphorusNeeded} kg</div>
                <div style="font-size: 0.9rem; color: #666;">For ${fieldArea} hectares</div>
            </div>
            <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
                <h4 style="color: #7b1fa2; margin: 0 0 10px 0;">Potassium (K)</h4>
                <div style="font-size: 1.5rem; font-weight: bold; color: #7b1fa2;">${potassiumNeeded} kg</div>
                <div style="font-size: 0.9rem; color: #666;">For ${fieldArea} hectares</div>
            </div>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4 style="color: #2c5530; margin: 0 0 10px 0;">Application Notes:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
                <li>Apply nitrogen in split doses for better efficiency</li>
                <li>Phosphorus should be applied at planting time</li>
                <li>Potassium can be applied before planting or as side dressing</li>
                <li>Adjust rates based on soil test results when available</li>
            </ul>
        </div>
    `;
    
    resultDiv.classList.add('show');
}

function showSeedCalculator() {
    alert('Seed Calculator feature coming soon! This will help you calculate optimal seeding rates for different crops.');
}

function showIrrigationPlanner() {
    alert('Irrigation Planner feature coming soon! This will help you plan irrigation schedules based on crop needs and weather.');
}

function showYieldEstimator() {
    alert('Yield Estimator feature coming soon! This will help you estimate potential crop yields based on various factors.');
}

function loadWeatherData() {
    // Simulate weather data loading
    // In a real application, this would fetch from a weather API
    const weatherData = {
        current: {
            temperature: 25,
            condition: 'sunny',
            humidity: 65,
            windSpeed: 12,
            icon: 'fas fa-sun'
        },
        forecast: [
            { day: 'Today', high: 25, low: 18, condition: 'sunny' },
            { day: 'Tomorrow', high: 27, low: 19, condition: 'partly-cloudy' },
            { day: 'Friday', high: 23, low: 16, condition: 'rainy' }
        ]
    };
    
    updateWeatherDisplay(weatherData);
}

function updateWeatherDisplay(data) {
    const weatherWidget = document.querySelector('.weather-widget');
    if (weatherWidget) {
        const iconElement = weatherWidget.querySelector('.weather-icon i');
        const tempElement = weatherWidget.querySelector('.weather-temp');
        const descElement = weatherWidget.querySelector('.weather-desc');
        const detailsElement = weatherWidget.querySelector('.weather-details');
        
        if (iconElement) iconElement.className = data.current.icon;
        if (tempElement) tempElement.textContent = `${data.current.temperature}°C`;
        if (descElement) descElement.textContent = data.current.condition.charAt(0).toUpperCase() + data.current.condition.slice(1);
        
        if (detailsElement) {
            detailsElement.innerHTML = `
                <p>Humidity: ${data.current.humidity}% | Wind: ${data.current.windSpeed} km/h</p>
                <p>Perfect conditions for field work</p>
            `;
        }
    }
}

function loadNews() {
    // Simulate news loading
    // In a real application, this would fetch from a news API or backend
    const newsData = [
        {
            date: 'June 25, 2025',
            title: 'New Sustainable Farming Techniques Show Promise',
            summary: 'Recent studies demonstrate significant improvements in crop yields using regenerative agriculture practices, with farmers reporting 15-20% increase in productivity while reducing environmental impact.'
        },
        {
            date: 'June 24, 2025',
            title: 'Government Announces New Agricultural Subsidies',
            summary: 'The agriculture ministry has announced new subsidy programs to support small-scale farmers, including grants for organic certification and sustainable farming equipment purchases.'
        },
        {
            date: 'June 23, 2025',
            title: 'Climate-Resistant Crop Varieties Released',
            summary: 'Agricultural researchers have developed new crop varieties that can withstand extreme weather conditions, offering hope for farmers facing climate change challenges.'
        },
        {
            date: 'June 22, 2025',
            title: 'Digital Farming Tools Gain Popularity',
            summary: 'More farmers are adopting digital tools and IoT sensors to monitor crop health and optimize resource usage, leading to more efficient and profitable farming operations.'
        }
    ];
    
    updateNewsDisplay(newsData);
}

function updateNewsDisplay(newsData) {
    const newsTab = document.getElementById('news');
    if (newsTab) {
        newsTab.innerHTML = newsData.map(item => `
            <div class="news-item">
                <div class="news-date">${item.date}</div>
                <div class="news-title">${item.title}</div>
                <div class="news-summary">${item.summary}</div>
            </div>
        `).join('');
    }
}

// User menu functionality
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function logout() {
    localStorage.removeItem('agrilearn_user');
    localStorage.removeItem('agrilearn_token');
    window.location.href = 'login.html';
}

// Close user menu when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('user-dropdown');
    
    if (userMenu && dropdown && !userMenu.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Auto-refresh weather data every 30 minutes
setInterval(loadWeatherData, 30 * 60 * 1000);

// Auto-refresh news every hour
setInterval(loadNews, 60 * 60 * 1000);
