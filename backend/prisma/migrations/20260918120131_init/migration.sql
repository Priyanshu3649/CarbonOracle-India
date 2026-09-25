-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'FIELD_AGENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plots" (
    "id" TEXT NOT NULL,
    "plot_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "common_name" TEXT NOT NULL,
    "scientific_name" TEXT NOT NULL,
    "wood_density_g_cm3" DOUBLE PRECISION NOT NULL,
    "region" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_batches" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "plot_id" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trees" (
    "id" TEXT NOT NULL,
    "internal_tree_id" TEXT NOT NULL,
    "plot_id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distance_from_tree_m" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tree_measurements" (
    "id" TEXT NOT NULL,
    "tree_id" TEXT NOT NULL,
    "diameter_cm" DOUBLE PRECISION NOT NULL,
    "tree_height_m" DOUBLE PRECISION NOT NULL,
    "wood_density_g_cm3" DOUBLE PRECISION NOT NULL,
    "agb_kg" DOUBLE PRECISION NOT NULL,
    "agc_kg" DOUBLE PRECISION NOT NULL,
    "bgb_kg" DOUBLE PRECISION NOT NULL,
    "bgc_kg" DOUBLE PRECISION NOT NULL,
    "total_carbon_kg" DOUBLE PRECISION NOT NULL,
    "co2e_kg" DOUBLE PRECISION NOT NULL,
    "data_source" TEXT NOT NULL DEFAULT 'rover',
    "raw_upload_batch_id" TEXT,
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_records" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "report_hash" TEXT NOT NULL,
    "blockchain_network" TEXT NOT NULL DEFAULT 'amoy',
    "chain_id" INTEGER NOT NULL DEFAULT 80002,
    "contract_address" TEXT NOT NULL DEFAULT '',
    "transaction_hash" TEXT,
    "block_number" INTEGER,
    "explorer_url" TEXT,
    "methodology_version" TEXT NOT NULL DEFAULT 'CarbonOracle-MRV-v1.0',
    "calculation_version" TEXT NOT NULL DEFAULT 'CarbonOracle-Calc-v1.0',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "recorded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockchain_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trees_internal_tree_id_key" ON "trees"("internal_tree_id");

-- CreateIndex
CREATE UNIQUE INDEX "trees_latitude_longitude_key" ON "trees"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_records_report_id_key" ON "blockchain_records"("report_id");

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trees" ADD CONSTRAINT "trees_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trees" ADD CONSTRAINT "trees_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_measurements" ADD CONSTRAINT "tree_measurements_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_measurements" ADD CONSTRAINT "tree_measurements_raw_upload_batch_id_fkey" FOREIGN KEY ("raw_upload_batch_id") REFERENCES "upload_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
