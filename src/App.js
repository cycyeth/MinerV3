import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultwagmiConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { createConfig, WagmiConfig } from "wagmi";
import { configureChains } from "@wagmi/core";
import { publicProvider } from "@wagmi/providers/public";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import logo from "./logo.png";
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ConnectButton } from "@rainbow-me/rainbowkit";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import styled from "styled-components";
import BrettMinerABI from "./abis/BrettMinerABI.json";
import BrettMinerImage from "./Design_sans_titre_30.png";
import "./App.css"; // Assurez-vous que ce fichier est bien importÃ©

const queryClient = new QueryClient();

// Adresse du contrat et du token Brett
const contractAddress = "0x2cF88805B665E2F14244065c8317eEa29967118A";
const brettTokenAddress = "0x532f27101965dd16442e59d40670faf5ebb142e4";

const { chains, publicClient } = configureChains(
  [base],
  [publicProvider()]
);

const wagmiConfig = createConfig({
  autoConnect: true,
  publicClient,
});


const BOX = styled.section`
  text-align: left;
`;

const Section2 = styled.section`
  text-align: left;
`;

const LeftSection = styled.div`
  width: 50%;
  padding-right: 20px;
`;

const RightSection = styled.div`
  width: 50%;
  text-align: center;
`;

const Section = styled.section`
  margin: 18px 0;
  padding: 15px;
  border: 1px solid gray;
  text-align: left;
`;

const Button = styled.button`
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  color: black;
  cursor: pointer;
  border-radius: 5px;
  margin: 5px;
`;

const Image = styled.img`
  width: 100%;
  border-radius: 10px;
`;

const ReferralSection = styled.div`
  margin-top: 20px;
  padding: 10px;
`;

function App() {
  const { address: walletAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [activewalletClient, setActivewalletClient] = useState(null);
  const [marketPoints, setMarketPoints] = useState(0);
  const [myPoints, setMyPoints] = useState(0);
  const [myMiners, setMyMiners] = useState(0);
  const [claimPower, setClaimPower] = useState(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [tvl, setTVL] = useState({ eth: 0, usd: 0 });
  const [brettBalance, setBrettBalance] = useState(0);
  const [halvingPercentage, setHalvingPercentage] = useState(100);
  const [userReward, setUserReward] = useState(0);
  const [referral, setReferral] = useState(
    "0x0000000000000000000000000000000000000000"
  );
  
  const initializeContract = async (walletClient) => {
    if (!walletClient) {
      console.error("Wallet client not found. Ensure wallet is connected.");
      return null;
    }
    try {
      const brettMinerContract = new ethers.Contract(
        contractAddress,
        BrettMinerABI,
        walletClient
      );
      return brettMinerContract;
    } catch (err) {
      console.error("Error initializing contract:", err);
    }
  };
  
  const fetchBrettBalance = async (address, publicClient) => {
    if (!address || !publicClient) {
      console.error("Address or public client is missing.");
      return;
    }
  
    try {
      const brettTokenContract = new ethers.Contract(
        brettTokenAddress,
        ["function balanceOf(address account) external view returns (uint256)"],
        publicClient
      );
      const balance = await brettTokenContract.balanceOf(address);
      setBrettBalance(ethers.utils.formatEther(balance));
    } catch (err) {
      console.error("Error fetching Brett balance:", err);
      setBrettBalance(0);
    }
  };
  
  const fetchReward = async () => {
    const brettMinerContract = await initializeContract();
    if (!brettMinerContract) {
      console.error("Contract not initialized.");
      return;
    }
    try {
      const myPoints = await brettMinerContract.getMyPoints();
      const reward = await brettMinerContract.calculatePointSell(myPoints);
      setUserReward(ethers.utils.formatEther(reward));
    } catch (err) {
      console.error("Error fetching reward:", err);
      setUserReward(0);
    }
  };
  
  const fetchContractData = async () => {
    const brettMinerContract = await initializeContract();
    if (!brettMinerContract) {
      console.error("Contract not initialized.");
      return;
    }
    try {
      const points = await brettMinerContract.getMyPoints();
      const miners = await brettMinerContract.getMyMiners();
      const marketPoints = await brettMinerContract.marketPoints();
      const claimPower = await brettMinerContract.getHalvingPercentage();
  
      setMyPoints(ethers.utils.formatEther(points));
      setMyMiners(miners.toString());
      setMarketPoints(marketPoints.toString());
      setClaimPower(ethers.utils.formatUnits(claimPower, 18));
    } catch (err) {
      console.error("Error fetching contract data:", err);
    }
  };
  
  const fetchTVL = async () => {
    const brettMinerContract = await initializeContract();
    if (!brettMinerContract) {
      console.error("Contract not initialized.");
      return;
    }
    try {
      const balance = await brettMinerContract.getBalance();
      const tokenPrice = await fetchTokenPrice();
      const tvlInEth = ethers.utils.formatEther(balance);
      setTVL({
        eth: tvlInEth,
        usd: (tvlInEth * tokenPrice).toFixed(2),
      });
    } catch (err) {
      console.error("Error fetching TVL:", err);
      setTVL({ eth: 0, usd: 0 });
    }
  };
  
  const fetchTokenPrice = async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=based-brett&vs_currencies=usd"
      );
      const data = await response.json();
      return data["based-brett"].usd;
    } catch (err) {
      console.error("Error fetching token price:", err);
      return 0;
    }
  };

  const depositETH = async (amount) => {
    if (!walletClient) {
      console.error("walletClient not found. Ensure wallet is connected.");
      return;
    }
  
    const brettMinerContract = new ethers.Contract(
      contractAddress,
      BrettMinerABI,
      walletClient
    );
  
    try {
      const tx = await brettMinerContract.depositETH(
        ethers.utils.parseEther(amount),
        "0x0000000000000000000000000000000000000000",
        { value: ethers.utils.parseEther(amount) }
      );
      await tx.wait();
      alert("Deposit ETH successful!");
      fetchTVL();
    } catch (err) {
      console.error("Error during ETH deposit:", err);
    }
  };
    
  const depositBrett = async (amount, walletClient) => {
    if (!walletClient) {
      console.error("Wallet client not found. Ensure wallet is connected.");
      return;
    }
  
    try {
      const brettTokenContract = new ethers.Contract(
        brettTokenAddress,
        [
          "function approve(address spender, uint256 amount) public returns (bool)",
          "function allowance(address owner, address spender) public view returns (uint256)",
        ],
        walletClient
      );
  
      const brettMinerContract = new ethers.Contract(
        contractAddress,
        BrettMinerABI,
        walletClient
      );
  
      const walletAddress = await walletClient.getAddress();
      const allowance = await brettTokenContract.allowance(walletAddress, contractAddress);
      const amountInWei = ethers.utils.parseUnits(amount, 18);
  
      if (allowance.lt(amountInWei)) {
        const approveTx = await brettTokenContract.approve(
          contractAddress,
          ethers.constants.MaxUint256
        );
        await approveTx.wait();
        alert("Approval successful!");
      }
  
      const depositTx = await brettMinerContract.depositBrett(
        amountInWei,
        "0x0000000000000000000000000000000000000000"
      );
      await depositTx.wait();
      alert("Deposit Brett successful!");
    } catch (err) {
      console.error("Error during Brett deposit:", err);
      alert("Failed to deposit Brett. Please check the console for details.");
    }
  };
  
  const compound = async (walletClient) => {
    if (!walletClient) {
      console.error("Wallet client not found. Ensure wallet is connected.");
      return;
    }
  
    const brettMinerContract = new ethers.Contract(
      contractAddress,
      BrettMinerABI,
      walletClient
    );
  
    try {
      const tx = await brettMinerContract.compound(
        "0x0000000000000000000000000000000000000000"
      );
      await tx.wait();
      alert("Compound successful!");
    } catch (err) {
      console.error("Error during compound:", err);
    }
  };
  
    
  const copyReferralLink = (walletAddress) => {
    if (walletAddress) {
      const referralLink = `${window.location.origin}/?ref=${walletAddress}`;
      navigator.clipboard
        .writeText(referralLink)
        .then(() => alert("Referral link copied to clipboard!"))
        .catch(() => alert("Failed to copy referral link."));
    } else {
      alert("Connect your wallet to generate a referral link.");
    }
  };
  
  const withdraw = async (walletClient) => {
    if (!walletClient) {
      alert("Wallet client not found. Ensure your wallet is connected.");
      return;
    }
  
    const brettMinerContract = new ethers.Contract(
      contractAddress,
      BrettMinerABI,
      walletClient
    );
  
    try {
      const tx = await brettMinerContract.withdraw();
      await tx.wait();
      alert("Withdraw successful!");
    } catch (err) {
      console.error("Error during withdrawal:", err);
    }
  };
        
  useEffect(() => {
    if (isConnected && walletAddress) {
      (async () => {
        await fetchReward();
        await fetchContractData();
        await fetchTVL();
        await fetchBrettBalance(walletAddress);
      })();
    }
  }, [isConnected, walletAddress]);
    
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <LeftSection className="LeftSection">
            <BOX>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h1 className="custom-font" style={{ fontSize: "45px" }}>
                  BRETT MINER
                </h1>
                <img src={logo} alt="Logo" className="logo" />
                <ConnectButton />
              </div>
            </BOX>

            <Section2>
              <hr className="custom-hr"></hr>
              <p className="custom-font">
                The $BRETT reward pool with the richest daily return and lowest
                dev fee, daily income up to 8% and a referal bonus up to 12%
              </p>
              <p className="custom-font">
                <u>
                  <strong>#1 - BUY MINERS :</strong>
                </u>{" "}
                Start by using your $BRETT or $ETH topurchase miners
              </p>
              <p className="custom-font">
                <u>
                  <strong>#2 - COMPOUND:</strong>
                </u>{" "}
                To maximize your earnings, click on the "COMPOUND" button. this
                action will automatically reinvest your rewards back into
                farmers
              </p>
              <p className="custom-font">
                <u>
                  <strong>#3 - CLAIM REWARDS:</strong>
                </u>{" "}
                This will transfer your accumulated $BRETT rewards directly into
                your wallet
              </p>
            </Section2>

            <Section2>
              <div
                className="flex items-center"
                style={{ display: "flex", alignItems: "center" }}
              >
                <h1
                  className="custom-font"
                  style={{ margin: 0, paddingRight: "10px" }}
                >
                  <strong>REWARDS</strong>
                </h1>
                <span
                  style={{ flex: 1, height: "1px", backgroundColor: "black" }}
                ></span>
              </div>

              <p className="custom-font">
                The key to maximizing your rewards lies in the quantity of brett
                you hold and how frequently you compound them. The more miner
                you accumulate and the more often you reinvest your rewards. the
                greater the potential for earning more rewards
              </p>
            </Section2>

            {/* 
        <Section>
          <h2>Wallet Information</h2>
          <p>Brett Balance: {brettBalance} Brett</p>
        </Section>
        */}

            <Section>
              <h1
                className="custom-font"
                style={{ fontWeight: "bold", textAlign: "center" }}
              >
                BRETT MINERS
              </h1>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p className="custom-font">TVL (Total Value Locked)</p>
                <p className="custom-font">{tvl.eth} Tokens</p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p className="custom-font">My Miners:</p>
                <p>{myMiners}</p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p className="custom-font">Claim Power: </p>
                <p className="custom-font">{claimPower}</p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p className="custom-font">You can claim: </p>
                <p className="custom-font">{userReward} Brett</p>
              </div>

              <h1 className="custom-font" style={{ textAlign: "center" }}>
                <Button
                  className="button-87"
                  role="button"
                  onClick={() => depositETH(depositAmount)}
                >
                  Deposit ETH
                </Button>
                <Button
                  className="button-87"
                  role="button"
                  onClick={() => depositBrett(depositAmount)}
                >
                  Deposit Brett
                </Button>
              </h1>
              <h1 style={{ textAlign: "center" }}>
                <div className="textInputWrapper">
                  <input
                    type="number"
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "textfield",
                    }}
                    placeholder="$BRETT / $ETH"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
              </h1>

              <p className="custom-font">Your rewards: </p>
              <h1 className="custom-font" style={{ textAlign: "center" }}>
                <Button className="button-87" role="button" onClick={compound}>
                  Compound
                </Button>
                <Button className="button-87" role="button" onClick={withdraw}>
                  Withdraw
                </Button>
              </h1>
              <p
                className="custom-font"
                style={{ textAlign: "center", fontSize: "12px" }}
              >
                WITHDRAW WILL RESET THE CLAIM POWER TO 50% <br /> CLAIM POWER
                REGENERATES 10% PER DAY TILL 100%
              </p>
            </Section>

            <Section>
            <h1
                className="custom-font"
                style={{ fontWeight: "bold", textAlign: "center" }}
              >
                EXTRACTION RETURN
              </h1>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p className="custom-font">Daily return: </p>
                <p className="custom-font">8%</p>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p className="custom-font">APR</p>
                <p className="custom-font">2920%</p>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p className="custom-font">Dev Fee</p>
                <p className="custom-font">5%</p>
              </div>
            </Section>

            <Section2>
              <div
                className="flex items-center"
                style={{ display: "flex", alignItems: "center" }}
              >
                <h1
                  className="custom-font"
                  style={{ margin: 0, paddingRight: "10px" }}
                >
                  <strong>REFERAL LINK</strong>
                </h1>
                <span
                  style={{ flex: 1, height: "1px", backgroundColor: "black" }}
                ></span>
              </div>

              <ReferralSection
                className="custom-font"
                style={{ textAlign: "center" }}
              >
                <Button className="button-87" onClick={copyReferralLink}>
                  Copy Referral Link
                </Button>
              </ReferralSection>
            </Section2>

            <div class="social-icons-container">
              <div class="telegram-icon">
                <a
                  href="https://t.me/Brett_Miner"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 496 512"
                    width="30"
                    height="30"
                  >
                    <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7 .2-.7 .3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3 .7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6 .5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z" />
                  </svg>
                </a>
              </div>
              <div class="twitter-icon">
                <a
                  href="https://x.com/BrettMinerBase"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    width="30"
                    height="30"
                  >
                    <path d="M459.4 151.7c.3 4.5 .3 9.1 .3 13.6 0 138.7-105.6 298.6-298.6 298.6-59.5 0-114.7-17.2-161.1-47.1 8.4 1 16.6 1.3 25.3 1.3 49.1 0 94.2-16.6 130.3-44.8-46.1-1-84.8-31.2-98.1-72.8 6.5 1 13 1.6 19.8 1.6 9.4 0 18.8-1.3 27.6-3.6-48.1-9.7-84.1-52-84.1-103v-1.3c14 7.8 30.2 12.7 47.4 13.3-28.3-18.8-46.8-51-46.8-87.4 0-19.5 5.2-37.4 14.3-53 51.7 63.7 129.3 105.3 216.4 109.8-1.6-7.8-2.6-15.9-2.6-24 0-57.8 46.8-104.9 104.9-104.9 30.2 0 57.5 12.7 76.7 33.1 23.7-4.5 46.5-13.3 66.6-25.3-7.8 24.4-24.4 44.8-46.1 57.8 21.1-2.3 41.6-8.1 60.4-16.2-14.3 20.8-32.2 39.3-52.6 54.3z" />
                  </svg>
                </a>
              </div>
            </div>
          </LeftSection>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;
