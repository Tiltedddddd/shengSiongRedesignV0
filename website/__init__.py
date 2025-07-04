from flask import Flask
from flask_session import Session
from flask_migrate import Migrate
from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from dotenv import load_dotenv
import os
import re

load_dotenv()
migrate = Migrate()

db = SQLAlchemy()
login_manager = LoginManager()
mail = Mail()


def regex_search(value, pattern):
    if value is None:
        return ''  # Return empty string instead of passing None to re.search()
    match = re.search(pattern, value)
    return match.group(0) if match else ''


def create_app():
    app = Flask(__name__)

    # Set up the secret key and database URI
    app.config['SECRET_KEY'] = 'fallback_secret'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'  # Use SQLite for simplicity
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Disable Flask-SQLAlchemy modification tracking
    app.config['GOOGLE_PLACES_API_KEY'] = os.getenv('GOOGLE_PLACES_API_KEY')
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # Change this if using another provider
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')
    mail.init_app(app)
    migrate.init_app(app, db)

    # ✅ Configure Flask-Session to persist session data
    app.config["SESSION_PERMANENT"] = False  # Ensures session does not expire immediately
    app.config["SESSION_TYPE"] = "filesystem"  # Stores session in a local file
    app.config["SESSION_FILE_DIR"] = os.path.join(os.getcwd(), "flask_session")  # Ensures persistence
    Session(app)  # Initialize Flask-Session

    # For my Product images
    # Configure the upload folder
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'images')  # Change this path if necessary
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

    # Ensure the folder exists
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    # Initialize the database object with the app
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "main.login"  # Redirects to login page when unauthorized
    login_manager.login_message_category = "warning"  # Flash message category

    # Register the regex_search function as a Jinja filter
    app.jinja_env.filters['regex_search'] = regex_search

    # Import models and routes AFTER initializing the app
    from .models import User  # Import here to avoid circular import
    from .routes import main  # Import the Blueprint for routes
    app.register_blueprint(main)  # Register the Blueprint with Flask

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))  # Ensure this query works with your database

    return app
