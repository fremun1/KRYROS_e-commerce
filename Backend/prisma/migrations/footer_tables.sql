-- CreateTable FooterSection
CREATE TABLE "footer_sections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable FooterLink
CREATE TABLE "footer_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "footer_links_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "footer_sections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable FooterConfig
CREATE TABLE "footer_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logo" TEXT,
    "description" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contactAddress" TEXT,
    "newsletterTitle" TEXT DEFAULT 'Subscribe to our Newsletter',
    "newsletterSubtitle" TEXT,
    "copyrightText" TEXT,
    "socialLinks" TEXT,
    "paymentMethods" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "footer_links_sectionId_idx" ON "footer_links"("sectionId");
