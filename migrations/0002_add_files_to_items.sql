-- Add files column to items table to store associated file paths
ALTER TABLE "items" ADD COLUMN "files" text[];