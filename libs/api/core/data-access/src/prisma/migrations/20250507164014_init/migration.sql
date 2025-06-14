-- CreateEnum
CREATE TYPE "AppUserRole" AS ENUM ('Member', 'Owner');

-- CreateEnum
CREATE TYPE "ClusterStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "ClusterType" AS ENUM ('Custom', 'SolanaDevnet', 'SolanaMainnet', 'SolanaTestnet');

-- CreateEnum
CREATE TYPE "MintType" AS ENUM ('SplToken');

-- CreateEnum
CREATE TYPE "TransactionCommitment" AS ENUM ('Confirmed', 'Finalized', 'Processed');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('Committed', 'Confirmed', 'Failed', 'Finalized', 'Processing');

-- CreateEnum
CREATE TYPE "TransactionErrorType" AS ENUM ('BadNonce', 'InvalidAccount', 'SomeError', 'Timeout', 'Unknown', 'WebhookFailed');

-- CreateEnum
CREATE TYPE "UserIdentityType" AS ENUM ('Discord', 'GitHub', 'Google');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Admin', 'User');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('Generated', 'Imported', 'Provisioned');

-- CreateEnum
CREATE TYPE "WebhookDirection" AS ENUM ('Incoming', 'Outgoing');

-- CreateEnum
CREATE TYPE "WebhookType" AS ENUM ('Balance', 'Event', 'Verify');

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "index" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "maxEnvs" INTEGER NOT NULL DEFAULT 5,
    "name" TEXT NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppEnv" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "ipsAllowed" TEXT[],
    "ipsBlocked" TEXT[],
    "solanaTransactionMaxRetries" INTEGER NOT NULL DEFAULT 0,
    "solanaTransactionSkipPreflight" BOOLEAN NOT NULL DEFAULT false,
    "uasAllowed" TEXT[],
    "uasBlocked" TEXT[],
    "webhookBalanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookBalanceUrl" TEXT,
    "webhookBalanceThreshold" TEXT,
    "webhookDebugging" BOOLEAN NOT NULL DEFAULT false,
    "webhookEventEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookEventUrl" TEXT,
    "webhookSecret" TEXT,
    "webhookVerifyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookVerifyUrl" TEXT,
    "appId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,

    CONSTRAINT "AppEnv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppMint" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "appEnvId" TEXT,
    "addMemo" BOOLEAN DEFAULT false,
    "mintId" TEXT,
    "walletId" TEXT,

    CONSTRAINT "AppMint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "AppUserRole" NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cluster" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpointPrivate" TEXT NOT NULL,
    "endpointPublic" TEXT NOT NULL,
    "explorer" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ClusterStatus" NOT NULL DEFAULT 'Active',
    "type" "ClusterType" NOT NULL,

    CONSTRAINT "Cluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mint" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addMemo" BOOLEAN DEFAULT false,
    "address" TEXT NOT NULL,
    "airdropAmount" INTEGER,
    "airdropMax" INTEGER,
    "airdropSecretKey" TEXT,
    "coinGeckoId" TEXT,
    "decimals" INTEGER NOT NULL,
    "default" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "symbol" TEXT NOT NULL,
    "type" "MintType" NOT NULL,
    "clusterId" TEXT NOT NULL,

    CONSTRAINT "Mint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amount" TEXT,
    "appKey" TEXT,
    "blockhash" TEXT,
    "commitment" "TransactionCommitment",
    "decimals" INTEGER,
    "destination" TEXT,
    "feePayer" TEXT,
    "headers" JSONB,
    "ip" TEXT,
    "lastValidBlockHeight" INTEGER,
    "mint" TEXT,
    "processingDuration" INTEGER,
    "reference" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "signature" TEXT,
    "solanaCommitted" TIMESTAMP(3),
    "solanaCommittedDuration" INTEGER,
    "solanaConfirmed" TIMESTAMP(3),
    "solanaFinalized" TIMESTAMP(3),
    "solanaFinalizedDuration" INTEGER,
    "solanaStart" TIMESTAMP(3),
    "solanaTransaction" JSONB,
    "source" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'Processing',
    "totalDuration" INTEGER,
    "tx" TEXT,
    "ua" TEXT,
    "webhookEventStart" TIMESTAMP(3),
    "webhookEventEnd" TIMESTAMP(3),
    "webhookEventDuration" INTEGER,
    "webhookVerifyStart" TIMESTAMP(3),
    "webhookVerifyEnd" TIMESTAMP(3),
    "webhookVerifyDuration" INTEGER,
    "appEnvId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionError" (
    "id" TEXT NOT NULL,
    "logs" TEXT[],
    "message" TEXT NOT NULL,
    "type" "TransactionErrorType" NOT NULL DEFAULT 'Unknown',
    "instruction" INTEGER,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "TransactionError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatarUrl" TEXT,
    "name" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL,
    "username" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEmail" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "UserEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "UserIdentityType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "profile" JSONB,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "WalletType" NOT NULL,
    "publicKey" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "ownerId" TEXT,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletBalance" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balance" BIGINT NOT NULL,
    "change" BIGINT NOT NULL,
    "appEnvId" TEXT,
    "walletId" TEXT,

    CONSTRAINT "WalletBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "direction" "WebhookDirection" NOT NULL,
    "headers" JSONB,
    "payload" JSONB,
    "reference" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "responsePayload" JSONB,
    "responseError" TEXT,
    "responseStatus" INTEGER,
    "type" "WebhookType" NOT NULL,
    "appEnvId" TEXT,
    "transactionId" TEXT,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AppEnvToWallet" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "App_index_key" ON "App"("index");

-- CreateIndex
CREATE UNIQUE INDEX "AppEnv_appId_name_key" ON "AppEnv"("appId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AppMint_order_appEnvId_key" ON "AppMint"("order", "appEnvId");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_appId_userId_key" ON "AppUser"("appId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mint_address_clusterId_key" ON "Mint"("address", "clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "Mint_address_clusterId_symbol_key" ON "Mint"("address", "clusterId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Mint_order_clusterId_key" ON "Mint"("order", "clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserEmail_email_key" ON "UserEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_AppEnvToWallet_AB_unique" ON "_AppEnvToWallet"("A", "B");

-- CreateIndex
CREATE INDEX "_AppEnvToWallet_B_index" ON "_AppEnvToWallet"("B");

-- AddForeignKey
ALTER TABLE "AppEnv" ADD CONSTRAINT "AppEnv_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppEnv" ADD CONSTRAINT "AppEnv_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMint" ADD CONSTRAINT "AppMint_appEnvId_fkey" FOREIGN KEY ("appEnvId") REFERENCES "AppEnv"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMint" ADD CONSTRAINT "AppMint_mintId_fkey" FOREIGN KEY ("mintId") REFERENCES "Mint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMint" ADD CONSTRAINT "AppMint_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mint" ADD CONSTRAINT "Mint_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_appEnvId_fkey" FOREIGN KEY ("appEnvId") REFERENCES "AppEnv"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionError" ADD CONSTRAINT "TransactionError_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmail" ADD CONSTRAINT "UserEmail_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletBalance" ADD CONSTRAINT "WalletBalance_appEnvId_fkey" FOREIGN KEY ("appEnvId") REFERENCES "AppEnv"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletBalance" ADD CONSTRAINT "WalletBalance_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_appEnvId_fkey" FOREIGN KEY ("appEnvId") REFERENCES "AppEnv"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AppEnvToWallet" ADD CONSTRAINT "_AppEnvToWallet_A_fkey" FOREIGN KEY ("A") REFERENCES "AppEnv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AppEnvToWallet" ADD CONSTRAINT "_AppEnvToWallet_B_fkey" FOREIGN KEY ("B") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
