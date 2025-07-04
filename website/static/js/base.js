// Get the header and the underline elements
const header = document.querySelector("header");
const underline = document.getElementById("header-underline");

// Function to handle scroll effect
window.addEventListener("scroll", () => {
    if (window.scrollY > 75) {
        header.classList.add("sticky"); // Add sticky class to header
        underline.style.width = "100%"; // Expand underline
    } else {
        header.classList.remove("sticky"); // Remove sticky class when scrolled up
        underline.style.width = "75%"; // Restore initial width
    }
});


// Automatically hide flash messages after 3 seconds
document.addEventListener("DOMContentLoaded", function () {
    const flashMessages = document.querySelectorAll(".flash-message");
    flashMessages.forEach((message) => {
        setTimeout(() => {
            message.style.transition = "opacity 0.3s ease-out";
            message.style.opacity = "0";
            setTimeout(() => message.remove(), 500); // Fully remove the element
        }, 3000); // 5 seconds
    });
});


//Address modal stuff
document.addEventListener("DOMContentLoaded", function () {
    const saveAddressBtn = document.getElementById("saveAddressBtn");
    const addressInput = document.getElementById("addressInput");
    const deliveryButton = document.getElementById("deliveryButton");
    const feedback = document.getElementById("addressFeedback");
    const useLocationBtn = document.getElementById("useLocationBtn");



    // Initialize Google Places Autocomplete
    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
        types: ['geocode'],
        componentRestrictions: { country: 'SG' }, // Restrict to Singapore
    });

    // Function to truncate long addresses but keep postal code visible
    const truncateAddress = (address) => {
        const postalCode = address.match(/\d{6}$/)?.[0] || "";
        if (address.length > 20) {
            return `${address.slice(0, 17)}... (${postalCode})`;
        }
        return address;
    };

    // Disable save button if postal code is invalid
    addressInput.addEventListener("input", () => {
        const postalCode = addressInput.value.trim();
        if (/^[0-9]{6}$/.test(postalCode)) {
            saveAddressBtn.disabled = false;
            feedback.style.display = "none";
            addressInput.style.borderColor = "";
        } else {
            saveAddressBtn.disabled = true;
            feedback.textContent = "Enter a valid 6-digit postal code.";
            feedback.style.display = "block";
            feedback.style.color = "red";
        }
    });

    // Handle address selection from autocomplete
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            console.error("No details available for the selected place.");
            feedback.textContent = "Please select a valid address.";
            feedback.style.display = "block";
            feedback.style.color = "red";
            addressInput.style.borderColor = "red";
            return;
        }

        // Extract postal code from address components
        let postalCode = "";
        place.address_components.forEach(component => {
            if (component.types.includes("postal_code")) {
                postalCode = component.long_name;
            }
        });

        if (postalCode) {
            addressInput.value = place.formatted_address;
            feedback.textContent = "";
            feedback.style.display = "none";
            addressInput.style.borderColor = "";
            saveAddressBtn.disabled = false;
        } else {
            feedback.textContent = "Unable to detect postal code.";
            feedback.style.display = "block";
            feedback.style.color = "red";
            addressInput.style.borderColor = "red";
            saveAddressBtn.disabled = true;
        }
    });

    // Save address functionality
    saveAddressBtn.addEventListener("click", function (event) {
    event.preventDefault();
    const address = addressInput.value.trim();
    const postalCode = address.match(/\d{6}$/)?.[0];

    if (!postalCode) {
        feedback.textContent = "Invalid postal code. Please select a valid address.";
        feedback.style.display = "block";
        feedback.style.color = "red";
        addressInput.style.borderColor = "red";
        return;
    }

    // Send full address and postal code to the backend
    fetch("/save_address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, postal_code: postalCode })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                feedback.textContent = data.error;
                feedback.style.display = "block";
                feedback.style.color = "red";
                addressInput.style.borderColor = "red";
            } else {
                // Update UI with short postal code and save full address
                deliveryButton.innerHTML = `${data.postal_code} <i class="bi bi-geo-alt-fill"></i>`;
                addressInput.value = data.address;

                feedback.textContent = "Postal code saved successfully!";
                feedback.style.display = "block";
                feedback.style.color = "green";

                // Close modal after success
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById("addressModal"));
                    modal.hide();
                    feedback.style.display = "none";
                    addressInput.style.borderColor = "";
                }, 1500);
            }
        })
        .catch((error) => {
            console.error("Error saving postal code:", error);
            feedback.textContent = "An error occurred. Please try again.";
            feedback.style.display = "block";
            feedback.style.color = "red";
        });
});

    // Handle "Use My Current Location" button
    useLocationBtn.addEventListener("click", function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    const geocodeUrl = ``;

                    fetch(geocodeUrl)
                        .then((response) => response.json())
                        .then((data) => {
                            if (data.status === "OK" && data.results.length > 0) {
                                const addressComponents = data.results[0].address_components;
                                const postalCode = addressComponents.find((component) =>
                                    component.types.includes("postal_code")
                                )?.long_name;

                                if (postalCode) {
                                    addressInput.value = postalCode;
                                    feedback.textContent = "Postal code detected from location!";
                                    feedback.style.display = "block";
                                    feedback.style.color = "green";
                                    saveAddressBtn.disabled = false;
                                } else {
                                    feedback.textContent = "Unable to retrieve postal code.";
                                    feedback.style.display = "block";
                                    feedback.style.color = "red";
                                    saveAddressBtn.disabled = true;
                                }
                            } else {
                                feedback.textContent = "Unable to retrieve address.";
                                feedback.style.display = "block";
                                feedback.style.color = "red";
                            }
                        })
                        .catch((error) => {
                            console.error("Error saving postal code:", error);
                            feedback.textContent = "An unexpected error occurred. Please try again.";
                            feedback.style.display = "block";
                            feedback.style.color = "red";
                        });

                },
                function (error) {
                    console.error("Geolocation error:", error);
                    feedback.textContent = "Location permission denied or unavailable.";
                    feedback.style.display = "block";
                    feedback.style.color = "red";
                }
            );
        } else {
            feedback.textContent = "Geolocation is not supported by your browser.";
            feedback.style.display = "block";
            feedback.style.color = "red";
        }
    });
});

document.querySelectorAll(".category-button").forEach(button => {
    button.addEventListener("click", function () {
        let category = this.getAttribute("data-category"); // Get category name
        window.location.href = `/filter?category=${category}&min_price=0&max_price=999`;
    });
});


//Signup stuff
document.addEventListener("DOMContentLoaded", function () {
    const passwordInput = document.getElementById("password");
    const strengthContainer = document.querySelector(".password-strength-container");
    const strengthBar = document.getElementById("passwordStrengthFill");
    const strengthValue = document.getElementById("strengthValue");

    const lengthCheck = document.getElementById("lengthCheck");
    const lowercaseCheck = document.getElementById("lowercaseCheck");
    const uppercaseCheck = document.getElementById("uppercaseCheck");
    const numberCheck = document.getElementById("numberCheck");

    let hideTimeout;

    function updateRequirement(element, isValid) {
        if (isValid) {
            element.innerHTML = "✅ " + element.innerText.slice(2); // Change to ✅ and keep the text
            element.classList.add("valid");
            element.classList.remove("invalid");
        } else {
            element.innerHTML = "❌ " + element.innerText.slice(2); // Change back to ❌
            element.classList.add("invalid");
            element.classList.remove("valid");
        }
    }

    function checkPasswordStrength() {
        let password = passwordInput.value;
        let strength = 0;

        if (password.length > 0) {
            clearTimeout(hideTimeout);
            strengthContainer.style.height = strengthContainer.scrollHeight + "px"; // Expand smoothly
            strengthContainer.classList.add("visible");
        } else {
            strengthContainer.classList.remove("visible"); // Start fade-out
            hideTimeout = setTimeout(() => {
                if (!strengthContainer.classList.contains("visible")) {
                    strengthContainer.style.height = "0px"; // Collapse smoothly after fade-out
                }
            }, 400);
            return;
        }

        // Check password strength conditions
        let hasLowercase = /[a-z]/.test(password);
        let hasUppercase = /[A-Z]/.test(password);
        let hasNumberOrSymbol = /[\d\W]/.test(password);
        let hasMinLength = password.length >= 8;

        // Update UI with emoji changes
        updateRequirement(lengthCheck, hasMinLength);
        updateRequirement(lowercaseCheck, hasLowercase);
        updateRequirement(uppercaseCheck, hasUppercase);
        updateRequirement(numberCheck, hasNumberOrSymbol);

        // Increase strength based on checks
        if (hasMinLength) strength += 25;
        if (hasLowercase) strength += 25;
        if (hasUppercase) strength += 25;
        if (hasNumberOrSymbol) strength += 25;

        // Update strength bar
        strengthBar.style.width = strength + "%";

        // Change bar color
        if (strength <= 25) {
            strengthBar.style.backgroundColor = "red";
        } else if (strength <= 50) {
            strengthBar.style.backgroundColor = "orange";
        } else if (strength <= 75) {
            strengthBar.style.backgroundColor = "yellowgreen";
        } else {
            strengthBar.style.backgroundColor = "green";
        }

        strengthValue.innerText = strength + "%";
    }

    passwordInput.addEventListener("input", checkPasswordStrength);
});












//Brendons part
    // Populate the modal with the product data when Edit is clicked
document.addEventListener("DOMContentLoaded", function () {

    // ✅ Allowed categories for selection
    const allowedCategories = [
        "poultry", "seafood", "vegetables", "fruits", "dairy",
        "canned food", "alcohol", "beverages", "snacks", "frozen food",
        "meat", "rice", "noodles", "condiments", "spices", "household essentials", "sauces"
    ];

    // 🔹================= [ Manage Products: Add Product Form ] =================🔹
    let selectedCategories = [];
    const inputField = document.getElementById("product-category");
    const categoryTags = document.getElementById("category-tags");
    const hiddenInput = document.getElementById("category-input");

    if (inputField) {
        inputField.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                let category = inputField.value.trim().toLowerCase();

                if (category && allowedCategories.includes(category) && !selectedCategories.includes(category)) {
                    selectedCategories.push(category);
                    updateCategoryTags();
                } else {
                    alert("Invalid category! Choose from: " + allowedCategories.map(cat => capitalizeFirstLetter(cat)).join(", "));
                }
                inputField.value = ""; // Clear input
            }
        });
    }

    function updateCategoryTags() {
        if (!categoryTags) return;

        categoryTags.innerHTML = selectedCategories.length > 0
            ? selectedCategories.map(cat => `<span class="category-tag">${capitalizeFirstLetter(cat)}
                     <button type="button" onclick="removeCategory('${cat}')">✖</button></span>`).join("")
            : `<small class="text-muted">No category selected. Type a category and press Enter.</small>`;

        if (hiddenInput) {
            hiddenInput.value = selectedCategories.join(", ");
        }
    }

    function removeCategory(category) {
        selectedCategories = selectedCategories.filter(cat => cat !== category);
        updateCategoryTags();
    }

    // 🔹================= [ Edit Product Modal ] =================🔹
    let selectedEditCategories = [];
    const editProductButtons = document.querySelectorAll(".edit-product-btn");
    const editProductForm = document.getElementById("editProductForm");

    editProductButtons.forEach(button => {
        button.addEventListener("click", function () {
            const productId = this.getAttribute("data-id");
            const productName = this.getAttribute("data-name");
            const productDescription = this.getAttribute("data-description");
            const productPrice = this.getAttribute("data-price");
            const productQuantity = this.getAttribute("data-quantity");

            let categories = this.getAttribute("data-category");  // Get categories from the button
            selectedEditCategories = []; // Reset categories

            if (categories && categories.trim() !== "") {
                selectedEditCategories = categories.split(",").map(c => c.trim().toLowerCase());
            }

            console.log("Loaded Categories:", selectedEditCategories); // Debugging

            // Populate form fields
            document.getElementById("editProductId").value = productId;
            document.getElementById("editProductName").value = productName;
            document.getElementById("editProductDescription").value = productDescription;
            document.getElementById("editProductPrice").value = productPrice;
            document.getElementById("editProductQuantity").value = productQuantity;

            // Update category tags in modal
            updateEditCategoryTags();

            // Store categories in hidden input for backend
            document.getElementById("editCategoryHiddenInput").value = selectedEditCategories.join(", ");

            // Update form action dynamically
            editProductForm.action = `/update_product/${productId}`;
        });
    });

    function updateEditCategoryTags() {
        let tagContainer = document.getElementById("editCategoryTags");

        if (!tagContainer) {
            console.error("Category tag container not found.");
            return;
        }

        console.log("Updating category tags, current list:", selectedEditCategories); // Debugging log

        tagContainer.innerHTML = selectedEditCategories.length > 0
            ? selectedEditCategories.map(cat => `<span class="category-tag">${capitalizeFirstLetter(cat)}
                     <button type="button" onclick="removeEditCategory('${cat}')">✖</button></span>`).join("")
            : `<small class="text-muted">No category selected. Type a category and press Enter.</small>`;

        let hiddenInput = document.getElementById("editCategoryHiddenInput");
        if (hiddenInput) {
            hiddenInput.value = selectedEditCategories.join(", ");
            console.log("Hidden category input value updated:", hiddenInput.value); // Debugging log
        }
    }

    const editCategoryInput = document.getElementById("editCategoryInput");

    if (editCategoryInput) {
        editCategoryInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                let category = this.value.trim().toLowerCase();

                if (category && allowedCategories.includes(category) && !selectedEditCategories.includes(category)) {
                    selectedEditCategories.push(category);
                    updateEditCategoryTags();
                } else {
                    alert("Invalid category! Choose from: " + allowedCategories.map(cat => capitalizeFirstLetter(cat)).join(", "));
                }
                this.value = ""; // Clear input field
            }
        });
    }

    function removeEditCategory(category) {
        selectedEditCategories = selectedEditCategories.filter(cat => cat !== category);
        updateEditCategoryTags();
    }

    // Function to capitalize the first letter of words for display
    function capitalizeFirstLetter(str) {
        return str.replace(/\b\w/g, char => char.toUpperCase());
    }
});



document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    const closeSidebar = document.getElementById("closeSidebar");

    document.getElementById("sidebarToggle").addEventListener("click", function () {
        sidebar.classList.add("show");
        sidebarBackdrop.style.display = "block";
    });

    closeSidebar.addEventListener("click", function () {
        sidebar.classList.remove("show");
        sidebarBackdrop.style.display = "none";
    });

    sidebarBackdrop.addEventListener("click", function () {
        sidebar.classList.remove("show");
        sidebarBackdrop.style.display = "none";
    });
});
