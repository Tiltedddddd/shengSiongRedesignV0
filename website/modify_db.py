import sqlite3

# Connect to the SQLite database
conn = sqlite3.connect('../instance/site.db')
cursor = conn.cursor()

# Add 'certification' column if it doesn't exist
try:
    cursor.execute("ALTER TABLE products ADD COLUMN certification TEXT")
    print("Column 'certification' added successfully.")
except sqlite3.OperationalError:
    print("Column 'certification' already exists.")


# Add the new column 'category'
try:
    cursor.execute("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'Uncategorized';")
    print("Column 'category' added successfully.")
except sqlite3.OperationalError as e:
    print(f"Error: {e}")


# Add the 'rating' column if it doesn't exist
try:
    cursor.execute("ALTER TABLE products ADD COLUMN rating FLOAT DEFAULT 0.0;")
    print("Column 'rating' added successfully!")
except sqlite3.OperationalError:
    print("Column 'rating' already exists.")


# Save changes and close the connection
conn.commit()
conn.close()
