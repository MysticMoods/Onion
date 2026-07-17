"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { ethers } from "ethers";
import { UploadCloud, File as FileIcon, Download, Key, Shield } from "lucide-react";
import { encryptFile, decryptFile, uploadToPinata, fetchFromIPFS, deriveKeyFromSignature } from "../../utils/ipfs";
import { FileVaultABI, FileVaultAddress } from "../../utils/contract";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  // Derive encryption key
  const deriveKey = async () => {
    if (!walletClient || !address) return;
    try {
      // Prompt user to sign a message to derive the key
      const message = "Unlock my Decentralized File Vault";
      const signature = await walletClient.signMessage({ message });
      const key = deriveKeyFromSignature(signature);
      setEncryptionKey(key);
    } catch (error) {
      console.error("Error deriving key:", error);
      alert("Failed to derive encryption key. You must sign the message.");
    }
  };

  // Fetch files from Smart Contract
  const fetchMyFiles = async () => {
    if (!address || !publicClient) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const ethersContract = new ethers.Contract(FileVaultAddress, FileVaultABI, provider);
      
      const myFiles = await ethersContract.getMyFiles({ from: address });
      setFiles(myFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchMyFiles();
    } else {
      setFiles([]);
      setEncryptionKey(null);
    }
  }, [isConnected, address]);

  // Handle Upload
  const handleUpload = async () => {
    if (!selectedFile || !encryptionKey || !walletClient) return;
    setIsUploading(true);
    try {
      // 1. Encrypt File
      const encryptedData = await encryptFile(selectedFile, encryptionKey);
      
      // 2. Upload to IPFS via Pinata
      const cid = await uploadToPinata(encryptedData, selectedFile.name);

      // 3. Save to Smart Contract
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(FileVaultAddress, FileVaultABI, signer);
      
      const tx = await contract.uploadFile(cid, selectedFile.name);
      await tx.wait();

      alert("File uploaded successfully!");
      setSelectedFile(null);
      fetchMyFiles();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Check console for details.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle View / Decrypt
  const handleView = async (cid: string, fileName: string) => {
    if (!encryptionKey) {
      alert("Please unlock your vault first to decrypt files.");
      return;
    }
    try {
      const encryptedData = await fetchFromIPFS(cid);
      const decryptedDataUrl = decryptFile(encryptedData, encryptionKey);
      
      // Create a temporary link to download/view
      const a = document.createElement('a');
      a.href = decryptedDataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error viewing file:", error);
      alert("Failed to view file. It may be corrupted or you don't have the correct key.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Decentralized Vault
          </h1>
        </div>
        <ConnectButton />
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column - Actions */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" /> Vault Status
            </h2>
            {isConnected ? (
              encryptionKey ? (
                <div className="text-green-400 bg-green-400/10 p-3 rounded-lg text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Vault Unlocked
                </div>
              ) : (
                <button
                  onClick={deriveKey}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-medium transition-all"
                >
                  Unlock Vault
                </button>
              )
            ) : (
              <p className="text-gray-500 text-sm">Connect your wallet to access your vault.</p>
            )}
          </div>

          <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl ${!encryptionKey ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-400" /> Upload File
            </h2>
            <div className="space-y-4">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-medium transition-all flex justify-center items-center gap-2"
              >
                {isUploading ? (
                  <span className="animate-pulse">Encrypting & Uploading...</span>
                ) : (
                  <>Upload Securely</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - File List */}
        <div className="md:col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl min-h-[500px]">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FileIcon className="w-5 h-5 text-gray-400" /> My Encrypted Files
            </h2>
            
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Shield className="w-12 h-12 mb-4 opacity-20" />
                <p>Connect wallet to view files</p>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <FileIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>Your vault is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {files.map((file, idx) => (
                  <div key={idx} className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl flex flex-col justify-between group hover:border-blue-500/50 transition-colors">
                    <div className="mb-4">
                      <p className="font-medium text-gray-200 truncate" title={file.fileName}>{file.fileName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(Number(file.timestamp) * 1000).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 truncate" title={file.ipfsCID}>CID: {file.ipfsCID}</p>
                    </div>
                    <button
                      onClick={() => handleView(file.ipfsCID, file.fileName)}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors text-blue-400"
                    >
                      <Download className="w-4 h-4" /> Download & Decrypt
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
