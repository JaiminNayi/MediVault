import React, { useState } from 'react';
import './registration.css';

export default function Registration({ contract, onRegister }) {
  const [doctorCode, setDoctorCode] = useState('');
  const [loading, setLoading]       = useState(false);

  const registerDoctor = async () => {
    setLoading(true);
    try {
      const tx = await contract.registerAsDoctor(doctorCode);
      await tx.wait();
      onRegister(1); // Doctor
    } catch (err) {
      alert('Doctor registration failed:\n' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const registerPatient = async () => {
    setLoading(true);
    try {
      const tx = await contract.registerAsPatient();
      await tx.wait();
      onRegister(2); // Patient
    } catch (err) {
      alert('Patient registration failed:\n' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-page">
      <div className="registration-card">
        <h2>MediVault Registration</h2>
        <p>Please choose your role to continue</p>

        <div className="field-group">
          <input
            type="text"
            placeholder="Doctor Registration Code"
            value={doctorCode}
            onChange={e => setDoctorCode(e.target.value)}
            disabled={loading}
          />
          <button
            className="action-btn"
            onClick={registerDoctor}
            disabled={loading}
          >
            {loading ? 'Registering…' : 'Register as Doctor'}
          </button>
        </div>

        <div className="field-group">
          <button
            className="action-btn"
            onClick={registerPatient}
            disabled={loading}
          >
            {loading ? 'Registering…' : 'Register as Patient'}
          </button>
        </div>
      </div>
    </div>
  );
}
