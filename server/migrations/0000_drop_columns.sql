
ALTER TABLE "users" 
  DROP COLUMN "first_name",
  DROP COLUMN "last_name",
  DROP COLUMN "address",
  DROP COLUMN "city",
  DROP COLUMN "state",
  DROP COLUMN "postal_code";

DROP TABLE "items";
