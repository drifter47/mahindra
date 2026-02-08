// ===== Configuration =====
// Replace this URL with your Google Apps Script Web App URL after deployment
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwt94QhodDBL34XJJDaVGjL_qpwr64CsmQol6cGlwPwfiPALMgT4F-xliCnIbOhq-bE/exec';

// ===== DOM Elements =====
const orderForm = document.getElementById('orderForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const slNoInput = document.getElementById('slNo');
const dateInput = document.getElementById('date');
const totalAmountInput = document.getElementById('totalAmount');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const ordersList = document.getElementById('ordersList');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const toast = document.getElementById('toast');
const itemsContainer = document.getElementById('itemsContainer');
const addItemBtn = document.getElementById('addItemBtn');

// Photo upload elements
const cameraInput = document.getElementById('cameraInput');
const galleryInput = document.getElementById('galleryInput');
const photoPreview = document.getElementById('photoPreview');
const photoPlaceholder = document.getElementById('photoPlaceholder');
const photoPreviewArea = document.getElementById('photoPreviewArea');
const photoRemoveBtn = document.getElementById('photoRemoveBtn');

// ===== State =====
let orders = [];
let dailyCounter = 1;
let itemCount = 1;
let photoBase64 = null; // Store the photo as base64

// ===== Accessories Configuration =====
// Add/modify accessories here - partNo can be empty if multiple part numbers exist
const ACCESSORIES = [
    { name: 'Alloy Wheels', partNo: '' },
    { name: 'Body Side Molding Kit', partNo: '' },
    { name: 'Car Audio', partNo: '' },
    { name: 'Car Charger', partNo: '' },
    { name: 'Car Body Cover', partNo: '' },
    { name: 'Cargo Chain', partNo: '' },
    { name: 'Floor Mat', partNo: '' },
    { name: 'Fog Lamp', partNo: '' },
    { name: 'Horn', partNo: '' },
    { name: 'Infotainment System', partNo: '' },
    { name: 'Mud Flap', partNo: '' },
    { name: 'Front Parking Sensor', partNo: '' },
    { name: 'Perfume', partNo: '' },
    { name: 'Power Window', partNo: '' },
    { name: 'Rain Visor', partNo: '' },
    { name: 'Remote Central Lock', partNo: '' },
    { name: 'Reverse Camera', partNo: '' },
    { name: 'Roof Carrier', partNo: '' },
    { name: 'Roof Rail', partNo: '' },
    { name: 'Scuff Plate', partNo: '' },
    { name: 'Seat Cover', partNo: '' },
    { name: 'Side Step', partNo: '' },
    { name: 'Side Step Flap', partNo: '' },
    { name: 'Speaker', partNo: '' },
    { name: 'Spoiler', partNo: '' },
    { name: 'Steering Cover', partNo: '' },
    { name: 'Sun Shade Set', partNo: '' },
    { name: 'Wheel Cover', partNo: '' },
    { name: 'Underbody', partNo: '' },
    { name: 'Paint Protection Film', partNo: '' }
];

// Get/save usage stats from localStorage
function getAccessoryUsage() {
    return JSON.parse(localStorage.getItem('accessoryUsage') || '{}');
}

function incrementAccessoryUsage(name) {
    const usage = getAccessoryUsage();
    usage[name] = (usage[name] || 0) + 1;
    localStorage.setItem('accessoryUsage', JSON.stringify(usage));
}

// Custom items management
function getCustomItems() {
    return JSON.parse(localStorage.getItem('customAccessories') || '[]');
}

function saveCustomItem(name, partNo = '') {
    const customs = getCustomItems();
    // Check if already exists
    if (!customs.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        customs.push({ name: name, partNo: partNo });
        localStorage.setItem('customAccessories', JSON.stringify(customs));
    }
}

// Get sorted accessories (frequently used first)
function getSortedAccessories() {
    const usage = getAccessoryUsage();
    const frequent = [], others = [];

    ACCESSORIES.forEach(acc => {
        if (usage[acc.name] >= 1) {
            frequent.push({ ...acc, count: usage[acc.name] });
        } else {
            others.push(acc);
        }
    });

    frequent.sort((a, b) => b.count - a.count);
    return { frequent, others };
}

// Generate dropdown HTML dynamically
function generateDropdownHTML() {
    const { frequent, others } = getSortedAccessories();
    const customItems = getCustomItems();
    const usage = getAccessoryUsage();

    let html = '<option value="">-- Select Accessory --</option>';

    // Frequently used (including custom items that have been used)
    const allFrequent = [...frequent];
    customItems.forEach(c => {
        if (usage[c.name] >= 1) {
            allFrequent.push({ ...c, count: usage[c.name] });
        }
    });
    allFrequent.sort((a, b) => b.count - a.count);

    if (allFrequent.length > 0) {
        html += '<optgroup label="⭐ Frequently Used">';
        allFrequent.forEach(a => html += `<option value="${a.name}">${a.name}</option>`);
        html += '</optgroup>';
    }

    // Custom items (that haven't been used yet)
    const unusedCustoms = customItems.filter(c => !usage[c.name] || usage[c.name] < 1);
    if (unusedCustoms.length > 0) {
        html += '<optgroup label="📝 Your Custom Items">';
        unusedCustoms.forEach(a => html += `<option value="${a.name}">${a.name}</option>`);
        html += '</optgroup>';
    }

    // All standard accessories
    html += '<optgroup label="All Accessories">';
    others.forEach(a => html += `<option value="${a.name}">${a.name}</option>`);
    html += '</optgroup>';

    html += '<optgroup label="Other"><option value="custom">✏️ Add New Custom Item...</option></optgroup>';
    return html;
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeDate();
    initializeSerialNumber();
    initializeFirstDropdown();
    setupEventListeners();
    calculateTotal();
});

// Initialize the first accessory dropdown
function initializeFirstDropdown() {
    const firstSelect = document.getElementById('firstAccessorySelect');
    if (firstSelect) {
        firstSelect.innerHTML = generateDropdownHTML();
    }
}

// ===== Theme Management =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ===== Date Initialization =====
function initializeDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// ===== Serial Number Management (Resets Daily) =====
function initializeSerialNumber() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('slNoDate');
    const savedCounter = localStorage.getItem('slNoCounter');

    if (savedDate === today && savedCounter) {
        dailyCounter = parseInt(savedCounter, 10);
    } else {
        // New day - reset counter
        dailyCounter = 1;
        localStorage.setItem('slNoDate', today);
    }

    updateSerialNumberDisplay();
}

function updateSerialNumberDisplay() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    slNoInput.value = `${dateStr}-${String(dailyCounter).padStart(3, '0')}`;
}

function incrementSerialNumber() {
    dailyCounter++;
    localStorage.setItem('slNoCounter', dailyCounter.toString());
    localStorage.setItem('slNoDate', new Date().toDateString());
    updateSerialNumberDisplay();
}

// ===== Multi-Item Management =====
function addItem() {
    itemCount++;
    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';
    itemCard.dataset.itemIndex = itemCount - 1;
    itemCard.innerHTML = `
        <div class="item-header">
            <span class="item-number">Item ${itemCount}</span>
            <button type="button" class="remove-item-btn" onclick="removeItem(this)" title="Remove item">×</button>
        </div>
        <div class="form-group">
            <label>Select Accessory <span class="required">*</span></label>
            <select name="accessorySelect[]" class="accessory-select" onchange="handleAccessorySelect(this)" required>
                ${generateDropdownHTML()}
            </select>
        </div>
        <div class="form-group custom-item-group hidden">
            <label>Custom Item Name</label>
            <input type="text" name="customItem[]" class="custom-item-input" placeholder="Enter custom accessory name">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Part No.</label>
                <input type="text" name="partNo[]" placeholder="Part number">
            </div>
            <div class="form-group">
                <label>Amount (₹) <span class="required">*</span></label>
                <input type="number" name="amount[]" placeholder="0" min="0" step="0.01" required class="item-amount" onchange="calculateTotal()">
            </div>
        </div>
    `;
    itemsContainer.appendChild(itemCard);

    // Focus on the accessory dropdown
    itemCard.querySelector('select[name="accessorySelect[]"]').focus();

    // Animate the new card
    itemCard.style.opacity = '0';
    itemCard.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        itemCard.style.transition = 'all 0.3s ease';
        itemCard.style.opacity = '1';
        itemCard.style.transform = 'translateY(0)';
    }, 10);

    updateItemNumbers();
}

// Get part number for accessory from ACCESSORIES array
function getPartNo(name) {
    const acc = ACCESSORIES.find(a => a.name === name);
    return acc ? acc.partNo : '';
}

function handleAccessorySelect(select) {
    const card = select.closest('.item-card');
    const customGroup = card.querySelector('.custom-item-group');
    const customInput = card.querySelector('.custom-item-input');
    const partNoInput = card.querySelector('input[name="partNo[]"]');

    if (select.value === 'custom') {
        customGroup.classList.remove('hidden');
        customInput.required = true;
        customInput.focus();
        partNoInput.value = '';
    } else {
        customGroup.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';

        // Auto-fill part number if available
        const partNo = getPartNo(select.value);
        if (partNo) {
            partNoInput.value = partNo;
        }
    }
}

function removeItem(button) {
    const card = button.closest('.item-card');
    const cards = itemsContainer.querySelectorAll('.item-card');

    // Don't remove if it's the only item
    if (cards.length <= 1) {
        showToast('At least one item is required', 'error');
        return;
    }

    // Animate removal
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateX(-20px)';

    setTimeout(() => {
        card.remove();
        updateItemNumbers();
        calculateTotal();
    }, 300);
}

function updateItemNumbers() {
    const cards = itemsContainer.querySelectorAll('.item-card');
    cards.forEach((card, index) => {
        card.querySelector('.item-number').textContent = `Item ${index + 1}`;
        card.dataset.itemIndex = index;
    });
    itemCount = cards.length;
}

function calculateTotal() {
    const amountInputs = document.querySelectorAll('.item-amount');
    let total = 0;

    amountInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });

    totalAmountInput.value = `₹ ${formatAmount(total)}`;
}

function getItems() {
    const cards = itemsContainer.querySelectorAll('.item-card');
    const items = [];

    cards.forEach(card => {
        const select = card.querySelector('select[name="accessorySelect[]"]');
        const customInput = card.querySelector('input[name="customItem[]"]');
        const partNoInput = card.querySelector('input[name="partNo[]"]');

        // Get description from dropdown or custom input
        let description = select.value;
        let isCustom = false;

        if (description === 'custom' && customInput) {
            description = customInput.value.trim();
            isCustom = true;
        }

        items.push({
            description: description,
            partNo: partNoInput.value.trim(),
            amount: parseFloat(card.querySelector('input[name="amount[]"]').value) || 0,
            isCustom: isCustom
        });
    });

    return items;
}

function resetItems() {
    // Keep only the first item card and clear it
    const cards = itemsContainer.querySelectorAll('.item-card');
    cards.forEach((card, index) => {
        if (index === 0) {
            // Clear first card
            card.querySelectorAll('input').forEach(input => input.value = '');
            card.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
            card.querySelector('.custom-item-group')?.classList.add('hidden');
        } else {
            // Remove other cards
            card.remove();
        }
    });
    itemCount = 1;
    updateItemNumbers();
    calculateTotal();
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Tab navigation
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Form submission
    orderForm.addEventListener('submit', handleFormSubmit);

    // Add item button
    addItemBtn.addEventListener('click', addItem);

    // Search orders
    searchInput.addEventListener('input', filterOrders);

    // Refresh orders
    refreshBtn.addEventListener('click', fetchOrders);

    // Photo upload handlers
    cameraInput.addEventListener('change', handlePhotoUpload);
    galleryInput.addEventListener('change', handlePhotoUpload);
    photoRemoveBtn.addEventListener('click', removePhoto);

    // Date change - check if we need to reset serial number
    dateInput.addEventListener('change', () => {
        const selectedDate = new Date(dateInput.value).toDateString();
        const today = new Date().toDateString();

        if (selectedDate !== today) {
            slNoInput.value = 'Will be assigned';
        } else {
            updateSerialNumberDisplay();
        }
    });
}

// ===== Tab Navigation =====
function switchTab(tabName) {
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-section`);
    });

    if (tabName === 'history') {
        fetchOrders();
    }
}

// ===== Form Submission =====
async function handleFormSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) return;

    // Show loading state
    setLoadingState(true);

    // Get items
    const items = getItems();

    // Calculate total from items
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Format items for Google Sheets (as text)
    const itemDescriptions = items.map(i => i.description).join(' | ');
    const partNumbers = items.map(i => i.partNo || '-').join(' | ');
    const amounts = items.map(i => `₹${i.amount}`).join(' | ');

    // Gather form data
    const formData = {
        slNo: slNoInput.value,
        date: dateInput.value,
        otfNo: document.getElementById('otfNo').value.trim(),
        customerName: document.getElementById('customerName').value.trim(),
        vehicleModel: document.getElementById('vehicleModel').value,
        chassisNo: document.getElementById('chassisNo').value.trim(),
        itemDescription: itemDescriptions,
        partNo: partNumbers,
        amount: amounts,
        totalAmount: totalAmount,
        status: document.getElementById('status').value,
        remarks: document.getElementById('remarks').value.trim(),
        items: items, // Keep structured data for local storage
        photo: photoBase64 // Include photo in form data
    };

    try {
        // Check if Apps Script URL is configured
        if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            // Demo mode - save to localStorage
            saveToLocalStorage(formData);
            showToast('Order saved locally (Demo Mode)', 'success');
        } else {
            // Submit to Google Sheets
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            showToast('Order submitted successfully!', 'success');
        }

        // Track accessory usage for smart sorting and save custom items
        items.forEach(item => {
            if (item.description && item.description !== 'custom') {
                // Save custom items for future use
                if (item.isCustom) {
                    saveCustomItem(item.description, item.partNo);
                }
                // Track usage
                incrementAccessoryUsage(item.description);
            }
        });

        // Increment serial number for next order
        incrementSerialNumber();

        // Reset form
        orderForm.reset();
        initializeDate();
        updateSerialNumberDisplay();
        resetItems();
        resetPhoto();
        initializeFirstDropdown(); // Refresh dropdown with updated usage stats

    } catch (error) {
        console.error('Submission error:', error);

        // Fallback to localStorage
        saveToLocalStorage(formData);
        showToast('Saved locally. Will sync when online.', 'warning');
    } finally {
        setLoadingState(false);
    }
}

// ===== Form Validation =====
function validateForm() {
    const requiredFields = orderForm.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'var(--error)';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });

    if (!isValid) {
        showToast('Please fill all required fields', 'error');
    }

    return isValid;
}

// ===== Loading State =====
function setLoadingState(loading) {
    submitBtn.disabled = loading;
    btnText.textContent = loading ? 'Submitting...' : 'Submit Order';
    btnLoader.classList.toggle('hidden', !loading);
}

// ===== Local Storage =====
function saveToLocalStorage(data) {
    const localOrders = JSON.parse(localStorage.getItem('mahindraOrders') || '[]');
    data.id = Date.now();
    data.synced = false;
    localOrders.unshift(data);
    localStorage.setItem('mahindraOrders', JSON.stringify(localOrders));
}

function getLocalOrders() {
    return JSON.parse(localStorage.getItem('mahindraOrders') || '[]');
}

// ===== Fetch Orders =====
async function fetchOrders() {
    ordersList.innerHTML = '<div class="loading-state">Loading orders...</div>';

    try {
        if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            // Demo mode - load from localStorage
            orders = getLocalOrders();
        } else {
            // Fetch from Google Sheets
            const response = await fetch(`${APPS_SCRIPT_URL}?action=getOrders`);
            orders = await response.json();
        }

        renderOrders(orders);
    } catch (error) {
        console.error('Fetch error:', error);
        // Fallback to localStorage
        orders = getLocalOrders();
        renderOrders(orders);
    }
}

// ===== Render Orders =====
function renderOrders(ordersToRender) {
    if (ordersToRender.length === 0) {
        ordersList.innerHTML = '<div class="empty-state">No orders found</div>';
        return;
    }

    ordersList.innerHTML = ordersToRender.map(order => {
        // Count items if available
        const itemCount = order.items ? order.items.length :
            (order.itemDescription ? order.itemDescription.split(' | ').length : 1);

        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">OTF: ${escapeHtml(order.otfNo || 'N/A')}</div>
                        <div class="order-date">${formatDate(order.date)} • ${itemCount} item(s)</div>
                    </div>
                    <span class="order-status status-${(order.status || 'pending').toLowerCase().replace(' ', '-')}">
                        ${escapeHtml(order.status || 'Pending')}
                    </span>
                </div>
                <div class="order-customer">${escapeHtml(order.customerName || 'Unknown')}</div>
                <div class="order-vehicle">${escapeHtml(order.vehicleModel || 'N/A')} • ${escapeHtml(order.chassisNo || 'N/A')}</div>
                <div class="order-footer">
                    <span class="order-amount">₹${formatAmount(order.totalAmount)}</span>
                    <span class="order-id">#${escapeHtml(order.slNo || 'N/A')}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Filter Orders =====
function filterOrders() {
    const query = searchInput.value.toLowerCase();
    const filtered = orders.filter(order =>
        (order.customerName || '').toLowerCase().includes(query) ||
        (order.otfNo || '').toLowerCase().includes(query) ||
        (order.vehicleModel || '').toLowerCase().includes(query) ||
        (order.chassisNo || '').toLowerCase().includes(query) ||
        (order.itemDescription || '').toLowerCase().includes(query)
    );
    renderOrders(filtered);
}

// ===== Toast Notification =====
function showToast(message, type = 'info') {
    const toastMessage = toast.querySelector('.toast-message');
    toastMessage.textContent = message;

    toast.className = 'toast';
    if (type) toast.classList.add(type);
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatAmount(amount) {
    if (!amount) return '0';
    return parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// ===== Photo Upload Functions =====
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('Image size must be less than 10MB', 'error');
        return;
    }

    // Show loading state
    photoPreviewArea.classList.add('loading');

    const reader = new FileReader();
    reader.onload = function (e) {
        // Compress the image before storing
        compressImage(e.target.result, 800, 0.7, (compressedBase64) => {
            photoBase64 = compressedBase64;

            // Update UI
            photoPreview.src = compressedBase64;
            photoPreview.classList.remove('hidden');
            photoPlaceholder.classList.add('hidden');
            photoRemoveBtn.classList.remove('hidden');
            photoPreviewArea.classList.add('has-photo');
            photoPreviewArea.classList.remove('loading');

            showToast('Photo uploaded successfully', 'success');
        });
    };
    reader.onerror = function () {
        photoPreviewArea.classList.remove('loading');
        showToast('Error reading file', 'error');
    };
    reader.readAsDataURL(file);

    // Clear the input so the same file can be selected again
    event.target.value = '';
}

function removePhoto() {
    photoBase64 = null;
    photoPreview.src = '';
    photoPreview.classList.add('hidden');
    photoPlaceholder.classList.remove('hidden');
    photoRemoveBtn.classList.add('hidden');
    photoPreviewArea.classList.remove('has-photo');
    showToast('Photo removed', 'info');
}

function resetPhoto() {
    photoBase64 = null;
    photoPreview.src = '';
    photoPreview.classList.add('hidden');
    photoPlaceholder.classList.remove('hidden');
    photoRemoveBtn.classList.add('hidden');
    photoPreviewArea.classList.remove('has-photo');
}

function compressImage(base64, maxWidth, quality, callback) {
    const img = new Image();
    img.onload = function () {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Get compressed base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        callback(compressedBase64);
    };
    img.src = base64;
}
