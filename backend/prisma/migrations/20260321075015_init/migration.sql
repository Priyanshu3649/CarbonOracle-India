-- CreateTable
CREATE TABLE `plots` (
    `id` VARCHAR(191) NOT NULL,
    `plot_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `species` (
    `id` VARCHAR(191) NOT NULL,
    `common_name` VARCHAR(191) NOT NULL,
    `scientific_name` VARCHAR(191) NOT NULL,
    `wood_density_g_cm3` DOUBLE NOT NULL,
    `region` VARCHAR(191) NULL,
    `remarks` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `upload_batches` (
    `id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `plot_id` VARCHAR(191) NOT NULL,
    `row_count` INTEGER NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tree_records` (
    `id` VARCHAR(191) NOT NULL,
    `internal_tree_id` VARCHAR(191) NOT NULL,
    `plot_id` VARCHAR(191) NOT NULL,
    `species_id` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `distance_from_tree_m` DOUBLE NULL,
    `diameter_cm` DOUBLE NOT NULL,
    `tree_height_m` DOUBLE NOT NULL,
    `wood_density_g_cm3` DOUBLE NOT NULL,
    `agb_kg` DOUBLE NOT NULL,
    `agc_kg` DOUBLE NOT NULL,
    `bgb_kg` DOUBLE NOT NULL,
    `bgc_kg` DOUBLE NOT NULL,
    `total_carbon_kg` DOUBLE NOT NULL,
    `co2e_kg` DOUBLE NOT NULL,
    `data_source` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `raw_upload_batch_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tree_records_internal_tree_id_key`(`internal_tree_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `upload_batches` ADD CONSTRAINT `upload_batches_plot_id_fkey` FOREIGN KEY (`plot_id`) REFERENCES `plots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tree_records` ADD CONSTRAINT `tree_records_plot_id_fkey` FOREIGN KEY (`plot_id`) REFERENCES `plots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tree_records` ADD CONSTRAINT `tree_records_species_id_fkey` FOREIGN KEY (`species_id`) REFERENCES `species`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tree_records` ADD CONSTRAINT `tree_records_raw_upload_batch_id_fkey` FOREIGN KEY (`raw_upload_batch_id`) REFERENCES `upload_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
