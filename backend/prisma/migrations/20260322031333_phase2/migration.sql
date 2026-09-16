/*
  Warnings:

  - You are about to drop the `tree_records` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `tree_records` DROP FOREIGN KEY `tree_records_plot_id_fkey`;

-- DropForeignKey
ALTER TABLE `tree_records` DROP FOREIGN KEY `tree_records_raw_upload_batch_id_fkey`;

-- DropForeignKey
ALTER TABLE `tree_records` DROP FOREIGN KEY `tree_records_species_id_fkey`;

-- DropTable
DROP TABLE `tree_records`;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'FIELD_AGENT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trees` (
    `id` VARCHAR(191) NOT NULL,
    `internal_tree_id` VARCHAR(191) NOT NULL,
    `plot_id` VARCHAR(191) NOT NULL,
    `species_id` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `distance_from_tree_m` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `trees_internal_tree_id_key`(`internal_tree_id`),
    UNIQUE INDEX `trees_latitude_longitude_key`(`latitude`, `longitude`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tree_measurements` (
    `id` VARCHAR(191) NOT NULL,
    `tree_id` VARCHAR(191) NOT NULL,
    `diameter_cm` DOUBLE NOT NULL,
    `tree_height_m` DOUBLE NOT NULL,
    `wood_density_g_cm3` DOUBLE NOT NULL,
    `agb_kg` DOUBLE NOT NULL,
    `agc_kg` DOUBLE NOT NULL,
    `bgb_kg` DOUBLE NOT NULL,
    `bgc_kg` DOUBLE NOT NULL,
    `total_carbon_kg` DOUBLE NOT NULL,
    `co2e_kg` DOUBLE NOT NULL,
    `data_source` VARCHAR(191) NOT NULL DEFAULT 'rover',
    `raw_upload_batch_id` VARCHAR(191) NULL,
    `measured_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trees` ADD CONSTRAINT `trees_plot_id_fkey` FOREIGN KEY (`plot_id`) REFERENCES `plots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trees` ADD CONSTRAINT `trees_species_id_fkey` FOREIGN KEY (`species_id`) REFERENCES `species`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tree_measurements` ADD CONSTRAINT `tree_measurements_tree_id_fkey` FOREIGN KEY (`tree_id`) REFERENCES `trees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tree_measurements` ADD CONSTRAINT `tree_measurements_raw_upload_batch_id_fkey` FOREIGN KEY (`raw_upload_batch_id`) REFERENCES `upload_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
