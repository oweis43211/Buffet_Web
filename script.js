// حالة التطبيق
let currentUser = null;
let products = {};
let availableProducts = {};
let selectedProducts = [];

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    // أحداث تسجيل الدخول
    document.getElementById('login-btn').addEventListener('click', doLogin);
    document.getElementById('change-password-btn').addEventListener('click', showChangePasswordModal);
    document.getElementById('password').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') doLogin();
    });

    // أحداث الواجهة الرئيسية
    document.getElementById('select-products-btn').addEventListener('click', showProductsModal);
    document.getElementById('consumption-btn').addEventListener('click', showConsumption);
    document.getElementById('orders-btn').addEventListener('click', showMyOrders);
    document.getElementById('send-normal-btn').addEventListener('click', () => sendOrder('عادي'));
    document.getElementById('send-cash-btn').addEventListener('click', () => sendOrder('كاش'));

    // أحداث المودالات
    setupModalEvents();
}

// دالة محسنة لجلب الصور من مجلد img
function getProductImage(code) {
    const extensions = ['png', 'jpg', 'jpeg', 'webp'];
    let html = '<div class="product-image-container">';

    // إضافة جميع الصور المحتملة
    extensions.forEach((ext, index) => {
        const displayStyle = index === 0 ? '' : 'style="display:none"';
        html += `<img src="img/${code}.${ext}" 
                     alt="Product ${code}" 
                     class="product-image"
                     ${displayStyle}
                     onerror="handleImageError(this, ${code})"
                     loading="lazy">`;
    });

    html += `<div class="no-image" style="display:none">🖼️ لا توجد صورة</div>`;
    html += '</div>';

    return html;
}

// معالجة خطأ الصورة
function handleImageError(imgElement, code) {
    const container = imgElement.closest('.product-image-container');
    const nextImage = container.querySelector('.product-image:not([style*="display: none"])');
    const noImage = container.querySelector('.no-image');

    imgElement.style.display = 'none';

    if (nextImage) {
        nextImage.style.display = 'block';
    } else {
        noImage.style.display = 'block';
    }
}

// تسجيل الدخول
async function doLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        alert('يرجى إدخال اسم المستخدم وكلمة المرور');
        return;
    }

    if (!password.match(/^\d{4}$/)) {
        alert('كلمة المرور يجب أن تكون 4 أرقام فقط');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password);

        if (error) throw error;

        if (data && data.length > 0) {
            currentUser = username;
            showMainApp();
        } else {
            alert('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
    } catch (error) {
        alert('فشل تسجيل الدخول: ' + error.message);
    }
}

// عرض الواجهة الرئيسية
function showMainApp() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-page').classList.add('active');
    document.getElementById('welcome-user').textContent = currentUser;

    fetchProductsAndAvailability();
    startAutoRefresh();
}

// جلب المنتجات والتوافر
async function fetchProductsAndAvailability() {
    try {
        // جلب الأسعار
        const { data: pricesData, error: pricesError } = await supabase
            .from('prices')
            .select('*');

        if (pricesError) throw pricesError;

        products = {};
        pricesData.forEach(item => {
            const code = parseInt(item.code);
            products[code] = {
                item: item.item,
                price: parseFloat(item.price) || 0,
                image_data: item.image_data
            };
        });

        // جلب التوافر
        const { data: availabilityData, error: availabilityError } = await supabase
            .from('availability')
            .select('*');

        if (availabilityError) throw availabilityError;

        availableProducts = {};
        availabilityData.forEach(item => {
            const code = parseInt(item.code);
            availableProducts[code] = {
                available: Boolean(item.available),
                available_qty: parseInt(item.available_qty) || 0
            };
        });

        updateRefreshTime();
    } catch (error) {
        console.error('Error fetching products:', error);
        alert('فشل تحميل البيانات');
    }
}

// تحديث الوقت
function updateRefreshTime() {
    const now = new Date().toLocaleTimeString('ar-EG');
    document.getElementById('refresh-status').textContent = `آخر تحديث: ${now}`;
}

// التحديث التلقائي
function startAutoRefresh() {
    setInterval(async () => {
        await fetchProductsAndAvailability();
        checkSystemStatus();
    }, 5000);
}

// التحقق من حالة النظام
async function checkSystemStatus() {
    try {
        const { data, error } = await supabase
            .from('system_status')
            .select('*')
            .limit(1);

        if (error) throw error;

        const status = data[0] || { buffet_open: true, prayer_closed: false };

        if (!status.buffet_open) {
            alert('عذرًا، البوفيه مغلق حاليًا، يرجى الطلب غدًا.');
        } else if (status.prayer_closed) {
            alert('عذرًا، عامل البوفيه ذهب للصلاة، يرجى الانتظار حتى انتهاء الصلاة.');
        }
    } catch (error) {
        console.error('Error checking system status:', error);
    }
}

// نافذة المنتجات
async function showProductsModal() {
    const modal = document.getElementById('products-modal');
    modal.style.display = 'block';
    await loadProductsModal();
}

async function loadProductsModal() {
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #ccc;">جاري تحميل المنتجات...</div>';

    try {
        const availableCodes = Object.keys(availableProducts)
            .filter(code => availableProducts[code].available && availableProducts[code].available_qty > 0)
            .map(code => parseInt(code));

        const availableProductsList = Object.keys(products)
            .filter(code => availableCodes.includes(parseInt(code)))
            .map(code => ({
                code: parseInt(code),
                ...products[code]
            }));

        const drinks = availableProductsList.filter(p => p.code >= 1 && p.code <= 43);
        const foods = availableProductsList.filter(p => p.code >= 100 && p.code <= 135);

        let html = '';

        if (drinks.length > 0) {
            html += '<h3 style="color: orange; margin: 20px 0 10px 0; font-size: 1.2rem;">🥤 المشروبات</h3>';
            html += renderProductSection(drinks);
        }

        if (foods.length > 0) {
            html += '<h3 style="color: orange; margin: 20px 0 10px 0; font-size: 1.2rem;">🍔 المأكولات</h3>';
            html += renderProductSection(foods);
        }

        productsList.innerHTML = html || '<div style="text-align: center; padding: 40px; color: #ccc;">لا توجد منتجات متاحة حالياً</div>';

        setupProductSearch();

    } catch (error) {
        productsList.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">فشل تحميل المنتجات</div>';
        console.error('Error loading products:', error);
    }
}

function renderProductSection(products) {
    return products.map(product => {
        const availableQty = availableProducts[product.code]?.available_qty || 0;
        const currentQty = selectedProducts.find(p => p.code === product.code)?.qty || 0;

        return `
            <div class="product-card" data-code="${product.code}">
                ${getProductImage(product.code)}
                <div class="product-info">
                    <h4>${product.item}</h4>
                    <p class="price">السعر: ${product.price} جنيه</p>
                    <p style="color: #4ecdc4;">المتاح: ${availableQty}</p>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="decreaseQuantity(${product.code})" 
                                ${currentQty === 0 ? 'disabled' : ''}>-</button>
                        <span class="quantity-display" id="qty-${product.code}">${currentQty}</span>
                        <button class="quantity-btn" onclick="increaseQuantity(${product.code})"
                                ${currentQty >= availableQty ? 'disabled' : ''}>+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// التحكم في الكميات
function increaseQuantity(code) {
    const availableQty = availableProducts[code]?.available_qty || 0;
    const currentProduct = selectedProducts.find(p => p.code === code);
    const currentQty = currentProduct ? currentProduct.qty : 0;

    if (currentQty < availableQty) {
        if (currentProduct) {
            currentProduct.qty++;
        } else {
            selectedProducts.push({
                code: code,
                name: products[code].item,
                price: products[code].price,
                qty: 1
            });
        }
        updateQuantityDisplay(code, currentQty + 1);
    }
}

function decreaseQuantity(code) {
    const currentProduct = selectedProducts.find(p => p.code === code);
    if (currentProduct) {
        currentProduct.qty--;
        if (currentProduct.qty <= 0) {
            selectedProducts = selectedProducts.filter(p => p.code !== code);
        }
        updateQuantityDisplay(code, Math.max(0, currentProduct.qty));
    }
}

function updateQuantityDisplay(code, quantity) {
    const display = document.getElementById(`qty-${code}`);
    if (display) {
        display.textContent = quantity;
    }
}

// تأكيد الاختيار
function confirmSelection() {
    if (selectedProducts.length > 0) {
        document.getElementById('selected-products').textContent =
            `تم اختيار ${selectedProducts.length} منتج ✅`;
        document.getElementById('selected-products').style.color = 'lightgreen';
        closeModal('products-modal');
        alert('تم حفظ اختيارك بنجاح ✅');
    } else {
        alert('لم يتم تحديد أي كميات.');
    }
}

// إرسال الطلب
async function sendOrder(orderType) {
    const place = document.getElementById('place').value.trim();
    const note = document.getElementById('note').value.trim();

    if (!place) {
        alert('يرجى إدخال المكان');
        return;
    }

    if (selectedProducts.length === 0 || !selectedProducts.some(p => p.qty > 0)) {
        alert('يرجى اختيار المنتجات أولاً');
        return;
    }

    // التحقق من حالة النظام
    try {
        const { data, error } = await supabase
            .from('system_status')
            .select('*')
            .limit(1);

        if (error) throw error;

        const status = data[0] || { buffet_open: true, prayer_closed: false };

        if (!status.buffet_open) {
            alert('عذرًا، البوفيه مغلق حاليًا، يرجى الطلب غدًا.');
            return;
        }

        if (status.prayer_closed) {
            alert('عذرًا، عامل البوفيه ذهب للصلاة، يرجى الانتظار حتى انتهاء الصلاة.');
            return;
        }
    } catch (error) {
        console.error('Error checking system status:', error);
    }

    try {
        const batchId = `${currentUser}_${Date.now()}`;
        let totalAll = 0;
        const productsData = [];
        const expensesRows = [];

        const now = new Date();
        const nowDate = now.toISOString().split('T')[0];
        const nowTime = now.toTimeString().split(' ')[0];

        for (const prod of selectedProducts) {
            if (prod.qty <= 0) continue;

            const code = prod.code;
            const availableInfo = availableProducts[code];

            if (!availableInfo || !availableInfo.available) continue;

            const availableQty = availableInfo.available_qty || 0;
            let finalQty = prod.qty;

            if (availableQty < prod.qty) {
                alert(`الكمية المتاحة من '${prod.name}' هي ${availableQty} فقط.`);
                finalQty = availableQty;
                if (finalQty <= 0) continue;
            }

            const totalPrice = prod.price * finalQty;
            totalAll += totalPrice;

            productsData.push({
                code: code,
                item: prod.name,
                price: prod.price,
                qty: finalQty,
                total: totalPrice
            });

            expensesRows.push({
                username: currentUser,
                code: code,
                item: prod.name,
                price: prod.price,
                qty: finalQty,
                total: totalPrice,
                date: nowDate,
                time: nowTime,
                payment_type: orderType,
                batch_id: batchId
            });

            // تحديث الكمية المتاحة
            const newQty = Math.max(0, availableQty - finalQty);
            await supabase
                .from('availability')
                .update({ available_qty: newQty })
                .eq('code', code);
        }

        if (productsData.length === 0) {
            alert('لم يتم إدخال أي منتجات صالحة');
            return;
        }

        // إدخال الطلب
        await supabase
            .from('orders')
            .insert({
                username: currentUser,
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

        alert(`تم إرسال طلبك بنجاح.\nالإجمالي: ${totalAll} جنيه`);

        // إعادة تعيين الحقول
        document.getElementById('place').value = '';
        document.getElementById('note').value = '';
        document.getElementById('selected-products').textContent = 'لم يتم اختيار منتجات';
        document.getElementById('selected-products').style.color = 'red';
        selectedProducts = [];

    } catch (error) {
        alert('حدث خطأ أثناء إرسال الطلب: ' + error.message);
    }
}

// إعداد أحداث المودالات
function setupModalEvents() {
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    document.getElementById('confirm-selection').addEventListener('click', confirmSelection);
    document.getElementById('save-password').addEventListener('click', changePassword);
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// البحث في المنتجات
function setupProductSearch() {
    const searchInput = document.getElementById('product-search');
    searchInput.addEventListener('input', function () {
        const term = this.value.toLowerCase().trim();
        const productCards = document.querySelectorAll('.product-card');

        productCards.forEach(card => {
            const productName = card.querySelector('h4').textContent.toLowerCase();
            if (productName.includes(term)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// تغيير كلمة المرور
async function changePassword() {
    const username = document.getElementById('change-username').value.trim();
    const oldPassword = document.getElementById('old-password').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();

    if (!username || !oldPassword || !newPassword) {
        alert('يرجى إدخال جميع الحقول');
        return;
    }

    if (!newPassword.match(/^\d{4}$/)) {
        alert('كلمة المرور الجديدة يجب أن تكون 4 أرقام فقط');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', oldPassword);

        if (error) throw error;

        if (data && data.length > 0) {
            await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('username', username);

            alert('تم تغيير كلمة المرور بنجاح ✅');
            closeModal('password-modal');
        } else {
            alert('اسم المستخدم أو كلمة المرور الحالية غير صحيحة');
        }
    } catch (error) {
        alert('فشل تغيير كلمة المرور: ' + error.message);
    }
}

function showChangePasswordModal() {
    document.getElementById('password-modal').style.display = 'block';
}

// وظائف العرض
async function showConsumption() {
    alert('سيتم تطوير هذه الوظيفة في النسخة القادمة');
}

async function showMyOrders() {
    alert('سيتم تطوير هذه الوظيفة في النسخة القادمة');
}