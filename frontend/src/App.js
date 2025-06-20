// src/App.jsx

import { useState } from "react";
import { ethers } from "ethers";
import HealthRecordsAbi from "./HealthRecordsAbi.json";

const contractAddress = "0xdDfC4f9211f9bC5066C536717aeEB42fD82a3C95";

// --- STYLING OBJECTS ---
const styles = {
  body: {
    fontFamily: "sans-serif",
    backgroundColor: "#f0f2f5",
    color: "#333",
    margin: 0,
    minHeight: "100vh",
  },
  nav: {
    backgroundColor: "#ffffff",
    padding: "16px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  navTitle: { fontSize: "24px", fontWeight: "bold", color: "#007bff" },
  main: { maxWidth: "1200px", margin: "0 auto", padding: "32px" },
  grid: { display: "flex", flexWrap: "wrap", gap: "32px" },
  column: {
    flex: "1",
    minWidth: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "1px solid #eee",
  },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  button: {
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    color: "white",
    backgroundColor: "#007bff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  buttonDisabled: { backgroundColor: "#aaa", cursor: "not-allowed" },
  buttonGreen: { backgroundColor: "#28a745" },
  buttonRed: { backgroundColor: "#dc3545" },
  error: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "16px",
    textAlign: "center",
    marginTop: "16px",
    borderRadius: "4px",
  },
  recordItem: {
    backgroundColor: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #eee",
  },
  recordDescription: {
    fontWeight: "bold",
    color: "#007bff",
    margin: "0 0 8px 0",
  },
  recordDetails: {
    fontSize: "14px",
    color: "#666",
    wordBreak: "break-all",
    margin: "4px 0",
  },
};

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerSpecialty, setProviderSpecialty] = useState("");
  const [accessAddress, setAccessAddress] = useState("");
  const [addRecordPatient, setAddRecordPatient] = useState("");
  const [addRecordDesc, setAddRecordDesc] = useState("");
  const [addRecordIpfs, setAddRecordIpfs] = useState("");
  const [viewRecordsPatient, setViewRecordsPatient] = useState("");
  const [patientRecords, setPatientRecords] = useState([]);

  const connectWallet = async () => {
    /* ... (this function is correct from last step) ... */ try {
      if (!window.ethereum) {
        setError("MetaMask is not installed.");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const healthContract = new ethers.Contract(
        contractAddress,
        HealthRecordsAbi.abi,
        signer
      );
      setAccount(address);
      setContract(healthContract);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to connect wallet.");
    }
  };
  const handleRegisterProvider = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const tx = await contract.registerProvider(
        providerName,
        providerSpecialty
      );
      await tx.wait();
      alert("Provider registered!");
      setProviderName("");
      setProviderSpecialty("");
    } catch (err) {
      setError(err.reason || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(accessAddress)) {
      setError("Invalid address format. Please check the provider address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const tx = await contract.grantAccess(accessAddress);
      await tx.wait();
      alert("Access granted!");
      setAccessAddress("");
    } catch (err) {
      setError(err.reason || "Failed to grant access.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(accessAddress)) {
      setError("Invalid address format. Please check the provider address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const tx = await contract.revokeAccess(accessAddress);
      await tx.wait();
      alert("Access revoked!");
      setAccessAddress("");
    } catch (err) {
      setError(err.reason || "Failed to revoke access.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(addRecordPatient)) {
      setError("Invalid address format. Please check the patient address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const tx = await contract.addRecord(
        addRecordPatient,
        addRecordDesc,
        addRecordIpfs
      );
      await tx.wait();
      alert("Record added!");
      setAddRecordPatient("");
      setAddRecordDesc("");
      setAddRecordIpfs("");
    } catch (err) {
      setError(err.reason || "Failed to add record.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecords = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(viewRecordsPatient)) {
      setError("Invalid address format. Please check the patient address.");
      return;
    }
    setLoading(true);
    setError("");
    setPatientRecords([]);
    try {
      const count = await contract.getRecordCount(viewRecordsPatient);
      let records = [];
      for (let i = 0; i < count; i++) {
        const record = await contract.getRecord(viewRecordsPatient, i);
        records.push({
          description: record.description,
          ipfsHash: record.ipfsHash,
          timestamp: new Date(record.timestamp * 1000).toLocaleString(),
          uploadedBy: record.uploadedBy,
        });
      }
      setPatientRecords(records);
    } catch (err) {
      setError(err.reason || "Failed to fetch records.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // The JSX part is unchanged
    <div style={styles.body}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>HealthChain</h1>
        {account ? (
          <div
            style={{
              ...styles.button,
              backgroundColor: "#f0f2f5",
              color: "#333",
            }}
          >
            {" "}
            Connected:{" "}
            {`${account.substring(0, 6)}...${account.substring(
              account.length - 4
            )}`}{" "}
          </div>
        ) : (
          <button onClick={connectWallet} style={styles.button}>
            {" "}
            Connect Wallet{" "}
          </button>
        )}
      </nav>
      {error && <div style={styles.error}>{error}</div>}
      <main style={styles.main}>
        {!account ? (
          <div style={{ textAlign: "center" }}>
            {" "}
            <h2 style={{ fontSize: "28px", fontWeight: 300 }}>
              Please connect your wallet to continue.
            </h2>{" "}
          </div>
        ) : (
          <div style={styles.grid}>
            <div style={styles.column}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Register as a Provider</h3>
                <form onSubmit={handleRegisterProvider} style={styles.form}>
                  <input
                    type="text"
                    placeholder="Provider Name"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Specialty"
                    value={providerSpecialty}
                    onChange={(e) => setProviderSpecialty(e.target.value)}
                    style={styles.input}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.button,
                      ...(loading && styles.buttonDisabled),
                    }}
                  >
                    {loading ? "Processing..." : "Register"}
                  </button>
                </form>
              </div>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>
                  Manage Provider Access (Patient)
                </h3>
                <form style={styles.form}>
                  <input
                    type="text"
                    placeholder="Provider Address"
                    value={accessAddress}
                    onChange={(e) => setAccessAddress(e.target.value)}
                    style={styles.input}
                  />
                  <div style={{ display: "flex", gap: "16px" }}>
                    <button
                      onClick={handleGrantAccess}
                      disabled={loading}
                      style={{
                        ...styles.button,
                        ...styles.buttonGreen,
                        flex: 1,
                        ...(loading && styles.buttonDisabled),
                      }}
                    >
                      Grant
                    </button>
                    <button
                      onClick={handleRevokeAccess}
                      disabled={loading}
                      style={{
                        ...styles.button,
                        ...styles.buttonRed,
                        flex: 1,
                        ...(loading && styles.buttonDisabled),
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                </form>
              </div>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Add New Record (Provider)</h3>
                <form onSubmit={handleAddRecord} style={styles.form}>
                  <input
                    type="text"
                    placeholder="Patient Address"
                    value={addRecordPatient}
                    onChange={(e) => setAddRecordPatient(e.target.value)}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={addRecordDesc}
                    onChange={(e) => setAddRecordDesc(e.target.value)}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="IPFS Hash"
                    value={addRecordIpfs}
                    onChange={(e) => setAddRecordIpfs(e.target.value)}
                    style={styles.input}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.button,
                      ...(loading && styles.buttonDisabled),
                    }}
                  >
                    {loading ? "Processing..." : "Add Record"}
                  </button>
                </form>
              </div>
            </div>
            <div style={{ ...styles.column, flex: 1.5 }}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>View Patient Records</h3>
                <form
                  onSubmit={handleViewRecords}
                  style={{ display: "flex", gap: "8px", marginBottom: "24px" }}
                >
                  <input
                    type="text"
                    placeholder="Patient Address to View"
                    value={viewRecordsPatient}
                    onChange={(e) => setViewRecordsPatient(e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.button,
                      ...(loading && styles.buttonDisabled),
                    }}
                  >
                    Fetch
                  </button>
                </form>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    maxHeight: "500px",
                    overflowY: "auto",
                  }}
                >
                  {patientRecords.length === 0 ? (
                    <p>No records to display.</p>
                  ) : (
                    patientRecords.map((record, index) => (
                      <div key={index} style={styles.recordItem}>
                        <p style={styles.recordDescription}>
                          {record.description}
                        </p>
                        <p style={styles.recordDetails}>
                          <strong>IPFS Hash:</strong> {record.ipfsHash}
                        </p>
                        <p style={styles.recordDetails}>
                          <strong>Timestamp:</strong> {record.timestamp}
                        </p>
                        <p style={styles.recordDetails}>
                          <strong>Uploaded By:</strong> {record.uploadedBy}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
