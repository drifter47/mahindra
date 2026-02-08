// ===== Configuration =====
// Replace this URL with your Google Apps Script Web App URL after deployment
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTvTLlX38dmos_MI-PWh9cE4cCk6nO4RlwDMEx3QgIdq43yZDBQA-CD-02gjmy64ru/exec';

// ===== DOM Elements =====
const orderForm = document.getElementById('orderForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const slNoInput = document.getElementById('slNo');
const dateInput = document.getElementById('date');
const amountInput = document.getElementById('amount');
const totalAmountInput = document.getElementById('totalAmount');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const ordersList = document.getElementById('ordersList');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const toast = document.getElementById('toast');

// ===== State =====
let orders = [];
let dailyCounter = 1;

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeDate();
    initializeSerialNumber();
    setupEventListeners();
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

    // Auto-copy amount to total if total is empty
    amountInput.addEventListener('input', () => {
        if (!totalAmountInput.value) {
            totalAmountInput.value = amountInput.value;
        }
    });

    // Search orders
    searchInput.addEventListener('input', filterOrders);

    // Refresh orders
    refreshBtn.addEventListener('click', fetchOrders);

    // Date change - check if we need to reset serial number
    dateInput.addEventListener('change', () => {
        const selectedDate = new Date(dateInput.value).toDateString();
        const today = new Date().toDateString();

        if (selectedDate !== today) {
            // If selecting a different date, show a placeholder
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

    // Gather form data
    const formData = {
        slNo: slNoInput.value,
        date: dateInput.value,
        otfNo: document.getElementById('otfNo').value.trim(),
        customerName: document.getElementById('customerName').value.trim(),
        vehicleModel: document.getElementById('vehicleModel').value,
        chassisNo: document.getElementById('chassisNo').value.trim(),
        itemDescription: document.getElementById('itemDescription').value.trim(),
        partNo: document.getElementById('partNo').value.trim(),
        amount: parseFloat(document.getElementById('amount').value) || 0,
        totalAmount: parseFloat(document.getElementById('totalAmount').value) || 0,
        status: document.getElementById('status').value,
        remarks: document.getElementById('remarks').value.trim()
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

    ordersList.innerHTML = ordersToRender.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">OTF: ${escapeHtml(order.otfNo || 'N/A')}</div>
                    <div class="order-date">${formatDate(order.date)}</div>
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
    `).join('');
}

// ===== Filter Orders =====
function filterOrders() {
    const query = searchInput.value.toLowerCase();
    const filtered = orders.filter(order =>
        (order.customerName || '').toLowerCase().includes(query) ||
        (order.otfNo || '').toLowerCase().includes(query) ||
        (order.vehicleModel || '').toLowerCase().includes(query) ||
        (order.chassisNo || '').toLowerCase().includes(query)
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
