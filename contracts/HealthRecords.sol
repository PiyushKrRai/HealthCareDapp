// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HealthRecords
 * @author Model Playground
 * @notice An enhanced smart contract for a decentralized health records system.
 * @dev This version includes owner-based provider vetting, efficient data retrieval functions
 * for UI optimization, and paginated record fetching.
 * It is designed to work seamlessly with a modern dApp frontend.
 */
contract HealthRecords {

    // --- Structs ---

    struct HealthRecord {
        string description;       // e.g., "Annual Checkup Blood Test Results"
        string ipfsHash;          // The hash of the encrypted file stored on IPFS
        uint256 timestamp;        // The time the record was added
        address uploadedBy;       // The address of the provider who added it
    }

    struct Provider {
        string name;
        string specialty;
        bool isApproved;          // True only if the owner has approved this provider
    }

    // --- State Variables ---

    address public owner;

    // Mapping from a patient's address to their array of health records
    mapping(address => HealthRecord[]) private records;

    // Mapping from a provider's address to their details
    mapping(address => Provider) public providers;

    // Mapping for fast O(1) access permission checks
    // patientAddress => providerAddress => hasAccess (bool)
    mapping(address => mapping(address => bool)) private accessPermissions;

    // Mapping for efficient O(n) enumeration of authorized providers for a UI
    // patientAddress => array of provider addresses
    mapping(address => address[]) private authorizedProvidersList;

    // Mapping to track if a patient has been registered on the system
    mapping(address => bool) public isPatient;

    // --- Events ---

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event ProviderRequestedRegistration(address indexed providerAddress, string name, string specialty);
    event ProviderApproved(address indexed providerAddress);
    event PatientRegistered(address indexed patientAddress);
    event RecordAdded(address indexed patientAddress, uint recordId, string ipfsHash, address indexed uploadedBy);
    event AccessGranted(address indexed patientAddress, address indexed providerAddress);
    event AccessRevoked(address indexed patientAddress, address indexed providerAddress);

    // --- Constructor ---

    constructor() {
        owner = msg.sender;
        emit OwnerChanged(address(0), msg.sender);
    }

    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }


    modifier onlyApprovedProvider() {
        require(providers[msg.sender].isApproved, "Caller is not an approved provider");
        _;
    }

    modifier hasAccess(address _patientAddress) {
        require(
            msg.sender == _patientAddress || accessPermissions[_patientAddress][msg.sender],
            "Caller does not have access to this patient's records"
        );
        _;
    }

    // --- Owner & Provider Management Functions ---

    /**
     * @notice Allows a potential provider to request registration. Must be approved by the owner.
     */
    function requestProviderRegistration(string calldata _name, string calldata _specialty) external {
        require(!providers[msg.sender].isApproved, "Provider already registered and approved");
        providers[msg.sender] = Provider(_name, _specialty, false); // Not approved yet
        emit ProviderRequestedRegistration(msg.sender, _name, _specialty);
    }

    /**
     * @notice Owner approves a provider, allowing them to be granted access by patients.
     * @param _providerAddress The address of the provider to approve.
     */
    function approveProvider(address _providerAddress) external onlyOwner {
        require(bytes(providers[_providerAddress].name).length > 0, "Provider has not requested registration");
        require(!providers[_providerAddress].isApproved, "Provider is already approved");
        providers[_providerAddress].isApproved = true;
        emit ProviderApproved(_providerAddress);
    }

    // --- Patient & Provider Interaction Functions ---

    /**
     * @notice A patient grants an approved provider access to their records.
     * @param _providerAddress The address of the provider to grant access to.
     */
    function grantAccess(address _providerAddress) external {
        require(providers[_providerAddress].isApproved, "Target is not an approved provider");
        require(!accessPermissions[msg.sender][_providerAddress], "Access has already been granted");

        // First time a patient grants access, register them.
        if (!isPatient[msg.sender]) {
            isPatient[msg.sender] = true;
            emit PatientRegistered(msg.sender);
        }

        accessPermissions[msg.sender][_providerAddress] = true;
        authorizedProvidersList[msg.sender].push(_providerAddress);
        emit AccessGranted(msg.sender, _providerAddress);
    }

    /**
     * @notice A patient revokes a provider's access to their records.
     * @param _providerAddress The address of the provider to revoke access from.
     */
    function revokeAccess(address _providerAddress) external {
        require(accessPermissions[msg.sender][_providerAddress], "Access has not been granted");
        accessPermissions[msg.sender][_providerAddress] = false;

        // Remove the provider from the authorized list (more complex but better for UI)
        address[] storage providerList = authorizedProvidersList[msg.sender];
        for (uint i = 0; i < providerList.length; i++) {
            if (providerList[i] == _providerAddress) {
                // Swap the element to be removed with the last element and pop
                providerList[i] = providerList[providerList.length - 1];
                providerList.pop();
                break;
            }
        }
        emit AccessRevoked(msg.sender, _providerAddress);
    }

    /**
     * @notice Adds a new health record for a patient. Can only be done by an approved provider with access.
     * @param _patientAddress The address of the patient.
     * @param _description A brief description of the record.
     * @param _ipfsHash The IPFS hash of the encrypted health record file.
     */
    function addRecord(address _patientAddress, string calldata _description, string calldata _ipfsHash)
        external
        onlyApprovedProvider
        hasAccess(_patientAddress)
    {
        uint recordId = records[_patientAddress].length;
        records[_patientAddress].push(HealthRecord({
            description: _description,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            uploadedBy: msg.sender
        }));
        emit RecordAdded(_patientAddress, recordId, _ipfsHash, msg.sender);
    }


    // --- View Functions (Read-only) ---

    /**
     * @notice Gets the total count of records for a patient.
     * @param _patientAddress The address of the patient.
     */
    function getRecordCount(address _patientAddress) external view hasAccess(_patientAddress) returns (uint) {
        return records[_patientAddress].length;
    }

    /**
     * @notice Fetches a paginated list of health records for a patient.
     * @dev Reduces the number of RPC calls from the frontend.
     * @param _patientAddress The address of the patient.
     * @param _page The page number (starting from 1).
     * @param _pageSize The number of records per page.
     * @return An array of HealthRecord structs.
     */
    function getRecords(address _patientAddress, uint _page, uint _pageSize)
        external
        view
        hasAccess(_patientAddress)
        returns (HealthRecord[] memory)
    {
        require(_page > 0 && _pageSize > 0, "Page and pageSize must be greater than 0");
        uint totalRecords = records[_patientAddress].length;
        
        uint startIndex = (_page - 1) * _pageSize;
        if (startIndex >= totalRecords) {
            return new HealthRecord[](0); // Return empty array if page is out of bounds
        }
        
        uint endIndex = startIndex + _pageSize;
        if (endIndex > totalRecords) {
            endIndex = totalRecords;
        }

        HealthRecord[] memory pageRecords = new HealthRecord[](endIndex - startIndex);
        for(uint i = startIndex; i < endIndex; i++) {
            pageRecords[i - startIndex] = records[_patientAddress][i];
        }

        return pageRecords;
    }

    /**
     * @notice Gets the list of all providers who have access to a patient's records.
     * @dev Crucial for UI to display access control lists efficiently.
     * @param _patientAddress The address of the patient.
     * @return An array of provider addresses.
     */
    function getAuthorizedProvidersForPatient(address _patientAddress) external view hasAccess(_patientAddress) returns (address[] memory) {
        return authorizedProvidersList[_patientAddress];
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