
import React from 'react';
import { ethers } from 'ethers';
import './login.css';
import bgImage from './image.png';      
import contractData from './HealthRecordNFT.json';


const rawAbi = contractData.abi[0];
const filteredAbi = rawAbi.filter(f => f.type !== 'error');
const CONTRACT_ADDRESS = '0xecE4cF5e2ddD345E07d307f9750B95A95FC196aa';

export default function Login({ onConnect }) {
  const handleConnect = async () => {
    try {
      const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer   = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, filteredAbi, signer);
      const rawRole  = await contract.roles(address);
      const role     = Number(rawRole);
      onConnect({ account: address, contract, role });
    } catch (err) {
      console.error(err);
      alert('Could not connect wallet:\n' + err.message);
    }
  };

  return (
    <div className="login-page">
     
      <img src={bgImage} alt="Background" className="login-bg" />

      <div className="login-card">
        <h2>MediVault</h2>
        <p>Your secure gateway to on‑chain health records</p>
        <button className="connect-btn" onClick={handleConnect}>
          Connect Wallet
        </button>
      </div>
    </div>
  );
}
