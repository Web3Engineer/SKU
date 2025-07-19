// Hagan Ace Hardware SKU Lookup System - Main Script

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Main SKU database - stored in localStorage
let skuDatabase = [];

// Constants
const REQUIRED_CLICKS = 12;
const LOCAL_STORAGE_KEY = 'haganAceHardwareSKUs';

// Track clicks on elements
const clickCounts = new Map();
let clickTimer = null;
const CLICK_TIMEOUT = 5000; // 5 seconds to reset click count

// Initialize the application
function initializeApp() {
    loadSkuDatabase();
    setupEventListeners();
    renderSkuList();
}

// Load SKU database from localStorage
function loadSkuDatabase() {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
        try {
            skuDatabase = JSON.parse(storedData);
        } catch (e) {
            console.error('Failed to parse SKU database from localStorage', e);
            skuDatabase = getSampleData(); // Load sample data if parsing fails
            saveSkuDatabase(); // Save the sample data
        }
    } else {
        // If no data exists, load sample data
        skuDatabase = getSampleData();
        saveSkuDatabase(); // Save the sample data
    }
}

// Save SKU database to localStorage
function saveSkuDatabase() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(skuDatabase));
    } catch (e) {
        console.error('Failed to save SKU database to localStorage', e);
        showNotification('Error saving data. Storage might be full.', 'error');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Add SKU button (+ button)
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.innerHTML = '+';
    addBtn.setAttribute('data-id', 'add-sku-btn');
    
    // Handle multiple clicks on add button
    addBtn.addEventListener('click', (e) => {
        handleMultipleClicks(addBtn, () => {
            openModal('add');
        });
    });
    
    document.querySelector('.search-section').appendChild(addBtn);
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterSkuList(searchTerm);
    });
    
    // Close modal button
    document.addEventListener('click', (e) => {
        if (e.target.matches('.close-modal')) {
            closeModal();
        }
    });
    
    // Form submission for adding/editing SKU
    document.addEventListener('submit', (e) => {
        if (e.target.matches('#sku-form')) {
            e.preventDefault();
            handleFormSubmit();
        }
    });
    
    // Add tag button inside modal
    document.addEventListener('click', (e) => {
        if (e.target.matches('.add-tag-btn') || e.target.closest('.add-tag-btn')) {
            addTag();
        }
    });
    
    // Remove tag button inside modal
    document.addEventListener('click', (e) => {
        if (e.target.matches('.remove-tag')) {
            const tagElement = e.target.closest('.tag-item');
            if (tagElement) {
                tagElement.remove();
            }
        }
    });
}

// Handle multiple clicks on an element
function handleMultipleClicks(element, callback) {
    const id = element.getAttribute('data-id');
    
    if (!clickCounts.has(id)) {
        clickCounts.set(id, 0);
    }
    
    // Create or update click count indicator
    let clickIndicator = element.querySelector('.click-count');
    if (!clickIndicator) {
        clickIndicator = document.createElement('div');
        clickIndicator.className = 'click-count';
        element.appendChild(clickIndicator);
    }
    
    // Create or update progress bar
    let progressBar = element.querySelector('.click-progress');
    if (!progressBar && !element.classList.contains('add-btn')) {
        progressBar = document.createElement('div');
        progressBar.className = 'click-progress';
        element.appendChild(progressBar);
    }
    
    // Increment click count
    const currentCount = clickCounts.get(id) + 1;
    clickCounts.set(id, currentCount);
    
    // Update visual indicators
    clickIndicator.textContent = currentCount;
    clickIndicator.classList.add('visible');
    
    if (progressBar) {
        const progress = (currentCount / REQUIRED_CLICKS) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    // Clear existing timeout
    if (clickTimer) {
        clearTimeout(clickTimer);
    }
    
    // Set new timeout to reset clicks
    clickTimer = setTimeout(() => {
        clickCounts.set(id, 0);
        if (clickIndicator) clickIndicator.classList.remove('visible');
        if (progressBar) progressBar.style.width = '0%';
    }, CLICK_TIMEOUT);
    
    // If reached required clicks, execute callback
    if (currentCount >= REQUIRED_CLICKS) {
        clickCounts.set(id, 0);
        if (clickIndicator) clickIndicator.classList.remove('visible');
        if (progressBar) progressBar.style.width = '0%';
        clearTimeout(clickTimer);
        callback();
    }
}

// Open modal for adding or editing SKU
function openModal(mode, skuId = null) {
    let modalHtml = `
        <div class="modal" id="sku-modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2 class="modal-title">${mode === 'add' ? 'Add New SKU' : 'Edit SKU'}</h2>
                <form id="sku-form">
                    <input type="hidden" id="sku-id" value="${skuId || ''}">
                    <input type="hidden" id="form-mode" value="${mode}">
                    
                    <div class="form-group">
                        <label for="sku-name" class="form-label">Product Name:</label>
                        <input type="text" id="sku-name" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="sku-code" class="form-label">SKU Code:</label>
                        <input type="text" id="sku-code" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Tags:</label>
                        <div class="tag-input-container">
                            <input type="text" id="tag-input" class="form-input tag-input" placeholder="Add a tag...">
                            <button type="button" class="add-tag-btn">+</button>
                        </div>
                        <div class="tag-list" id="tag-list">
                            <!-- Tags will be added here -->
                        </div>
                    </div>
                    
                    <button type="submit" class="form-button">
                        ${mode === 'add' ? 'Add SKU' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    `;
    
    // Insert modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal with animation
    setTimeout(() => {
        const modal = document.getElementById('sku-modal');
        modal.style.display = 'flex';
    }, 10);
    
    // If editing, populate form with existing data
    if (mode === 'edit' && skuId) {
        const skuItem = skuDatabase.find(item => item.id === skuId);
        if (skuItem) {
            document.getElementById('sku-name').value = skuItem.name;
            document.getElementById('sku-code').value = skuItem.sku;
            
            const tagList = document.getElementById('tag-list');
            skuItem.tags.forEach(tag => {
                addTagElement(tag);
            });
        }
    }
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('sku-name').focus();
    }, 300);
}

// Close modal
function closeModal() {
    const modal = document.getElementById('sku-modal');
    if (modal) {
        // Fade out animation
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Handle form submission
function handleFormSubmit() {
    const mode = document.getElementById('form-mode').value;
    const skuId = document.getElementById('sku-id').value;
    const name = document.getElementById('sku-name').value;
    const skuCode = document.getElementById('sku-code').value;
    
    // Collect all tags
    const tagElements = document.querySelectorAll('.tag-item');
    const tags = Array.from(tagElements).map(el => el.getAttribute('data-tag'));
    
    if (mode === 'add') {
        // Add new SKU
        const newId = generateId();
        skuDatabase.push({
            id: newId,
            name,
            sku: skuCode,
            tags
        });
        
        showNotification('SKU added successfully!');
    } else {
        // Edit existing SKU
        const index = skuDatabase.findIndex(item => item.id === skuId);
        if (index !== -1) {
            skuDatabase[index] = {
                ...skuDatabase[index],
                name,
                sku: skuCode,
                tags
            };
            
            showNotification('SKU updated successfully!');
        }
    }
    
    // Save and refresh
    saveSkuDatabase();
    renderSkuList();
    closeModal();
}

// Add a tag in the modal
function addTag() {
    const tagInput = document.getElementById('tag-input');
    const tagText = tagInput.value.trim();
    
    if (tagText) {
        addTagElement(tagText);
        tagInput.value = '';
        tagInput.focus();
    }
}

// Add a tag element to the tag list
function addTagElement(tagText) {
    const tagList = document.getElementById('tag-list');
    const tagHtml = `
        <div class="tag-item" data-tag="${tagText}">
            ${tagText}
            <span class="remove-tag">&times;</span>
        </div>
    `;
    tagList.insertAdjacentHTML('beforeend', tagHtml);
}

// Render SKU list
function renderSkuList() {
    const skuContainer = document.querySelector('.sku-container');
    
    if (skuDatabase.length === 0) {
        skuContainer.innerHTML = `
            <div class="no-results">
                No SKU items found. Click the + button 12 times to add a new SKU.
            </div>
        `;
        return;
    }
    
    // Sort by name (alphabetical)
    const sortedSkus = [...skuDatabase].sort((a, b) => a.name.localeCompare(b.name));
    
    let skuHtml = '';
    sortedSkus.forEach(item => {
        const tagsHtml = item.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        
        skuHtml += `
            <div class="sku-item" data-id="${item.id}">
                <div class="sku-name">${item.name}</div>
                <div class="sku-code">${item.sku}</div>
                <div class="sku-tags">
                    ${tagsHtml}
                </div>
            </div>
        `;
    });
    
    skuContainer.innerHTML = skuHtml;
    
    // Add click event listeners for editing
    document.querySelectorAll('.sku-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const id = item.getAttribute('data-id');
            handleMultipleClicks(item, () => {
                openModal('edit', id);
            });
        });
    });
}

// Filter SKU list based on search term
function filterSkuList(searchTerm) {
    const skuContainer = document.querySelector('.sku-container');
    
    if (!searchTerm) {
        renderSkuList();
        return;
    }
    
    const filteredSkus = skuDatabase.filter(item => {
        // Search in name and SKU
        const nameMatch = item.name.toLowerCase().includes(searchTerm);
        const skuMatch = item.sku.toLowerCase().includes(searchTerm);
        
        // Search in tags
        const tagMatch = item.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        return nameMatch || skuMatch || tagMatch;
    });
    
    if (filteredSkus.length === 0) {
        skuContainer.innerHTML = `
            <div class="no-results">
                No matching SKUs found. Try a different search term.
            </div>
        `;
        return;
    }
    
    // Sort filtered results
    const sortedSkus = [...filteredSkus].sort((a, b) => a.name.localeCompare(b.name));
    
    let skuHtml = '';
    sortedSkus.forEach(item => {
        const tagsHtml = item.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        
        skuHtml += `
            <div class="sku-item" data-id="${item.id}">
                <div class="sku-name">${item.name}</div>
                <div class="sku-code">${item.sku}</div>
                <div class="sku-tags">
                    ${tagsHtml}
                </div>
            </div>
        `;
    });
    
    skuContainer.innerHTML = skuHtml;
    
    // Re-add click event listeners
    document.querySelectorAll('.sku-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const id = item.getAttribute('data-id');
            handleMultipleClicks(item, () => {
                openModal('edit', id);
            });
        });
    });
}

// Show notification
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide and remove notification after a delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get sample data for first-time users
function getSampleData() {
    return [
        {
            id: 'sample1',
            name: 'Garden Shovel',
            sku: '12345',
            tags: ['Garden', 'Tools', 'Outdoor']
        },
        {
            id: 'sample2',
            name: 'Potted Plant - Fern',
            sku: '67890',
            tags: ['Plants', 'Garden', 'Indoor']
        },
        {
            id: 'sample3',
            name: 'Hammer',
            sku: '24680',
            tags: ['Tools', 'Hardware']
        },
        {
            id: 'sample4',
            name: 'Light Bulb - LED 60W',
            sku: '13579',
            tags: ['Electrical', 'Lighting']
        },
        {
            id: 'sample5',
            name: 'Paint Brush Set',
            sku: '97531',
            tags: ['Painting', 'Tools', 'Accessories']
        }
    ];
}
