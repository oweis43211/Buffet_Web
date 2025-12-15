// التحقق من أن supabase متاح
if (typeof supabase === 'undefined') {
    console.error('Supabase is not loaded. Please check the script tags.');
    // إنشاء عميل supabase يدوياً
    window.supabase = window.supabase || {};
}

const SUPABASE_URL = "https://oshbvczwsxpimyneudeg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zaGJ2Y3p3c3hwaW15bmV1ZGVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODcxMDkyNCwiZXhwIjoyMDc0Mjg2OTI0fQ.A4QiXm-uC6q8RWV0w67zXNEXnsqQIwJdS7f-efG1vQg";

// تهيئة Supabase
let supabase;
try {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase initialized successfully');
    } else {
        console.error('Supabase SDK not loaded properly');
    }
} catch (error) {
    console.error('Error initializing Supabase:', error);
}

// حالة التطبيق
let adminState = {
    authenticated: false,
    currentSection: 'dashboard',
    products: [],
    users: [],
    orders: [],
    inventory: [],
    stats: {}
};

// عناصر DOM
const adminElements = {
    // الشاشات
    authScreen: document.getElementById('authScreen'),
    adminPanel: document.getElementById('adminPanel'),
    
    // المصادقة
    adminUsername: document.getElementById('adminUsername'),
    adminPassword: document.getElementById('adminPassword'),
    adminLoginBtn: document.getElementById('adminLoginBtn'),
    backToMainBtn: document.getElementById('backToMainBtn'),
    adminLoginMessage: document.getElementById('adminLoginMessage'),
    adminLogoutBtn: document.getElementById('adminLogoutBtn'),
    adminGreeting: document.getElementById('adminGreeting'),
    
    // القائمة الجانبية
    menuItems: document.querySelectorAll('.menu-item'),
    
    // الأقسام
    sections: {
        dashboard: document.getElementById('dashboardSection'),
        products: document.getElementById('productsSection'),
        users: document.getElementById('usersSection'),
        orders: document.getElementById('ordersSection'),
        inventory: document.getElementById('inventorySection'),
        statistics: document.getElementById('statisticsSection'),
        system: document.getElementById('systemSection')
    },
    
    // الإحصائيات
    totalOrders: document.getElementById('totalOrders'),
    totalUsers: document.getElementById('totalUsers'),
    totalProducts: document.getElementById('totalProducts'),
    totalRevenue: document.getElementById('totalRevenue'),
    recentOrdersTable: document.getElementById('recentOrdersTable'),
    
    // الجداول
    productsTableBody: document.getElementById('productsTableBody'),
    usersTableBody: document.getElementById('usersTableBody'),
    adminOrdersTableBody: document.getElementById('adminOrdersTableBody'),
    inventoryTableBody: document.getElementById('inventoryTableBody'),
    
    // النماذج المنبثقة
    productModal: document.getElementById('productModal'),
    userModal: document.getElementById('userModal'),
    orderDetailsModal: document.getElementById('orderDetailsModal'),
    
    // الأزرار
    addProductBtn: document.getElementById('addProductBtn'),
    addUserBtn: document.getElementById('addUserBtn'),
    refreshOrdersBtn: document.getElementById('refreshOrdersBtn'),
    generateReportBtn: document.getElementById('generateReportBtn'),
    
    // الفلاتر
    orderStatusFilter: document.getElementById('orderStatusFilter'),
    orderDateFilter: document.getElementById('orderDateFilter'),
    statsPeriod: document.getElementById('statsPeriod'),
    statsFromDate: document.getElementById('statsFromDate'),
    statsToDate: document.getElementById('statsToDate'),
    
    // إعدادات النظام
    buffetToggle: document.getElementById('buffetToggle'),
    prayerToggle: document.getElementById('prayerToggle'),
    buffetStatusText: document.getElementById('buffetStatusText'),
    prayerStatusText: document.getElementById('prayerStatusText'),
    
    // التحميل والاستعادة
    backupBtn: document.getElementById('backupBtn'),
    restoreBtn: document.getElementById('restoreBtn'),
    
    // المنتجات الأكثر مبيعاً
    topProductsList: document.getElementById('topProductsList'),
    topUsersList: document.getElementById('topUsersList'),
    
    // إحصائيات المخزون
    availableProductsCount: document.getElementById('availableProductsCount'),
    lowStockCount: document.getElementById('lowStockCount'),
    unavailableProductsCount: document.getElementById('unavailableProductsCount')
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    initializeAdminApp();
    setupAdminEventListeners();
});

// تهيئة تطبيق الإدارة
function initializeAdminApp() {
    const adminAuth = localStorage.getItem('admin_authenticated');
    
    if (adminAuth === 'true') {
        adminState.authenticated = true;
        showAdminPanel();
        loadDashboardData();
    } else {
        showAuthScreen();
    }
}

// إعداد مستمعي الأحداث
function setupAdminEventListeners() {
    // تسجيل دخول المسؤول
    adminElements.adminLoginBtn.addEventListener('click', handleAdminLogin);
    adminElements.adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAdminLogin();
    });
    
    adminElements.backToMainBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    adminElements.adminLogoutBtn.addEventListener('click', handleAdminLogout);
    
    // القائمة الجانبية
    adminElements.menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
        });
    });
    
    // الأزرار
    adminElements.addProductBtn.addEventListener('click', () => showProductModal('add'));
    adminElements.addUserBtn.addEventListener('click', () => showUserModal('add'));
    adminElements.refreshOrdersBtn.addEventListener('click', loadOrders);
    adminElements.generateReportBtn.addEventListener('click', generateReport);
    
    // إعدادات النظام
    adminElements.buffetToggle.addEventListener('change', updateSystemStatus);
    adminElements.prayerToggle.addEventListener('change', updateSystemStatus);
    
    // التحميل والاستعادة
    adminElements.backupBtn.addEventListener('click', createBackup);
    adminElements.restoreBtn.addEventListener('click', () => {
        document.getElementById('restoreFile').click();
    });
    
    // النماذج المنبثقة
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    
    // إغلاق النماذج
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // الفلاتر
    adminElements.orderStatusFilter.addEventListener('change', loadOrders);
    adminElements.orderDateFilter.addEventListener('change', loadOrders);
}

// تسجيل دخول المسؤول
function handleAdminLogin() {
    const username = adminElements.adminUsername.value.trim();
    const password = adminElements.adminPassword.value.trim();
    
    if (username === 'admin' && password === '5555') {
        adminState.authenticated = true;
        localStorage.setItem('admin_authenticated', 'true');
        showAdminPanel();
        loadDashboardData();
        showNotification('تم تسجيل الدخول كمسؤول بنجاح', 'success');
    } else {
        showMessage(adminElements.adminLoginMessage, 'بيانات الدخول غير صحيحة', 'error');
    }
}

// تسجيل خروج المسؤول
function handleAdminLogout() {
    adminState.authenticated = false;
    localStorage.removeItem('admin_authenticated');
    showAuthScreen();
    showNotification('تم تسجيل الخروج من لوحة التحكم', 'success');
}

// عرض شاشة المصادقة
function showAuthScreen() {
    adminElements.authScreen.classList.remove('hidden');
    adminElements.adminPanel.classList.add('hidden');
}

// عرض لوحة التحكم
function showAdminPanel() {
    adminElements.authScreen.classList.add('hidden');
    adminElements.adminPanel.classList.remove('hidden');
}

// تبديل الأقسام
function switchSection(sectionName) {
    // تحديث القائمة الجانبية
    adminElements.menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });
    
    // إخفاء جميع الأقسام
    Object.values(adminElements.sections).forEach(section => {
        section.classList.add('hidden');
    });
    
    // عرض القسم المحدد
    adminElements.sections[sectionName].classList.remove('hidden');
    adminState.currentSection = sectionName;
    
    // تحميل بيانات القسم إذا لزم الأمر
    switch(sectionName) {
        case 'products':
            loadProducts();
            break;
        case 'users':
            loadUsers();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'statistics':
            loadStatistics();
            break;
        case 'system':
            loadSystemSettings();
            break;
    }
}

// تحميل بيانات لوحة التحكم
async function loadDashboardData() {
    try {
        // جلب الإحصائيات
        const [
            ordersCount,
            usersCount,
            productsCount,
            expensesData,
            recentOrders
        ] = await Promise.all([
            supabase.from('orders').select('count', { count: 'exact' }),
            supabase.from('users').select('count', { count: 'exact' }),
            supabase.from('prices').select('count', { count: 'exact' }),
            supabase.from('expenses').select('total'),
            supabase.from('orders')
                .select('*')
                .order('id', { ascending: false })
                .limit(10)
        ]);
        
        // تحديث الإحصائيات
        adminElements.totalOrders.textContent = ordersCount.count || 0;
        adminElements.totalUsers.textContent = usersCount.count || 0;
        adminElements.totalProducts.textContent = productsCount.count || 0;
        
        // حساب الإيرادات
        const totalRevenue = expensesData.data?.reduce((sum, item) => 
            sum + (item.total || 0), 0) || 0;
        adminElements.totalRevenue.textContent = totalRevenue.toFixed(2) + ' جنيه';
        
        // عرض أحدث الطلبات
        displayRecentOrders(recentOrders.data || []);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('خطأ في تحميل بيانات لوحة التحكم', 'error');
    }
}

// عرض أحدث الطلبات
function displayRecentOrders(orders) {
    if (!orders.length) {
        adminElements.recentOrdersTable.innerHTML = '<p class="empty">لا توجد طلبات حديثة</p>';
        return;
    }
    
    let html = '<table><thead><tr>';
    html += '<th>رقم</th><th>المستخدم</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th><th>إجراء</th>';
    html += '</tr></thead><tbody>';
    
    orders.forEach(order => {
        html += `
            <tr>
                <td>${order.id}</td>
                <td>${order.username}</td>
                <td>${order.date}<br>${order.time}</td>
                <td>${order.total} جنيه</td>
                <td><span class="status ${getStatusClass(order.status)}">${order.status}</span></td>
                <td>
                    <button class="btn-small" onclick="viewOrderDetails(${order.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    adminElements.recentOrdersTable.innerHTML = html;
}

// تحميل المنتجات
async function loadProducts() {
    try {
        const { data } = await supabase
            .from('prices')
            .select('*, availability(*)')
            .order('code');
        
        adminState.products = data || [];
        displayProducts();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('خطأ في تحميل المنتجات', 'error');
    }
}

// عرض المنتجات
function displayProducts() {
    adminElements.productsTableBody.innerHTML = '';
    
    if (!adminState.products.length) {
        adminElements.productsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">لا توجد منتجات</td>
            </tr>
        `;
        return;
    }
    
    adminState.products.forEach(product => {
        const availability = product.availability || {};
        const status = availability.available ? 'متاح' : 'غير متاح';
        const statusClass = availability.available ? 'status-available' : 'status-unavailable';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.code}</td>
            <td>
                ${product.image_url ? 
                    `<img src="${product.image_url}" alt="${product.item}" class="table-image"
                         onerror="this.src='https://via.placeholder.com/50x50?text=No+Image'">` :
                    '<i class="fas fa-box text-muted"></i>'
                }
            </td>
            <td>${product.item}</td>
            <td>${product.price} جنيه</td>
            <td>${availability.available_qty || 0}</td>
            <td><span class="status ${statusClass}">${status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editProduct(${product.code})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteProduct(${product.code})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        adminElements.productsTableBody.appendChild(row);
    });
}

// تحميل المستخدمين
async function loadUsers() {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('*');
        
        const { data: expenses } = await supabase
            .from('expenses')
            .select('username, total');
        
        // حساب إحصائيات المستخدمين
        const userStats = {};
        expenses?.forEach(expense => {
            const username = expense.username;
            if (!userStats[username]) {
                userStats[username] = {
                    orderCount: 0,
                    totalSpent: 0
                };
            }
            userStats[username].orderCount++;
            userStats[username].totalSpent += expense.total || 0;
        });
        
        adminState.users = users || [];
        displayUsers(userStats);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('خطأ في تحميل المستخدمين', 'error');
    }
}

// عرض المستخدمين
function displayUsers(userStats) {
    adminElements.usersTableBody.innerHTML = '';
    
    if (!adminState.users.length) {
        adminElements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">لا يوجد مستخدمين</td>
            </tr>
        `;
        return;
    }
    
    adminState.users.forEach(user => {
        const stats = userStats[user.username] || { orderCount: 0, totalSpent: 0 };
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.password}</td>
            <td>${stats.orderCount}</td>
            <td>${stats.totalSpent.toFixed(2)} جنيه</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editUser('${user.username}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteUser('${user.username}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        adminElements.usersTableBody.appendChild(row);
    });
}

// تحميل الطلبات
async function loadOrders() {
    try {
        let query = supabase
            .from('orders')
            .select('*')
            .order('id', { ascending: false });
        
        // تطبيق الفلاتر
        const status = adminElements.orderStatusFilter.value;
        if (status) {
            query = query.eq('status', status);
        }
        
        const date = adminElements.orderDateFilter.value;
        if (date) {
            query = query.eq('date', date);
        }
        
        const { data } = await query;
        adminState.orders = data || [];
        displayOrders();
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('خطأ في تحميل الطلبات', 'error');
    }
}

// عرض الطلبات
function displayOrders() {
    adminElements.adminOrdersTableBody.innerHTML = '';
    
    if (!adminState.orders.length) {
        adminElements.adminOrdersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">لا توجد طلبات</td>
            </tr>
        `;
        return;
    }
    
    adminState.orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.username}</td>
            <td>${order.date}<br>${order.time}</td>
            <td>${order.products?.length || 0} منتج</td>
            <td>${order.total} جنيه</td>
            <td>
                <span class="status ${getStatusClass(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="viewOrderDetails(${order.id})" title="عرض">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="updateOrderStatus(${order.id})" title="تغيير الحالة">
                        <i class="fas fa-sync"></i>
                    </button>
                </div>
            </td>
        `;
        
        adminElements.adminOrdersTableBody.appendChild(row);
    });
}

// تحميل المخزون
async function loadInventory() {
    try {
        const { data } = await supabase
            .from('availability')
            .select('*, prices(item)')
            .order('code');
        
        adminState.inventory = data || [];
        displayInventory();
        
        // تحديث إحصائيات المخزون
        updateInventoryStats();
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        showNotification('خطأ في تحميل المخزون', 'error');
    }
}

// عرض المخزون
function displayInventory() {
    adminElements.inventoryTableBody.innerHTML = '';
    
    if (!adminState.inventory.length) {
        adminElements.inventoryTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">لا توجد بيانات مخزون</td>
            </tr>
        `;
        return;
    }
    
    adminState.inventory.forEach(item => {
        const status = item.available ? 'متاح' : 'غير متاح';
        const statusClass = item.available ? 'status-available' : 'status-unavailable';
        const stockClass = item.available_qty < 10 ? 'low-stock' : '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.code}</td>
            <td>${item.prices?.item || 'غير معروف'}</td>
            <td class="${stockClass}">${item.available_qty}</td>
            <td>10</td>
            <td><span class="status ${statusClass}">${status}</span></td>
            <td>
                <div class="stock-control">
                    <button class="btn-icon" onclick="updateStock(${item.code}, -1)" title="تقليل">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="btn-icon" onclick="updateStock(${item.code}, 1)" title="زيادة">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn-icon" onclick="updateStock(${item.code}, 10)" title="إضافة 10">
                        +10
                    </button>
                </div>
            </td>
        `;
        
        adminElements.inventoryTableBody.appendChild(row);
    });
}

// تحديث إحصائيات المخزون
function updateInventoryStats() {
    const available = adminState.inventory.filter(item => 
        item.available && item.available_qty > 0
    ).length;
    
    const lowStock = adminState.inventory.filter(item => 
        item.available && item.available_qty < 10 && item.available_qty > 0
    ).length;
    
    const unavailable = adminState.inventory.filter(item => 
        !item.available || item.available_qty === 0
    ).length;
    
    adminElements.availableProductsCount.textContent = available;
    adminElements.lowStockCount.textContent = lowStock;
    adminElements.unavailableProductsCount.textContent = unavailable;
}

// تحميل الإحصائيات
async function loadStatistics() {
    try {
        // جلب البيانات
        const [
            expensesData,
            productsData,
            usersData
        ] = await Promise.all([
            supabase.from('expenses').select('*'),
            supabase.from('expenses').select('item, qty, total'),
            supabase.from('expenses').select('username, total')
        ]);
        
        adminState.stats = {
            expenses: expensesData.data || [],
            products: productsData.data || [],
            users: usersData.data || []
        };
        
        // عرض التقارير
        displayStatistics();
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        showNotification('خطأ في تحميل الإحصائيات', 'error');
    }
}

// عرض الإحصائيات
function displayStatistics() {
    // حساب المنتجات الأكثر مبيعاً
    const productSales = {};
    adminState.stats.products.forEach(item => {
        if (!productSales[item.item]) {
            productSales[item.item] = 0;
        }
        productSales[item.item] += item.qty || 0;
    });
    
    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // عرض المنتجات الأكثر مبيعاً
    adminElements.topProductsList.innerHTML = '';
    topProducts.forEach(([product, qty]) => {
        const div = document.createElement('div');
        div.className = 'top-item';
        div.innerHTML = `
            <span class="product-name">${product}</span>
            <span class="product-qty">${qty} وحدة</span>
        `;
        adminElements.topProductsList.appendChild(div);
    });
    
    // حساب المستخدمين الأكثر شراءً
    const userSpending = {};
    adminState.stats.users.forEach(item => {
        if (!userSpending[item.username]) {
            userSpending[item.username] = 0;
        }
        userSpending[item.username] += item.total || 0;
    });
    
    const topUsers = Object.entries(userSpending)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // عرض المستخدمين الأكثر شراءً
    adminElements.topUsersList.innerHTML = '';
    topUsers.forEach(([user, total]) => {
        const div = document.createElement('div');
        div.className = 'top-item';
        div.innerHTML = `
            <span class="user-name">${user}</span>
            <span class="user-total">${total.toFixed(2)} جنيه</span>
        `;
        adminElements.topUsersList.appendChild(div);
    });
}

// توليد التقرير
async function generateReport() {
    const period = adminElements.statsPeriod.value;
    const fromDate = adminElements.statsFromDate.value;
    const toDate = adminElements.statsToDate.value;
    
    try {
        let query = supabase.from('expenses').select('*');
        
        // تطبيق الفلاتر حسب الفترة
        if (fromDate && toDate) {
            query = query.gte('date', fromDate).lte('date', toDate);
        } else if (period !== 'all') {
            const now = new Date();
            let startDate = new Date();
            
            switch(period) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
            }
            
            query = query.gte('date', startDate.toISOString().split('T')[0]);
        }
        
        const { data } = await query;
        
        // إنشاء التقرير
        createReport(data || []);
        showNotification('تم توليد التقرير بنجاح', 'success');
        
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('خطأ في توليد التقرير', 'error');
    }
}

// إنشاء التقرير
function createReport(data) {
    if (!data.length) {
        alert('لا توجد بيانات للتقرير المحدد');
        return;
    }
    
    // حساب الإحصائيات
    const total = data.reduce((sum, item) => sum + (item.total || 0), 0);
    const cashTotal = data.filter(item => item.payment_type === 'كاش')
        .reduce((sum, item) => sum + (item.total || 0), 0);
    const normalTotal = total - cashTotal;
    const avgOrder = total / data.length;
    
    // إنشاء محتوى التقرير
    let reportContent = `
        <h3>تقرير إحصائيات البوفيه</h3>
        <p><strong>الفترة:</strong> ${adminElements.statsPeriod.options[adminElements.statsPeriod.selectedIndex].text}</p>
        <p><strong>عدد المعاملات:</strong> ${data.length}</p>
        <p><strong>إجمالي الإيرادات:</strong> ${total.toFixed(2)} جنيه</p>
        <p><strong>الدفع العادي:</strong> ${normalTotal.toFixed(2)} جنيه</p>
        <p><strong>الدفع كاش:</strong> ${cashTotal.toFixed(2)} جنيه</p>
        <p><strong>متوسط قيمة الطلب:</strong> ${avgOrder.toFixed(2)} جنيه</p>
        <hr>
        <h4>تفاصيل المعاملات:</h4>
        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>المستخدم</th>
                    <th>الصنف</th>
                    <th>الكمية</th>
                    <th>الإجمالي</th>
                    <th>نوع الدفع</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(item => {
        reportContent += `
            <tr>
                <td>${item.date}</td>
                <td>${item.username}</td>
                <td>${item.item}</td>
                <td>${item.qty}</td>
                <td>${item.total} جنيه</td>
                <td>${item.payment_type}</td>
            </tr>
        `;
    });
    
    reportContent += '</tbody></table>';
    
    // فتح التقرير في نافذة جديدة
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>تقرير البوفيه</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f2f2f2; }
                h3 { color: #00bfa6; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            ${reportContent}
            <br><br>
            <button onclick="window.print()">🖨️ طباعة التقرير</button>
            <button onclick="window.close()">إغلاق</button>
        </body>
        </html>
    `);
}

// تحميل إعدادات النظام
async function loadSystemSettings() {
    try {
        const { data } = await supabase
            .from('system_status')
            .select('*')
            .single();
        
        if (data) {
            adminElements.buffetToggle.checked = data.buffet_open;
            adminElements.prayerToggle.checked = data.prayer_closed;
            
            adminElements.buffetStatusText.textContent = 
                data.buffet_open ? 'مفتوح' : 'مغلق';
            adminElements.prayerStatusText.textContent = 
                data.prayer_closed ? 'متوقف' : 'نشط';
        }
        
    } catch (error) {
        console.error('Error loading system settings:', error);
    }
}

// تحديث حالة النظام
async function updateSystemStatus() {
    try {
        const buffetOpen = adminElements.buffetToggle.checked;
        const prayerClosed = adminElements.prayerToggle.checked;
        
        const { error } = await supabase
            .from('system_status')
            .update({
                buffet_open: buffetOpen,
                prayer_closed: prayerClosed,
                updated_at: new Date().toISOString()
            })
            .eq('id', 1);
        
        if (error) throw error;
        
        adminElements.buffetStatusText.textContent = buffetOpen ? 'مفتوح' : 'مغلق';
        adminElements.prayerStatusText.textContent = prayerClosed ? 'متوقف' : 'نشط';
        
        showNotification('تم تحديث إعدادات النظام', 'success');
        
    } catch (error) {
        console.error('Error updating system status:', error);
        showNotification('خطأ في تحديث النظام', 'error');
    }
}

// إنشاء نسخة احتياطية
async function createBackup() {
    try {
        // جلب جميع البيانات
        const [
            usersData,
            productsData,
            availabilityData,
            ordersData,
            expensesData,
            statusData
        ] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('prices').select('*'),
            supabase.from('availability').select('*'),
            supabase.from('orders').select('*'),
            supabase.from('expenses').select('*'),
            supabase.from('system_status').select('*')
        ]);
        
        const backup = {
            timestamp: new Date().toISOString(),
            data: {
                users: usersData.data,
                prices: productsData.data,
                availability: availabilityData.data,
                orders: ordersData.data,
                expenses: expensesData.data,
                system_status: statusData.data
            }
        };
        
        // تحويل إلى JSON وتنزيل الملف
        const jsonStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `buffet_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('تم إنشاء النسخة الاحتياطية بنجاح', 'success');
        
    } catch (error) {
        console.error('Error creating backup:', error);
        showNotification('خطأ في إنشاء النسخة الاحتياطية', 'error');
    }
}

// النماذج المنبثقة
function showProductModal(mode, productCode = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (mode === 'add') {
        title.textContent = 'إضافة منتج جديد';
        form.reset();
        form.dataset.mode = 'add';
        form.dataset.code = '';
    } else {
        const product = adminState.products.find(p => p.code === productCode);
        if (!product) return;
        
        title.textContent = 'تعديل المنتج';
        document.getElementById('productCode').value = product.code;
        document.getElementById('productName').value = product.item;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productImage').value = product.image_url || '';
        document.getElementById('initialStock').value = product.availability?.available_qty || 0;
        document.getElementById('productStatus').value = 
            product.availability?.available ? 'active' : 'inactive';
        
        form.dataset.mode = 'edit';
        form.dataset.code = productCode;
    }
    
    modal.classList.remove('hidden');
}

// معالجة نموذج المنتج
async function handleProductSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode;
    const productCode = form.dataset.code;
    
    const productData = {
        code: parseInt(document.getElementById('productCode').value),
        item: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        image_url: document.getElementById('productImage').value || null
    };
    
    const stockData = {
        code: productData.code,
        available: document.getElementById('productStatus').value === 'active',
        available_qty: parseInt(document.getElementById('initialStock').value)
    };
    
    try {
        if (mode === 'add') {
            // إضافة منتج جديد
            await supabase.from('prices').insert(productData);
            await supabase.from('availability').insert(stockData);
            showNotification('تم إضافة المنتج بنجاح', 'success');
        } else {
            // تحديث المنتج الموجود
            await supabase.from('prices')
                .update(productData)
                .eq('code', productCode);
            
            await supabase.from('availability')
                .update(stockData)
                .eq('code', productCode);
            
            showNotification('تم تحديث المنتج بنجاح', 'success');
        }
        
        // إغلاق النافذة وتحديث البيانات
        document.getElementById('productModal').classList.add('hidden');
        await loadProducts();
        await loadInventory();
        
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('خطأ في حفظ المنتج', 'error');
    }
}

// حذف منتج
async function deleteProduct(code) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    try {
        await supabase.from('prices').delete().eq('code', code);
        await supabase.from('availability').delete().eq('code', code);
        
        showNotification('تم حذف المنتج بنجاح', 'success');
        await loadProducts();
        await loadInventory();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('خطأ في حذف المنتج', 'error');
    }
}

// تعديل منتج
window.editProduct = function(code) {
    showProductModal('edit', code);
};

// عرض نافذة المستخدم
function showUserModal(mode, username = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const form = document.getElementById('userForm');
    
    if (mode === 'add') {
        title.textContent = 'إضافة مستخدم جديد';
        form.reset();
        form.dataset.mode = 'add';
        form.dataset.username = '';
    } else {
        const user = adminState.users.find(u => u.username === username);
        if (!user) return;
        
        title.textContent = 'تعديل المستخدم';
        document.getElementById('newUsername').value = user.username;
        document.getElementById('newPassword').value = user.password;
        document.getElementById('confirmNewPassword').value = user.password;
        
        form.dataset.mode = 'edit';
        form.dataset.username = username;
    }
    
    modal.classList.remove('hidden');
}

// معالجة نموذج المستخدم
async function handleUserSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode;
    const oldUsername = form.dataset.username;
    
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmNewPassword').value.trim();
    
    if (!password.match(/^\d{4}$/)) {
        alert('كلمة المرور يجب أن تكون 4 أرقام فقط');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('كلمة المرور غير متطابقة');
        return;
    }
    
    const userData = {
        username: username,
        password: password
    };
    
    try {
        if (mode === 'add') {
            // التحقق من عدم وجود مستخدم بنفس الاسم
            const { data: existing } = await supabase
                .from('users')
                .select('username')
                .eq('username', username)
                .single();
            
            if (existing) {
                alert('اسم المستخدم موجود مسبقاً');
                return;
            }
            
            await supabase.from('users').insert(userData);
            showNotification('تم إضافة المستخدم بنجاح', 'success');
        } else {
            await supabase.from('users')
                .update(userData)
                .eq('username', oldUsername);
            
            showNotification('تم تحديث المستخدم بنجاح', 'success');
        }
        
        // إغلاق النافذة وتحديث البيانات
        document.getElementById('userModal').classList.add('hidden');
        await loadUsers();
        
    } catch (error) {
        console.error('Error saving user:', error);
        showNotification('خطأ في حفظ المستخدم', 'error');
    }
}

// حذف مستخدم
async function deleteUser(username) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    try {
        await supabase.from('users').delete().eq('username', username);
        showNotification('تم حذف المستخدم بنجاح', 'success');
        await loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('خطأ في حذف المستخدم', 'error');
    }
}

// تعديل مستخدم
window.editUser = function(username) {
    showUserModal('edit', username);
};

// عرض تفاصيل الطلب
async function viewOrderDetails(orderId) {
    try {
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        
        if (!order) return;
        
        const content = document.getElementById('orderDetailsContent');
        content.innerHTML = `
            <div class="order-header">
                <div class="order-info">
                    <h3>طلب #${order.id}</h3>
                    <p><strong>المستخدم:</strong> ${order.username}</p>
                    <p><strong>التاريخ:</strong> ${order.date} ${order.time}</p>
                    <p><strong>المكان:</strong> ${order.place}</p>
                    <p><strong>الحالة:</strong> <span class="status ${getStatusClass(order.status)}">${order.status}</span></p>
                    <p><strong>نوع الدفع:</strong> ${order.order_type}</p>
                    <p><strong>الإجمالي:</strong> ${order.total} جنيه</p>
                    ${order.note ? `<p><strong>ملاحظة:</strong> ${order.note}</p>` : ''}
                </div>
            </div>
            
            <div class="order-products">
                <h4>المنتجات:</h4>
                <table>
                    <thead>
                        <tr>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.products?.map(product => `
                            <tr>
                                <td>${product.item}</td>
                                <td>${product.qty}</td>
                                <td>${product.price} جنيه</td>
                                <td>${product.total} جنيه</td>
                            </tr>
                        `).join('') || ''}
                    </tbody>
                </table>
            </div>
            
            <div class="order-actions">
                <button onclick="updateOrderStatus(${order.id})" class="btn-primary">
                    <i class="fas fa-sync"></i> تغيير حالة الطلب
                </button>
            </div>
        `;
        
        document.getElementById('orderDetailsModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading order details:', error);
        showNotification('خطأ في تحميل تفاصيل الطلب', 'error');
    }
}

// تحديث حالة الطلب
window.updateOrderStatus = async function(orderId) {
    const statuses = ['في الانتظار', 'تم الاستلام', 'جاري التجهيز', 'تم التسليم', 'ملغي'];
    const currentStatus = adminState.orders.find(o => o.id === orderId)?.status;
    
    const newStatus = prompt(
        `تغيير حالة الطلب #${orderId}\n` +
        `الحالة الحالية: ${currentStatus}\n` +
        `اختر الحالة الجديدة:\n${statuses.join('\n')}`,
        currentStatus
    );
    
    if (newStatus && statuses.includes(newStatus)) {
        try {
            await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);
            
            showNotification('تم تحديث حالة الطلب', 'success');
            await loadOrders();
            
        } catch (error) {
            console.error('Error updating order status:', error);
            showNotification('خطأ في تحديث حالة الطلب', 'error');
        }
    }
};

// تحديث المخزون
window.updateStock = async function(code, change) {
    const product = adminState.inventory.find(item => item.code === code);
    if (!product) return;
    
    const newQty = Math.max(0, product.available_qty + change);
    
    try {
        await supabase
            .from('availability')
            .update({ available_qty: newQty })
            .eq('code', code);
        
        showNotification('تم تحديث المخزون', 'success');
        await loadInventory();
        
    } catch (error) {
        console.error('Error updating stock:', error);
        showNotification('خطأ في تحديث المخزون', 'error');
    }
};

// وظائف المساعدة
function getStatusClass(status) {
    switch(status) {
        case 'تم التسليم': return 'status-delivered';
        case 'في الانتظار': return 'status-pending';
        case 'تم الاستلام': return 'status-received';
        case 'جاري التجهيز': return 'status-preparing';
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
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.updateStock = updateStock;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editUser = editUser;
window.deleteUser = deleteUser;
