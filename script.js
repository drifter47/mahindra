// ===== Configuration =====
// Replace this URL with your Google Apps Script Web App URL after deployment
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyduBHDWBMwpToBXgo8VdfZrwljAWD7PLdjG5a1RSWBzgM4TnBB-rdsI6ES7AKZERep/exec';

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

// ===== State =====
let orders = [];
let dailyCounter = 1;
let itemCount = 1;

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeDate();
    initializeSerialNumber();
    setupEventListeners();
    calculateTotal();
});

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
                <option value="">-- Select Accessory --</option>
                <optgroup label="Exterior">
                    <option value="Mud Flaps">Mud Flaps</option>
                    <option value="Side Steps">Side Steps</option>
                    <option value="Roof Rails">Roof Rails</option>
                    <option value="Door Visor">Door Visor</option>
                    <option value="Body Cover">Body Cover</option>
                    <option value="Bumper Guard">Bumper Guard</option>
                    <option value="Bull Bar">Bull Bar</option>
                    <option value="Tail Lamp Garnish">Tail Lamp Garnish</option>
                    <option value="Chrome Kit">Chrome Kit</option>
                </optgroup>
                <optgroup label="Interior">
                    <option value="Seat Cover">Seat Cover</option>
                    <option value="Floor Mats">Floor Mats</option>
                    <option value="Dashboard Kit">Dashboard Kit</option>
                    <option value="Steering Cover">Steering Cover</option>
                    <option value="Sun Shade">Sun Shade</option>
                    <option value="Neck Pillow">Neck Pillow</option>
                    <option value="Cushion Set">Cushion Set</option>
                </optgroup>
                <optgroup label="Electronics">
                    <option value="Reverse Camera">Reverse Camera</option>
                    <option value="Parking Sensors">Parking Sensors</option>
                    <option value="Music System">Music System</option>
                    <option value="Speaker Set">Speaker Set</option>
                    <option value="LED Lights">LED Lights</option>
                    <option value="Fog Lamps">Fog Lamps</option>
                </optgroup>
                <optgroup label="Other">
                    <option value="First Aid Kit">First Aid Kit</option>
                    <option value="Tool Kit">Tool Kit</option>
                    <option value="Jerry Can">Jerry Can</option>
                    <option value="Tow Hook">Tow Hook</option>
                    <option value="custom">✏️ Custom Item...</option>
                </optgroup>
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

// Handle accessory dropdown selection
// Part number mapping - UPDATE THESE PART NUMBERS AS NEEDED
const PART_NUMBERS = {
    // Exterior
    'Mud Flaps': 'MF-001',
    'Side Steps': 'SS-001',
    'Roof Rails': 'RR-001',
    'Door Visor': 'DV-001',
    'Body Cover': 'BC-001',
    'Bumper Guard': 'BG-001',
    'Bull Bar': 'BB-001',
    'Tail Lamp Garnish': 'TG-001',
    'Chrome Kit': 'CK-001',
    // Interior
    'Seat Cover': 'SC-001',
    'Floor Mats': 'FM-001',
    'Dashboard Kit': 'DK-001',
    'Steering Cover': 'STC-001',
    'Sun Shade': 'SSH-001',
    'Neck Pillow': 'NP-001',
    'Cushion Set': 'CS-001',
    // Electronics
    'Reverse Camera': 'RC-001',
    'Parking Sensors': 'PS-001',
    'Music System': 'MS-001',
    'Speaker Set': 'SPK-001',
    'LED Lights': 'LED-001',
    'Fog Lamps': 'FL-001',
    // Other
    'First Aid Kit': 'FAK-001',
    'Tool Kit': 'TK-001',
    'Jerry Can': 'JC-001',
    'Tow Hook': 'TH-001'
};

function handleAccessorySelect(select) {
    const card = select.closest('.item-card');
    const customGroup = card.querySelector('.custom-item-group');
    const customInput = card.querySelector('.custom-item-input');
    const partNoInput = card.querySelector('input[name="partNo[]"]');

    if (select.value === 'custom') {
        customGroup.classList.remove('hidden');
        customInput.required = true;
        customInput.focus();
        partNoInput.value = ''; // Clear part number for custom items
    } else {
        customGroup.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';

        // Auto-fill part number
        if (PART_NUMBERS[select.value]) {
            partNoInput.value = PART_NUMBERS[select.value];
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

        // Get description from dropdown or custom input
        let description = select.value;
        if (description === 'custom' && customInput) {
            description = customInput.value.trim();
        }

        items.push({
            description: description,
            partNo: card.querySelector('input[name="partNo[]"]').value.trim(),
            amount: parseFloat(card.querySelector('input[name="amount[]"]').value) || 0
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
        items: items // Keep structured data for local storage
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

        // Increment serial number for next order
        incrementSerialNumber();

        // Reset form
        orderForm.reset();
        initializeDate();
        updateSerialNumberDisplay();
        resetItems();

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
