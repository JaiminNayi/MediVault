import React, { useState } from 'react';
import Login from './Login';
import Registration from './Registration';
import DoctorHome from './DoctorHome';
import PatientHome from './PatientHome';
import './App.css';

function App() {
  const [account,  setAccount]  = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [role,     setRole]     = useState(0);   // 0 = unregistered, 1 = doctor, 2 = patient

  // Called by Login.js
  const handleConnect = ({ account, contract, provider, role }) => {
    setAccount(account);
    setContract(contract);
    setProvider(provider);
    setRole(role);
  };

  // Called by Registration.js
  const handleRegister = (newRole) => {
    setRole(newRole);
  };

  // Called by either home page
  const handleLogout = () => {
    setAccount(null);
    setContract(null);
    setProvider(null);
    setRole(0);
  };

  // 1) Not connected yet
  if (!account) {
    return (
      <div className="container">
        <Login onConnect={handleConnect} />
      </div>
    );
  }

  // 2) Connected but not registered
  if (role === 0) {
    return (
      <div className="container">
        <Registration
          contract={contract}
          onRegister={handleRegister}
        />
      </div>
    );
  }

  // 3) Registered: show role-specific home
  return (
    <div className="container">
      {role === 1 ? (
        <DoctorHome
          account={account}
          contract={contract}
          provider={provider}
          onLogout={handleLogout}
        />
      ) : (
        <PatientHome
          account={account}
          contract={contract}
          provider={provider}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
