-- AlterTable: make code nullable and add providerRequestId
ALTER TABLE "otp_sessions" ALTER COLUMN "code" DROP NOT NULL;
ALTER TABLE "otp_sessions" ADD COLUMN "providerRequestId" TEXT;
