import { useState } from 'react';
import { ethers } from 'ethers';
import HealthRecordsAbi from './HealthRecordsAbi.json';
import './App.css'; // Import the new CSS file

const contractAddress = "0xdDfC4f9211f9bC5066C536717aeEB42fD82a3C95";

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Form inputs
  const [providerName, setProviderName] = useState('');
  const [providerSpecialty, setProviderSpecialty] = useState('');
  const [accessAddress, setAccessAddress] = useState('');
  const [addRecordPatient, setAddRecordPatient] = useState('');
  const [addRecordDesc, setAddRecordDesc] = useState('');
  const [addRecordIpfs, setAddRecordIpfs] = useState('');
  const [viewRecordsPatient, setViewRecordsPatient] = useState('');

  // Data display
  const [patientRecords, setPatientRecords] = useState([]);

  // --- Helper Functions ---
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleAction = async (action, successMessage) => {
    setLoading(true);
    try {
      const tx = await action();
      await tx.wait();
      showToast(successMessage, 'success');
      return true;
    } catch (err) {
      console.error(err);
      showToast(err.reason || "An error occurred.", 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // --- Wallet & Contract Functions ---
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        showToast("MetaMask is not installed.", 'error');
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const healthContract = new ethers.Contract(contractAddress, HealthRecordsAbi.abi, signer);
      
      setAccount(address);
      setContract(healthContract);
      showToast("Wallet connected successfully!", 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to connect wallet.", 'error');
    }
  };

  const handleRegisterProvider = async (e) => {
    e.preventDefault();
    const success = await handleAction(
      () => contract.registerProvider(providerName, providerSpecialty),
      "Provider registered successfully!"
    );
    if (success) {
      setProviderName('');
      setProviderSpecialty('');
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(accessAddress)) { showToast("Invalid provider address.", 'error'); return; }
    const success = await handleAction(
      () => contract.grantAccess(accessAddress),
      "Access granted successfully!"
    );
    if (success) setAccessAddress('');
  };
  
  const handleRevokeAccess = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(accessAddress)) { showToast("Invalid provider address.", 'error'); return; }
    const success = await handleAction(
      () => contract.revokeAccess(accessAddress),
      "Access revoked successfully!"
    );
    if (success) setAccessAddress('');
  };
  
  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(addRecordPatient)) { showToast("Invalid patient address.", 'error'); return; }
    const success = await handleAction(
      () => contract.addRecord(addRecordPatient, addRecordDesc, addRecordIpfs),
      "Record added successfully!"
    );
    if (success) {
      setAddRecordPatient('');
      setAddRecordDesc('');
      setAddRecordIpfs('');
    }
  };

  const handleViewRecords = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(viewRecordsPatient)) { showToast("Invalid patient address.", 'error'); return; }
    setLoading(true);
    setPatientRecords([]);
    try {
      const count = await contract.getRecordCount(viewRecordsPatient);
      let records = [];
      for (let i = 0; i < count; i++) {
        const record = await contract.getRecord(viewRecordsPatient, i);
        records.push({
          description: record.description,
          ipfsHash: record.ipfsHash,
          timestamp: new Date(Number(record.timestamp) * 1000).toLocaleString(),
          uploadedBy: record.uploadedBy,
        });
      }
      setPatientRecords(records);
      if (count == 0) showToast("No records found for this patient.", 'success');
    } catch (err) {
      console.error(err);
      showToast(err.reason || "Failed to fetch records.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {toast.show && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <nav className="navbar">
        <h1 className="navbar-title">HealthChain</h1>
        {account ? (
          <div className="btn" style={{ cursor: 'default', backgroundColor: '#414868' }}>
            {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
          </div>
        ) : (
          <button onClick={connectWallet} className="btn btn-primary">Connect Wallet</button>
        )}
      </nav>
      
      <main className="main-content">
        {!account ? (
          <div className="welcome-message">
            <h2>Welcome to the Future of Health Records</h2>
            <p>Please connect your wallet to manage your records securely.</p>
          </div>
        ) : (
          <>
            <div className="actions-grid">
              {/* --- Patient Actions Card --- */}
              <div className="card">
                <h3 className="card-title">Patient Actions</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="form-group">
                    <label>Provider Address to Manage</label>
                    <input type="text" placeholder="0x..." value={accessAddress} onChange={(e) => setAccessAddress(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleGrantAccess} disabled={loading} className="btn btn-success">
                      {loading ? <div className="spinner"></div> : 'Grant Access'}
                    </button>
                    <button onClick={handleRevokeAccess} disabled={loading} className="btn btn-danger">
                      {loading ? <div className="spinner"></div> : 'Revoke Access'}
                    </button>
                  </div>
                </form>
              </div>

              {/* --- Provider Actions Card --- */}
              <div className="card">
                <h3 className="card-title">Provider Actions</h3>
                <form onSubmit={handleRegisterProvider}>
                  <div className="form-group">
                    <label>Provider Name</label>
                    <input type="text" placeholder="e.g., General Hospital" value={providerName} onChange={(e) => setProviderName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Specialty</label>
                    <input type="text" placeholder="e.g., Cardiology" value={providerSpecialty} onChange={(e) => setProviderSpecialty(e.target.value)} />
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? <div className="spinner"></div> : 'Register as Provider'}
                  </button>
                </form>
                <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border-color)'}} />
                <form onSubmit={handleAddRecord}>
                   <div className="form-group">
                    <label>Patient Address to Add Record For</label>
                    <input type="text" placeholder="0x..." value={addRecordPatient} onChange={(e) => setAddRecordPatient(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Record Description</label>
                    <input type="text" placeholder="e.g., Annual Blood Test" value={addRecordDesc} onChange={(e) => setAddRecordDesc(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>IPFS Hash of Encrypted Record</label>
                    <input type="text" placeholder="Qm..." value={addRecordIpfs} onChange={(e) => setAddRecordIpfs(e.target.value)} />
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? <div className="spinner"></div> : 'Add Record'}
                  </button>
                </form>
              </div>
            </div>

            {/* --- Records Display Section --- */}
            <div className="card records-section">
              <h3 className="card-title">View Patient Records</h3>
              <form onSubmit={handleViewRecords} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <input type="text" placeholder="Enter Patient Address to View" value={viewRecordsPatient} onChange={(e) => setViewRecordsPatient(e.target.value)} />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: 'auto' }}>
                  {loading ? <div className="spinner"></div> : 'Fetch Records'}
                </button>
              </form>
              <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border-color)'}} />
              <div className="records-list">
                {patientRecords.length > 0 ? (
                  patientRecords.map((record, index) => (
                    <div key={index} className="record-item">
                      <p><strong>Description:</strong> {record.description}</p>
                      <p><strong>Uploaded By:</strong> {record.uploadedBy}</p>
                      <p><strong>Timestamp:</strong> {record.timestamp}</p>
                      <p className="ipfs-hash"><strong>IPFS Hash:</strong> {record.ipfsHash}</p>
                    </div>
                  ))
                ) : (
                  <p>No records to display. Enter an address and click "Fetch Records".</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;