function formatMoney(value) {
  const num = Number(value || 0);
  return '$' + num.toFixed(2);
}

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
  } catch {
    return 'User';
  }
}

function authHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function showError(msg) {
  const errorBox = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  if (errorText) errorText.textContent = msg;
  if (errorBox) errorBox.classList.remove('hidden');
}

function setLoading(isLoading) {
  const loading = document.getElementById('loading-indicator');
  const activeContainer = document.getElementById('orders-container');
  const historyContainer = document.getElementById('order-history-container');

  if (isLoading) {
    loading && loading.classList.remove('hidden');
    activeContainer && activeContainer.classList.add('hidden');
    historyContainer && historyContainer.classList.add('hidden');
  } else {
    loading && loading.classList.add('hidden');
  }
}

function renderOrderCard(order, isHistory = false) {
  const date = new Date(order.orderDate || Date.now());
  const dateStr = date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const itemsPreview = (order.items || [])
    .map(i => `${i.quantity || 1} × ${i.name} (Size ${i.size})`)
    .join('<br>');

  const statusLower = (order.status || '').toLowerCase();
  const isProcessing = statusLower === 'processing';
  const isShipped = statusLower === 'shipped';
  const isDelivered = statusLower === 'delivered';
  const isCancelled = statusLower === 'cancelled';

  const pillBg =
    isProcessing ? '#FFF4E5' :
    isShipped ? '#E3F2FD' :
    isDelivered ? '#E8FFF1' :
    '#F3F4F6';

  const pillText =
    isProcessing ? '#FF9800' :
    isShipped ? '#1E88E5' :
    isDelivered ? '#00C853' :
    '#6B7280';

  return `
    <div class="order-card border rounded-lg p-4 mb-4 shadow-sm bg-white hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start mb-2">
        <div>
          <p class="text-sm text-gray-500">Order ID</p>
          <p class="font-semibold text-gray-800">${order.orderId}</p>
        </div>
        <span class="text-xs px-2 py-1 rounded-full" style="background-color:${pillBg}; color:${pillText};">
          ${order.status}
        </span>
      </div>

      <p class="text-sm text-gray-600 mb-1">
        <span class="font-semibold">Placed:</span> ${dateStr}
      </p>

      <p class="text-sm text-gray-600 mb-2">
        <span class="font-semibold">Items:</span><br>${itemsPreview || '(No items)'}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
        <div><span class="font-semibold">Total:</span> ${formatMoney(order.totalAmount)}</div>
        <div><span class="font-semibold">Est. Delivery:</span> ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : '—'}</div>
        <div><span class="font-semibold">Tracking #:</span> ${order.trackingNumber || '—'}</div>
        <div><span class="font-semibold">Updated:</span> ${order.statusUpdatedAt ? new Date(order.statusUpdatedAt).toLocaleString() : '—'}</div>
      </div>

      <div class="flex justify-between items-center mt-3">
        <div class="text-sm text-gray-600">
          <span class="font-semibold">Ship To:</span>
          ${order.shippingAddress?.name || ''}, ${order.shippingAddress?.street || ''},
          ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.zipCode || ''}
        </div>

        <div class="flex gap-2">
          ${(!isHistory && isProcessing) ? `
            <button data-cancel="${order.orderId}"
              class="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700">
              Cancel Order
            </button>
          ` : ''}

          ${(isShipped && order.trackingNumber) ? `
            <button data-track="${order.orderId}"
              class="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">
              Track Package
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...authHeader()
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function loadAndRenderOrders() {
  setLoading(true);

  // Hide previous errors
  const errorBox = document.getElementById('error-message');
  errorBox && errorBox.classList.add('hidden');

  const noOrders = document.getElementById('no-orders-message');
  noOrders && noOrders.classList.add('hidden');

  try {
    const [activeRes, historyRes] = await Promise.all([
      fetchJson('/api/orders'),
      fetchJson('/api/orders/history')
    ]);

    const active = activeRes.orders || [];
    const history = historyRes.orders || [];

    const activeContainer = document.getElementById('orders-container');
    const historyContainer = document.getElementById('order-history-container');

    activeContainer.innerHTML = active.length
      ? active.map(o => renderOrderCard(o, false)).join('')
      : '';

    historyContainer.innerHTML = history.length
      ? history.map(o => renderOrderCard(o, true)).join('')
      : `<div class="text-center text-gray-500 py-8">No past orders yet.</div>`;

    if (!active.length && !history.length) {
      noOrders && noOrders.classList.remove('hidden');
    } else {
      activeContainer.classList.remove('hidden');
    }

    // Wire up buttons
    document.querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const orderId = btn.getAttribute('data-cancel');
        if (!confirm('Cancel this order? This can only be done while status is Processing.')) return;

        try {
          await fetchJson(`/api/orders/${orderId}`, { method: 'DELETE' });
          await loadAndRenderOrders();
        } catch (e) {
          showError(e.message || 'Failed to cancel order');
        }
      });
    });

    document.querySelectorAll('[data-track]').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-track');
        alert(`Tracking for order ${orderId} is shown via the Tracking # field (demo feature).`);
      });
    });

  } catch (e) {
    showError(e.message || 'Could not load your orders.');
  } finally {
    setLoading(false);
  }
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
document.addEventListener('DOMContentLoaded', async () => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    if (confirm('Please login to view your orders. Go to login page?')) {
      window.location.href = 'user-registration.HTML';
      return;
    }
    // If they refuse, still show page but it will error on fetch
  }

  const emailSpan = document.getElementById('user-email');
  if (emailSpan) emailSpan.textContent = getLoggedInEmail();

  setupTabs();
  await loadAndRenderOrders();
});
