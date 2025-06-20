import { useState, useEffect } from "react";
import { ethers } from "ethers";
import HealthRecordsAbi from "./HealthRecordsAbi.json";
import "./App.css";

// --- Configuration ---
const contractAddress = "0xdDfC4f9211f9bC5066C536717aeEB42fD82a3C95";

// --- SVG Icon Components (for a clean UI) ---
const Icon = ({ path }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);
const UserPlusIcon = () => (
  <Icon path="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
);
const LockOpenIcon = () => (
  <Icon path="M13.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H4.5a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
);
const DocumentTextIcon = () => (
  <Icon path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
);
const HistoryIcon = () => (
  <Icon path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
);
const getActivityIcon = (type) => {
  switch (type) {
    case "grant":
      return <LockOpenIcon />;
    case "revoke":
      return (
        <Icon path="M12 15v2m-6.5-2h13A2.5 2.5 0 0021 12.5v-6.5A2.5 2.5 0 0018.5 3.5h-13A2.5 2.5 0 003 6v6.5A2.5 2.5 0 005.5 15z" />
      );
    case "add_record":
      return <DocumentTextIcon />;
    case "receive_access":
      return (
        <Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      );
    default:
      return <HistoryIcon />;
  }
};

function App() {
  // --- State Management ---
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [activityLog, setActivityLog] = useState([]);
  const [patientRecords, setPatientRecords] = useState([]);

  // Form Input States
  const [providerName, setProviderName] = useState("");
  const [providerSpecialty, setProviderSpecialty] = useState("");
  const [accessAddress, setAccessAddress] = useState("");
  const [addRecordPatient, setAddRecordPatient] = useState("");
  const [addRecordDesc, setAddRecordDesc] = useState("");
  const [addRecordIpfs, setAddRecordIpfs] = useState("");
  const [viewRecordsPatient, setViewRecordsPatient] = useState("");

  // --- Effects ---
  // This effect runs when the user connects their wallet, fetching initial data.
  useEffect(() => {
    const loadInitialData = async () => {
      if (contract && account) {
        setLoading(true);
        await fetchActivityLog(contract, account);
        setLoading(false);
      }
    };
    loadInitialData();
  }, [contract, account]);

  // --- Helper Functions ---
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Generic wrapper for handling contract transactions to reduce boilerplate
  const handleAction = async (action, successMessage) => {
    setLoading(true);
    try {
      const tx = await action();
      await tx.wait();
      showToast(successMessage, "success");
      fetchActivityLog(contract, account); // Refresh activity log after successful action
      return true;
    } catch (err) {
      console.error(err);
      showToast(err.reason || "An error occurred.", "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // --- Core Logic Functions ---
  const connectWallet = async () => {
    try {
      if (!window.ethereum)
        return showToast("MetaMask is not installed.", "error");
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
      showToast("Wallet connected!", "success");
    } catch (err) {
      showToast("Failed to connect wallet.", "error");
    }
  };

  const fetchActivityLog = async (contractInstance, userAddress) => {
    const filters = {
      grantedToYou: contractInstance.filters.AccessGranted(null, userAddress),
      grantedByYou: contractInstance.filters.AccessGranted(userAddress),
      revokedByYou: contractInstance.filters.AccessRevoked(userAddress),
      recordAddedToYourFile: contractInstance.filters.RecordAdded(userAddress),
    };

    const logsPromises = Object.entries(filters).map(([key, filter]) =>
      contractInstance.queryFilter(filter, 0, "latest")
    );
    const allLogs = await Promise.all(logsPromises);

    const processLogs = (logs, type) =>
      Promise.all(
        logs.map(async (log) => {
          const block = await log.getBlock();
          let message = "";
          switch (type) {
            case "receive_access":
              message = `Patient ${log.args.patientAddress.substring(
                0,
                6
              )}... gave you access.`;
              break;
            case "grant":
              message = `You granted access to Provider ${log.args.providerAddress.substring(
                0,
                6
              )}...`;
              break;
            case "revoke":
              message = `You revoked access from Provider ${log.args.providerAddress.substring(
                0,
                6
              )}...`;
              break;
            case "add_record":
              message = `A new record was added by ${
                log.args.uploadedBy === userAddress
                  ? "you"
                  : `Provider ${log.args.uploadedBy.substring(0, 6)}...`
              }`;
              break;
            default:
              break;
          }
          return {
            type,
            message,
            timestamp: block.timestamp,
            key: log.transactionHash + log.logIndex,
          };
        })
      );

    const [grantedToYou, grantedByYou, revokedByYou, recordsAdded] =
      await Promise.all([
        processLogs(allLogs[0], "receive_access"),
        processLogs(allLogs[1], "grant"),
        processLogs(allLogs[2], "revoke"),
        processLogs(allLogs[3], "add_record"),
      ]);

    const combinedLogs = [
      ...grantedToYou,
      ...grantedByYou,
      ...revokedByYou,
      ...recordsAdded,
    ];
    combinedLogs.sort((a, b) => b.timestamp - a.timestamp);
    setActivityLog(combinedLogs);
  };

  const handleRegisterProvider = async (e) => {
    e.preventDefault();
    const success = await handleAction(
      () => contract.registerProvider(providerName, providerSpecialty),
      "Provider registered!"
    );
    if (success) {
      setProviderName("");
      setProviderSpecialty("");
    }
  };

  const handleAccessAction = async (actionType) => {
    if (!ethers.isAddress(accessAddress))
      return showToast("Invalid provider address.", "error");
    if (actionType === "grant") {
      await handleAction(
        () => contract.grantAccess(accessAddress),
        "Access granted!"
      );
    } else {
      await handleAction(
        () => contract.revokeAccess(accessAddress),
        "Access revoked!"
      );
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(addRecordPatient))
      return showToast("Invalid patient address.", "error");
    const success = await handleAction(
      () => contract.addRecord(addRecordPatient, addRecordDesc, addRecordIpfs),
      "Record added!"
    );
    if (success) {
      setAddRecordPatient("");
      setAddRecordDesc("");
      setAddRecordIpfs("");
    }
  };

  const handleViewRecords = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(viewRecordsPatient))
      return showToast("Invalid patient address.", "error");
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
      if (count == 0)
        showToast("No records found for this patient.", "success");
    } catch (err) {
      showToast(err.reason || "Failed to fetch records.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
      <nav className="navbar">
        <h1 className="navbar-title">HealthChain</h1>
        {!account && (
          <button onClick={connectWallet} className="btn btn-primary">
            Connect Wallet
          </button>
        )}
      </nav>

      <main className="main-content">
        {!account ? (
          <div className="hero slide-in">
            <h2>The Future of Health Records, Secured by Blockchain.</h2>
            <p>Connect your wallet to take control of your medical data.</p>
          </div>
        ) : (
          <>
            <div className="hero slide-in">
              <h2>Welcome Back!</h2>
              <p
                style={{
                  color: "var(--primary-accent)",
                  fontFamily: "monospace",
                }}
              >
                {account}
              </p>
            </div>

            <div className="actions-grid">
              {/* Patient Card */}
              <div
                className="card slide-in"
                style={{ animationDelay: "100ms" }}
              >
                <h3 className="card-title">
                  <LockOpenIcon /> Patient Controls
                </h3>
                <div className="form-container">
                  <div className="form-group">
                    <label>Manage Provider Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={accessAddress}
                      onChange={(e) => setAccessAddress(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      onClick={() => handleAccessAction("grant")}
                      disabled={loading}
                      className="btn btn-success"
                      style={{ flex: 1 }}
                    >
                      {loading ? <div className="spinner"></div> : "Grant"}
                    </button>
                    <button
                      onClick={() => handleAccessAction("revoke")}
                      disabled={loading}
                      className="btn btn-danger"
                      style={{ flex: 1 }}
                    >
                      {loading ? <div className="spinner"></div> : "Revoke"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Provider Card */}
              <div
                className="card slide-in"
                style={{ animationDelay: "200ms" }}
              >
                <h3 className="card-title">
                  <UserPlusIcon /> Provider Actions
                </h3>
                <div className="form-container">
                  <form
                    onSubmit={handleRegisterProvider}
                    className="form-container"
                  >
                    <div className="form-group">
                      <label>Provider Name</label>
                      <input
                        type="text"
                        placeholder="e.g., General Hospital"
                        value={providerName}
                        onChange={(e) => setProviderName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Specialty</label>
                      <input
                        type="text"
                        placeholder="e.g., Cardiology"
                        value={providerSpecialty}
                        onChange={(e) => setProviderSpecialty(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-secondary"
                    >
                      {loading ? <div className="spinner"></div> : "Register"}
                    </button>
                  </form>
                  <div className="form-separator"></div>
                  <form onSubmit={handleAddRecord} className="form-container">
                    <div className="form-group">
                      <label>Patient Address</label>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={addRecordPatient}
                        onChange={(e) => setAddRecordPatient(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Record Description</label>
                      <input
                        type="text"
                        placeholder="e.g., Annual Blood Test"
                        value={addRecordDesc}
                        onChange={(e) => setAddRecordDesc(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>IPFS Hash</label>
                      <input
                        type="text"
                        placeholder="Qm..."
                        value={addRecordIpfs}
                        onChange={(e) => setAddRecordIpfs(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? <div className="spinner"></div> : "Add Record"}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Activity Log Section */}
            <div className="card slide-in" style={{ animationDelay: "300ms" }}>
              <h3 className="card-title">
                <HistoryIcon /> My Activity Log
              </h3>
              <div className="activity-list">
                {activityLog.length > 0 ? (
                  activityLog.map((log) => (
                    <div
                      key={log.key}
                      className={`activity-item type-${log.type}`}
                    >
                      <div className="activity-icon">
                        {getActivityIcon(log.type)}
                      </div>
                      <div className="activity-content">
                        <p className="activity-message">{log.message}</p>
                        <p className="activity-timestamp">
                          {new Date(log.timestamp * 1000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <HistoryIcon />
                    <p>Your activity will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* View Records Section */}
            <div
              className="records-container card slide-in"
              style={{ animationDelay: "400ms", marginTop: "2.5rem" }}
            >
              <h3 className="card-title">
                <DocumentTextIcon /> View Patient Records
              </h3>
              <form
                onSubmit={handleViewRecords}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                  marginBottom: "2rem",
                }}
              >
                <input
                  type="text"
                  placeholder="Enter Patient Address to View"
                  value={viewRecordsPatient}
                  onChange={(e) => setViewRecordsPatient(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: "auto" }}
                >
                  {loading ? <div className="spinner"></div> : "Fetch"}
                </button>
              </form>
              <div className="records-list">
                {patientRecords.length > 0 ? (
                  patientRecords.map((record, index) => (
                    <div key={index} className="record-item">
                      <div className="record-header">
                        <strong>{record.description}</strong>
                        <span>{record.timestamp}</span>
                      </div>
                      <p>
                        <strong>Uploaded By:</strong> {record.uploadedBy}
                      </p>
                      <p className="ipfs-hash">
                        <strong>IPFS Hash:</strong> {record.ipfsHash}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <DocumentTextIcon />
                    <p>No records to display.</p>
                  </div>
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
