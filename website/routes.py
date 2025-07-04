from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, current_app
import traceback
import re
import os
import json

from sqlalchemy import or_
from datetime import datetime
from . import db, mail
from .forms import UpdateProfileForm
from werkzeug.utils import secure_filename
from .models import User, ContactMessage, Product, Order
from flask_login import login_required, current_user, login_user, logout_user
from flask_mail import Message
from urllib.parse import unquote_plus
from itsdangerous import URLSafeSerializer

# Define the Blueprint
main = Blueprint("main", __name__)


# Define order email
def send_order_email(email, cart, total_price, address, payment_method):
    try:
        print(f"📧 Attempting to send order email to: {email}")
        print(f"🛍️ Order Details: {cart}, Total: ${total_price}")
        print(f"📍 Shipping Address: {address}, Payment: {payment_method}")

        msg = Message(
            "Your Order Confirmation",
            recipients=[email]
        )
        msg.body = f"Thank you for your order!\n\n"
        msg.body += "Order Summary:\n"
        msg.body += "\n".join([f"{item['quantity']}x {item['name']} - ${item['price']:.2f}" for item in cart])
        msg.body += f"\n\nTotal: ${total_price:.2f}\n"
        msg.body += f"Payment Method: {payment_method}\n"
        msg.body += f"Shipping Address: {address}\n"
        msg.body += "\nWe appreciate your business!"

        print("📨 Sending email...")
        mail.send(msg)
        print("✅ Email sent successfully!")

    except Exception as e:
        print(f"❌ ERROR SENDING EMAIL: {e}")


# Home route
@main.route("/")
def home():
    print(f"Raw URL: {request.url}")
    category_filter = request.args.get("category", "all")  # Get category from URL, default to "all"
    print(f"Raw category received: '{category_filter}'")
    category_filter = unquote_plus(category_filter.strip())
    print(f"Decoded category: '{category_filter}'")
    limit = int(request.args.get("limit", 10))  # Limit products to 10 unless specified

    if category_filter == "all":
        products = Product.query.limit(limit).all()  # Show only the first 10 products
    else:
        products = Product.query.filter(Product.category.ilike(f"%{category_filter.strip()}%")).all()

    print(f"Products found for '{category_filter}': {len(products)}")
    return render_template("index.html", products=products, category_filter=category_filter,  page_name='index')


@main.route('/filter')
def filter_products():
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    categories = request.args.getlist('category')

    print(f"Filters received - Min Price: {min_price}, Max Price: {max_price}, Categories: {categories}")

    # Query base products
    query = Product.query.filter(Product.price >= min_price, Product.price <= max_price)

    # Handle 'All' case
    if categories and "All" not in categories:
        category_filters = [Product.category.ilike(f"%{category}%") for category in categories]
        query = query.filter(or_(*category_filters))  # Use OR condition for multiple categories

    products = query.all()

    # Fix: Use case-insensitive matching and allow partial matches
    if categories:
        category_filters = [Product.category.ilike(f"%{category}%") for category in categories]
        query = query.filter(or_(*category_filters))  # Use OR condition

    products = query.all()
    print(f"Products found: {len(products)}")  # Debugging output

    return render_template("filter.html", products=products, selected_categories=categories, min_price=min_price or 1, max_price=max_price or 999, page_name='filter')






@main.route('/get_cart')
@login_required
def get_cart():
    cart_items = session.get("cart", {})  # Get cart from session
    product_list = []

    for product_id, quantity in cart_items.items():
        product = Product.query.get(product_id)
        if product:
            product_list.append({
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "quantity": quantity,
                "image": product.image
            })

    return jsonify({"cart": product_list})


@main.route('/remove_from_cart', methods=['POST'])
@login_required
def remove_from_cart():
    data = request.json
    product_id = data.get("product_id")

    if "cart" in session and product_id in session["cart"]:
        del session["cart"][product_id]
        session.modified = True  # Update session

    return jsonify({"message": "Product removed from cart!"})


@main.context_processor
def inject_google_api_key():
    return {
        "google_api_key": current_app.config["GOOGLE_PLACES_API_KEY"]
    }


# Signup route
@main.route("/signup", methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        first_name = request.form['first_name'].strip()
        last_name = request.form['last_name'].strip()
        email = request.form['email'].strip()
        password = request.form['password']

        # Basic validation checks
        if not re.match(r"^[a-zA-Z]+$", first_name):
            flash("Invalid first name. Use only letters.", "danger")
            return redirect(url_for('main.signup'))

        if not re.match(r"^[a-zA-Z]+$", last_name):
            flash("Invalid last name. Use only letters.", "danger")
            return redirect(url_for('main.signup'))

        if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email):
            flash("Invalid email address.", "danger")
            return redirect(url_for('main.signup'))

        if len(password) < 8 or not re.search(r"[A-Z]", password) or not re.search(r"\d", password):
            flash("Password must be at least 8 characters long, contain an uppercase letter and a number.", "danger")
            return redirect(url_for('main.signup'))

        # Check if email already exists
        if User.query.filter_by(email=email).first():
            flash("Email already exists! Please try logging in.", "danger")
            return redirect(url_for('main.login'))

        new_user = User(first_name=first_name, last_name=last_name, email=email, is_verified=False)
        new_user.set_password(password)

        try:
            db.session.add(new_user)
            db.session.commit()
            send_verification_email(new_user)  # ✅ Sends email
            flash("A verification email has been sent! Please check your inbox.", "info")
            return redirect(url_for('main.login'))  # ✅ Redirects straight to login
        except Exception as e:
            db.session.rollback()
            flash(f"An error occurred: {e}", "danger")

    return render_template("signup.html", signup=True, hide_footer=True, page_name='signup')


def send_verification_email(user):
    token = user.get_verification_token()
    verify_url = url_for('main.verify_email', token=token, _external=True)

    msg = Message("Verify Your Email", recipients=[user.email])
    msg.html = render_template("email_verification.html", verify_url=verify_url)

    mail.send(msg)


@main.route("/verify_email/<token>")
def verify_email(token):
    email = User.verify_token(token)

    if email is None:
        flash("The verification link is invalid or has expired.", "danger")
        return redirect(url_for('main.login'))

    user = User.query.filter_by(email=email).first()

    if not user:
        flash("User not found. Please sign up again.", "danger")
        return redirect(url_for('main.signup'))  # Redirect user to sign up if email is not found

    if user.is_verified:
        flash("Your account is already verified! Please log in.", "success")
        return redirect(url_for('main.login'))

    user.is_verified = True
    db.session.commit()
    flash("Your email has been verified! You can now log in.", "success")
    return redirect(url_for('main.login'))


@main.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        # Check if the user exists
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            if not user.is_verified:
                flash("Please verify your email before logging in.", "warning")
                return redirect(url_for('main.login'))

            # Log the user in
            login_user(user, remember=True)  # This ensures Flask-Login recognizes the user!

            flash("Login successful!", "success")
            return redirect(url_for('main.dashboard'))
        else:
            flash("Invalid email or password.", "danger")

    return render_template("login.html", hide_footer=True, page_name='login')


@main.route("/logout")
def logout():
    logout_user()  # Log out the user
    flash("Logged out successfully!", "info")
    return redirect(url_for('main.login'))


@main.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user, active_page='dashboard', page_name='dashboard')


@main.route('/update', methods=['GET', 'POST'])
@login_required
def update():
    form = UpdateProfileForm()

    if form.validate_on_submit():
        # Validate current password only if the user is changing their password
        if form.new_password.data:
            if not current_user.check_password(form.current_password.data):
                flash("Incorrect current password!", "danger")
                return redirect(url_for('main.update'))

            # Update the password
            current_user.set_password(form.new_password.data)

        # Update user data only if the field is filled
        if form.first_name.data:
            current_user.first_name = form.first_name.data

        if form.last_name.data:
            current_user.last_name = form.last_name.data

        if form.email.data:
            current_user.email = form.email.data

        if request.form.get("address"):  # Handle the address field
            current_user.address = request.form.get("address")

        # Commit changes to the database
        db.session.commit()
        flash("Profile updated successfully!", "success")
        return redirect(url_for('main.dashboard'))

    # Pre-fill form with current user data for GET requests
    if request.method == 'GET':
        form.first_name.data = current_user.first_name
        form.last_name.data = current_user.last_name
        form.email.data = current_user.email
        form.address.data = current_user.address or ""

    return render_template('update_profile.html', form=form, active_page='update_profile')


@main.route('/delete_account', methods=['POST', 'GET'])
@login_required
def delete_account():
    if request.method == 'POST':
        password = request.form.get('password')
        if not current_user.check_password(password):
            flash("Incorrect password. Account not deleted.", "danger")
            return redirect(url_for('main.delete_account'))

        # Delete the user
        db.session.delete(current_user)
        db.session.commit()
        logout_user()
        flash("Your account has been deleted successfully.", "success")
        return redirect(url_for('main.home'))

    return render_template('delete_account.html', active_page='delete_account')


# Addressing

@main.route('/save_address', methods=['POST'])
def save_address():
    try:
        data = request.json
        address = data.get("address")
        postal_code = data.get("postal_code")

        # Validate postal code
        if not postal_code or not re.match(r"^\d{6}$", postal_code):
            return jsonify({"error": "Invalid postal code."}), 400

        # Validate address
        if not address or address.strip() == "":
            return jsonify({"error": "Address cannot be empty."}), 400

        # Save both address and postal code
        if current_user.is_authenticated:
            current_user.address = address
            current_user.postal_code = postal_code
            db.session.commit()
            return jsonify({"message": "Address saved successfully!", "address": address, "postal_code": postal_code}), 200
        else:
            session["guest_address"] = address
            session["guest_postal_code"] = postal_code
            return jsonify({"message": "Address saved temporarily for guest!", "address": address, "postal_code": postal_code}), 200

    except Exception as e:
        current_app.logger.error(f"Error in save_address: {e}")
        current_app.logger.error(traceback.format_exc())  # Log detailed traceback
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500






# Clements part
@main.route('/cart')
def cart():
    return render_template('NEW_cart.html', cart=[], page_name='NEW_cart', user=current_user)


@main.route('/checkout', methods=['GET', 'POST'])
def checkout():
    if request.method == 'POST':
        address = request.form.get("address")
        postal_code = request.form.get("postal_code")
        payment_method = request.form.get("payment_method")
        guest_email = request.form.get("guest_email")
        recipient_name = request.form.get("recipient_name")
        phone_number = request.form.get("phone_number")

        # 🛠️ Store data in session
        session["checkout_address"] = address
        session["checkout_postal"] = postal_code
        session["payment_method"] = payment_method
        session["guest_email"] = guest_email if not current_user.is_authenticated else None
        session["recipient_name"] = recipient_name
        session["phone_number"] = phone_number

        print("🛠️ DEBUG: Checkout data stored in session ->", session)

        return redirect(url_for("main.confirm_order"))

    # ✅ Pre-fill address from user account or session (for guests)
    saved_address = current_user.address if current_user.is_authenticated else session.get("guest_address", "")
    saved_postal = current_user.postal_code if current_user.is_authenticated else session.get("guest_postal_code", "")

    return render_template("checkout.html",
                           saved_address=saved_address,
                           saved_postal=saved_postal,
                           page_name='checkout')


@main.route('/sync_cart', methods=['POST'])
def sync_cart():
    data = request.json
    cart_list = data.get("cart", [])  # Receives a list

    # Convert list format to {product_id: quantity}
    cart_dict = {str(item["id"]): item["quantity"] for item in cart_list}

    session["cart"] = cart_dict  # Store properly in session
    session.modified = True  # Ensure session updates

    return jsonify({"success": True})


# Quantity changes update for dropdown when changed in newcart
@main.route('/update_cart', methods=['POST'])
@login_required
def update_cart():
    data = request.json
    product_id = data.get("product_id")
    change = data.get("change", 0)

    if "cart" in session and product_id in session["cart"]:
        session["cart"][product_id] += change
        if session["cart"][product_id] <= 0:
            del session["cart"][product_id]
        session.modified = True
        return jsonify({"success": True})

    return jsonify({"success": False})


@main.route('/confirm-order', methods=['GET', 'POST'])
def confirm_order():
    try:
        print("🟢 DEBUG: Processing order...")

        cart_data = session.get("cart", {})
        print(f"🛒 CART DATA: {cart_data}")  # ✅ Print cart content

        address = session.get("checkout_address")
        postal_code = session.get("checkout_postal")
        payment_method = session.get("payment_method")
        guest_email = session.get("guest_email") if not current_user.is_authenticated else None

        print(f"📍 ADDRESS: {address}, POSTAL: {postal_code}, PAYMENT: {payment_method}, GUEST EMAIL: {guest_email}")

        if not cart_data:
            print("❌ CART IS EMPTY!")
            flash("Your cart is empty.", "danger")
            return redirect(url_for("main.cart"))

        if not address or not payment_method or (not current_user.is_authenticated and not guest_email):
            print("❌ MISSING ORDER DETAILS!")
            flash("Invalid order details.", "danger")
            return redirect(url_for("main.checkout"))

        cart = []
        total_price = 0

        for product_id, quantity in cart_data.items():
            print(f"🔍 Fetching product {product_id}...")
            product = Product.query.get(product_id)
            if not product:
                print(f"❌ ERROR: Product ID {product_id} NOT FOUND IN DATABASE!")
                flash(f"Product ID {product_id} is no longer available.", "danger")
                return redirect(url_for("main.cart"))

            item_total = product.price * quantity
            total_price += item_total
            cart.append({
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "quantity": quantity,
                "subtotal": item_total
            })

        print(f"✅ TOTAL PRICE: ${total_price}")

        email = guest_email if guest_email else current_user.email
        print(f"📧 Sending confirmation email to: {email}")

        # Save Order
        print("📦 Saving order to database...")
        new_order = Order(
            user_id=current_user.id if current_user.is_authenticated else None,
            guest_email=guest_email,
            items=json.dumps(cart),
            total_price=total_price,
            address=address,
            payment_method=payment_method,
            created_at=datetime.utcnow()
        )

        db.session.add(new_order)
        db.session.commit()

        # ✅ Call `send_order_email()`
        print("📧 Calling send_order_email() now...")
        send_order_email(email, cart, total_price, address, payment_method)
        print("📧 Finished executing send_order_email()")

        # ✅ Clear cart after successful order
        print(f"🛒 Cart before clearing: {session.get('cart')}")  # ✅ Debugging
        session.pop("cart", None)
        session.modified = True  # ✅ Ensure Flask recognizes session changes
        print(f"✅ Cart after clearing: {session.get('cart')}")  # ✅ Debugging

        print("✅ ORDER SUCCESS!")
        return redirect(url_for("main.order_success"))

    except Exception as e:
        db.session.rollback()
        error_message = traceback.format_exc()
        print(f"❌ ORDER ERROR:\n{error_message}")
        return f"<h3>❌ ERROR:</h3><pre>{error_message}</pre>", 500


@main.route('/order-success')
def order_success():
    return render_template('order_success.html')



# Brendons part
#Fetch my products in the database to the NEW_product html page

@main.route('/all_products')
def all_products():
    products = Product.query.all()  # Fetch all products from the database
    return render_template('NEW_product_page.html', products=products)


# Add Products
@main.route('/manage_products', methods=['GET', 'POST'])
def manage_products():
    if request.method == 'POST':
        # Retrieve form data
        name = request.form.get('name')
        description = request.form.get('description')
        price = request.form.get('price')
        quantity = request.form.get('quantity')
        category_data = request.form.get('categories')
        certification = request.form.get('certification')  # Ensure certification is selected
        image = request.files.get('image')

        # 🔥 Validate certification to prevent NULL errors
        if not certification:
            flash("Error: Certification must be selected!", "danger")
            return redirect(url_for('main.manage_products'))

        # 🔥 Validate price and quantity to prevent negative/zero values
        try:
            price = float(price)
            quantity = int(quantity)

            if price <= 0 or quantity <= 0:
                flash("Error: Price and quantity must be greater than 0!", "danger")
                return redirect(url_for('main.manage_products'))
        except ValueError:
            flash("Error: Invalid price or quantity!", "danger")
            return redirect(url_for('main.manage_products'))

        # Convert categories to lowercase for consistency
        categories = ", ".join([c.strip().lower() for c in category_data.split(",")])

        # Save the product image
        if image:
            image_filename = secure_filename(image.filename)
            UPLOAD_FOLDER = os.path.join(current_app.root_path, 'static', 'images')
            image_path = os.path.join(UPLOAD_FOLDER, image_filename)
            image.save(image_path)
        else:
            image_filename = None

        # Add the product to the database
        new_product = Product(
            name=name,
            description=description,
            price=price,
            quantity=quantity,
            category=categories,
            certification=certification,
            image=image_filename
        )
        db.session.add(new_product)
        db.session.commit()

        flash('Product added successfully!', 'success')
        return redirect(url_for('main.manage_products'))

    # Retrieve all products for display
    products = Product.query.all()
    return render_template('manage_products.html', products=products)


#Edit Products
@main.route('/update_product/<int:product_id>', methods=['POST'])
def update_product(product_id):
    product = Product.query.get_or_404(product_id)

    product.name = request.form.get('name')
    product.description = request.form.get('description')
    product.price = float(request.form.get('price'))
    product.quantity = int(request.form.get('quantity'))

    # Debug: Print received category
    categories = request.form.get('category', '').strip()
    print(f"Received category: {categories}")  # Debugging log

    if not categories:
        flash("Error: A product must have at least one category!", "danger")
        return redirect(url_for('main.view_products'))

    product.category = categories  # Store it in the database
    product.certification = request.form.get('certification')

    db.session.commit()
    flash('Product updated successfully!', 'success')

    return redirect(url_for('main.view_products'))


#View Products
@main.route('/view_products')
def view_products():
    products = Product.query.all()  # Fetch all products
    return render_template('view_products.html', products=products)

#Delete Products
@main.route('/delete_product/<int:product_id>', methods=['POST'])
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()

    flash('Product deleted successfully!', 'success')
    return redirect(url_for('main.manage_products'))


# For Employees
# Hardcoded employee credentials
EMPLOYEES = {
    "001": "123",  # employee_id: password
    "EMP002": "mypassword456",
}


@main.route('/employee_login', methods=['GET', 'POST'])
def employee_login():
    if request.method == 'POST':
        employee_id = request.form.get('employee_id')
        password = request.form.get('password')

        # Check if employee ID exists and password matches
        if employee_id in EMPLOYEES and EMPLOYEES[employee_id] == password:
            session['employee_id'] = employee_id  # Store employee ID in session
            flash('Logged in successfully!', 'success')
            return redirect(url_for('main.employee_dashboard'))  # Redirect to dashboard
        else:
            flash('Invalid Employee ID or password.', 'danger')

    return render_template('employee_login.html')


@main.route('/employee_dashboard')
def employee_dashboard():
    if 'employee_id' not in session:
        flash('Please log in as an employee to access this page.', 'danger')
        return redirect(url_for('main.employee_login'))

    employee_id = session['employee_id']  # Retrieve employee ID from session
    return render_template('employee_dashboard.html', employee_id=employee_id)


@main.route('/employee_logout')
def employee_logout():
    session.pop('employee_id', None)  # Clear the session
    flash('Logged out successfully!', 'success')
    return redirect(url_for('main.employee_login'))

