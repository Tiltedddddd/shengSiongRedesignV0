document.addEventListener("DOMContentLoaded", function () {
    loadCartFromLocalStorage();
    updateCartBadge(); // ✅ Ensure the cart badge updates

    // 🛒 Hide the dropdown cart on `NEW_cart.html`
    let cartDropdown = document.getElementById("cart-dropdown");
    if (cartDropdown) {
        cartDropdown.style.display = "none";
    }

    // 🛒 Handle Continue Shopping Button
    document.getElementById("continue-shopping").addEventListener("click", function () {
        window.location.href = "/";
    });

    // 🛒 Handle Proceed to Checkout Button (Placeholder)
    document.getElementById("proceed-checkout").addEventListener("click", function () {
        alert("Proceeding to checkout! (Not implemented)");
    });

});

// ✅ Load cart data from localStorage
function loadCartFromLocalStorage() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    renderCartItems(cart);
    updateOrderSummary(); // ✅ Ensures order summary updates when page loads
}



// ✅ Render cart items dynamically in `NEW_cart.html`
function renderCartItems(cart) {
    let cartContainer = document.getElementById("cart-items");
    cartContainer.innerHTML = "";

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">Your cart is empty.</td>
            </tr>`;
        document.getElementById("cart-subtotal").textContent = "$0.00";
        document.getElementById("cart-tax").textContent = "$0.00";
        document.getElementById("cart-total").textContent = "$0.00";
        return;
    }

    cart.forEach(item => {
        cartContainer.innerHTML += `
            <tr class="cart-item">
                <td class="d-flex align-items-center">
                    <img src="${item.image}" class="img-fluid rounded" style="max-width: 80px; margin-right: 15px;">
                    <span>${item.name}</span>
                </td>
                <td class="text-center">
                    <div class="quantity-controls d-flex align-items-center justify-content-center">
                        <button class="btn btn-outline-secondary decrement-btn" data-id="${item.id}">−</button>
                        <input type="text" class="form-control text-center quantity-input" data-id="${item.id}" value="${item.quantity}" style="width: 50px;">
                        <button class="btn btn-outline-secondary increment-btn" data-id="${item.id}">+</button>
                    </div>
                </td>
                <td class="text-center">
                    <strong>$<span class="price">${(item.quantity * item.price).toFixed(2)}</span></strong>
                </td>
                <td class="text-center">
                    <button class="btn btn-outline-danger remove-from-cart" data-id="${item.id}">×</button>
                </td>
            </tr>
        `;
    });

    attachCartEventListeners(); // ✅ Attach event listeners to buttons
}

//This ensures the Remove buttons get event listeners AFTER they are added to the page.
function attachCartEventListeners() {
    // 🔽 Decrease Quantity
    document.querySelectorAll(".decrement-btn").forEach(button => {
        button.addEventListener("click", function () {
            let input = this.nextElementSibling; // The quantity input field
            let currentValue = parseInt(input.value);

            if (currentValue > 1) {
                input.value = currentValue - 1;
                updateQuantity(input.dataset.id, -1);
            }
        });
    });

    // 🔼 Increase Quantity
    document.querySelectorAll(".increment-btn").forEach(button => {
        button.addEventListener("click", function () {
            let input = this.previousElementSibling; // The quantity input field
            let currentValue = parseInt(input.value);

            input.value = currentValue + 1;
            updateQuantity(input.dataset.id, 1);
        });
    });

    // 🛑 Prevent invalid quantity inputs
    document.querySelectorAll(".quantity-input").forEach(input => {
        input.addEventListener("input", function () {
            // Remove anything that's not a number
            this.value = this.value.replace(/[^0-9]/g, "");

            // Ensure the value is at least 1
            if (this.value === "" || parseInt(this.value) < 1) {
                this.value = 1;
            }
        });

        input.addEventListener("change", function () {
            let newQuantity = parseInt(this.value);

            // Ensure the quantity is valid
            if (isNaN(newQuantity) || newQuantity < 1) {
                this.value = 1;
                newQuantity = 1;
            }

            updateQuantity(this.dataset.id, newQuantity - parseInt(this.defaultValue));
            this.defaultValue = this.value; // Prevent double updates
        });
    });

    // ❌ Remove Item from Cart
    document.querySelectorAll(".remove-from-cart").forEach(button => {
        button.addEventListener("click", function () {
            let productId = this.dataset.id;
            removeFromCart(productId);
        });
    });
}


// ✅ Update item quantity in localStorage
function updateQuantity(productId, change) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let item = cart.find(item => item.id === productId);

    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);  // Remove item if quantity is 0
        }
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    loadCartFromLocalStorage();  // ✅ Update `NEW_cart.html`
    updateCartBadge();
}

// ✅ Remove item from cart in localStorage
function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    productId = productId.toString();  // ✅ Ensure it's a string

    console.log("Removing product ID:", productId);

    let newCart = cart.filter(item => item.id !== productId);

    localStorage.setItem("cart", JSON.stringify(newCart));

    loadCartFromLocalStorage(); // ✅ Refresh the cart UI
    updateCartBadge();
    updateOrderSummary(); // ✅ Update the order summary when item is removed
}

function updateCartBadge() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    let cartBadge = document.getElementById("cart-count");

    if (cartBadge) {
        cartBadge.textContent = totalItems > 99 ? "99+" : totalItems;
        cartBadge.style.display = totalItems > 0 ? "inline-block" : "none"; // Hide if empty
    }
}

function updateOrderSummary() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    let subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    let tax = subtotal * 0.09;  // ✅ Assuming 9% tax
    let shipping = cart.length > 0 ? 10.00 : 0.00;  // ✅ Free shipping if cart is empty
    let total = subtotal + tax + shipping;

    console.log("Updating Order Summary -> Subtotal:", subtotal, "Tax:", tax, "Total:", total);

    document.getElementById("cart-subtotal").textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById("cart-tax").textContent = `$${tax.toFixed(2)}`;
    document.getElementById("cart-total").textContent = `$${total.toFixed(2)}`;
}


// ✅ Update the cart badge on page load
document.addEventListener("DOMContentLoaded", function () {
    updateCartBadge();
});


document.addEventListener("DOMContentLoaded", function () {
    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("order_success")) {
        localStorage.removeItem("cart");  // ✅ Clear cart for guests
    }
});
