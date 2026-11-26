-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "audiences" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "education" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
