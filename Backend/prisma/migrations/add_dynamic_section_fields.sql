-- Add new fields for dynamic section system to cms_sections table
ALTER TABLE "cms_sections" 
ADD COLUMN IF NOT EXISTS "templateType" VARCHAR(255) DEFAULT 'ProductShelf',
ADD COLUMN IF NOT EXISTS "dataSourceId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "slotKey" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "cms_sections_templateType_idx" ON "cms_sections"("templateType");
CREATE INDEX IF NOT EXISTS "cms_sections_dataSourceId_idx" ON "cms_sections"("dataSourceId");
