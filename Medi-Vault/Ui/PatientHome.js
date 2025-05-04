// src/PatientHome.js
import React, { useState, useEffect } from 'react';
import { ethers }       from 'ethers';
import CryptoJS         from 'crypto-js';
import {
  YODA_TOKEN_ADDRESS,
  YODA_TOKEN_ABI
} from './constants.js';
import './home.css';

const PAID_KEY      = 'paidRecords';
const APPROVED_KEY = 'approvedDoctors';

export default function PatientHome({
  account,
  contract,    
  provider,
  onLogout
}) {

  const [yodaBalance, setYodaBalance]             = useState('0');
  const [myTokens, setMyTokens]                   = useState([]);
  const [unlockedRecords, setUnlockedRecords]     = useState({}); 
  const [approvedDoctors, setApprovedDoctors]     = useState([]); 
  const [doctorToApprove, setDoctorToApprove]     = useState('');
  const [doctorName, setDoctorName]               = useState('');

  useEffect(() => {
    if (!account || !contract) return;
    (async () => {
      const idsBN = await contract.getTokensByPatient(account);
      setMyTokens(idsBN.map(bn => bn.toNumber()));
    })().catch(console.error);
  }, [account, contract]);


  useEffect(() => {
    if (!account || myTokens.length === 0) return;

    const paidIds = JSON.parse(localStorage.getItem(PAID_KEY) || '[]');
    if (paidIds.length === 0) return;

    const web3Provider = provider ||
      (window.ethereum && new ethers.providers.Web3Provider(window.ethereum));
    if (!web3Provider) return;

    (async () => {
      const key = account.toLowerCase();
      const newRecs = {};
      for (let id of paidIds) {
        
        if (!myTokens.includes(id) || unlockedRecords[id]) continue;
        try {
          const res = await contract.viewRecord(id);
          const raw = {
            diagnosis:  res[0],
            medication: res[1],
            doctor:     res[2],
            timestamp:  new Date(res[3].toNumber() * 1000).toLocaleString()
          };
          newRecs[id] = {
            diagnosis:  CryptoJS.AES.decrypt(raw.diagnosis, key)
                          .toString(CryptoJS.enc.Utf8) || raw.diagnosis,
            medication: CryptoJS.AES.decrypt(raw.medication, key)
                          .toString(CryptoJS.enc.Utf8) || raw.medication,
            doctor:     raw.doctor,
            timestamp:  raw.timestamp
          };
        } catch (e) {
          console.error(`Failed to decrypt record ${id}`, e);
        }
      }
      if (Object.keys(newRecs).length) {
        setUnlockedRecords(r => ({ ...r, ...newRecs }));
      }
    })();
  
  }, [account, myTokens]);

  
  useEffect(() => {
    const raw = localStorage.getItem(APPROVED_KEY) || '[]';
    try {
      setApprovedDoctors(JSON.parse(raw));
    } catch {
      setApprovedDoctors([]);
    }
  }, []);


  useEffect(() => {
    if (!account) return;
    const web3Provider = provider ||
      (window.ethereum && new ethers.providers.Web3Provider(window.ethereum));
    if (!web3Provider) return;

    (async () => {
      const yoda = new ethers.Contract(
        YODA_TOKEN_ADDRESS,
        YODA_TOKEN_ABI,
        web3Provider
      );
      const dec = await yoda.decimals();
      const raw = await yoda.balanceOf(account);
      setYodaBalance(ethers.utils.formatUnits(raw, dec));
    })().catch(console.error);
  }, [account, provider]);

  
  const unlockRecord = async (id) => {
    const web3Provider = provider ||
      (window.ethereum && new ethers.providers.Web3Provider(window.ethereum));
    if (!web3Provider) {
      alert('Wallet not connected');
      return;
    }
    const signer = web3Provider.getSigner();
    const yoda   = new ethers.Contract(
      YODA_TOKEN_ADDRESS,
      YODA_TOKEN_ABI,
      signer
    );

    try {
    
      const res    = await contract.viewRecord(id);
      const doctor = res[2];


      const dec       = await yoda.decimals();
      const feeAmount = ethers.utils.parseUnits('10', dec);
      const txFee     = await yoda.transfer(doctor, feeAmount);
      await txFee.wait();


      const rawBal = await yoda.balanceOf(account);
      setYodaBalance(ethers.utils.formatUnits(rawBal, dec));

 
      const raw = {
        diagnosis:  res[0],
        medication: res[1],
        doctor,
        timestamp:  new Date(res[3].toNumber() * 1000).toLocaleString()
      };
      const key = account.toLowerCase();
      const rec = {
        diagnosis:  CryptoJS.AES.decrypt(raw.diagnosis, key)
                      .toString(CryptoJS.enc.Utf8) || raw.diagnosis,
        medication: CryptoJS.AES.decrypt(raw.medication, key)
                      .toString(CryptoJS.enc.Utf8) || raw.medication,
        doctor:     raw.doctor,
        timestamp:  raw.timestamp
      };

    
      setUnlockedRecords(r => ({ ...r, [id]: rec }));
      const paid = JSON.parse(localStorage.getItem(PAID_KEY) || '[]');
      if (!paid.includes(id)) {
        paid.push(id);
        localStorage.setItem(PAID_KEY, JSON.stringify(paid));
      }
    } catch (err) {
      console.error('Unlock failed', err);
      alert('Could not unlock record: ' + (err.reason || err.message));
    }
  };

  
  const approveDoctor = async () => {
    try {
      const addr = ethers.utils.getAddress(doctorToApprove.trim());
      // on-chain
      const tx = await contract.approveDoctor(addr);
      await tx.wait();
      // local
      const updated = [...approvedDoctors, { address: addr, name: doctorName }];
      setApprovedDoctors(updated);
      localStorage.setItem(APPROVED_KEY, JSON.stringify(updated));
      setDoctorToApprove('');
      setDoctorName('');
    } catch (err) {
      alert('Approve failed: ' + err.message);
    }
  };

  const revokeDoctor = async (addr) => {
    try {
      await (await contract.revokeDoctor(addr)).wait();
      const updated = approvedDoctors.filter(d => d.address !== addr);
      setApprovedDoctors(updated);
      localStorage.setItem(APPROVED_KEY, JSON.stringify(updated));
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
          <p><strong>Role:</strong> Patient</p>
          <p><strong>YODA Balance:</strong> {yodaBalance} YODA</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>

      <div className="panel">
        <h3>Your Health Records</h3>
        {myTokens.length === 0 ? (
          <p>No records found.</p>
        ) : (
          <ul className="token-list">
            {myTokens.map(id => {
              const rec = unlockedRecords[id];
              return (
                <li key={id} className="record-item">
                  {rec ? (
                    <div className="record-card">
                      <p><strong>Token #{id}</strong></p>
                      <p><strong>Diagnosis:</strong> {rec.diagnosis}</p>
                      <p><strong>Medication:</strong> {rec.medication}</p>
                      <p><strong>Doctor:</strong> {rec.doctor}</p>
                      <p><strong>When:</strong> {rec.timestamp}</p>
                    </div>
                  ) : (
                    <div className="locked-card">
                      <p><strong>Token #{id}</strong></p>
                      <button onClick={() => unlockRecord(id)}>
                        🔒 Unlock for 10 YODA
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <hr/>

      <div className="panel">
        <h3>Approve / Revoke Doctor</h3>

        <div className="field-group">
          <input
            type="text"
            placeholder="Doctor Address"
            value={doctorToApprove}
            onChange={e => setDoctorToApprove(e.target.value)}
          />
          <input
            type="text"
            placeholder="Doctor Name"
            value={doctorName}
            onChange={e => setDoctorName(e.target.value)}
          />
          <button onClick={approveDoctor}>Approve</button>
        </div>

        <ul className="doc-list">
          {approvedDoctors.map(doc => (
            <li key={doc.address}>
              <span>{doc.name} ({doc.address})</span>
              <button
                className="danger"
                onClick={() => revokeDoctor(doc.address)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
