-- CreateTable
CREATE TABLE `blockchain_records` (
    `id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NOT NULL,
    `report_hash` VARCHAR(64) NOT NULL,
    `blockchain_network` VARCHAR(191) NOT NULL DEFAULT 'amoy',
    `chain_id` INTEGER NOT NULL DEFAULT 80002,
    `contract_address` VARCHAR(191) NOT NULL DEFAULT '',
    `transaction_hash` VARCHAR(66) NULL,
    `block_number` INTEGER NULL,
    `explorer_url` VARCHAR(191) NULL,
    `methodology_version` VARCHAR(191) NOT NULL DEFAULT 'CarbonOracle-MRV-v1.0',
    `calculation_version` VARCHAR(191) NOT NULL DEFAULT 'CarbonOracle-Calc-v1.0',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `failure_reason` TEXT NULL,
    `recorded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `blockchain_records_report_id_key`(`report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
