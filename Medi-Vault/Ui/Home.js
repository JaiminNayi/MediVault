
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import {
  YODA_TOKEN_ADDRESS,
  YODA_TOKEN_ABI
} from './constants.js';
import './home.css';

export default function Home({ account, contract, role, onLogout, provider }) {
  //  YODA Balance 
  const [yodaBalance, setYodaBalance] = useState('0');

  useEffect(() => {
    const web3Provider = provider ||
      (window.ethereum
        ? new ethers.providers.Web3Provider(window.ethereum)
        : null);
    if (!web3Provider || !account) return;

    const fetchYoda = async () => {
      try {
        console.log('[YODA] using provider:', web3Provider);
        console.log('[YODA] account:', account);
        console.log('[YODA] token address:', YODA_TOKEN_ADDRESS);

        const signer = web3Provider.getSigner();
        const yoda   = new ethers.Contract(
          YODA_TOKEN_ADDRESS,
          YODA_TOKEN_ABI,
          signer
        );

        const dec = await yoda.decimals();
        const raw = await yoda.balanceOf(account);
        console.log('[YODA] raw balance:', raw.toString());

        const formatted = ethers.utils.formatUnits(raw, dec);
        console.log('[YODA] formatted balance:', formatted);
        setYodaBalance(formatted);
      } catch (err) {
        console.error('Failed to fetch YODA balance', err);
      }
    };

    fetchYoda();
  }, [provider, account]);

 
  const requestYoda = async () => {
    const web3Provider = provider ||
      (window.ethereum
        ? new ethers.providers.Web3Provider(window.ethereum)
        : null);
    if (!web3Provider || !account) {
      alert('Wallet not connected');
      return;
    }

    try {
      const signer = web3Provider.getSigner();
      const yoda   = new ethers.Contract(
        YODA_TOKEN_ADDRESS,
        YODA_TOKEN_ABI,
        signer
      );

      const tx = await yoda.sendMeFunds();
      await tx.wait();
      alert('YODA allowance received!');

      // Refresh balance
      const dec = await yoda.decimals();
      const raw = await yoda.balanceOf(account);
      setYodaBalance(ethers.utils.formatUnits(raw, dec));
    } catch (err) {
      console.error('Failed to request YODA', err);
      alert('Request failed: ' + (err.reason || err.message));
    }
  };

  
  const encryptData = (text, key) =>
    CryptoJS.AES.encrypt(text, key).toString();

  const decryptData = (ciphertext, key) => {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, key);
      const txt   = bytes.toString(CryptoJS.enc.Utf8);
      return txt.length > 0 ? txt : ciphertext;
    } catch {
      return ciphertext;
    }
  };


  const fetchRecord = async (id) => {
    const res = await contract.viewRecord(id);
    return {
      diagnosis:  res[0],
      medication: res[1],
      doctor:     res[2],
      timestamp:  new Date(res[3].toNumber() * 1000).toLocaleString(),
    };
  };

  
  const [patientAddr, setPatientAddr]       = useState('');
  const [diagnosis, setDiagnosis]           = useState('');
  const [medication, setMedication]         = useState('');
  const [patientLookup, setPatientLookup]   = useState('');
  const [patientTokens, setPatientTokens]   = useState([]);
  const [fetchedRecords, setFetchedRecords] = useState({});
  const [myTokens, setMyTokens]             = useState([]);
  const [myRecords, setMyRecords]           = useState({});
  const [doctorToApprove, setDoctorToApprove] = useState('');

 
  useEffect(() => {
    if (role === 2) {
      (async () => {
        try {
          const tokensBN = await contract.getTokensByPatient(account);
          const tokens   = tokensBN.map(t => t.toNumber());
          setMyTokens(tokens);

          const recs     = {};
          const secretKey = account.toLowerCase();
          for (let id of tokens) {
            const raw = await fetchRecord(id);
            recs[id] = {
              diagnosis:  decryptData(raw.diagnosis,  secretKey),
              medication: decryptData(raw.medication, secretKey),
              doctor:     raw.doctor,
              timestamp:  raw.timestamp,
            };
          }
          setMyRecords(recs);
        } catch (err) {
          console.error('Failed to load & decrypt patient records:', err);
        }
      })();
    }
 
  }, [role, account, contract]);


  const mintRecord = async () => {
    try {
      const to       = ethers.utils.getAddress(patientAddr);
      const approved = await contract.isApprovedByPatient(to, account);
      if (!approved) {
        alert('You are not approved by this patient to mint a record.');
        return;
      }

      const secretKey          = to.toLowerCase();
      const encryptedDiagnosis  = encryptData(diagnosis,  secretKey);
      const encryptedMedication = encryptData(medication, secretKey);

      const tx = await contract.mintRecord(
        to,
        encryptedDiagnosis,
        encryptedMedication
      );
      await tx.wait();

      alert(`Encrypted record minted for ${to}`);
      setPatientAddr(''); setDiagnosis(''); setMedication('');
    } catch (err) {
      alert('Minting failed: ' + err.message);
    }
  };

  
  const lookupPatientTokens = async () => {
    try {
      const patient  = ethers.utils.getAddress(patientLookup);
      const approved = await contract.isApprovedByPatient(patient, account);
      if (!approved) {
        alert('You are not approved by this patient to view their records.');
        return;
      }

      const tokensBN = await contract.getTokensByPatient(patient);
      setPatientTokens(tokensBN.map(t => t.toNumber()));
      setFetchedRecords({});
    } catch (err) {
      alert('Lookup failed: ' + err.message);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const raw       = await fetchRecord(id);
      const secretKey = patientLookup.toLowerCase();
      const rec       = {
        diagnosis:  decryptData(raw.diagnosis,  secretKey),
        medication: decryptData(raw.medication, secretKey),
        doctor:     raw.doctor,
        timestamp:  raw.timestamp,
      };
      setFetchedRecords(r => ({ ...r, [id]: rec }));
    } catch (err) {
      alert('Failed to view record: ' + err.message);
    }
  };

  //approve / revoke doctor 
  const approveDoctor = async () => {
    try {
      const doc = ethers.utils.getAddress(doctorToApprove);
      await (await contract.approveDoctor(doc)).wait();
      alert(`Doctor ${doc} approved`);
      setDoctorToApprove('');
    } catch (err) {
      alert('Approve failed: ' + err.message);
    }
  };

  const revokeDoctor = async () => {
    try {
      const doc = ethers.utils.getAddress(doctorToApprove);
      await (await contract.revokeDoctor(doc)).wait();
      alert(`Doctor ${doc} revoked`);
      setDoctorToApprove('');
    } catch (err) {
      alert('Revoke failed: ' + err.message);
    }
  };

  
  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h2>MediVault Dashboard</h2>
          <p><strong>Account:</strong> {account}</p>
          <p><strong>Role:</strong> {role === 1 ? 'Doctor' : 'Patient'}</p>
          <p><strong>YODA Balance:</strong> {yodaBalance} YODA</p>
          <button onClick={requestYoda}>Request YODA</button>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

   
      {role === 1 && (
        <>

        </>
      )}

      {/* Patient UI */}
      {role === 2 && (
        <div className="panel">
        </div>
      )}
    </div>
  );
}
