/**
 * KRYROS — One-time migration: base64 avatars → Cloudinary URLs
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-avatars-to-cloudinary.ts
 *
 * Safe to run multiple times — skips users who already have a Cloudinary URL.
 * Processes users in batches of 20 to avoid memory issues.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

const prisma = new PrismaClient();
const BATCH_SIZE = 20;

async function uploadToCloudinary(base64: string, userId: string): Promise<string> {
  const result = await cloudinary.uploader.upload(base64, {
    folder: 'kryros/avatars',
    public_id: `user_${userId}`,
    overwrite: true,
    resource_type: 'image',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
  return result.secure_url;
}

async function main() {
  console.log('🚀 Starting avatar migration to Cloudinary...');

  const total = await prisma.user.count({
    where: { avatar: { startsWith: 'data:' } },
  });
  console.log(`Found ${total} users with base64 avatars to migrate.`);

  if (total === 0) {
    console.log('✅ Nothing to migrate.');
    return;
  }

  let migrated = 0;
  let failed = 0;
  let cursor: string | undefined;

  while (true) {
    const users = await prisma.user.findMany({
      where: { avatar: { startsWith: 'data:' } },
      select: { id: true, avatar: true },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
    });

    if (users.length === 0) break;

    for (const user of users) {
      try {
        console.log(`  Uploading avatar for user ${user.id}...`);
        const cloudinaryUrl = await uploadToCloudinary(user.avatar!, user.id);
        await prisma.user.update({
          where: { id: user.id },
          data: { avatar: cloudinaryUrl },
        });
        migrated++;
        console.log(`  ✅ ${user.id} → ${cloudinaryUrl}`);
      } catch (err) {
        failed++;
        console.error(`  ❌ Failed for user ${user.id}: ${err}`);
      }
    }

    cursor = users[users.length - 1].id;
    console.log(`Progress: ${migrated + failed}/${total}`);
  }

  console.log(`\n✅ Migration complete. Migrated: ${migrated}, Failed: ${failed}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
