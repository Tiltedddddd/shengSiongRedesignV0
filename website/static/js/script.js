(function($) {

  "use strict";

  var initPreloader = function() {
    $(document).ready(function($) {
    var Body = $('body');
        Body.addClass('preloader-site');
    });
    $(window).load(function() {
        $('.preloader-wrapper').fadeOut();
        $('body').removeClass('preloader-site');
    });
  }

  // init Chocolat light box
	var initChocolat = function() {
		Chocolat(document.querySelectorAll('.image-link'), {
		  imageSize: 'contain',
		  loop: true,
		})
	}

  var initSwiper = function() {

    var swiper = new Swiper(".main-swiper", {
      speed: 500,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
    });

    var category_swiper = new Swiper(".category-carousel", {
      slidesPerView: 6,
      spaceBetween: 30,
      speed: 500,
      navigation: {
        nextEl: ".category-carousel-next",
        prevEl: ".category-carousel-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 2,
        },
        768: {
          slidesPerView: 3,
        },
        991: {
          slidesPerView: 4,
        },
        1500: {
          slidesPerView: 6,
        },
      }
    });

    var brand_swiper = new Swiper(".brand-carousel", {
      slidesPerView: 4,
      spaceBetween: 30,
      speed: 500,
      navigation: {
        nextEl: ".brand-carousel-next",
        prevEl: ".brand-carousel-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 2,
        },
        768: {
          slidesPerView: 2,
        },
        991: {
          slidesPerView: 3,
        },
        1500: {
          slidesPerView: 4,
        },
      }
    });

    var products_swiper = new Swiper(".products-carousel", {
      slidesPerView: 5,
      spaceBetween: 30,
      speed: 500,
      navigation: {
        nextEl: ".products-carousel-next",
        prevEl: ".products-carousel-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 3,
        },
        991: {
          slidesPerView: 4,
        },
        1500: {
          slidesPerView: 6,
        },
      }
    });
  }

  var initProductQty = function(){

    $('.product-qty').each(function(){

      var $el_product = $(this);
      var quantity = 0;

      $el_product.find('.quantity-right-plus').click(function(e){
          e.preventDefault();
          var quantity = parseInt($el_product.find('#quantity').val());
          $el_product.find('#quantity').val(quantity + 1);
      });

      $el_product.find('.quantity-left-minus').click(function(e){
          e.preventDefault();
          var quantity = parseInt($el_product.find('#quantity').val());
          if(quantity>0){
            $el_product.find('#quantity').val(quantity - 1);
          }
      });

    });

  }

  // init jarallax parallax
  var initJarallax = function() {
    jarallax(document.querySelectorAll(".jarallax"));

    jarallax(document.querySelectorAll(".jarallax-keep-img"), {
      keepImg: true,
    });
  }

  // document ready
  $(document).ready(function() {

    initPreloader();
    initSwiper();
    initProductQty();
    initJarallax();
    initChocolat();

  }); // End of a document

})(jQuery);




//cart
document.addEventListener("DOMContentLoaded", function () {

    // 🛒 Prevent users from entering invalid characters in quantity input
    document.querySelectorAll(".input-number").forEach(input => {
        input.addEventListener("keydown", function (event) {
            if (event.key === "-" || event.key === "e") {
                event.preventDefault();
            }
        });

        // ✅ Validate input in real-time
        input.addEventListener("input", function () {
            let value = parseInt(this.value);

            if (isNaN(value) || value < 1) {
                this.value = 1; // Default to 1 if invalid
            } else if (value > 50) {
                this.value = 50; // Prevent exceeding 50
                alert("Maximum limit is 50.");
            }
        });
    });

    // ✅ Handle quantity increase/decrease
    document.querySelectorAll(".quantity-left-minus, .quantity-right-plus").forEach(button => {
        button.addEventListener("click", function () {
            let input = this.closest(".product-qty").querySelector(".input-number");
            let quantity = parseInt(input.value) || 1;

            if (this.dataset.type === "minus" && quantity > 1) {
                input.value = quantity - 1;
            }
            if (this.dataset.type === "plus") {
                if (quantity < 50) {
                    input.value = quantity + 1;
                } else {
                    alert("You can't add more than 50 units of this product.");
                }
            }
        });
    });

    // ✅ Handle "Add to Cart" Button Click
    document.querySelectorAll(".add-to-cart").forEach(button => {
        button.addEventListener("click", function () {
            let productId = this.getAttribute("data-id");
            let productName = this.getAttribute("data-name");
            let productPrice = parseFloat(this.getAttribute("data-price"));
            let productImage = this.getAttribute("data-image");
            let quantityInput = document.getElementById("quantity_" + productId);
            let quantity = parseInt(quantityInput.value) || 1;

            if (!quantityInput || isNaN(quantity) || quantity <= 0) {
                alert("Please enter a valid quantity.");
                return;
            }

            let cartItem = {
                id: productId,
                name: productName,
                price: productPrice,
                image: productImage,
                quantity: quantity
            };

            addToCart(cartItem);
        });
    });

    function refreshCartPage() {
    if (window.location.pathname.includes("NEW_cart")) {
        loadCartFromLocalStorage();  // ✅ Ensure the cart page updates dynamically
    }
}

    // ✅ Function to Add Item to Cart (LocalStorage)
    function addToCart(item) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let existingItem = cart.find(p => p.id === item.id);

    if (existingItem) {
        existingItem.quantity += item.quantity;
        if (existingItem.quantity > 50) {
            existingItem.quantity = 50;
            alert("You can only add up to 50 units per product.");
        }
    } else {
        if (item.quantity > 50) {
            item.quantity = 50;
        }
        cart.push(item);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartBadge();
    updateCartDropdown();
    refreshCartPage();  // ✅ Refresh full cart page when item is added
    }


    // ✅ Function to Update Cart Badge Count
    function updateCartBadge() {
        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        let totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById("cart-count").textContent = totalItems > 99 ? "99+" : totalItems; // Show 99+ if exceeded
    }

    // ✅ Function to Update Cart Dropdown
    function updateCartDropdown() {
    let cartDropdown = document.getElementById("cart-dropdown");
    let cartItems = JSON.parse(localStorage.getItem("cart")) || [];


    // 🛒 If the cart is empty
    if (cartItems.length === 0) {
        document.getElementById("cart-total-items").textContent = "0 items in your basket";
        document.getElementById("cart-total-price").textContent = "S$0.00";
        cartDropdown.innerHTML = `
            <li class="text-center text-muted">Your cart is empty</li>
        `;
        return;
    }

    let totalItems = 0;
    let totalPrice = 0;
    let cartHTML = `
        <li class="cart-summary border-bottom p-2">
            <strong>Total Items: <span id="cart-total-items">0</span></strong>
            <br>
            <strong><span id="cart-total-price">S$0.00</span></strong>
        </li>
    `;

    // 🛒 Loop through cart items and calculate totals
    cartItems.forEach(item => {
        totalItems += item.quantity;
        totalPrice += item.quantity * item.price;

        cartHTML += `
            <li class="d-flex align-items-center justify-content-between p-2 border-bottom">
                <div class="d-flex align-items-center">
                    <img src="${item.image}" width="50" class="me-2 rounded">
                    <div>
                        <strong>${item.name}</strong>
                        <br><small>Quantity: ${item.quantity}</small>
                        <br><small>Price: S$${(item.quantity * item.price).toFixed(2)}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-danger remove-from-cart" data-product-id="${item.id}">X</button>
            </li>`;
    });

    cartHTML += `<li class="text-center mt-2"><a href="/cart" class="btn btn-primary btn-sm">View Cart</a></li>`;
    cartDropdown.innerHTML = cartHTML;

    // ✅ Ensure total updates correctly
    document.getElementById("cart-total-items").textContent = `${totalItems}`;
    document.getElementById("cart-total-price").textContent = `S$${totalPrice.toFixed(2)}`;

    // ✅ Attach event listeners to remove items dynamically
    document.querySelectorAll(".remove-from-cart").forEach(button => {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            let productId = this.getAttribute("data-product-id");
            removeFromCart(productId);
        });
    });

    // ✅ Attach event listener AFTER cart dropdown updates
    document.querySelector(".view-basket-btn")?.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = "/cart";  // ✅ Redirects to `NEW_cart.html`
    });
}


    // ✅ Function to Remove Items from Cart
    function removeFromCart(productId) {
        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartBadge();
        updateCartDropdown();
    }

    // ✅ Ensure cart updates on page load
    updateCartBadge();
    updateCartDropdown();
});
