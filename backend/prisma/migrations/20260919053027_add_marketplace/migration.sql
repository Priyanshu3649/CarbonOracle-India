-- CreateTable
CREATE TABLE "wood_density_reference" (
    "id" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "genus" TEXT NOT NULL,
    "family" TEXT,
    "plant_order" TEXT,
    "plant_group" TEXT,
    "wsg_est" DOUBLE PRECISION NOT NULL,
    "wsg_est_trunk" DOUBLE PRECISION,
    "wsg_est_branch" DOUBLE PRECISION,
    "wsg_raw" DOUBLE PRECISION,
    "nb_samples" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "wood_density_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_projects" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "plot_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "methodology" TEXT NOT NULL DEFAULT 'CarbonOracle-MRV-v1.0',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total_credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_per_credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vintage_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_credits" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "vintage_year" INTEGER NOT NULL,
    "quantity_tonnes" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "current_owner_id" TEXT,
    "retired_by_id" TEXT,
    "retired_at" TIMESTAMP(3),
    "retirement_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carbon_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "credit_id" TEXT NOT NULL,
    "from_user_id" TEXT,
    "to_user_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity_tonnes" DOUBLE PRECISION NOT NULL,
    "price_per_tonne" DOUBLE PRECISION,
    "total_price_usd" DOUBLE PRECISION,
    "blockchain_tx_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retirement_certificates" (
    "id" TEXT NOT NULL,
    "credit_id" TEXT NOT NULL,
    "retired_by_id" TEXT NOT NULL,
    "beneficiary_name" TEXT NOT NULL,
    "quantity_tonnes" DOUBLE PRECISION NOT NULL,
    "retirement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificate_number" TEXT NOT NULL,
    "blockchain_tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retirement_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wood_density_reference_species_idx" ON "wood_density_reference"("species");

-- CreateIndex
CREATE INDEX "wood_density_reference_genus_idx" ON "wood_density_reference"("genus");

-- CreateIndex
CREATE UNIQUE INDEX "carbon_credits_serial_number_key" ON "carbon_credits"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "retirement_certificates_credit_id_key" ON "retirement_certificates"("credit_id");

-- CreateIndex
CREATE UNIQUE INDEX "retirement_certificates_certificate_number_key" ON "retirement_certificates"("certificate_number");

-- AddForeignKey
ALTER TABLE "carbon_projects" ADD CONSTRAINT "carbon_projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_projects" ADD CONSTRAINT "carbon_projects_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_credits" ADD CONSTRAINT "carbon_credits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "carbon_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_credits" ADD CONSTRAINT "carbon_credits_current_owner_id_fkey" FOREIGN KEY ("current_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_credits" ADD CONSTRAINT "carbon_credits_retired_by_id_fkey" FOREIGN KEY ("retired_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "carbon_credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retirement_certificates" ADD CONSTRAINT "retirement_certificates_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "carbon_credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retirement_certificates" ADD CONSTRAINT "retirement_certificates_retired_by_id_fkey" FOREIGN KEY ("retired_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
