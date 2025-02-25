
-- Drop existing tables
DROP TABLE IF EXISTS "items";
DROP TABLE IF EXISTS "users";

-- Create users table
CREATE TABLE "users" (
  "firebase_id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "subscription_type" TEXT NOT NULL DEFAULT 'free',
  "email_notifications" BOOLEAN NOT NULL DEFAULT false
);

-- Create items table with foreign key
CREATE TABLE "items" (
  "id" SERIAL PRIMARY KEY,
  "item" TEXT NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "users"("firebase_id")
);
