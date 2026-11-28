
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // PRODUCTS
    // Change these items and prices whenever needed.
    // ==========================================

    const products = [
        {
            id: 1,
            name: "Memory Journal",
            description: "A journal for recording daily memories.",
            price: 149.99
        },
        {
            id: 2,
            name: "Daily Reminder Cards",
            description: "Cards to help organise everyday activities.",
            price: 89.99
        },
        {
            id: 3,
            name: "Memory Photo Frame",
            description: "A frame for keeping special photographs close.",
            price: 119.99
        },
        {
            id: 4,
            name: "Personal Memory Book",
            description: "A personal collection of important memories.",
            price: 179.99
        },
        {
            id: 5,
            name: "Routine Planner",
            description: "A simple planner for daily routines.",
            price: 99.99
        },
        {
            id: 6,
            name: "Family Memory Album",
            description: "A place to keep family photographs and stories.",
            price: 199.99
        }
    ];


    // ==========================================
    // PROFESSIONAL SERVICES
    // Add your own providers here.
    // ==========================================

    const providers = [];


    // ==========================================
    // CART SETTINGS
    // ==========================================

    const DELIVERY_COST = 0;

    const STORAGE_KEY = "khumbula_shop_cart";

    let cart = [];


    // ==========================================
    // ELEMENTS
    // ==========================================

    const productList = document.getElementById("product-list");
    const productSearch = document.getElementById("product-search");

    const serviceList = document.getElementById("service-list");
    const serviceSearch = document.getElementById("service-search");
    const serviceCategory = document.getElementById("service-category");

    const cartItems = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const cartSubtotal = document.getElementById("cart-subtotal");
    const deliveryCost = document.getElementById("delivery-cost");
    const cartTotal = document.getElementById("cart-total");

    const clearCartButton = document.getElementById("clear-cart");
    const checkoutButton = document.getElementById("open-checkout");

    const cartMessage = document.getElementById("cart-message");
    const checkoutSection = document.getElementById("checkout-section");
    const checkoutResult = document.getElementById("checkout-result");
    const cancelCheckoutButton = document.getElementById("cancel-checkout");


    // ==========================================
    // HELPERS
    // ==========================================

    function formatPrice(amount) {
        return new Intl.NumberFormat("en-ZA", {
            style: "currency",
            currency: "ZAR"
        }).format(amount);
    }


    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }


    function findProduct(productId) {
        return products.find(product => product.id === Number(productId));
    }


    // ==========================================
    // DISPLAY PRODUCTS
    // ==========================================

    function displayProducts() {

        const searchTerm = productSearch.value.trim().toLowerCase();

        const filteredProducts = products.filter(product => {
            return (
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
        });

        if (filteredProducts.length === 0) {
            productList.innerHTML = `
                <div class="empty-state">
                    No products found.
                </div>
            `;
            return;
        }

        productList.innerHTML = filteredProducts.map(product => `

            <article class="product-card">

                <!-- EMPTY IMAGE PLACEHOLDER -->
                <div class="product-image"></div>

                <div class="product-info">

                    <h3>${escapeHTML(product.name)}</h3>

                    <p class="product-description">
                        ${escapeHTML(product.description)}
                    </p>

                    <div class="product-bottom">

                        <span class="product-price">
                            ${formatPrice(product.price)}
                        </span>

                        <button
                            type="button"
                            class="add-button"
                            data-add="${product.id}">
                            Add to cart
                        </button>

                    </div>

                </div>

            </article>

        `).join("");

    }


    // ==========================================
    // ADD PRODUCT TO CART
    // ==========================================

    function addToCart(productId) {

        const product = findProduct(productId);

        if (!product) return;

        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: product.id,
                quantity: 1
            });
        }

        saveCart();
        displayCart();

    }


    // ==========================================
    // UPDATE QUANTITY
    // ==========================================

    function updateQuantity(productId, change) {

        const item = cart.find(item => item.id === Number(productId));

        if (!item) return;

        item.quantity += change;

        if (item.quantity <= 0) {
            cart = cart.filter(cartItem => cartItem.id !== Number(productId));
        }

        saveCart();
        displayCart();

    }


    // ==========================================
    // REMOVE PRODUCT
    // ==========================================

    function removeFromCart(productId) {

        cart = cart.filter(item => item.id !== Number(productId));

        saveCart();
        displayCart();

    }


    // ==========================================
    // CART CALCULATIONS
    // ==========================================

    function calculateSubtotal() {

        return cart.reduce((total, item) => {

            const product = findProduct(item.id);

            if (!product) return total;

            return total + (product.price * item.quantity);

        }, 0);

    }


    function calculateTotal() {

        const subtotal = calculateSubtotal();

        const delivery = cart.length > 0 ? DELIVERY_COST : 0;

        return subtotal + delivery;

    }


    // ==========================================
    // DISPLAY CART
    // ==========================================

    function displayCart() {

        const itemCount = cart.reduce(
            (total, item) => total + item.quantity,
            0
        );

        cartCount.textContent = itemCount;

        if (cart.length === 0) {

            cartItems.innerHTML = `
                <div class="empty-state">
                    Your cart is empty.
                </div>
            `;

        } else {

            cartItems.innerHTML = cart.map(item => {

                const product = findProduct(item.id);

                if (!product) return "";

                const itemTotal = product.price * item.quantity;

                return `

                    <article class="cart-item">

                        <div class="cart-item-info">

                            <h3>${escapeHTML(product.name)}</h3>

                            <p>${formatPrice(itemTotal)}</p>

                        </div>

                        <div class="quantity-controls">

                            <button
                                type="button"
                                data-decrease="${product.id}"
                                aria-label="Decrease quantity">
                                −
                            </button>

                            <span class="quantity">
                                ${item.quantity}
                            </span>

                            <button
                                type="button"
                                data-increase="${product.id}"
                                aria-label="Increase quantity">
                                +
                            </button>

                        </div>

                        <button
                            type="button"
                            class="remove-button"
                            data-remove="${product.id}">
                            Remove
                        </button>

                    </article>

                `;

            }).join("");

        }

        // Calculate and display totals.

        const subtotal = calculateSubtotal();
        const delivery = cart.length > 0 ? DELIVERY_COST : 0;
        const total = subtotal + delivery;

        cartSubtotal.textContent = formatPrice(subtotal);
        deliveryCost.textContent = formatPrice(delivery);
        cartTotal.textContent = formatPrice(total);

        checkoutButton.disabled = cart.length === 0;
        clearCartButton.disabled = cart.length === 0;

    }


    // ==========================================
    // CLEAR CART
    // ==========================================

    function clearCart() {

        if (cart.length === 0) return;

        const confirmed = confirm("Are you sure you want to clear your cart?");

        if (!confirmed) return;

        cart = [];

        saveCart();
        displayCart();

        checkoutSection.hidden = true;

    }


    // ==========================================
    // CHECKOUT
    // ==========================================

    function checkout() {

        if (cart.length === 0) return;

        const total = calculateTotal();

        checkoutSection.hidden = false;

        checkoutResult.innerHTML = `
            <div class="checkout-message">
                <strong>Order summary</strong>
                <p>Total: ${formatPrice(total)}</p>
                <p>Payment processing has not been connected yet.</p>
            </div>
        `;

    }


    // ==========================================
    // LOCAL STORAGE
    // ==========================================

    function saveCart() {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cart)
        );

    }


    function loadCart() {

        try {

            const savedCart = JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            );

            if (!Array.isArray(savedCart)) {
                cart = [];
                return;
            }

            cart = savedCart.filter(item => {

                const productExists = findProduct(item.id);

                return (
                    productExists &&
                    Number.isInteger(item.quantity) &&
                    item.quantity > 0
                );

            });

        } catch (error) {

            cart = [];

        }

    }


    // ==========================================
    // PROFESSIONAL SERVICES
    // ==========================================

    function displayServices() {

        const searchTerm = serviceSearch.value.trim().toLowerCase();
        const selectedCategory = serviceCategory.value;

        const filteredProviders = providers.filter(provider => {

            const matchesCategory =
                selectedCategory === "all" ||
                provider.category === selectedCategory;

            const matchesSearch =
                provider.name.toLowerCase().includes(searchTerm) ||
                provider.category.toLowerCase().includes(searchTerm);

            return matchesCategory && matchesSearch;

        });

        if (filteredProviders.length === 0) {

            serviceList.innerHTML = `
                <div class="empty-state">
                </div>
            `;

            return;
        }

        serviceList.innerHTML = filteredProviders.map(provider => `

            <article class="service-card">

                <h3>${escapeHTML(provider.name)}</h3>

                <p>${escapeHTML(provider.category)}</p>

            </article>

        `).join("");

    }


    // ==========================================
    // TAB NAVIGATION
    // ==========================================

    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach(button => {

        button.addEventListener("click", () => {

            const targetTab = button.dataset.tab;

            tabButtons.forEach(tab => {
                tab.classList.remove("active");
                tab.setAttribute("aria-selected", "false");
            });

            tabPanels.forEach(panel => {
                panel.classList.remove("active");
                panel.hidden = true;
            });

            button.classList.add("active");
            button.setAttribute("aria-selected", "true");

            const selectedPanel = document.getElementById(targetTab);

            if (selectedPanel) {
                selectedPanel.classList.add("active");
                selectedPanel.hidden = false;
            }

        });

    });


    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    productSearch.addEventListener("input", displayProducts);

    productList.addEventListener("click", event => {

        const button = event.target.closest("[data-add]");

        if (!button) return;

        addToCart(button.dataset.add);

    });


    cartItems.addEventListener("click", event => {

        const increaseButton = event.target.closest("[data-increase]");
        const decreaseButton = event.target.closest("[data-decrease]");
        const removeButton = event.target.closest("[data-remove]");

        if (increaseButton) {
            updateQuantity(increaseButton.dataset.increase, 1);
        }

        if (decreaseButton) {
            updateQuantity(decreaseButton.dataset.decrease, -1);
        }

        if (removeButton) {
            removeFromCart(removeButton.dataset.remove);
        }

    });


    serviceSearch.addEventListener("input", displayServices);

    serviceCategory.addEventListener("change", displayServices);

    clearCartButton.addEventListener("click", clearCart);

    checkoutButton.addEventListener("click", checkout);

    cancelCheckoutButton.addEventListener("click", () => {
        checkoutSection.hidden = true;
    });


    // ==========================================
    // INITIALISE
    // ==========================================

    loadCart();

    displayProducts();
    displayServices();
    displayCart();

});
