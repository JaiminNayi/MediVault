import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import {
  YODA_TOKEN_ADDRESS,
  YODA_TOKEN_ABI
} from './constants.js';
import './home.css';

export default function DoctorHome({
  account,
  contract,    
  provider,
  onLogout
}) {
  //YODA Balance
  const [yodaBalance, setYodaBalance] = useState('0');

  useEffect(() => {
    const web3 = provider || (window.ethereum && new ethers.providers.Web3Provider(window.ethereum));
    if (!web3 || !account) return;

    (async () => {
      try {
        const yoda = new ethers.Contract(YODA_TOKEN_ADDRESS, YODA_TOKEN_ABI, web3.getSigner());
        const dec  = await yoda.decimals();
        const raw  = await yoda.balanceOf(account);
        setYodaBalance(ethers.utils.formatUnits(raw, dec));
      } catch (e) {
        console.error('YODA fetch error', e);
      }
    })();
  }, [provider, account]);


  const encryptData = (text, key) =>
    CryptoJS.AES.encrypt(text, key).toString();
  const decryptData = (cipher, key) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, key);
      const txt   = bytes.toString(CryptoJS.enc.Utf8);
      return txt || cipher;
    } catch {
      return cipher;
    }
  };


  const fetchRecord = async (id) => {
    const res = await contract.viewRecord(id);
    return {
      diagnosis:  res[0],
      medication: res[1],
      doctor:     res[2],
      timestamp:  new Date(res[3].toNumber() * 1000).toLocaleString()
    };
  };

  
  const [patientAddr, setPatientAddr]       = useState('');
  const [diagnosis, setDiagnosis]           = useState('');
  const [medication, setMedication]         = useState('');
  const [patientLookup, setPatientLookup]   = useState('');
  const [patientTokens, setPatientTokens]   = useState([]);
  const [fetchedRecords, setFetchedRecords] = useState({});

  const mintRecord = async () => {
    try {
      const to = ethers.utils.getAddress(patientAddr);
      if (!(await contract.isApprovedByPatient(to, account))) {
        alert('Not approved by this patient.');
        return;
      }
      const key = to.toLowerCase();
      const encD = encryptData(diagnosis, key);
      const encM = encryptData(medication, key);

      const tx = await contract.mintRecord(to, encD, encM);
      await tx.wait();
      alert(`Record minted for ${to}`);
      setPatientAddr(''); setDiagnosis(''); setMedication('');
    } catch (e) {
      alert('Mint failed: ' + e.message);
    }
  };

  const lookupPatientTokens = async () => {
    try {
      const patient = ethers.utils.getAddress(patientLookup);
      if (!(await contract.isApprovedByPatient(patient, account))) {
        alert('Not approved—cannot view.');
        return;
      }
      const ids   = (await contract.getTokensByPatient(patient)).map(bn => bn.toNumber());
      setPatientTokens(ids);
      setFetchedRecords({});
    } catch (e) {
      alert('Lookup failed: ' + e.message);
    }
  };

  const handleViewDetail = async (id) => {
    const raw = await fetchRecord(id);
    const key = patientLookup.toLowerCase();
    setFetchedRecords((r) => ({
      ...r,
      [id]: {
        diagnosis:  decryptData(raw.diagnosis, key),
        medication: decryptData(raw.medication, key),
        doctor:     raw.doctor,
        timestamp:  raw.timestamp
      }
    }));
  };


  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h2>MediVault Dashboard</h2>
          <p><strong>Account:</strong> {account}</p>
          <p><strong>Role:</strong> Doctor</p>
          <p><strong>YODA Balance:</strong> {yodaBalance} YODA</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>

      <div className="panel">
        <h3>Mint New Health Record</h3>
        <input
          placeholder="Patient Address"
          value={patientAddr}
          onChange={e => setPatientAddr(e.target.value)}
        />
        <input
          placeholder="Diagnosis"
          value={diagnosis}
          onChange={e => setDiagnosis(e.target.value)}
        />
        <input
          placeholder="Medication"
          value={medication}
          onChange={e => setMedication(e.target.value)}
        />
        <button onClick={mintRecord}>Mint Record</button>
      </div>

      <div className="panel">
        <h3>Lookup Patient Records</h3>
        <div className="field-group">
          <input
            placeholder="Patient Address"
            value={patientLookup}
            onChange={e => setPatientLookup(e.target.value)}
          />
          <button onClick={lookupPatientTokens}>Fetch Token IDs</button>
        </div>
        <ul className="token-list">
          {patientTokens.map(id => (
            <li key={id}>
              <span>Token #{id}</span>
              <button onClick={() => handleViewDetail(id)}>View & Decrypt</button>
              {fetchedRecords[id] && (
                <div className="record-card">
                  <p><strong>Diagnosis:</strong> {fetchedRecords[id].diagnosis}</p>
                  <p><strong>Medication:</strong> {fetchedRecords[id].medication}</p>
                  <p><strong>Doctor:</strong> {fetchedRecords[id].doctor}</p>
                  <p><strong>When:</strong> {fetchedRecords[id].timestamp}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
