-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RSS Feeds table
CREATE TABLE IF NOT EXISTS rss_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    category TEXT,
    last_fetched DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, url)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    feed_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE,
    UNIQUE(user_id, feed_id)
);

-- RSS Articles table
CREATE TABLE IF NOT EXISTS articles (
    link TEXT PRIMARY KEY,
    feed_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    pub_date DATETIME,
    author TEXT,
    content TEXT,
    guid TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_rss_feeds_user_id ON rss_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_url_user ON rss_feeds(url, user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_feed ON favorites(user_id, feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_feed_date ON articles(feed_id, pub_date);
CREATE INDEX IF NOT EXISTS idx_articles_guid ON articles(guid);