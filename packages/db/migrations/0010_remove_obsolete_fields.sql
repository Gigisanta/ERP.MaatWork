-- Remove obsolete fields from contacts table
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "phone_secondary";
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "whatsapp";
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "date_of_birth";
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "address";
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "city";

