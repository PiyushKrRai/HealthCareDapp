import { useState, useEffect } from "react";
import { ethers } from "ethers";
// 1. UPDATED PATH: Now correctly points to the ABI file inside the 'src' folder.
import HealthRecordsAbi from "./HealthRecordsAbi.json";
import "./App.css";

// --- Configuration ---
// IMPORTANT: Replace with the address of your NEWLY deployed contract on CoreDAO Testnet
const contractAddress = "0x9cDEFD4963e9CD527AabCd3b1aD07a7C0dc81CC7";

// --- SVG Icon Components ---
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
const ShieldCheckIcon = () => (
  <Icon path="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.017h-.008v-.017z" />
);

function App() {
  // --- State Management ---
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const [patientRecords, setPatientRecords] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);

  // Form Input States
  const [providerName, setProviderName] = useState("");
  const [providerSpecialty, setProviderSpecialty] = useState("");
  const [accessAddress, setAccessAddress] = useState("");
  const [addRecordPatient, setAddRecordPatient] = useState("");
  const [addRecordDesc, setAddRecordDesc] = useState("");
  const [addRecordIpfs, setAddRecordIpfs] = useState("");
  const [viewRecordsPatient, setViewRecordsPatient] = useState("");

  // --- Effects ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (contract && account) {
        setLoading(true);
        try {
          const ownerAddress = await contract.owner();
          const isUserOwner =
            ownerAddress.toLowerCase() === account.toLowerCase();
          setIsOwner(isUserOwner);

          if (isUserOwner) {
            await fetchPendingProviders(contract);
          }
        } catch (err) {
          console.error("Failed to load initial data:", err);
          showToast("Could not load contract data.", "error");
        }
        setLoading(false);
      }
    };
    loadInitialData();
  }, [contract, account]);

  // --- Helper Functions ---
  const showToast = (message, type = "info", duration = 4000) => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "" }),
      duration
    );
  };

  const handleAction = async (action, successMessage) => {
    if (!contract) return showToast("Contract not connected.", "error");
    setLoading(true);
    let success = false;
    try {
      const tx = await action();
      await tx.wait();
      showToast(successMessage, "success");
      success = true;
    } catch (err) {
      const errorMessage = err.reason || err.data?.message || err.message;
      showToast(errorMessage, "error");
      console.error(err);
    } finally {
      setLoading(false);
      return success;
    }
  };

  // --- Core Logic Functions ---
  const connectWallet = async () => {
    try {
      if (!window.ethereum)
        return showToast("MetaMask is not installed.", "error");

      const provider = new ethers.BrowserProvider(window.ethereum);
      // Request accounts which also prompts the user to connect
      await provider.send("eth_requestAccounts", []);

      // Attempt to switch to CoreDAO Testnet (chain ID 1115)
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x45B" }], // 0x45B is hex for 1115
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          showToast("Please add CoreDAO Testnet to MetaMask.", "info");
        } else {
          throw switchError;
        }
      }

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
      showToast(err.message, "error");
    }
  };

  const fetchPendingProviders = async (contractInstance) => {
    const filter = contractInstance.filters.ProviderRequestedRegistration();
    const logs = await contractInstance.queryFilter(filter, 0, "latest");

    const pending = [];
    for (const log of logs) {
      const providerDetails = await contractInstance.providers(
        log.args.providerAddress
      );
      if (!providerDetails.isApproved) {
        pending.push({
          address: log.args.providerAddress,
          name: log.args.name,
          specialty: log.args.specialty,
        });
      }
    }
    setPendingProviders(pending.reverse()); // Show newest requests first
  };

  const handleApproveProvider = async (providerAddress) => {
    const success = await handleAction(
      () => contract.approveProvider(providerAddress),
      "Provider approved successfully!"
    );
    if (success) {
      await fetchPendingProviders(contract); // Refresh the list
    }
  };

  const handleRequestRegistration = async (e) => {
    e.preventDefault();
    const success = await handleAction(
      () =>
        contract.requestProviderRegistration(providerName, providerSpecialty),
      "Registration requested! An admin must approve it."
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
      "Record added successfully!"
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
      const records = await contract.getRecords(viewRecordsPatient, 1, 100); // Fetch page 1, up to 100 records

      const formattedRecords = records.map((record) => ({
        description: record.description,
        ipfsHash: record.ipfsHash,
        timestamp: new Date(Number(record.timestamp) * 1000).toLocaleString(),
        uploadedBy: record.uploadedBy,
      }));

      setPatientRecords(formattedRecords.reverse()); // Show newest first
      if (records.length === 0)
        showToast("No records found for this patient.", "info");
    } catch (err) {
      const errorMessage =
        err.reason || err.data?.message || "Failed to fetch records.";
      showToast(errorMessage, "error");
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
        {!account ? (
          <button onClick={connectWallet} className="btn btn-primary">
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            Connected:{" "}
            <span>
              {account.substring(0, 6)}...{account.substring(38)}
            </span>
          </div>
        )}
      </nav>

      <main className="main-content">
        {!account ? (
          <div className="hero slide-in">
            <h2>Secure, Sovereign Health Records on CoreDAO.</h2>
            <p>Connect your wallet to begin.</p>
          </div>
        ) : (
          <>
            {isOwner && (
              <div
                className="card admin-panel slide-in"
                style={{ animationDelay: "50ms" }}
              >
                <h3 className="card-title">
                  <ShieldCheckIcon /> Admin Panel
                </h3>
                <p className="admin-subtitle">Provider Registration Requests</p>
                <div className="pending-list">
                  {pendingProviders.length > 0 ? (
                    pendingProviders.map((p) => (
                      <div key={p.address} className="pending-item">
                        <div className="pending-info">
                          <strong>{p.name}</strong> ({p.specialty})
                          <span>{p.address}</span>
                        </div>
                        <button
                          onClick={() => handleApproveProvider(p.address)}
                          className="btn btn-success"
                          disabled={loading}
                        >
                          Approve
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No pending provider requests.</p>
                  )}
                </div>
              </div>
            )}

            <div className="actions-grid">
              <div
                className="card slide-in"
                style={{ animationDelay: "100ms" }}
              >
                <h3 className="card-title">
                  <LockOpenIcon /> Patient Controls
                </h3>
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
                    Grant Access
                  </button>
                  <button
                    onClick={() => handleAccessAction("revoke")}
                    disabled={loading}
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                  >
                    Revoke Access
                  </button>
                </div>
              </div>

              <div
                className="card slide-in"
                style={{ animationDelay: "200ms" }}
              >
                <h3 className="card-title">
                  <UserPlusIcon /> Provider Actions
                </h3>
                <form
                  onSubmit={handleRequestRegistration}
                  className="form-container"
                >
                  <p className="form-description">
                    Request to become a provider. An admin must approve.
                  </p>
                  <div className="form-group">
                    {" "}
                    <label>Your Name/Facility Name</label>{" "}
                    <input
                      type="text"
                      placeholder="e.g., Dr. Alice / General Hospital"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      required
                    />{" "}
                  </div>
                  <div className="form-group">
                    {" "}
                    <label>Specialty</label>{" "}
                    <input
                      type="text"
                      placeholder="e.g., Cardiology"
                      value={providerSpecialty}
                      onChange={(e) => setProviderSpecialty(e.target.value)}
                      required
                    />{" "}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-secondary"
                  >
                    Request Registration
                  </button>
                </form>
                <div className="form-separator"></div>
                <form onSubmit={handleAddRecord} className="form-container">
                  <p className="form-description">
                    Add a record for a patient who granted you access.
                  </p>
                  <div className="form-group">
                    {" "}
                    <label>Patient Address</label>{" "}
                    <input
                      type="text"
                      placeholder="0x..."
                      value={addRecordPatient}
                      onChange={(e) => setAddRecordPatient(e.target.value)}
                      required
                    />{" "}
                  </div>
                  <div className="form-group">
                    {" "}
                    <label>Record Description</label>{" "}
                    <input
                      type="text"
                      placeholder="e.g., Annual Blood Test"
                      value={addRecordDesc}
                      onChange={(e) => setAddRecordDesc(e.target.value)}
                      required
                    />{" "}
                  </div>
                  <div className="form-group">
                    {" "}
                    <label>IPFS Hash</label>{" "}
                    <input
                      type="text"
                      placeholder="Qm..."
                      value={addRecordIpfs}
                      onChange={(e) => setAddRecordIpfs(e.target.value)}
                      required
                    />{" "}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    Add Record
                  </button>
                </form>
              </div>
            </div>

            <div
              className="records-container card slide-in"
              style={{ animationDelay: "300ms" }}
            >
              <h3 className="card-title">
                <DocumentTextIcon /> View Patient Records
              </h3>
              <form onSubmit={handleViewRecords} className="view-records-form">
                <input
                  type="text"
                  placeholder="Enter Patient Address"
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
                  Fetch Records
                </button>
              </form>
              <div className="records-list">
                {loading && patientRecords.length === 0 ? (
                  <div className="spinner"></div>
                ) : patientRecords.length > 0 ? (
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
                    <p>Enter a patient address and click fetch.</p>
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
