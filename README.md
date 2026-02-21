# StellSwap 🌌

StellSwap is a multi-wallet decentralized exchange (DEX) frontend built on the **Stellar Soroban Testnet**. It allows users to swap between XLM, USDC, and ETH using a real automated market maker (AMM) smart contract.

<img src="./screenshots/stellswap.png" alt="StellSwap" />

## 🚀 Features & Project Requirements Met

✅ **Multi-Wallet Support:** Users can connect using the Freighter Wallet extension via `@creit.tech/stellar-wallets-kit`.
✅ **Contract Deployed on Testnet:** The Soroban AMM contract is deployed live on the Stellar Testnet.
✅ **Contract Called from Frontend:** The UI directly interacts with the Soroban contract for quotes (`get_rates`) and actual swaps (`swap_xlm_for_usdc`, etc.).
✅ **Transaction Status Visible:** Real-time toast notifications guide the user through signing, submission, and confirmation (with polling for `SUCCESS`).
✅ **Live Market Data:** Displays live XLM/USD pricing data using a dynamic Chart.js chart and `get_reserves` data from the contract for pool liquidity TVL.

### 🛡️ 3 Error Types Handled
1. **Wallet Not Connected:** Swap buttons and inputs are disabled; the UI prompts the user to "Connect Wallet" before attempting any transaction.
2. **Insufficient Balance:** The UI instantly checks user balances from the Soroban token contracts and disables the swap button with an "Insufficient Balance" warning if the entered amount exceeds their holdings.
3. **Transaction Canceled / Rejected:** If the user rejects the transaction signature in the Freighter wallet popup, the frontend catches the error and displays a clear "Transaction was canceled" warning toast instead of crashing.

---

## 🔗 Important Links & Contract Information

- **Contract Address:** `CCH3WGMUTBXK573BPC6MSWLQQZ72DYYOQ7ZFEOXJBJROFCTVFCETDQZA` (Stellar Testnet)
- **XLM SAC Token:** `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- **USDC Token:** `CBAFDW2AC2PSW3MGW5FVZUJSASEHMT7U6HX24XKHQ34GXXFKCGUX2I7Y` 
- **ETH Token:** `CANGUK3UOKPZOKHTYUYOXJYJRQ5B7YH7ZSKXW6KNCIPOKXXUDNT3RT2V`

**Testnet Transaction Hash (Successful Swap Call):**
`042cab10f52f02a74e361482362ab8ea003f5ce624c965e6b4e073040bc1d0a5`
*(Swapped 10 XLM for 1.66 USDC)*
[View on Stellar Expert Explorer](https://stellar.expert/explorer/testnet/tx/042cab10f52f02a74e361482362ab8ea003f5ce624c965e6b4e073040bc1d0a5)

---

## 🛠️ Setup Instructions

To run this project locally, you will need **Node.js 18+** and the **Freighter Wallet extension** installed in your browser.

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd stellswap
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *(Note: This installs Next.js, Stellar SDK, chart.js, and other required packages).*

3. **Configure Environment Variables:**
   A `.env` file should be present in the root directory with the following configuration:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=CCH3WGMUTBXK573BPC6MSWLQQZ72DYYOQ7ZFEOXJBJROFCTVFCETDQZA
   NEXT_PUBLIC_ADMIN_PUBKEY=GBV2VSXKD6CY3XNZOVKIWAEXBHYU3XDQWOGOZSFI27SDCA6SGST73ZBQ
   NEXT_PUBLIC_USDC_TOKEN_ID=CBAFDW2AC2PSW3MGW5FVZUJSASEHMT7U6HX24XKHQ34GXXFKCGUX2I7Y
   NEXT_PUBLIC_ETH_TOKEN_ID=CANGUK3UOKPZOKHTYUYOXJYJRQ5B7YH7ZSKXW6KNCIPOKXXUDNT3RT2V
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the App:**
   Open [http://localhost:3000](http://localhost:3000) in your browser. Connect your Freighter wallet (ensure it is set to **Testnet**) to begin viewing balances, live market charts, and executing swaps.

---

## 📸 Screenshots

<img src="./screenshots/stellswap.png" alt="StellSwap" />

---
Built for Stellar Soroban Smart Contract Development Level 2.
