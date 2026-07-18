"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient, usePublicClient, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from "ethers";
import { UploadCloud, File as FileIcon, Download, Key, Shield, Loader2 } from "lucide-react";
import { encryptFile, decryptFile, uploadToPinata, fetchFromIPFS, deriveKeyFromSignature } from "../../utils/ipfs";
import { FileVaultABI, FileVaultAddress } from "../../utils/contract";

export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isConnectedSafe = mounted && isConnected;
  const isRightNetwork = chain?.id === 31337;

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [isDerivingKey, setIsDerivingKey] = useState(false);
  const [downloadingCid, setDownloadingCid] = useState<string | null>(null);

  // Derive encryption key
  const deriveKey = async () => {
    if (!walletClient || !address) return;
    setIsDerivingKey(true);
    try {
      const message = "Unlock my Decentralized File Vault";
      const signature = await walletClient.signMessage({ account: address as `0x${string}`, message });
      const key = deriveKeyFromSignature(signature);
      setEncryptionKey(key);
    } catch (error) {
      console.error("Error deriving key:", error);
      alert("Failed to derive encryption key. You must sign the message.");
    } finally {
      setIsDerivingKey(false);
    }
  };

  // Fetch files from Smart Contract
  const fetchMyFiles = async () => {
    if (!address || !publicClient || !isRightNetwork) return;
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
    if (isConnectedSafe && isRightNetwork) {
      fetchMyFiles();
    } else {
      setFiles([]);
      setEncryptionKey(null);
    }
  }, [isConnected, address, isRightNetwork]);

  // Handle Upload
  const handleUpload = async () => {
    if (!selectedFile || !walletClient || !address) return;
    
    const MAX_SIZE = 50 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      alert("File is too large! Maximum allowed size is 50MB.");
      return;
    }

    let currentKey = encryptionKey;
    if (!currentKey) {
      try {
        setIsDerivingKey(true);
        const message = "Unlock my Decentralized File Vault";
        const signature = await walletClient.signMessage({ account: address as `0x${string}`, message });
        currentKey = deriveKeyFromSignature(signature);
        setEncryptionKey(currentKey);
      } catch (error) {
        console.error("Error deriving key:", error);
        alert("Failed to derive encryption key. You must sign the message to encrypt files.");
        setIsDerivingKey(false);
        return;
      } finally {
        setIsDerivingKey(false);
      }
    }

    setIsUploading(true);
    try {
      // 1. Encrypt File
      const encryptedData = await encryptFile(selectedFile, currentKey);
      
      // 2. Upload to IPFS via Pinata
      const cid = await uploadToPinata(encryptedData, selectedFile.name);

      // 3. Save to Smart Contract
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(FileVaultAddress, FileVaultABI, signer);
      
      const tx = await contract.uploadFile(cid, selectedFile.name);
      await tx.wait();

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
    setDownloadingCid(cid);
    try {
      const encryptedData = await fetchFromIPFS(cid);
      const decryptedDataUrl = decryptFile(encryptedData, encryptionKey);
      
      const a = document.createElement('a');
      a.href = decryptedDataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error viewing file:", error);
      alert("Failed to view file. It may be corrupted or you don't have the correct key.");
    } finally {
      setDownloadingCid(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-sans relative overflow-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-8">
        <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 rounded-xl backdrop-blur-md shadow-lg">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                Onion Vault
              </h1>
              <p className="text-sm text-gray-500 font-medium">Decentralized. Encrypted. Yours.</p>
            </div>
          </div>
          <div className="shadow-2xl shadow-blue-900/20 rounded-xl">
            <ConnectButton />
          </div>
        </header>
        
        <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Actions */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Vault Status Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/50 transition-all duration-300 hover:border-white/20">
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-200">
                <Key className="w-5 h-5 text-purple-400" /> Cryptographic State
              </h2>
              {isConnectedSafe ? (
                !isRightNetwork ? (
                  <div className="text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
                    Please connect to Localhost.
                  </div>
                ) : encryptionKey ? (
                  <div className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 p-4 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in zoom-in duration-500">
                    <Shield className="w-5 h-5" /> Vault is Unlocked
                  </div>
                ) : (
                  <button
                    onClick={deriveKey}
                    disabled={isDerivingKey}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-semibold shadow-lg shadow-purple-900/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2"
                  >
                    {isDerivingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : "Unlock Vault"}
                  </button>
                )
              ) : (
                <p className="text-gray-400 text-sm p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                  Wallet disconnected.
                </p>
              )}
            </div>

            {/* Upload Card */}
            <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/50 transition-all duration-300 hover:border-white/20 ${(!isConnectedSafe || !isRightNetwork) ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-200">
                <UploadCloud className="w-5 h-5 text-blue-400" /> Encrypt & Upload
              </h2>
              <div className="space-y-5">
                
                <div className="relative group">
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <div className={`w-full border-2 border-dashed ${selectedFile ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50 group-hover:border-gray-500'} rounded-2xl p-6 text-center transition-all duration-300 flex flex-col items-center justify-center gap-3`}>
                    <UploadCloud className={`w-8 h-8 ${selectedFile ? 'text-blue-400' : 'text-gray-500'}`} />
                    <p className="text-sm font-medium text-gray-300 truncate w-full px-4">
                      {selectedFile ? selectedFile.name : "Drag & drop or click to browse"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 rounded-xl font-semibold shadow-lg shadow-blue-900/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none flex justify-center items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Securing Data...
                    </>
                  ) : (
                    "Upload Securely"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - File List */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/50 min-h-[550px] flex flex-col transition-all duration-300 hover:border-white/20">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-200">
                <FileIcon className="w-5 h-5 text-indigo-400" /> My Secure Vault
              </h2>
              
              {!isConnectedSafe ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-60">
                  <Shield className="w-16 h-16 mb-4 text-gray-700" />
                  <p className="font-medium">Connect wallet to view encrypted files</p>
                </div>
              ) : !isRightNetwork ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-60">
                  <p className="font-medium text-yellow-500/80">Switch to the Localhost network</p>
                </div>
              ) : files.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-60">
                  <FileIcon className="w-16 h-16 mb-4 text-gray-700" />
                  <p className="font-medium">Your vault is currently empty</p>
                  <p className="text-sm mt-2 text-gray-600">Upload a file to begin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto pr-2 custom-scrollbar">
                  {files.map((file, idx) => (
                    <div key={idx} className="bg-gray-900/60 border border-gray-700/50 p-5 rounded-2xl flex flex-col justify-between group hover:border-indigo-500/50 hover:bg-gray-800/60 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-900/20 hover:-translate-y-1">
                      <div className="mb-6">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-gray-200 truncate" title={file.fileName}>{file.fileName}</p>
                          <span className="shrink-0 text-xs px-2 py-1 bg-white/5 rounded-md text-gray-400">
                            {new Date(Number(file.timestamp) * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                          <p className="text-[10px] text-gray-500 font-mono break-all line-clamp-2" title={file.ipfsCID}>
                            {file.ipfsCID}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleView(file.ipfsCID, file.fileName)}
                        disabled={downloadingCid === file.ipfsCID}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloadingCid === file.ipfsCID ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Decrypting...</>
                        ) : (
                          <><Download className="w-4 h-4" /> Download</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
