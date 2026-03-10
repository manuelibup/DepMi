-- DepMi Safe Migration
-- Paste this entire file into Neon SQL Editor and click Run.
-- Every statement is idempotent — safe to run on an existing database.

-- ══════════════════════════════════════════════
-- 1. New ENUMs (skip if already exists)
-- ══════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASING', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentRail" AS ENUM ('NAIRA', 'CRYPTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "StoreVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'STICKER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "StoreTier" AS ENUM ('TRIAL', 'FREE', 'BASIC', 'PRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════
-- 2. New values on existing ENUMs
-- ══════════════════════════════════════════════

ALTER TYPE "Category" ADD VALUE IF NOT EXISTS 'TRANSPORT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_PRODUCT_FROM_STORE';
ALTER TYPE "OtpType" ADD VALUE IF NOT EXISTS 'ACCOUNT_UPDATE';

-- ══════════════════════════════════════════════
-- 3. New columns on existing tables
-- ══════════════════════════════════════════════

-- User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;

-- Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT '₦';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 2500;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 1;

-- Demand
ALTER TABLE "Demand" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT '₦';
ALTER TABLE "Demand" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- Store
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP(3);
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "tier" "StoreTier" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bankAccountNo" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bankCode" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "cryptoWalletAddr" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "preferredPayoutRail" "PaymentRail" NOT NULL DEFAULT 'NAIRA';
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "cacDocUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "rcNumber" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "tin" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "verificationStatus" "StoreVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'HELD';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cryptoAmountUsdc" DECIMAL(18,6);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cryptoTxHash" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentRail" "PaymentRail" NOT NULL DEFAULT 'NAIRA';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "platformFeeNgn" DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "virtualAcctBank" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "virtualAcctExpiry" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "virtualAcctNo" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT NOT NULL DEFAULT 'DELIVERY';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingNo" TEXT;

-- KycStatus unique constraints (new)
CREATE UNIQUE INDEX IF NOT EXISTS "KycStatus_ninRef_key" ON "KycStatus"("ninRef");
CREATE UNIQUE INDEX IF NOT EXISTS "KycStatus_bvnRef_key" ON "KycStatus"("bvnRef");
CREATE UNIQUE INDEX IF NOT EXISTS "KycStatus_cacNumber_key" ON "KycStatus"("cacNumber");

-- ══════════════════════════════════════════════
-- 4. New tables
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "DemandMedia" (
    "id" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DemandMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "virtualAccountNumber" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paystackReference" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SavedProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchQuery" TEXT,
    "productId" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductWatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "productId" TEXT,
    "demandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StoreFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreFollow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessagePreview" TEXT,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaUrl" TEXT,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "_ConversationParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ConversationParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- ══════════════════════════════════════════════
-- 5. Indexes for new tables
-- ══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS "DemandMedia_demandId_idx" ON "DemandMedia"("demandId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_paystackReference_key" ON "Payment"("paystackReference");
CREATE INDEX IF NOT EXISTS "ProductLike_productId_idx" ON "ProductLike"("productId");
CREATE INDEX IF NOT EXISTS "ProductLike_userId_idx" ON "ProductLike"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductLike_userId_productId_key" ON "ProductLike"("userId", "productId");
CREATE INDEX IF NOT EXISTS "SavedProduct_productId_idx" ON "SavedProduct"("productId");
CREATE INDEX IF NOT EXISTS "SavedProduct_userId_idx" ON "SavedProduct"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "SavedProduct_userId_productId_key" ON "SavedProduct"("userId", "productId");
CREATE INDEX IF NOT EXISTS "ProductWatch_userId_idx" ON "ProductWatch"("userId");
CREATE INDEX IF NOT EXISTS "ProductWatch_productId_idx" ON "ProductWatch"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_key" ON "Review"("orderId");
CREATE INDEX IF NOT EXISTS "Review_buyerId_idx" ON "Review"("buyerId");
CREATE INDEX IF NOT EXISTS "Review_storeId_idx" ON "Review"("storeId");
CREATE INDEX IF NOT EXISTS "Comment_productId_idx" ON "Comment"("productId");
CREATE INDEX IF NOT EXISTS "Comment_demandId_idx" ON "Comment"("demandId");
CREATE INDEX IF NOT EXISTS "Comment_authorId_idx" ON "Comment"("authorId");
CREATE INDEX IF NOT EXISTS "StoreFollow_storeId_notify_idx" ON "StoreFollow"("storeId", "notify");
CREATE INDEX IF NOT EXISTS "StoreFollow_userId_idx" ON "StoreFollow"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StoreFollow_userId_storeId_key" ON "StoreFollow"("userId", "storeId");
CREATE INDEX IF NOT EXISTS "UserFollow_followerId_idx" ON "UserFollow"("followerId");
CREATE INDEX IF NOT EXISTS "UserFollow_followingId_idx" ON "UserFollow"("followingId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");
CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS "Message_senderId_read_idx" ON "Message"("senderId", "read");
CREATE INDEX IF NOT EXISTS "_ConversationParticipants_B_index" ON "_ConversationParticipants"("B");

-- ══════════════════════════════════════════════
-- 6. Foreign keys (skip if already exists)
-- ══════════════════════════════════════════════

DO $$ BEGIN ALTER TABLE "DemandMedia" ADD CONSTRAINT "DemandMedia_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductLike" ADD CONSTRAINT "ProductLike_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductLike" ADD CONSTRAINT "ProductLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SavedProduct" ADD CONSTRAINT "SavedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SavedProduct" ADD CONSTRAINT "SavedProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductWatch" ADD CONSTRAINT "ProductWatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductWatch" ADD CONSTRAINT "ProductWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Review" ADD CONSTRAINT "Review_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Review" ADD CONSTRAINT "Review_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Comment" ADD CONSTRAINT "Comment_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Comment" ADD CONSTRAINT "Comment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StoreFollow" ADD CONSTRAINT "StoreFollow_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "StoreFollow" ADD CONSTRAINT "StoreFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "_ConversationParticipants" ADD CONSTRAINT "_ConversationParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "_ConversationParticipants" ADD CONSTRAINT "_ConversationParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
