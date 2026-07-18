export const FileVaultAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const FileVaultABI = [
  "function uploadFile(string memory _cid, string memory _fileName) external",
  "function shareFile(string memory _cid, address _user) external",
  "function revokeAccess(string memory _cid, address _user) external",
  "function getMyFiles() external view returns (tuple(string ipfsCID, string fileName, uint256 timestamp)[])",
  "function hasAccess(string memory _cid, address _user) external view returns (bool)",
  "event FileUploaded(address indexed owner, string cid, string fileName, uint256 timestamp)",
  "event AccessGranted(address indexed owner, address indexed user, string cid)",
  "event AccessRevoked(address indexed owner, address indexed user, string cid)"
];
