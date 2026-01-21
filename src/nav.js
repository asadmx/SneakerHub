function getCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        return cart.reduce((total, item) => total + (item.quantity || 1), 0);
    } catch {
        return 0;
    }
}

function updateCartBadge() {
    const cartBadge = document.getElementById('cart-badge');
    const count = getCartCount();
    
    if (cartBadge) {
        if (count > 0) {
            cartBadge.textContent = count > 99 ? '99+' : count;
            cartBadge.classList.remove('hidden');
        } else {
            cartBadge.classList.add('hidden');
        }
    }
}

function updateNavigation() {
    const authToken = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');

    const loginLink  = document.getElementById('login-link');
    const logoutBtn  = document.getElementById('logout-btn');
    const ordersLink = document.getElementById('orders-link');
    const cartLink   = document.getElementById('cart-link');

    if (authToken && userEmail) {
        // User is logged in
        if (loginLink) loginLink.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');

        if (ordersLink) ordersLink.classList.add('font-semibold');
        if (cartLink)   cartLink.classList.add('font-semibold');
    } else {
        // User is not logged in
        if (loginLink) loginLink.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (ordersLink) ordersLink.classList.remove('font-semibold');
        if (cartLink)   cartLink.classList.remove('font-semibold');
    }
    
    // Update cart badge
    updateCartBadge();
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userEmail');
            updateNavigation();
            // Send them to login or home
            window.location.href = 'user-registration.HTML';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    setupLogout();
    
    // Update cart badge periodically
    setInterval(updateCartBadge, 1000);
    
    // Listen for storage changes (cart updates)
    window.addEventListener('storage', () => {
        updateCartBadge();
    });
});


