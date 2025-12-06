
/* ---------- STORAGE HELPERS ---------- */
function loadOrders() {
    return JSON.parse(localStorage.getItem('orders') || '[]');
}

function saveOrders(orders) {
    localStorage.setItem('orders', JSON.stringify(orders));
}

function formatMoney(value) {
    return '$' + value.toFixed(2);
}

/* ---------- USER EMAIL HELPER ---------- */
function getLoggedInEmail() {
    const saved = localStorage.getItem('userEmail');
    if (saved) return saved;

    const token = localStorage.getItem('authToken');
    if (!token) return 'Guest';

    const parts = token.split('.');
    if (parts.length !== 3) return 'User';

    try {
        const payloadJson = atob(parts[1]);
        const payload = JSON.parse(payloadJson);
        return payload.email || payload.username || 'User';
    } catch (e) {
        return 'User';
    }
}

/* ---------- CANCEL ORDER ---------- */
function cancelOrder(orderId) {
    const orders = loadOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) return;

    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }

    orders[index].status = 'Cancelled';
    saveOrders(orders);

    alert('Your order has been cancelled.');
    renderAllOrders();
}

/* ---------- TRACK PACKAGE (PLACEHOLDER) ---------- */
function trackPackage(orderId) {
    alert(`Tracking details for order ${orderId} will be available in a future sprint.`);
}

/* ---------- ORDER CARD HTML ---------- */
function renderOrderCard(order) {
    const date = new Date(order.createdAt || Date.now());
    const dateStr = date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const itemsPreview = (order.items || [])
        .map(i => `${i.quantity || 1} × ${i.name} (Size ${i.size})`)
        .join('<br>');

    const status = (order.status || '').toLowerCase();
    const isProcessing = status === 'processing';
    const isShipped = status === 'shipped';

    return `
        <div class="border rounded-lg p-4 mb-4 shadow-sm bg-white">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <p class="text-sm text-gray-500">Order ID</p>
                    <p class="font-semibold text-gray-800">${order.id}</p>
                </div>
                <span class="text-xs px-2 py-1 rounded-full"
                      style="
                        background-color:${isProcessing ? '#FFF4E5' : (isShipped ? '#E3F2FD' : '#E8FFF1')};
                        color:${isProcessing ? '#FF9800' : (isShipped ? '#1E88E5' : '#00C853')};
                      ">
                    ${order.status}
                </span>
            </div>

            <p class="text-sm text-gray-600 mb-1">
                <span class="font-semibold">Placed:</span> ${dateStr}
            </p>

            <p class="text-sm text-gray-600 mb-2">
                <span class="font-semibold">Items:</span><br>${itemsPreview}
            </p>

            <div class="flex justify-between items-center mt-3">
                <p class="font-semibold text-gray-800">
                    Total: ${formatMoney(order.total || 0)}
                </p>

                <div class="flex gap-2">
                    ${isProcessing ? `
                        <button onclick="cancelOrder('${order.id}')"
                                class="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700">
                            Cancel Order
                        </button>
                    ` : ''}

                    ${isShipped ? `
                        <button onclick="trackPackage('${order.id}')"
                                class="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">
                            Track Package
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/* ---------- RENDER ORDERS (ACTIVE + HISTORY) ---------- */
function renderAllOrders() {
    const loading = document.getElementById('loading-indicator');
    const errorBox = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const activeContainer = document.getElementById('orders-container');
    const historyContainer = document.getElementById('order-history-container');
    const noOrders = document.getElementById('no-orders-message');

    if (loading) loading.classList.add('hidden');
    if (errorBox) errorBox.classList.add('hidden');
    if (noOrders) noOrders.classList.add('hidden');

    let orders;
    try {
        orders = loadOrders();
    } catch (e) {
        if (errorText && errorBox) {
            errorText.textContent = 'Could not load your orders.';
            errorBox.classList.remove('hidden');
        }
        return;
    }

    if (!orders.length) {
        if (noOrders) noOrders.classList.remove('hidden');
        return;
    }

    activeContainer.innerHTML = '';
    historyContainer.innerHTML = '';

    orders.forEach(order => {
        const html = renderOrderCard(order);
        const status = (order.status || '').toLowerCase();

        // "Active" = processing or shipped
        if (status === 'processing' || status === 'shipped') {
            activeContainer.insertAdjacentHTML('beforeend', html);
        } else {
            historyContainer.insertAdjacentHTML('beforeend', html);
        }
    });

    activeContainer.classList.remove('hidden');
}

/* ---------- TABS SETUP ---------- */
function setupTabs() {
    const tabActive = document.getElementById('tab-active-orders');
    const tabHistory = document.getElementById('tab-order-history');
    const activeContainer = document.getElementById('orders-container');
    const historyContainer = document.getElementById('order-history-container');

    function showActive() {
        tabActive.style.color = '#00C853';
        tabActive.style.borderColor = '#00C853';
        tabHistory.style.color = '#666666';
        tabHistory.style.borderColor = 'transparent';

        activeContainer.classList.remove('hidden');
        historyContainer.classList.add('hidden');
    }

    function showHistory() {
        tabHistory.style.color = '#00C853';
        tabHistory.style.borderColor = '#00C853';
        tabActive.style.color = '#666666';
        tabActive.style.borderColor = 'transparent';

        activeContainer.classList.add('hidden');
        historyContainer.classList.remove('hidden');
    }

    tabActive.addEventListener('click', showActive);
    tabHistory.addEventListener('click', showHistory);

    showActive(); 
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        if (confirm('Please login to view your orders. Go to login page?')) {
            window.location.href = 'src/user-registration.HTML';
            return;
        }
    }

    // Set welcome email at top of page
    const emailSpan = document.getElementById('user-email');
    if (emailSpan) {
        emailSpan.textContent = getLoggedInEmail();
    }

    renderAllOrders();
    setupTabs();
});
