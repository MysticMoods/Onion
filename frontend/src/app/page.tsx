"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient, usePublicClient, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from "ethers";
import { UploadCloud, File as FileIcon, Download, Key, Shield, Loader2, Trash2, Edit3, Palette } from "lucide-react";
import { encryptFile, decryptFile, uploadToPinata, fetchFromIPFS, deriveKeyFromSignature } from "../../utils/ipfs";
import { FileVaultABI, FileVaultAddress } from "../../utils/contract";

type ThemeName = 'neon' | 'cyber' | 'sunset';

const THEMES = {
  neon: {
    bg1: 'bg-purple-600/20',
    bg2: 'bg-blue-600/20',
    textGlow: 'from-blue-400 via-indigo-400 to-purple-400',
    btnPrimary: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/30',
    btnUpload: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-900/30',
    iconPrimary: 'text-purple-400',
    iconUpload: 'text-blue-400',
    iconFile: 'text-indigo-400',
    badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
  },
  cyber: {
    bg1: 'bg-emerald-600/20',
    bg2: 'bg-cyan-600/20',
    textGlow: 'from-cyan-400 via-emerald-400 to-green-400',
    btnPrimary: 'from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-900/30',
    btnUpload: 'from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/30',
    iconPrimary: 'text-emerald-400',
    iconUpload: 'text-cyan-400',
    iconFile: 'text-emerald-400',
    badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
  },
  sunset: {
    bg1: 'bg-rose-600/20',
    bg2: 'bg-orange-600/20',
    textGlow: 'from-orange-400 via-rose-400 to-pink-400',
    btnPrimary: 'from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 shadow-rose-900/30',
    btnUpload: 'from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 shadow-orange-900/30',
    iconPrimary: 'text-rose-400',
    iconUpload: 'text-orange-400',
    iconFile: 'text-rose-400',
    badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400'
  }
};

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
  const [deletingCid, setDeletingCid] = useState<string | null>(null);
  const [renamingCid, setRenamingCid] = useState<string | null>(null);
  
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('neon');
  const theme = THEMES[currentTheme];

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
      const encryptedData = await encryptFile(selectedFile, currentKey);
      const cid = await uploadToPinata(encryptedData, selectedFile.name);

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

  // Handle Delete
  const handleDelete = async (cid: string) => {
    if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) return;
    
    setDeletingCid(cid);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(FileVaultAddress, FileVaultABI, signer);
      
      const tx = await contract.deleteFile(cid);
      await tx.wait();
      
      fetchMyFiles();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete file.");
    } finally {
      setDeletingCid(null);
    }
  };

  // Handle Rename
  const handleRename = async (cid: string, currentName: string) => {
    const newName = prompt("Enter new file name:", currentName);
    if (!newName || newName === currentName) return;
    
    setRenamingCid(cid);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(FileVaultAddress, FileVaultABI, signer);
      
      const tx = await contract.renameFile(cid, newName);
      await tx.wait();
      
      fetchMyFiles();
    } catch (error) {
      console.error("Rename error:", error);
      alert("Failed to rename file.");
    } finally {
      setRenamingCid(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-sans relative overflow-hidden flex flex-col">
      
      {/* Animated Background Decorative Glows */}
      <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] ${theme.bg1} rounded-full blur-[120px] pointer-events-none animate-float transition-colors duration-1000`} />
      <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] ${theme.bg2} rounded-full blur-[120px] pointer-events-none animate-float-delayed transition-colors duration-1000`} />

      <div className="relative z-10 p-8 flex-1 flex flex-col">
        <header className="max-w-6xl mx-auto w-full flex flex-col md:flex-row justify-between items-center mb-8 md:mb-16 gap-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl backdrop-blur-md shadow-lg transition-colors duration-500`}>
              <Shield className={`w-8 h-8 ${theme.iconPrimary} transition-colors duration-500`} />
            </div>
            <div>
              <h1 className={`text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${theme.textGlow} transition-colors duration-500`}>
                Onion Vault
              </h1>
              <p className="text-sm text-gray-500 font-medium">Decentralized. Encrypted. Yours.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Switcher */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
              <button onClick={() => setCurrentTheme('neon')} className={`p-2 rounded-lg transition-all ${currentTheme === 'neon' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`} title="Neon Theme"><Palette className="w-4 h-4" /></button>
              <button onClick={() => setCurrentTheme('cyber')} className={`p-2 rounded-lg transition-all ${currentTheme === 'cyber' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`} title="Cyber Theme"><Palette className="w-4 h-4" /></button>
              <button onClick={() => setCurrentTheme('sunset')} className={`p-2 rounded-lg transition-all ${currentTheme === 'sunset' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-gray-300'}`} title="Sunset Theme"><Palette className="w-4 h-4" /></button>
            </div>
            <div className="shadow-2xl shadow-black/20 rounded-xl">
              <ConnectButton />
            </div>
          </div>
        </header>
        
        {!isConnectedSafe ? (
          <main className="max-w-6xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center mt-12 mb-24">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${theme.badge} font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors`}>
              <Shield className="w-4 h-4" /> Military-Grade Decentralized Storage
            </div>
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-500 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
              Your Data, <br className="hidden md:block"/> Truly Yours.
            </h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              Onion uses client-side AES encryption and IPFS pinning to ensure your files are censorship-resistant, perfectly private, and accessible only by your wallet signature.
            </p>
            
            <div className="transform hover:scale-105 transition-all duration-300 shadow-2xl rounded-xl animate-in fade-in zoom-in duration-1000 delay-500">
              <ConnectButton label="Connect Wallet to Enter Vault" />
            </div>
            
            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left w-full">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/10 transition-colors duration-300 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-[600ms]">
                <div className="p-3 bg-white/5 rounded-xl w-fit mb-5">
                  <Key className={`w-8 h-8 ${theme.iconPrimary} transition-colors`} />
                </div>
                <h3 className="text-xl font-bold text-gray-200 mb-3">Zero-Knowledge</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Files are encrypted in your browser before upload. We never see your data or your keys.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/10 transition-colors duration-300 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-[800ms]">
                <div className="p-3 bg-white/5 rounded-xl w-fit mb-5">
                  <UploadCloud className={`w-8 h-8 ${theme.iconUpload} transition-colors`} />
                </div>
                <h3 className="text-xl font-bold text-gray-200 mb-3">IPFS Storage</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Data is pinned to the decentralized web, meaning no central server can delete or restrict it.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/10 transition-colors duration-300 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-[1000ms]">
                <div className="p-3 bg-white/5 rounded-xl w-fit mb-5">
                  <Shield className={`w-8 h-8 ${theme.iconFile} transition-colors`} />
                </div>
                <h3 className="text-xl font-bold text-gray-200 mb-3">On-Chain Registry</h3>
                <p className="text-gray-400 text-sm leading-relaxed">File metadata and permissions are managed immutably by smart contracts on the blockchain.</p>
              </div>
            </div>
          </main>
        ) : (
          <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Actions */}
            <div className="lg:col-span-1 space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
              
              {/* Vault Status Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/50 transition-all duration-300 hover:border-white/20">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-200">
                  <Key className={`w-5 h-5 ${theme.iconPrimary} transition-colors`} /> Cryptographic State
                </h2>
                {!isRightNetwork ? (
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
                    className={`w-full py-3.5 px-4 bg-gradient-to-r ${theme.btnPrimary} rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2`}
                  >
                    {isDerivingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : "Unlock Vault"}
                  </button>
                )}
              </div>

              {/* Upload Card */}
              <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/50 transition-all duration-300 hover:border-white/20 ${(!isRightNetwork) ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-200">
                  <UploadCloud className={`w-5 h-5 ${theme.iconUpload} transition-colors`} /> Encrypt & Upload
                </h2>
                <div className="space-y-5">
                  
                  <div className="relative group">
                    <input
                      type="file"
                      id="file-upload"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <div className={`w-full border-2 border-dashed ${selectedFile ? `border-white/40 bg-white/10` : 'border-gray-700 bg-gray-800/50 group-hover:border-gray-500'} rounded-2xl p-6 text-center transition-all duration-300 flex flex-col items-center justify-center gap-3`}>
                      <UploadCloud className={`w-8 h-8 ${selectedFile ? 'text-white' : 'text-gray-500'}`} />
                      <p className="text-sm font-medium text-gray-300 truncate w-full px-4">
                        {selectedFile ? selectedFile.name : "Drag & drop or click to browse"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className={`w-full py-3.5 px-4 bg-gradient-to-r ${theme.btnUpload} disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none flex justify-center items-center gap-2`}
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
            <div className="lg:col-span-2 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/50 min-h-[550px] flex flex-col transition-all duration-300 hover:border-white/20">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-200">
                  <FileIcon className={`w-5 h-5 ${theme.iconFile} transition-colors`} /> My Secure Vault
                </h2>
                
                {!isRightNetwork ? (
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
                      <div key={idx} className="bg-gray-900/60 border border-gray-700/50 p-5 rounded-2xl flex flex-col justify-between group hover:border-white/20 hover:bg-gray-800/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
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
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 hover:border-white/20 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingCid === file.ipfsCID ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Decrypting...</>
                          ) : (
                            <><Download className="w-4 h-4" /> Download</>
                          )}
                        </button>
                        <div className="flex gap-2 w-full mt-2">
                          <button
                            onClick={() => handleRename(file.ipfsCID, file.fileName)}
                            disabled={renamingCid === file.ipfsCID || deletingCid === file.ipfsCID}
                            className="flex flex-1 items-center justify-center gap-2 py-2 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 border border-gray-500/20 hover:border-gray-500/40 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {renamingCid === file.ipfsCID ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <><Edit3 className="w-4 h-4" /> Rename</>
                            )}
                          </button>
  
                          <button
                            onClick={() => handleDelete(file.ipfsCID)}
                            disabled={renamingCid === file.ipfsCID || deletingCid === file.ipfsCID}
                            className="flex flex-1 items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingCid === file.ipfsCID ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <><Trash2 className="w-4 h-4" /> Delete</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
  
          </main>
        )}
      </div>
    </div>
  );
}
