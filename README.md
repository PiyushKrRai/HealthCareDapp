# HealthChain: A Decentralized Health Record System

HealthChain is a decentralized application (DApp) designed to revolutionize how medical records are stored, managed, and shared. Built on the CoreDAO blockchain, this system shifts the paradigm of data ownership from centralized institutions to the individual patient.

The core of the system utilizes a smart contract to manage permissions and ownership, acting as an immutable access control layer. The actual, sensitive health record files are encrypted and stored on a decentralized storage network like IPFS (InterPlanetary File System). The on-chain contract only stores the reference hash to this data, ensuring privacy, security, and cost-efficiency. This hybrid approach leverages the best of both worlds: CoreDAO's robust security for managing who can see what, and IPFS for scalable, decentralized data storage.

## Table of Contents
* [Project Vision](#project-vision)
* [Future Scope](#future-scope)
* [Key Features](#key-features)
* [Screenshot & Demo Video](#screenshot--demo-video)
* [Contract Address](#contract-address)

## Project Vision

Our vision is to create a global, patient-centric healthcare ecosystem where individuals have complete control over their most sensitive data. We aim to break down the data silos that currently fragment the healthcare industry, allowing for seamless, secure, and permissioned data sharing between patients and providers anywhere in the world. By putting patients in charge, HealthChain fosters trust, enhances data security, and paves the way for a more integrated and efficient future for healthcare.

## Future Scope

The current implementation provides a solid foundation for a comprehensive health data platform. Future enhancements could include:

*   **Emergency Access ("Break-Glass" Functionality):** Implementing a mechanism where designated family members or a social recovery wallet can grant temporary emergency access to a new provider if the patient is incapacitated.
*   **Insurance & Billing Integration:** Automating insurance claims by allowing providers to trigger a claim submission event on the smart contract when a new record (representing a service) is added.
*   **Decentralized Identity (DID) Integration:** Integrating with DID standards to provide a more robust and portable identity solution for patients and providers beyond just a wallet address.
*   **Anonymous Data for Medical Research:** Creating a system where patients can voluntarily and anonymously contribute their data to research pools, potentially earning rewards while advancing medical science without compromising their identity.
*   **Mobile Application:** Developing a dedicated mobile app for an even more accessible and user-friendly experience for managing records and permissions on the go.

## Key Features

*   **Patient Data Sovereignty:** The patient is the sole owner of their records. They have the exclusive ability to grant and revoke access to healthcare providers at any time using the `grantAccess` and `revokeAccess` functions.

*   **On-Chain Access Control with Off-Chain Storage:** The smart contract acts as a secure access control layer on the CoreDAO blockchain, while sensitive data remains encrypted and stored off-chain on IPFS for maximum privacy and scalability.

*   **Role-Based Dashboards:** The user interface dynamically adapts based on the user's role. A contract owner sees an **Admin Dashboard** for approving providers, while patients and providers see a **User Dashboard** tailored to their specific actions.

*   **Admin-Vetted Providers:** To ensure network integrity, providers cannot act on the network immediately. They must first "request registration," and only a contract administrator can approve them, making the network of providers trustworthy.

*   **Transparent & Immutable Event Logging:** Every critical action—such as granting access, adding a record, or approving a provider—emits an on-chain event. This creates a fully transparent and auditable history of all interactions with a patient's data.

## Screenshot & Demo Video

Below is a screenshot of the Admin Dashboard, where the contract owner can view and approve pending provider registration requests.

![Screenshot 2025-06-21 155400](https://github.com/user-attachments/assets/afcbfd00-0c0f-4e01-b564-b3873ef19265)

![Screenshot 2025-06-21 155415](https://github.com/user-attachments/assets/f4f1ee0e-19c3-4744-b541-596d95a4ef21)

![Screenshot 2025-06-21 155447](https://github.com/user-attachments/assets/c9492eb5-2817-4f56-b7c7-2df76b268480)

![Screenshot 2025-06-22 234048](https://github.com/user-attachments/assets/5cbecfec-bf7d-41cd-adf9-51bf976fb513)

![Screenshot 2025-06-22 234112](https://github.com/user-attachments/assets/516550a2-82ba-402c-91b5-09a3b6ed57cb)

![Screenshot 2025-06-22 234157](https://github.com/user-attachments/assets/5fde7e8c-3d24-4a8e-9642-a7b8bdec9b7d)

![Screenshot 2025-06-22 234221](https://github.com/user-attachments/assets/6cf36d34-62d8-4f6c-9b90-9d3a198297ab)


A full video demonstration walking through the registration, access granting, and record management process can be viewed here:

https://github.com/user-attachments/assets/0f10c2b6-60c8-4c17-ae24-a44e20344b43

## Contract Address

The `HealthRecords.sol` smart contract is deployed on the **CoreDAO Testnet**.

*   **Address:** `0x9cDEFD4963e9CD527AabCd3b1aD07a7C0dc81CC7`

*   **Block Explorer:** You can view and interact with the contract directly on CoreScan Testnet.
    *   [View on CoreScan Testnet](https://scan.test.btcs.network/address/0x9cDEFD4963e9CD527AabCd3b1aD07a7C0dc81CC7)

![image](https://github.com/user-attachments/assets/4dd9c263-5971-4b7a-8987-5bf90fafb1c1)
