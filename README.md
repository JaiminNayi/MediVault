
# MediVault: Decentralized Health Record System



## 🧠 Abstract

MediVault is a decentralized application designed to give patients full ownership and control over their health records by representing each record as an HealthRecord NFT, secured with AES encryption. Doctors and patients register on-chain, and patients explicitly grant doctors permission before any records can be minted. Every NFT contains an encrypted combination of diagnosis and medication information while maintaining complete privacy on public blockchains. To access a record, patients pay a small, fixed fee in Yoda, which automatically transfers to the issuing doctor before the record is decrypted in the browser. The smart contract enforces role-based access control, and the front-end, built in React with ethers.js, handles key derivation, and encryption/decryption. The LocalStorage feature determines what medical records have already been accessed so users do not need to repeatedly pay the fee when they return to the application. MediVault demonstrates how blockchain can secure sensitive data, enforce patient consent, and fairly compensate providers through on-chain micropayments, all while maintaining a seamless user experience.



## ⚙️ Tech Stack

- **React.js** (Frontend UI)
- **Ethers.js** (Ethereum interaction)
- **Solidity** (NFT Smart Contract)
- **CryptoJS** (AES encryption/decryption)
- **MetaMask** (Wallet integration)
- **Sepolia Testnet** (Deployed blockchain)

## 🔑 Key Features

- Encrypted doctor-to-patient health record NFTs.
- Role-based login and registration (Doctor & Patient).
- One-time unlock per record via 10 YODA token payment.
- Doctor approval/revocation by patients.

## 📁 Folder Structure

```
project/
├── contracts/
│   └── Healthrecord.sol 
|   └── ERC721.sol   # Your smart contract file
└── src/
    ├── App.js
    ├── DoctorHome.js
    ├── PatientHome.js
    ├── Login.js
    ├── Registration.js
    ├── constants.js
    ├── home.css
    └── ...
```

## 🧪 Setup & Running the Project

### 1. Prerequisites

- Node.js & npm
- MetaMask (connected to Sepolia Testnet)
- Some testnet ETH and YODA tokens

### 2. Installation

```bash
npm install
```

### 3. Start the App

```bash
npm start
```

This will launch the frontend on `http://localhost:3000`.

## 📌 How to Use

1. Connect your wallet (MetaMask).
2. Register as a doctor (use code `DOCTOR123`) or patient.
3. If you are a patient:
   - Approve a doctor by entering their wallet address.
   - View and unlock records by paying 10 YODA once.
4. If you are a doctor:
   - Mint encrypted records for patients who approved you.
   - Look up patient tokens and decrypt them.

## 📦 Notes

- No need to deploy manually — contract is already live on Sepolia.
- You should have YODA token balance for unlocking.

