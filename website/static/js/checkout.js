document.addEventListener("DOMContentLoaded", function () {
    let addressForm = document.getElementById("address-form");
    let addressInputs = document.querySelectorAll("#address-section input");
    let paymentSection = document.getElementById("payment-section");
    let paymentDropdown = document.getElementById("payment-method");
    let cardDetails = document.getElementById("card-details");
    let saveAddressBtn = document.getElementById("save-address");
    let changeAddress = document.getElementById("change-address");

    let cardNumberInput = document.getElementById("card-number");
    let expiryDateInput = document.getElementById("expiry-date");
    let cvvInput = document.getElementById("cvv");
    let paymentForm = document.getElementById("checkout-form");
    let cardIcon = document.getElementById("card-icon");

    // ✅ Bootstrap Collapses for Sections
    let addressCollapse = new bootstrap.Collapse(addressForm, { toggle: false });
    let paymentCollapse = new bootstrap.Collapse(paymentSection, { toggle: false });
    let cardCollapse = new bootstrap.Collapse(cardDetails, { toggle: false });

    // ✅ "Save & Continue" Click → Collapse Address, Show Payment
    saveAddressBtn.addEventListener("click", function () {
        let address = document.getElementById("address").value.trim();
        let postalCode = document.getElementById("postal-code").value.trim();
        let recipientName = document.getElementById("recipient-name").value.trim();
        let phoneNumber = document.getElementById("phone-number").value.trim();

        if (!address || !postalCode || !recipientName || !phoneNumber) {
            alert("❌ Please fill in all required fields!");
            return;
        }

        // ✅ Collapse Address Fields
        addressCollapse.hide();
        console.log("🔻 Address section collapsed");

        // ✅ Show "Change" Button
        changeAddress.classList.remove("d-none");

        // ✅ Expand Payment Section
        paymentCollapse.show();
        console.log("🟢 Payment section expanded!");
    });

    // ✅ "Change" Click → Expand Address, Hide Button
    changeAddress.addEventListener("click", function () {
        addressCollapse.show();
        console.log("🟢 Address fields expanded!");
        changeAddress.classList.add("d-none");
    });

    // ✅ Toggle Credit Card Fields Based on Selection
    paymentDropdown.addEventListener("change", function () {
        if (this.value === "Card") {
            cardCollapse.show();
        } else {
            cardCollapse.hide();
        }
    });

    // ✅ Card Number Formatting, Type Detection & Icon Update
    cardNumberInput.addEventListener("input", function () {
        let cardNumber = this.value.replace(/\D/g, ""); // Remove non-numeric characters
        let cardType = detectCardType(cardNumber);
        let maxLength = getCardMaxLength(cardType);

        // ✅ Ensure card number doesn't exceed max length
        cardNumber = cardNumber.slice(0, maxLength);

        updateCardIcon(cardType);

        // ✅ Auto-format card number (XXXX XXXX XXXX XXXX)
        this.value = cardNumber.replace(/(.{4})/g, "$1 ").trim();

        // ✅ Update CVV length based on detected card type
        cvvInput.setAttribute("maxlength", getCVVLength(cardType));
    });

    cvvInput.addEventListener("input", function () {
        let cardType = detectCardType(cardNumberInput.value);
        let maxCVVLength = getCVVLength(cardType);

        // ✅ Prevent entering more than allowed CVV digits
        this.value = this.value.replace(/\D/g, "").slice(0, maxCVVLength);
    });

    function detectCardType(number) {
        if (/^4/.test(number)) return "Visa";
        if (/^5[1-5]/.test(number)) return "MasterCard";
        if (/^3[47]/.test(number)) return "American Express";
        return "Unknown";
    }

    function updateCardIcon(cardType) {
        let iconUrls = {
            "Visa": "https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png",
            "MasterCard": "https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg",
            "American Express": "https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg"
        };

        if (iconUrls[cardType]) {
            cardIcon.src = iconUrls[cardType];
            cardIcon.style.display = "block"; // Show icon
        } else {
            cardIcon.style.display = "none"; // Hide if not recognized
        }
    }

    function getCardMaxLength(cardType) {
        return cardType === "American Express" ? 15 : 16;
    }

    function getCVVLength(cardType) {
        return cardType === "American Express" ? 4 : 3;
    }

    // ✅ Expiry Date Validation
    expiryDateInput.addEventListener("input", function () {
        let expiry = this.value.replace(/\D/g, ""); // Remove non-numeric characters

        if (expiry.length > 2) {
            expiry = expiry.slice(0, 2) + "/" + expiry.slice(2, 4);
        }
        this.value = expiry.slice(0, 5);
    });

    // ✅ Sync cart with Flask before submitting checkout form
    document.getElementById("checkout-form").addEventListener("submit", function(event) {
        event.preventDefault(); // Stop form from immediately submitting

        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        console.log("🛒 Syncing cart with backend before checkout...", cart);

        fetch("/sync_cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ cart: cart }) // Send localStorage cart to Flask
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("✅ Cart successfully synced!");
                this.submit(); // Submit form after syncing
            } else {
                alert("❌ Failed to sync cart. Please try again.");
            }
        })
        .catch(error => {
            console.error("❌ Error syncing cart:", error);
            alert("❌ There was an issue processing your cart.");
        });
    });

    // ✅ Load Order Summary (Now Includes 9% Tax)
    function loadCheckoutSummary() {
        let cart = JSON.parse(localStorage.getItem("cart")) || [];

        if (cart.length === 0) {
            alert("Your cart is empty! Redirecting back.");
            window.location.href = "/cart";
            return;
        }

        let subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
        let tax = subtotal * 0.09; // ✅ 9% tax calculation
        let deliveryFee = cart.length > 0 ? 10.00 : 0.00;
        let total = subtotal + tax + deliveryFee; // ✅ Include tax in total

        // ✅ Update HTML elements with correct amounts
        document.getElementById("summary-subtotal").textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById("summary-tax").textContent = `$${tax.toFixed(2)}`; // Ensure this row is in checkout.html
        document.getElementById("summary-delivery").textContent = `$${deliveryFee.toFixed(2)}`;
        document.getElementById("summary-total").textContent = `$${total.toFixed(2)}`;
    }

    loadCheckoutSummary();
});
