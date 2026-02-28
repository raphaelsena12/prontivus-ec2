-- AddColumn: modalidade to consultas
ALTER TABLE "consultas" ADD COLUMN "modalidade" TEXT NOT NULL DEFAULT 'PRESENCIAL';

-- CreateTable: telemedicine_sessions
CREATE TABLE "telemedicine_sessions" (
    "id" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "meetingId" TEXT,
    "meetingData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "patientToken" TEXT NOT NULL,
    "patientTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "identityVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "telemedicine_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: telemedicine_participants
CREATE TABLE "telemedicine_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "medicoId" TEXT,
    "role" TEXT NOT NULL,
    "attendeeId" TEXT,
    "attendeeData" JSONB,
    "joinTime" TIMESTAMP(3),
    "leaveTime" TIMESTAMP(3),

    CONSTRAINT "telemedicine_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: telemedicine_logs
CREATE TABLE "telemedicine_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "medicoId" TEXT,
    "role" TEXT,
    "eventType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemedicine_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: telemedicine_consents
CREATE TABLE "telemedicine_consents" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemedicine_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telemedicine_sessions_consultaId_key" ON "telemedicine_sessions"("consultaId");
CREATE UNIQUE INDEX "telemedicine_sessions_patientToken_key" ON "telemedicine_sessions"("patientToken");
CREATE INDEX "telemedicine_sessions_patientToken_idx" ON "telemedicine_sessions"("patientToken");
CREATE INDEX "telemedicine_sessions_status_idx" ON "telemedicine_sessions"("status");
CREATE INDEX "telemedicine_participants_sessionId_idx" ON "telemedicine_participants"("sessionId");
CREATE INDEX "telemedicine_participants_role_idx" ON "telemedicine_participants"("role");
CREATE INDEX "telemedicine_logs_sessionId_idx" ON "telemedicine_logs"("sessionId");
CREATE INDEX "telemedicine_logs_eventType_idx" ON "telemedicine_logs"("eventType");
CREATE INDEX "telemedicine_consents_sessionId_idx" ON "telemedicine_consents"("sessionId");

-- AddForeignKey
ALTER TABLE "telemedicine_sessions" ADD CONSTRAINT "telemedicine_sessions_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consultas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "telemedicine_participants" ADD CONSTRAINT "telemedicine_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "telemedicine_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "telemedicine_logs" ADD CONSTRAINT "telemedicine_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "telemedicine_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "telemedicine_consents" ADD CONSTRAINT "telemedicine_consents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "telemedicine_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
