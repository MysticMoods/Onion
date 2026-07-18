# Onion 🧅 - Secure, Decentralized File Vault

Onion is a fully decentralized, privacy-first file storage vault. It uses military-grade client-side encryption combined with IPFS to ensure that you—and only you—truly own and control your data.

## 🚀 Features

* **Wallet Authentication**: Connect seamlessly using WalletConnect/AppKit.
* **Client-Side Encryption**: Files are encrypted in the browser using AES encryption before they ever leave your device. The encryption key is derived from a secure wallet signature.
* **Decentralized Storage**: Encrypted files are pinned to IPFS via Pinata, ensuring high availability and censorship resistance.
* **On-Chain Registry**: IPFS CIDs and file metadata are permanently stored on a local/testnet smart contract, linking your files explicitly to your wallet address.

## 🛠️ Tech Stack

* **Frontend**: Next.js (App Router), React, TypeScript, TailwindCSS
* **Web3 Integration**: WalletConnect / Reown (AppKit), Ethers.js
* **Smart Contracts**: Solidity, Hardhat
* **Storage & Encryption**: IPFS, Pinata API, CryptoJS

---

## 💻 Getting Started (Local Development)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Onion
```

### 2. Setup Smart Contracts (Local Blockchain)
Open a terminal and navigate to the `smart-contracts` folder:
```bash
cd smart-contracts
npm install

# Start the local Hardhat node
npx hardhat node
```
*Keep this terminal running.*

In a new terminal window (still inside `smart-contracts`), deploy the `FileVault` contract to your local network:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Note the deployed contract address and ensure it matches the `FileVaultAddress` inside `frontend/utils/contract.ts`.*

### 3. Setup the Frontend
Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory and add your Pinata API keys:
```env
NEXT_PUBLIC_PINATA_API_KEY=your_api_key_here
NEXT_PUBLIC_PINATA_SECRET_API_KEY=your_secret_key_here
```

Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔒 Architecture (How it works)
1. User connects their wallet.
2. User selects a file to upload.
3. The user signs a deterministic message to generate a private AES encryption key.
4. The file is encrypted locally using CryptoJS.
5. The encrypted blob is uploaded to IPFS via Pinata.
6. A transaction is sent to the `FileVault` smart contract to store the resulting IPFS CID against the user's wallet address.
7. To retrieve files, the frontend queries the smart contract for the user's CIDs, fetches the encrypted blobs from IPFS gateways, and decrypts them locally using the user's signature-derived key.
