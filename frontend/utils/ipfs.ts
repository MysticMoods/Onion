import CryptoJS from "crypto-js";

/**
 * Derives a deterministic encryption key from a user's wallet signature.
 * The message to sign should be consistent so the user derives the same key.
 */
export const deriveKeyFromSignature = (signature: string): string => {
  // Hash the signature to create a 256-bit key
  return CryptoJS.SHA256(signature).toString(CryptoJS.enc.Hex);
};

/**
 * Encrypts a File object using AES.
 */
export const encryptFile = async (file: File, key: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const encrypted = CryptoJS.AES.encrypt(dataUrl, key).toString();
      resolve(encrypted);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Decrypts data using AES.
 */
export const decryptFile = (encryptedData: string, key: string): string => {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
  return decrypted.toString(CryptoJS.enc.Utf8);
};

/**
 * Uploads encrypted content to IPFS via Pinata.
 */
export const uploadToPinata = async (encryptedData: string, fileName: string): Promise<string> => {
  const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error("Pinata API keys are missing in environment variables.");
  }

  // Pinata JSON upload endpoint
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
  
  const payload = {
    pinataOptions: {
      cidVersion: 1,
    },
    pinataMetadata: {
      name: fileName,
    },
    pinataContent: {
      encryptedFile: encryptedData,
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error uploading to Pinata: ${response.statusText}`);
  }

  const data = await response.json();
  return data.IpfsHash;
};

/**
 * Fetches encrypted content from IPFS via a public gateway.
 */
export const fetchFromIPFS = async (cid: string): Promise<string> => {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Error fetching from IPFS: ${response.statusText}`);
  }

  const data = await response.json();
  return data.encryptedFile;
};
