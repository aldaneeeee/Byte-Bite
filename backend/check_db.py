import sqlite3

conn = sqlite3.connect('byte_and_bite.db')
cursor = conn.cursor()

# Get all table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")

# Check specifically for forum_reports
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Forum_Reports';")
result = cursor.fetchone()
print(f"\nForum_Reports table exists: {result is not None}")

# Check forum posts
cursor.execute("SELECT COUNT(*) FROM Forum_Posts;")
posts_count = cursor.fetchone()[0]
print(f"Number of forum posts: {posts_count}")

if posts_count > 0:
    cursor.execute("SELECT post_id, title, customer_id FROM Forum_Posts LIMIT 3;")
    posts = cursor.fetchall()
    print("Sample posts:")
    for post in posts:
        print(f"  - ID: {post[0]}, Title: {post[1]}, Customer: {post[2]}")

# Check forum comments
cursor.execute("SELECT COUNT(*) FROM Forum_Comments;")
comments_count = cursor.fetchone()[0]
print(f"Number of forum comments: {comments_count}")

if comments_count > 0:
    cursor.execute("SELECT comment_id, content, customer_id FROM Forum_Comments LIMIT 3;")
    comments = cursor.fetchall()
    print("Sample comments:")
    for comment in comments:
        print(f"  - ID: {comment[0]}, Content: {comment[1][:50]}..., Customer: {comment[2]}")

conn.close()