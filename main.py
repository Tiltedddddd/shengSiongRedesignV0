from website import create_app, db
from website.models import User


app = create_app()

# Create the database tables if they don't exist
with app.app_context():
    db.create_all()  # This creates the database and tables

if __name__ == '__main__':
    app.run(debug=True)

