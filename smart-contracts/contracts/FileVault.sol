// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FileVault {
    struct File {
        string ipfsCID;
        string fileName;
        uint256 timestamp;
    }

    // Mapping from owner to their files
    mapping(address => File[]) private userVaults;

    // Mapping to check if a specific address has access to a specific CID
    // mapping(cid => mapping(user => hasAccess))
    mapping(string => mapping(address => bool)) public accessRegistry;

    // Mapping to track the true owner of a file CID
    mapping(string => address) public fileOwner;

    // Events
    event FileUploaded(address indexed owner, string cid, string fileName, uint256 timestamp);
    event AccessGranted(address indexed owner, address indexed user, string cid);
    event AccessRevoked(address indexed owner, address indexed user, string cid);

    modifier onlyFileOwner(string memory _cid) {
        require(fileOwner[_cid] == msg.sender, "Not the owner of this file");
        _;
    }

    function uploadFile(string memory _cid, string memory _fileName) external {
        require(fileOwner[_cid] == address(0), "File CID already registered");
        fileOwner[_cid] = msg.sender;

        File memory newFile = File({
            ipfsCID: _cid,
            fileName: _fileName,
            timestamp: block.timestamp
        });

        userVaults[msg.sender].push(newFile);
        // Owner naturally has access
        accessRegistry[_cid][msg.sender] = true;

        emit FileUploaded(msg.sender, _cid, _fileName, block.timestamp);
    }

    function shareFile(string memory _cid, address _user) external onlyFileOwner(_cid) {
        accessRegistry[_cid][_user] = true;
        emit AccessGranted(msg.sender, _user, _cid);
    }

    function revokeAccess(string memory _cid, address _user) external onlyFileOwner(_cid) {
        require(msg.sender != _user, "Cannot revoke own access");
        accessRegistry[_cid][_user] = false;
        emit AccessRevoked(msg.sender, _user, _cid);
    }

    function getMyFiles() external view returns (File[] memory) {
        return userVaults[msg.sender];
    }

    function hasAccess(string memory _cid, address _user) external view returns (bool) {
        return accessRegistry[_cid][_user];
    }
}
