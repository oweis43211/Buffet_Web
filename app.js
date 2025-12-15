// تكوين Supabase
const SUPABASE_URL = "https://oshbvczwsxpimyneudeg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zaGJ2Y3p3c3hwaW15bmV1ZGVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODcxMDkyNCwiZXhwIjoyMDc0Mjg2OTI0fQ.A4QiXm-uC6q8RWV0w67zXNEXnsqQIwJdS7f-efG1vQg";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// حالة التطبيق
let state = {
    loggedIn: false,
    username: null,
    selectedProducts: {},
    products: [],
    availability: {},
    orders: [],
    consumption: [],
    systemStatus: { buffet_open: true, prayer_closed: false },
    cart: []
};

// عناصر DOM
const elements = {
    loginScreen: document.getElementById('loginScreen'),
    mainScreen: document.getElementById('mainScreen'),
    adminBtn: document.getElementById('adminBtn'),
    
    // تسجيل الدخول
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('loginBtn'),
    changePasswordBtn: document.getElementById('changePasswordBtn'),
    loginMessage: document.getElementById('loginMessage'),
    
    // التطبيق الرئيسي
    userName: document.getElementById('userName'),
    logoutBtn: document.getElementById('logoutBtn'),
    buffetStatus: document.getElementById('buffetStatus'),
    lastUpdate: document.getElementById('lastUpdate'),
    
    // الطلب
    place: document.getElementById('place'),
    note: document.getElementById('note'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    clearCartBtn: document.getElementById('clearCartBtn'),
    sendOrderBtn: document.getElementById('sendOrderBtn'),
    sendCashOrderBtn: document.getElementById('sendCashOrderBtn'),
    
    // المنتجات
    productSearch: document.getElementById('productSearch'),
    productsGrid: document.getElementById('productsGrid'),
    
    // الإحصائيات
    myOrdersCount: document.getElementById('myOrdersCount'),
    myTotalSpent: document.getElementById('myTotalSpent'),
    viewOrdersBtn: document.getElementById('viewOrdersBtn'),
    viewConsumptionBtn: document.getElementById('viewConsumptionBtn'),
    
    // النماذج المنبثقة
    productSelectorModal: document.getElementById('productSelectorModal'),
    ordersModal: document.getElementById('ordersModal'),
    consumptionModal: document.getElementById('consumptionModal'),
    changePasswordModal: document.getElementById('changePasswordModal'),
    
    // تغيير كلمة المرور
    changeUsername: document.getElementById('changeUsername'),
    oldPassword: document.getElementById('oldPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    savePasswordBtn: document.getElementById('savePasswordBtn'),
    changePasswordMessage: document.getElementById('changePasswordMessage'),
    
    // الجداول
    ordersTableBody: document.getElementById('ordersTableBody'),
    consumptionTableBody: document.getElementById('consumptionTableBody')
};

// متغير الفلترة
let currentCategory = 'all'; // all | drinks | foods

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkSystemStatus();
    loadProducts();
    
    setInterval(() => {
        if (state.loggedIn) {
            loadProducts();
            checkSystemStatus();
            updateLastUpdateTime();
        }
    }, 30000);
});

function initializeApp() {
    const savedUser = localStorage.getItem('buffet_user');
    const savedUsername = localStorage.getItem('buffet_username');
    
    if (savedUser && savedUsername) {
        state.loggedIn = true;
        state.username = savedUsername;
        showMainScreen();
        loadUserData();
    } else {
        showLoginScreen();
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    elements.changePasswordBtn.addEventListener('click', showChangePasswordModal);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderProducts();
        });
    });

    elements.logoutBtn.addEventListener('click', handleLogout);
    
    elements.clearCartBtn.addEventListener('click', clearCart);
    elements.sendOrderBtn.addEventListener('click', () => sendOrder('عادي'));
    elements.sendCashOrderBtn.addEventListener('click', () => sendOrder('كاش'));
    
    elements.productSearch.addEventListener('input', filterProducts);
    
    elements.viewOrdersBtn.addEventListener('click', showOrdersModal);
    elements.viewConsumptionBtn.addEventListener('click', showConsumptionModal);
    
    elements.adminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
    
    elements.savePasswordBtn.addEventListener('click', handleChangePassword);
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });
}

// تسجيل الدخول
async function handleLogin() {
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value.trim();
    
    if (!username || !password) {
        showMessage(elements.loginMessage, 'يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    if (!password.match(/^\d{4}$/)) {
        showMessage(elements.loginMessage, 'كلمة المرور يجب أن تكون 4 أرقام فقط', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();
        
        if (error || !data) {
            showMessage(elements.loginMessage, 'اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
            return;
        }
        
        state.loggedIn = true;
        state.username = username;
        
        localStorage.setItem('buffet_user', password);
        localStorage.setItem('buffet_username', username);
        
        showMainScreen();
        loadUserData();
        showNotification('تم تسجيل الدخول بنجاح!', 'success');
        
    } catch (error) {
        showMessage(elements.loginMessage, 'حدث خطأ أثناء تسجيل الدخول', 'error');
        console.error('Login error:', error);
    }
}

// تسجيل الخروج
function handleLogout() {
    state.loggedIn = false;
    state.username = null;
    state.selectedProducts = {};
    state.cart = [];
    
    localStorage.removeItem('buffet_user');
    localStorage.removeItem('buffet_username');
    
    showLoginScreen();
    showNotification('تم تسجيل الخروج بنجاح', 'success');
}

// تحميل بيانات المستخدم
async function loadUserData() {
    elements.userName.textContent = state.username;
    await Promise.all([
        loadProducts(),
        loadUserOrders(),
        loadUserConsumption()
    ]);
    updateCartDisplay();
}

// تحميل المنتجات
async function loadProducts() {
    try {
        const [productsRes, availabilityRes] = await Promise.all([
            supabase.from('prices').select('*'),
            supabase.from('availability').select('*')
        ]);
        
        state.products = productsRes.data || [];
        state.availability = {};
        
        availabilityRes.data?.forEach(item => {
            state.availability[item.code] = item;
        });
        
        renderProducts();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('خطأ في تحميل المنتجات', 'error');
    }
}

// عرض المنتجات
function renderProducts() {
    elements.productsGrid.innerHTML = '';

    if (!state.products.length) {
        elements.productsGrid.innerHTML = '<div class="loading">لا توجد منتجات متاحة</div>';
        return;
    }

    const drinks = state.products.filter(p => p.code >= 1 && p.code <= 43);
    const foods  = state.products.filter(p => p.code >= 100 && p.code <= 135);

    let allProducts = [];
    if (currentCategory === 'drinks') allProducts = drinks;
    else if (currentCategory === 'foods') allProducts = foods;
    else allProducts = [...drinks, ...foods];

    const searchTerm = elements.productSearch.value.toLowerCase();
    let filteredProducts = allProducts;

    if (searchTerm) {
        filteredProducts = allProducts.filter(p =>
            p.item?.toLowerCase().includes(searchTerm)
        );
    }

    if (!filteredProducts.length) {
        elements.productsGrid.innerHTML = '<div class="loading">لا توجد منتجات</div>';
        return;
    }

    filteredProducts.forEach(product => {
        const availability = state.availability[product.code] || {};
        const isAvailable = availability.available !== false;
        const availableQty = availability.available_qty || 0;
        const currentQty = state.selectedProducts[product.code] || 0;

        const productCard = document.createElement('div');
        productCard.className = `product-card ${!isAvailable ? 'unavailable' : ''}`;

        productCard.innerHTML = `
            ${product.image_url ? 
                `<img src="${product.image_url}" 
                      alt="${product.item}" 
                      class="product-image"
                      onerror="this.src='https://via.placeholder.com/250x150?text=No+Image'">`
                :
                `<div class="product-image" style="display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-box" style="font-size:48px;color:#666;"></i>
                 </div>`
            }
            <div class="product-info">
                <div class="product-name">${product.item}</div>
                <div class="product-price">${product.price} جنيه</div>
                <div class="product-availability">
                    ${isAvailable ? `المتبقي: ${availableQty}` : '<span class="unavailable-badge">غير متوفر</span>'}
                </div>
            </div>
            <div class="product-actions">
                <div class="qty-controls">
                    <button onclick="updateProductQty(${product.code}, -1)" ${currentQty <= 0 ? 'disabled' : ''}>-</button>
                    <span>${currentQty}</span>
                    <button onclick="updateProductQty(${product.code}, 1)" ${currentQty >= availableQty ? 'disabled' : ''}>+</button>
                </div>
                <button onclick="addToCart(${product.code})" ${!isAvailable || availableQty === 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i>
                </button>
            </div>
        `;
        elements.productsGrid.appendChild(productCard);
    });
}

// تحديث كمية المنتج
window.updateProductQty = function(code, change) {
    const currentQty = state.selectedProducts[code] || 0;
    const availability = state.availability[code] || {};
    const availableQty = availability.available_qty || 0;
    
    let newQty = currentQty + change;
    newQty = Math.max(0, Math.min(newQty, availableQty));
    
    if (newQty !== currentQty) {
        state.selectedProducts[code] = newQty;
        updateCart();
        renderProducts();
    }
};

// إضافة إلى السلة
window.addToCart = function(code) {
    const currentQty = state.selectedProducts[code] || 0;
    if (currentQty > 0) {
        updateProductQty(code, 0);
        showNotification('تمت إضافة المنتج إلى السلة', 'success');
    }
};

// تحديث السلة
function updateCart() {
    state.cart = [];
    let total = 0;
    
    Object.entries(state.selectedProducts).forEach(([code, qty]) => {
        if (qty > 0) {
            const product = state.products.find(p => p.code == code);
            if (product) {
                const itemTotal = product.price * qty;
                total += itemTotal;
                
                state.cart.push({
                    code: code,
                    name: product.item,
                    price: product.price,
                    qty: qty,
                    total: itemTotal
                });
            }
        }
    });
    
    updateCartDisplay();
    updateStats();
}

// عرض السلة
function updateCartDisplay() {
    elements.cartItems.innerHTML = '';
    
    if (state.cart.length === 0) {
        elements.cartItems.innerHTML = '<p class="empty-cart">السلة فارغة</p>';
        elements.cartTotal.textContent = '0.00 جنيه';
        return;
    }
    
    state.cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-qty">الكمية: ${item.qty}</div>
            </div>
            <div class="cart-item-price">${item.total.toFixed(2)} جنيه</div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.code})">
                <i class="fas fa-times"></i>
            </button>
        `;
        elements.cartItems.appendChild(cartItem);
    });
    
    const total = state.cart.reduce((sum, item) => sum + item.total, 0);
    elements.cartTotal.textContent = total.toFixed(2) + ' جنيه';
}

// إزالة من السلة
window.removeFromCart = function(code) {
    delete state.selectedProducts[code];
    updateCart();
    renderProducts();
};

// إفراغ السلة
function clearCart() {
    if (state.cart.length === 0) return;
    
    if (confirm('هل تريد إفراغ السلة؟')) {
        state.selectedProducts = {};
        updateCart();
        renderProducts();
        showNotification('تم إفراغ السلة', 'success');
    }
};

// فلترة المنتجات
function filterProducts() {
    renderProducts();
}

// تحميل طلبات المستخدم
async function loadUserOrders() {
    try {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('username', state.username)
            .order('id', { ascending: false });
        
        state.orders = data || [];
        elements.myOrdersCount.textContent = state.orders.length;
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// تحميل استهلاك المستخدم
async function loadUserConsumption() {
    try {
        const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('username', state.username)
            .order('date', { ascending: false });
        
        state.consumption = data || [];
        
        const total = state.consumption.reduce((sum, item) => 
            sum + (item.total || 0), 0);
        elements.myTotalSpent.textContent = total.toFixed(2) + ' جنيه';
        
    } catch (error) {
        console.error('Error loading consumption:', error);
    }
}

// تحديث الإحصائيات
function updateStats() {
    const total = state.cart.reduce((sum, item) => sum + item.total, 0);
    elements.cartTotal.textContent = total.toFixed(2) + ' جنيه';
}

// إرسال الطلب
async function sendOrder(orderType) {
    const place = elements.place.value.trim();
    const note = elements.note.value.trim();
    
    if (!place) {
        showNotification('يرجى إدخال المكان', 'error');
        return;
    }
    
    if (state.cart.length === 0) {
        showNotification('يرجى اختيار المنتجات أولاً', 'error');
        return;
    }
    
    // التحقق من حالة النظام
    if (!state.systemStatus.buffet_open) {
        showNotification('عذرًا، البوفيه مغلق حاليًا، يرجى الطلب غدًا.', 'error');
        return;
    }
    
    if (state.systemStatus.prayer_closed) {
        showNotification('عذرًا، عامل البوفيه ذهب للصلاة، يرجى الانتظار حتى انتهاء الصلاة.', 'error');
        return;
    }
    
    try {
        const batchId = `${state.username}_${Date.now()}`;
        const nowDate = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString('ar-EG', { hour12: false });
        
        let totalAll = 0;
        const productsData = [];
        const expensesRows = [];
        
        // التحقق من توفر المنتجات وتحديث المخزون
        for (const item of state.cart) {
            const product = state.products.find(p => p.code == item.code);
            if (!product) continue;
            
            const availability = state.availability[item.code] || {};
            const availableQty = availability.available_qty || 0;
            
            if (availableQty < item.qty) {
                showNotification(`الكمية المتاحة من '${item.name}' هي ${availableQty} فقط`, 'warning');
                item.qty = Math.min(item.qty, availableQty);
                
                if (item.qty <= 0) continue;
            }
            
            const totalPrice = product.price * item.qty;
            totalAll += totalPrice;
            
            productsData.push({
                code: item.code,
                item: item.name,
                price: product.price,
                qty: item.qty,
                total: totalPrice
            });
            
            expensesRows.push({
                username: state.username,
                code: item.code,
                item: item.name,
                price: product.price,
                qty: item.qty,
                total: totalPrice,
                date: nowDate,
                time: nowTime,
                payment_type: orderType,
                batch_id: batchId
            });
            
            // تحديث المخزون
            const newQty = Math.max(0, availableQty - item.qty);
            await supabase
                .from('availability')
                .update({ available_qty: newQty })
                .eq('code', item.code);
        }
        
        if (productsData.length === 0) {
            showNotification('لم يتم إدخال أي منتجات صالحة', 'error');
            return;
        }
        
        // إدخال الطلب
        await supabase
            .from('orders')
            .insert({
                username: state.username,
                place: place,
                status: 'في الانتظار',
                order_type: orderType,
                note: note,
                batch_id: batchId,
                products: productsData,
                total: totalAll,
                date: nowDate,
                time: nowTime
            });
        
        // إدخال المصروفات
        await supabase
            .from('expenses')
            .insert(expensesRows);
        
        // إعادة تعيين
        state.selectedProducts = {};
        elements.place.value = '';
        elements.note.value = '';
        
        // تحديث البيانات
        await Promise.all([
            loadProducts(),
            loadUserOrders(),
            loadUserConsumption()
        ]);
        
        updateCartDisplay();
        
        showNotification(`تم إرسال طلبك بنجاح! الإجمالي: ${totalAll.toFixed(2)} جنيه`, 'success');
        
    } catch (error) {
        console.error('Error sending order:', error);
        showNotification('حدث خطأ أثناء إرسال الطلب', 'error');
    }
}

// التحقق من حالة النظام
async function checkSystemStatus() {
    try {
        const { data } = await supabase
            .from('system_status')
            .select('*')
            .limit(1)
            .single();
        
        if (data) {
            state.systemStatus = data;
            
            let statusText = '';
            if (!data.buffet_open) {
                statusText = '⛔ البوفيه مغلق';
                elements.buffetStatus.style.color = '#F44336';
            } else if (data.prayer_closed) {
                statusText = '⏸️ متوقف للصلاة';
                elements.buffetStatus.style.color = '#FF9800';
            } else {
                statusText = '✅ البوفيه مفتوح';
                elements.buffetStatus.style.color = '#4CAF50';
            }
            
            elements.buffetStatus.textContent = statusText;
        }
    } catch (error) {
        console.error('Error checking system status:', error);
    }
}

// تحديث وقت آخر تحديث
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-EG', { hour12: false });
    elements.lastUpdate.textContent = `آخر تحديث: ${timeString}`;
}

// عرض نافذة الطلبات
function showOrdersModal() {
    elements.ordersTableBody.innerHTML = '';
    
    state.orders.forEach(order => {
        const productsText = order.products?.map(p => 
            `${p.item} (${p.qty})`
        ).join('<br>') || '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.date}<br>${order.time}</td>
            <td>${productsText}</td>
            <td>${order.total} جنيه</td>
            <td>
                <span class="${getStatusClass(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td>${order.order_type}</td>
        `;
        elements.ordersTableBody.appendChild(row);
    });
    
    elements.ordersModal.classList.remove('hidden');
}

// عرض نافذة الاستهلاك
function showConsumptionModal() {
    elements.consumptionTableBody.innerHTML = '';
    
    let totalAll = 0;
    let totalNormal = 0;
    let totalCash = 0;
    
    state.consumption.forEach(item => {
        const total = item.total || 0;
        totalAll += total;
        
        if (item.payment_type === 'كاش') {
            totalCash += total;
        } else {
            totalNormal += total;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}<br>${item.time}</td>
            <td>${item.item}</td>
            <td>${item.qty}</td>
            <td>${item.price} جنيه</td>
            <td>${total.toFixed(2)} جنيه</td>
            <td>${item.payment_type}</td>
        `;
        elements.consumptionTableBody.appendChild(row);
    });
    
    // تحديث الإجماليات
    document.getElementById('totalAll').textContent = totalAll.toFixed(2) + ' جنيه';
    document.getElementById('totalNormal').textContent = totalNormal.toFixed(2) + ' جنيه';
    document.getElementById('totalCash').textContent = totalCash.toFixed(2) + ' جنيه';
    
    elements.consumptionModal.classList.remove('hidden');
}

// عرض نافذة تغيير كلمة المرور
function showChangePasswordModal() {
    elements.changeUsername.value = '';
    elements.oldPassword.value = '';
    elements.newPassword.value = '';
    elements.confirmPassword.value = '';
    elements.changePasswordMessage.textContent = '';
    
    elements.changePasswordModal.classList.remove('hidden');
}

// تغيير كلمة المرور
async function handleChangePassword() {
    const username = elements.changeUsername.value.trim();
    const oldPassword = elements.oldPassword.value.trim();
    const newPassword = elements.newPassword.value.trim();
    const confirmPassword = elements.confirmPassword.value.trim();
    
    if (!username || !oldPassword || !newPassword || !confirmPassword) {
        showMessage(elements.changePasswordMessage, 'يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    if (!newPassword.match(/^\d{4}$/)) {
        showMessage(elements.changePasswordMessage, 'كلمة المرور الجديدة يجب أن تكون 4 أرقام فقط', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage(elements.changePasswordMessage, 'كلمة المرور الجديدة غير متطابقة', 'error');
        return;
    }
    
    try {
        // التحقق من كلمة المرور الحالية
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', oldPassword)
            .single();
        
        if (error || !data) {
            showMessage(elements.changePasswordMessage, 'اسم المستخدم أو كلمة المرور الحالية غير صحيحة', 'error');
            return;
        }
        
        // تحديث كلمة المرور
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: newPassword })
            .eq('username', username);
        
        if (updateError) {
            showMessage(elements.changePasswordMessage, 'حدث خطأ أثناء تغيير كلمة المرور', 'error');
            return;
        }
        
        showMessage(elements.changePasswordMessage, 'تم تغيير كلمة المرور بنجاح ✅', 'success');
        
        // إغلاق النافذة بعد ثانيتين
        setTimeout(() => {
            elements.changePasswordModal.classList.add('hidden');
        }, 2000);
        
    } catch (error) {
        console.error('Change password error:', error);
        showMessage(elements.changePasswordMessage, 'حدث خطأ غير متوقع', 'error');
    }
}

// وظائف المساعدة
function showLoginScreen() {
    elements.loginScreen.classList.remove('hidden');
    elements.mainScreen.classList.add('hidden');
}

function showMainScreen() {
    elements.loginScreen.classList.add('hidden');
    elements.mainScreen.classList.remove('hidden');
}

function getStatusClass(status) {
    switch(status) {
        case 'تم التسليم': return 'status-delivered';
        case 'في الانتظار': return 'status-pending';
        case 'ملغي': return 'status-cancelled';
        default: return '';
    }
}

function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
}

function showNotification(text, type = 'info') {
    const notificationArea = document.getElementById('notificationArea');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">${text}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    notificationArea.appendChild(notification);
    
    // إزالة الإشعار بعد 5 ثوانٍ
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// تعريف الدوال على window للوصول من HTML
window.showNotification = showNotification;
