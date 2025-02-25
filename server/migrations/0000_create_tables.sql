
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  firebase_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  subscription_type TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  email_notifications BOOLEAN NOT NULL DEFAULT false
);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(firebase_id),
  item TEXT NOT NULL
);
