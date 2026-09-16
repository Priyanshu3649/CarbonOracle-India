// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CarbonOracleRegistry
 * @notice Provides tamper-evident, timestamped anchoring of CarbonOracle MRV report hashes.
 *
 * IMPORTANT: This contract does NOT create carbon credits, does NOT validate
 * the scientific correctness of carbon calculations, and does NOT constitute
 * regulatory verification. It provides data integrity and audit trail only.
 *
 * Carbon calculation is performed off-chain by the CarbonOracle calculation engine.
 * Blockchain records only the SHA-256 fingerprint of the finalized MRV report.
 */
contract CarbonOracleRegistry {

    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;

    struct Report {
        string  reportId;          // Unique MRV report / upload-batch ID
        bytes32 reportHash;        // SHA-256 of the canonical MRV report (hex → bytes32)
        uint256 totalCarbonKg;     // Total carbon (kg), scaled ×1000 to avoid floats
        uint256 co2eKg;            // CO₂-equivalent (kg), scaled ×1000
        string  methodologyVersion;// e.g. "CarbonOracle-MRV-v1.0"
        uint256 timestamp;         // Block timestamp at registration
        bool    exists;            // Guard for duplicate-detection
    }

    /// reportId → Report
    mapping(string => Report) private reports;

    /// Ordered list of all registered reportIds (for enumeration)
    string[] public reportIds;

    // ─── Events ───────────────────────────────────────────────────────────────

    /**
     * @dev Emitted on every successful report registration.
     * Indexed fields allow efficient off-chain filtering.
     */
    event ReportRegistered(
        string  indexed reportId,
        bytes32 indexed reportHash,
        uint256         totalCarbonKg,
        uint256         co2eKg,
        string          methodologyVersion,
        uint256         timestamp
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "CarbonOracleRegistry: caller is not owner");
        _;
    }

    modifier reportDoesNotExist(string calldata reportId) {
        require(
            !reports[reportId].exists,
            "CarbonOracleRegistry: report already registered (use a new version ID)"
        );
        _;
    }

    modifier reportExists(string calldata reportId) {
        require(reports[reportId].exists, "CarbonOracleRegistry: report not found");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ─── Write Functions ──────────────────────────────────────────────────────

    /**
     * @notice Register a finalized MRV report hash on-chain.
     * @dev Only the authorized CarbonOracle backend wallet (owner) may register.
     *      Duplicate registrations are rejected — use a versioned reportId instead.
     *
     * @param reportId          Unique identifier (e.g. "BATCH-abc123-V1")
     * @param reportHash        SHA-256 hash of the canonical MRV report (as bytes32)
     * @param totalCarbonKg     Total carbon estimate in kg × 1000 (integer)
     * @param co2eKg            CO₂-equivalent estimate in kg × 1000 (integer)
     * @param methodologyVersion Version string of the calculation methodology
     */
    function registerReport(
        string  calldata reportId,
        bytes32          reportHash,
        uint256          totalCarbonKg,
        uint256          co2eKg,
        string  calldata methodologyVersion
    )
        external
        onlyOwner
        reportDoesNotExist(reportId)
    {
        require(bytes(reportId).length > 0,           "CarbonOracleRegistry: empty reportId");
        require(reportHash != bytes32(0),             "CarbonOracleRegistry: empty reportHash");
        require(bytes(methodologyVersion).length > 0, "CarbonOracleRegistry: empty methodologyVersion");

        reports[reportId] = Report({
            reportId:           reportId,
            reportHash:         reportHash,
            totalCarbonKg:      totalCarbonKg,
            co2eKg:             co2eKg,
            methodologyVersion: methodologyVersion,
            timestamp:          block.timestamp,
            exists:             true
        });

        reportIds.push(reportId);

        emit ReportRegistered(
            reportId,
            reportHash,
            totalCarbonKg,
            co2eKg,
            methodologyVersion,
            block.timestamp
        );
    }

    /**
     * @notice Transfer ownership to a new backend wallet.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "CarbonOracleRegistry: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── Read Functions (public — anyone can verify) ──────────────────────────

    /**
     * @notice Retrieve a registered report by ID.
     * @dev Public — any wallet or tool can independently verify a report.
     */
    function getReport(string calldata reportId)
        external
        view
        reportExists(reportId)
        returns (
            string  memory reportId_,
            bytes32        reportHash,
            uint256        totalCarbonKg,
            uint256        co2eKg,
            string  memory methodologyVersion,
            uint256        timestamp
        )
    {
        Report storage r = reports[reportId];
        return (
            r.reportId,
            r.reportHash,
            r.totalCarbonKg,
            r.co2eKg,
            r.methodologyVersion,
            r.timestamp
        );
    }

    /**
     * @notice Check whether a report ID has been registered.
     */
    function reportExists_(string calldata reportId) external view returns (bool) {
        return reports[reportId].exists;
    }

    /**
     * @notice Total number of registered reports.
     */
    function totalReports() external view returns (uint256) {
        return reportIds.length;
    }
}
