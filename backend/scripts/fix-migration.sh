#!/bin/bash

# Fix for failed Prisma migration: 20251202000000_add_delivered_at_to_messages
# This script resolves the failed migration and deploys any pending migrations

set -e

echo "🔍 Checking migration status..."
npx prisma migrate status --schema=prisma/schema.prisma

echo ""
echo "🔧 Resolving failed migration: 20251202000000_add_delivered_at_to_messages"
echo "   (Migration SQL is now idempotent with IF NOT EXISTS)"
echo ""
echo "This will mark the migration as applied. Press Ctrl+C to cancel, or Enter to continue..."
read -r

npx prisma migrate resolve --applied 20251202000000_add_delivered_at_to_messages --schema=prisma/schema.prisma

echo ""
echo "✅ Failed migration resolved!"
echo ""
echo "🚀 Deploying all pending migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma

echo ""
echo "✅ All migrations deployed successfully!"
echo ""
echo "🔄 Generating Prisma Client..."
npx prisma generate --schema=prisma/schema.prisma

echo ""
echo "✅ Done! Your database is now up to date."
