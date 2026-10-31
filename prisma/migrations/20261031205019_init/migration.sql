-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'PROFESSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "ShareIntention" AS ENUM ('DISCUSS_IN_SESSION', 'WANT_FEEDBACK', 'JUST_FYI');

-- CreateEnum
CREATE TYPE "CareLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "CbtStatus" AS ENUM ('DRAFT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('JOURNAL', 'EMOTION', 'CBT', 'TASK', 'ASSESSMENT', 'RESOURCE');

-- CreateEnum
CREATE TYPE "CopingCardType" AS ENUM ('TECHNIQUE', 'PHRASE', 'ACTIVITY', 'CONTACT', 'HELPLINE');

-- CreateEnum
CREATE TYPE "CopingTechnique" AS ENUM ('BREATHING', 'GROUNDING', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthorKind" AS ENUM ('PROFESSIONAL', 'PATIENT');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('PDF', 'IMAGE', 'LINK', 'TEXT');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'LIKERT', 'SLIDER', 'PERCENTAGE', 'YES_NO', 'NUMBER', 'SHORT_TEXT', 'LONG_TEXT', 'DATE', 'INFO');

-- CreateEnum
CREATE TYPE "ScoringMethod" AS ENUM ('SUM', 'AVERAGE', 'WEIGHTED_SUM');

-- CreateEnum
CREATE TYPE "CriticalOperator" AS ENUM ('GTE', 'GT', 'EQ', 'LTE', 'LT');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('DAILY', 'WEEKLY', 'NEVER');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PATIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'NEVER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareLink" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "CareLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentVersion" TEXT NOT NULL,
    "consentAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharingDefaults" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "journal" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "emotions" "Visibility" NOT NULL DEFAULT 'SHARED',
    "cbt" "Visibility" NOT NULL DEFAULT 'SHARED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharingDefaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionNode" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmotionNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionNodeOverride" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "EmotionNodeOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "noteEnc" TEXT,
    "visibility" "Visibility" NOT NULL,
    "intention" "ShareIntention",
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmotionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionEntryItem" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "intensity" INTEGER NOT NULL,
    "bodyZones" TEXT[],

    CONSTRAINT "EmotionEntryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "titleEnc" TEXT,
    "bodyEnc" TEXT NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "intention" "ShareIntention",
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryEmotion" (
    "journalEntryId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,

    CONSTRAINT "JournalEntryEmotion_pkey" PRIMARY KEY ("journalEntryId","nodeId")
);

-- CreateTable
CREATE TABLE "CognitiveDistortion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "example" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CognitiveDistortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbtRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "CbtStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "situationEnc" TEXT,
    "thoughtEnc" TEXT,
    "beliefBefore" INTEGER,
    "bodyZones" TEXT[],
    "behaviorEnc" TEXT,
    "alternativeEnc" TEXT,
    "beliefAfter" INTEGER,
    "visibility" "Visibility" NOT NULL,
    "intention" "ShareIntention",
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbtRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbtRecordDistortion" (
    "cbtRecordId" TEXT NOT NULL,
    "distortionId" TEXT NOT NULL,

    CONSTRAINT "CbtRecordDistortion_pkey" PRIMARY KEY ("cbtRecordId","distortionId")
);

-- CreateTable
CREATE TABLE "CbtRecordEmotion" (
    "id" TEXT NOT NULL,
    "cbtRecordId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "intensityBefore" INTEGER NOT NULL,
    "intensityAfter" INTEGER,

    CONSTRAINT "CbtRecordEmotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTopic" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "textEnc" TEXT NOT NULL,
    "sourceType" "EntryType",
    "sourceId" TEXT,
    "discussedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "targetType" "EntryType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "bodyEnc" TEXT NOT NULL,
    "resourceId" TEXT,
    "discussInSession" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickReply" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bodyEnc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopingPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopingCard" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "type" "CopingCardType" NOT NULL,
    "technique" "CopingTechnique",
    "title" TEXT NOT NULL,
    "body" TEXT,
    "phone" TEXT,
    "whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "author" "AuthorKind" NOT NULL DEFAULT 'PROFESSIONAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopingCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "url" TEXT,
    "storageKey" TEXT,
    "bodyText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAssignment" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "ResourceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resourceId" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "patientCommentEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "sourceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentVersion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "instructions" TEXT,
    "referencePeriod" TEXT,
    "scoringMethod" "ScoringMethod" NOT NULL DEFAULT 'SUM',
    "patientSeesScore" BOOLEAN NOT NULL DEFAULT false,
    "closingMessage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSection" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,

    CONSTRAINT "AssessmentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sectionId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "scored" BOOLEAN NOT NULL DEFAULT true,
    "reverse" BOOLEAN NOT NULL DEFAULT false,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "subscaleId" TEXT,
    "scaleBlockKey" TEXT,
    "criticalOperator" "CriticalOperator",
    "criticalValue" DOUBLE PRECISION,
    "config" JSONB,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscale" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "ScoringMethod" NOT NULL DEFAULT 'SUM',

    CONSTRAINT "Subscale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreRange" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "subscaleId" TEXT,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "text" TEXT,

    CONSTRAINT "ScoreRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAssignment" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "recurrenceDays" INTEGER,
    "nextDueAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT,
    "versionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "ResponseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalScore" DOUBLE PRECISION,
    "subscaleScores" JSONB,
    "interpretation" TEXT,
    "criticalQuestionIds" TEXT[],
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "valueNumber" DOUBLE PRECISION,
    "optionIds" TEXT[],
    "textEnc" TEXT,
    "valueDate" TIMESTAMP(3),

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalResult" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "interpretation" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "storageKey" TEXT,
    "notesEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CrisisLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "patientId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT NOT NULL DEFAULT '20:00',
    "days" INTEGER[],

    CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "PatientProfile"("userId");

-- CreateIndex
CREATE INDEX "CareLink_professionalId_status_idx" ON "CareLink"("professionalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CareLink_patientId_professionalId_key" ON "CareLink"("patientId", "professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_code_key" ON "Invitation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SharingDefaults_patientId_key" ON "SharingDefaults"("patientId");

-- CreateIndex
CREATE INDEX "EmotionNode_parentId_idx" ON "EmotionNode"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionNodeOverride_professionalId_nodeId_key" ON "EmotionNodeOverride"("professionalId", "nodeId");

-- CreateIndex
CREATE INDEX "EmotionEntry_patientId_occurredAt_idx" ON "EmotionEntry"("patientId", "occurredAt");

-- CreateIndex
CREATE INDEX "EmotionEntryItem_nodeId_idx" ON "EmotionEntryItem"("nodeId");

-- CreateIndex
CREATE INDEX "JournalEntry_patientId_createdAt_idx" ON "JournalEntry"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "CbtRecord_patientId_occurredAt_idx" ON "CbtRecord"("patientId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CbtRecordEmotion_cbtRecordId_nodeId_key" ON "CbtRecordEmotion"("cbtRecordId", "nodeId");

-- CreateIndex
CREATE INDEX "SessionTopic_patientId_discussedAt_idx" ON "SessionTopic"("patientId", "discussedAt");

-- CreateIndex
CREATE INDEX "Feedback_patientId_targetType_targetId_idx" ON "Feedback"("patientId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "ClinicalNote_professionalId_patientId_idx" ON "ClinicalNote"("professionalId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "CopingPlan_patientId_key" ON "CopingPlan"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAssignment_resourceId_patientId_key" ON "ResourceAssignment"("resourceId", "patientId");

-- CreateIndex
CREATE INDEX "Task_patientId_completedAt_idx" ON "Task"("patientId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentVersion_assessmentId_version_key" ON "AssessmentVersion"("assessmentId", "version");

-- CreateIndex
CREATE INDEX "AssessmentResponse_patientId_completedAt_idx" ON "AssessmentResponse"("patientId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_responseId_questionId_key" ON "Answer"("responseId", "questionId");

-- CreateIndex
CREATE INDEX "AuditLog_patientId_createdAt_idx" ON "AuditLog"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSettings_userId_key" ON "ReminderSettings"("userId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareLink" ADD CONSTRAINT "CareLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareLink" ADD CONSTRAINT "CareLink_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharingDefaults" ADD CONSTRAINT "SharingDefaults_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionNode" ADD CONSTRAINT "EmotionNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EmotionNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionNodeOverride" ADD CONSTRAINT "EmotionNodeOverride_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionNodeOverride" ADD CONSTRAINT "EmotionNodeOverride_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "EmotionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionEntry" ADD CONSTRAINT "EmotionEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionEntryItem" ADD CONSTRAINT "EmotionEntryItem_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "EmotionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionEntryItem" ADD CONSTRAINT "EmotionEntryItem_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "EmotionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryEmotion" ADD CONSTRAINT "JournalEntryEmotion_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryEmotion" ADD CONSTRAINT "JournalEntryEmotion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "EmotionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtRecord" ADD CONSTRAINT "CbtRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtRecordDistortion" ADD CONSTRAINT "CbtRecordDistortion_cbtRecordId_fkey" FOREIGN KEY ("cbtRecordId") REFERENCES "CbtRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtRecordDistortion" ADD CONSTRAINT "CbtRecordDistortion_distortionId_fkey" FOREIGN KEY ("distortionId") REFERENCES "CognitiveDistortion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtRecordEmotion" ADD CONSTRAINT "CbtRecordEmotion_cbtRecordId_fkey" FOREIGN KEY ("cbtRecordId") REFERENCES "CbtRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtRecordEmotion" ADD CONSTRAINT "CbtRecordEmotion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "EmotionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTopic" ADD CONSTRAINT "SessionTopic_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickReply" ADD CONSTRAINT "QuickReply_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopingPlan" ADD CONSTRAINT "CopingPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopingCard" ADD CONSTRAINT "CopingCard_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CopingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentVersion" ADD CONSTRAINT "AssessmentVersion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSection" ADD CONSTRAINT "AssessmentSection_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subscaleId_fkey" FOREIGN KEY ("subscaleId") REFERENCES "Subscale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscale" ADD CONSTRAINT "Subscale_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRange" ADD CONSTRAINT "ScoreRange_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRange" ADD CONSTRAINT "ScoreRange_subscaleId_fkey" FOREIGN KEY ("subscaleId") REFERENCES "Subscale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssessmentAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "AssessmentResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalResult" ADD CONSTRAINT "ExternalResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalResult" ADD CONSTRAINT "ExternalResult_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSettings" ADD CONSTRAINT "ReminderSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
