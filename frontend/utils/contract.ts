export const FileVaultAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

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
