// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HealthRecords
 * @author Model Playground
 * @notice A smart contract to manage ownership and access permissions for health records.
 * Actual record data is stored off-chain (e.g., on IPFS), and only its hash is stored here.
 * This contract is suitable for deployment on an EVM-compatible chain like CoreDAO.
 */
contract HealthRecords {

    // --- Structs ---

    struct HealthRecord {
        string description;       // e.g., "Annual Checkup Blood Test Results"
        string ipfsHash;          // The hash of the encrypted file stored on IPFS
        uint256 timestamp;        // The time the record was added
        address uploadedBy;       // The address of the provider or patient who added it
    }

    struct Provider {
        string name;              // e.g., "Dr. Alice" or "General Hospital"
        string specialty;         // e.g., "Cardiology"
        bool isRegistered;
    }

    // --- State Variables ---

    // Mapping from a patient's address to their array of health records
    mapping(address => HealthRecord[]) private records;

    // Mapping from a provider's address to their details
    mapping(address => Provider) public providers;

    // Mapping from a patient's address to another mapping that tracks which providers have access
    // patientAddress => providerAddress => hasAccess (bool)
    mapping(address => mapping(address => bool)) private accessPermissions;

    // --- Events ---

    event PatientRegistered(address indexed patientAddress);
    event ProviderRegistered(address indexed providerAddress, string name, string specialty);
    event RecordAdded(address indexed patientAddress, uint recordId, string ipfsHash);
    event AccessGranted(address indexed patientAddress, address indexed providerAddress);
    event AccessRevoked(address indexed patientAddress, address indexed providerAddress);


    // --- Modifiers ---

    // Ensures the caller is a registered provider
    modifier onlyProvider() {
        require(providers[msg.sender].isRegistered, "Caller is not a registered provider");
        _;
    }

    // Ensures the caller is the patient themselves
    modifier onlyPatient(address _patientAddress) {
        require(msg.sender == _patientAddress, "Caller is not the patient");
        _;
    }

    // Ensures the caller is either the patient or a provider with granted access
    modifier hasAccess(address _patientAddress) {
        require(msg.sender == _patientAddress || accessPermissions[_patientAddress][msg.sender], "Caller does not have access");
        _;
    }


    // --- Functions ---

    /**
     * @notice Allows a healthcare provider to register themselves on the system.
     * In a real-world scenario, this might be controlled by a governing body.
     */
    function registerProvider(string calldata _name, string calldata _specialty) external {
        require(!providers[msg.sender].isRegistered, "Provider already registered");
        providers[msg.sender] = Provider(_name, _specialty, true);
        emit ProviderRegistered(msg.sender, _name, _specialty);
    }

    /**
     * @notice Adds a new health record. Can only be added by a provider who has been granted access by the patient.
     * @param _patientAddress The address of the patient whose record is being added.
     * @param _description A brief description of the record.
     * @param _ipfsHash The IPFS hash of the encrypted health record file.
     */
    function addRecord(address _patientAddress, string calldata _description, string calldata _ipfsHash) external onlyProvider hasAccess(_patientAddress) {
        records[_patientAddress].push(HealthRecord({
            description: _description,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            uploadedBy: msg.sender
        }));
        uint recordId = records[_patientAddress].length - 1;
        emit RecordAdded(_patientAddress, recordId, _ipfsHash);
    }

    /**
     * @notice A patient grants a provider access to their records.
     * @param _providerAddress The address of the provider to grant access to.
     */
    function grantAccess(address _providerAddress) external {
        require(providers[_providerAddress].isRegistered, "Target address is not a registered provider");
        accessPermissions[msg.sender][_providerAddress] = true;
        emit AccessGranted(msg.sender, _providerAddress);
    }

    /**
     * @notice A patient revokes a provider's access to their records.
     * @param _providerAddress The address of the provider to revoke access from.
     */
    function revokeAccess(address _providerAddress) external {
        // We use msg.sender as the patient address, ensuring only they can revoke their own access.
        accessPermissions[msg.sender][_providerAddress] = false;
        // Using 'delete' is also an option to save gas: delete accessPermissions[msg.sender][_providerAddress];
        emit AccessRevoked(msg.sender, _providerAddress);
    }

    // --- View Functions (Read-only) ---

    /**
     * @notice Gets the total count of records for a patient.
     * @dev Can only be called by the patient or an authorized provider.
     * @param _patientAddress The address of the patient.
     * @return The number of records.
     */
    function getRecordCount(address _patientAddress) external view hasAccess(_patientAddress) returns (uint) {
        return records[_patientAddress].length;
    }

    /**
     * @notice Fetches a specific health record for a patient.
     * @dev Can only be called by the patient or an authorized provider.
     * @param _patientAddress The address of the patient.
     * @param _recordId The index of the record in the patient's record array.
     * @return The full HealthRecord struct.
     */
    function getRecord(address _patientAddress, uint _recordId) external view hasAccess(_patientAddress) returns (HealthRecord memory) {
        return records[_patientAddress][_recordId];
    }
    
    /**
     * @notice Checks if a specific provider has access to a specific patient's records.
     * @param _patientAddress The address of the patient.
     * @param _providerAddress The address of the provider.
     * @return true if access is granted, false otherwise.
     */
    function checkAccess(address _patientAddress, address _providerAddress) external view returns (bool) {
        return accessPermissions[_patientAddress][_providerAddress];
    }
}