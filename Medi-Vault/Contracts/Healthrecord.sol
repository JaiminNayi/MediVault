// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "./ERC721.sol";


contract HealthRecordNFT is ERC721 {
    // contract deployer set as owner
    address public owner;

    // restricts access to only contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // roles for addresses
    enum Role { None, Doctor, Patient }

    // mapping each address to its role
    mapping(address => Role) public roles;

    // patient can approve multiple doctors
    mapping(address => address[]) private patientApprovals;

    struct HealthRecord {
        string diagnosis;    
        string medication;  
        address doctor;
        uint256 timestamp;
    }

    mapping(uint256 => HealthRecord) private records;


    uint256 private tokenIdCounter; 
    bytes32 private doctorRegistrationCodeHash;

    
    constructor()
        ERC721("HealthRecordNFT", "HRNFT", 0, 0)
    {
        owner = msg.sender;  
        
        doctorRegistrationCodeHash = keccak256(abi.encodePacked("DOCTOR123"));
        
        roles[msg.sender] = Role.Doctor;
    }

    
    modifier onlyDoctor() {
        require(roles[msg.sender] == Role.Doctor, "Not doctor");
        _;
    }

   
    function assignRole(address user, Role role) public onlyOwner {
        roles[user] = role;
    }

    
    function registerAsDoctor(string memory code) public {
        require(roles[msg.sender] == Role.None, "Already registered");
        // checking provided code matches stored hash
        require(
            keccak256(abi.encodePacked(code)) == doctorRegistrationCodeHash,
            "Invalid doctor code"
        );
        roles[msg.sender] = Role.Doctor;
    }

    function registerAsPatient() public {
        require(roles[msg.sender] == Role.None, "Already registered");
        roles[msg.sender] = Role.Patient;
    }

    function approveDoctor(address doctor) public {
        require(roles[doctor] == Role.Doctor, "Must be a doctor");
        patientApprovals[msg.sender].push(doctor);
    }

   
    function revokeDoctor(address doctor) public {
        require(roles[doctor] == Role.Doctor, "Not a doctor");
        _removeApproval(msg.sender, doctor);
    }

 
    function revokePatientApproval(address patient) public {
        require(roles[msg.sender] == Role.Doctor, "Not a doctor");
        _removeApproval(patient, msg.sender);
    }

     // helper method to remove approval from list
    function _removeApproval(address patient, address doc) internal {
        address[] storage list = patientApprovals[patient];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == doc) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
        revert("Approval not found");
    }

    function isApprovedByPatient(address patient, address doctor) public view returns (bool) {
        address[] memory list = patientApprovals[patient];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == doctor) {
                return true;
            }
        }
        return false;
    }

    
    function mintRecord(
        address patient,
        string memory diagnosis,
        string memory medication
    ) public onlyDoctor returns (uint256) {
        require(
            isApprovedByPatient(patient, msg.sender),
            "Doctor not approved by patient"
        );

        uint256 newTokenId = tokenIdCounter;
        _mint(patient, newTokenId); 
        //minting via erc721
        // storing all health data
        records[newTokenId] = HealthRecord({
            diagnosis:  diagnosis,
            medication: medication,
            doctor:     msg.sender,
            timestamp:  block.timestamp
        });

        tokenIdCounter++;
        return newTokenId;
    }

    function viewRecord(uint256 tokenId) public view returns (
        string memory diagnosis,
        string memory medication,
        address doctor,
        uint256 timestamp
    ) {
        address patient = _ownerOf[tokenId];
        require(patient != address(0), "Record doesn't exist");

        bool allowed = (msg.sender == patient) ||
                       isApprovedByPatient(patient, msg.sender);
        require(allowed, "Access denied");

        HealthRecord memory rec = records[tokenId];
        return (rec.diagnosis, rec.medication, rec.doctor, rec.timestamp);
    }

    function getTokensByPatient(address patient) public view returns (uint256[] memory) {
        require(
            msg.sender == patient ||
            isApprovedByPatient(patient, msg.sender),
            "Access denied"
        );

        uint256 count = _balanceOf[patient];
        uint256[] memory tokens = new uint256[](count);
        uint256 idx = 0;

        // iterating through all minted ids
        for (uint256 i = 0; i < tokenIdCounter; i++) {
            if (_ownerOf[i] == patient) {
                tokens[idx++] = i;
            }
        }
        return tokens;
    }
}
