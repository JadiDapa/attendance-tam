-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('BELUM_KAWIN', 'KAWIN', 'CERAI_HIDUP', 'CERAI_MATI');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('PKWT', 'PKWTT');

-- CreateTable
CREATE TABLE "PersonalIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "placeOfBirth" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "religion" "Religion" NOT NULL,
    "maritalStatus" "MaritalStatus" NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Indonesia',
    "ktpPhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domicileAddress" TEXT NOT NULL,
    "ktpAddress" TEXT NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactRelation" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentData" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "workLocation" TEXT NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL,
    "startDate" DATE NOT NULL,
    "contractEndDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousCompany" TEXT,
    "previousPosition" TEXT,
    "previousDuration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ktpUrl" TEXT,
    "npwpUrl" TEXT,
    "kkUrl" TEXT,
    "ijazahUrl" TEXT,
    "transkripUrl" TEXT,
    "sertifikatUrl" TEXT,
    "bankBookUrl" TEXT,
    "pasFotoUrl" TEXT,
    "cvUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrativeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseSalary" INTEGER NOT NULL,
    "allowance" INTEGER,
    "bonus" INTEGER,
    "bankAccountNumber" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "bpjsKesehatanNumber" TEXT,
    "bpjsKetenagakerjaanNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingHistory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalIdentity_userId_key" ON "PersonalIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalIdentity_nik_key" ON "PersonalIdentity"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_userId_key" ON "Contact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentData_userId_key" ON "EmploymentData"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentData_employeeNumber_key" ON "EmploymentData"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkHistory_userId_key" ON "WorkHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrativeDocument_userId_key" ON "AdministrativeDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_userId_key" ON "Payroll"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Training_userId_key" ON "Training"("userId");

-- AddForeignKey
ALTER TABLE "PersonalIdentity" ADD CONSTRAINT "PersonalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentData" ADD CONSTRAINT "EmploymentData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkHistory" ADD CONSTRAINT "WorkHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeDocument" ADD CONSTRAINT "AdministrativeDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
