import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import styled from "styled-components";

import BrettMinerABI from "./abis/BrettMinerABI.json";

// Adresse du contrat et du token Brett
const contractAddress = "0x2cF88805B665E2F14244065c8317eEa29967118A";
const brettTokenAddress = "0x532f27101965dd16442e59d40670faf5ebb142e4";

const Container = styled.div`
  font-family: Arial, sans-serif;
  text-align: center;
  padding: 20px;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #d35400;
  color: white;
`;

const Section = styled.section`
  margin: 20px 0;
  padding: 20px;
  background-color: #ecf0f1;
  border-radius: 10px;
  text-align: left;
`;

const Button = styled.button`
  background-color: #f39c12;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  color: white;
  cursor: pointer;
  border-radius: 5px;
  margin: 5px;
`;

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [marketPoints, setMarketPoints] = useState(0);
  const [myPoints, setMyPoints] = useState(0);
  const [myMiners, setMyMiners] = useState(0);
  const [claimPower, setClaimPower] = useState(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [tvl, setTVL] = useState({ eth: 0, usd: 0 });
  const [brettBalance, setBrettBalance] = useState(0);
  const [halvingPercentage, setHalvingPercentage] = useState(100);
  const [userReward, setUserReward] = useState(0);

  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      try {
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        fetchBrettBalance(address);
        fetchReward();
        fetchContractData();
        fetchTVL();
      } catch (err) {
        console.error("Error connecting wallet:", err);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app.");
    }
  };

  const initializeContract = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const brettMinerContract = new ethers.Contract(
          contractAddress,
          BrettMinerABI,
          signer
        );
        return brettMinerContract;
      } catch (err) {
        console.error("Error initializing contract:", err);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app.");
    }
  };

  const fetchBrettBalance = async (address) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const brettTokenContract = new ethers.Contract(
      brettTokenAddress,
      [
        "function balanceOf(address account) external view returns (uint256)"
      ],
      provider
    );
    try {
      const balance = await brettTokenContract.balanceOf(address);
      setBrettBalance(ethers.utils.formatEther(balance));
    } catch (err) {
      console.error("Error fetching Brett balance:", err);
      setBrettBalance(0);
    }
  };

  const fetchReward = async () => {
    const brettMinerContract = await initializeContract();
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
    const brettMinerContract = await initializeContract();
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

  const depositBrett = async (amount) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const brettTokenContract = new ethers.Contract(
      brettTokenAddress,
      [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)",
      ],
      signer
    );
    const brettMinerContract = await initializeContract();

    try {
      const allowance = await brettTokenContract.allowance(
        walletAddress,
        contractAddress
      );
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
    }
  };

  const compound = async () => {
    const brettMinerContract = await initializeContract();
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

  const withdraw = async () => {
    const brettMinerContract = await initializeContract();
    try {
      const tx = await brettMinerContract.withdraw();
      await tx.wait();
      alert("Withdraw successful!");
    } catch (err) {
      console.error("Error during withdrawal:", err);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchReward();
      fetchContractData();
      fetchTVL();
      fetchBrettBalance(walletAddress);
    }
  }, [walletAddress, myPoints]);

  return (
    <Container>
      <Header>
        <h1>Brett Miner</h1>
        <Button onClick={connectWallet}>
          {walletAddress ? `Wallet: ${walletAddress}` : "Connect Wallet"}
        </Button>
      </Header>

      <Section>
        <h2>Wallet Information</h2>
        <p>Brett Balance: {brettBalance} Brett</p>
      </Section>

      <Section>
        <h2>Your Reward</h2>
        <p>You can claim: {userReward} Brett</p>
      </Section>

      <Section>
        <h2>Game Information</h2>
        <p>My Points: {myPoints}</p>
        <p>My Miners: {myMiners}</p>
        <p>Market Points: {marketPoints}</p>
        <p>Claim Power: {claimPower * 100}%</p>
      </Section>

      <Section>
        <h2>TVL (Total Value Locked)</h2>
        <p>{tvl.eth} Tokens</p>
        <p>${tvl.usd} USD</p>
      </Section>

      <Section>
        <h2>Actions</h2>
        <input
          type="number"
          placeholder="Amount to deposit"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
        />
        <Button onClick={() => depositETH(depositAmount)}>Deposit ETH</Button>
        <Button onClick={() => depositBrett(depositAmount)}>Deposit Brett</Button>
        <Button onClick={compound}>Compound</Button>
        <Button onClick={withdraw}>Withdraw</Button>
      </Section>
    </Container>
  );
}

export default App;
