/** @jsx jsx */
import { jsx } from "@emotion/react";
import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import "antd/dist/antd.css";
import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import "./App.css";
import { Row, Col, Button, Menu, Alert, List, Card, InputNumber, Progress, Statistic} from "antd";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useUserAddress } from "eth-hooks";
import {
  useExchangePrice,
  useGasPrice,
  useUserProvider,
  useContractLoader,
  useContractReader,
  useEventListener,
  useBalance,
  useExternalContractLoader,
} from "./hooks";
import { Header, Account, Faucet, Ramp, Contract, GasGauge, Balance, Address } from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
import { Hints, ExampleUI, Subgraph } from "./views";
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { VariablesAreInputTypesRule } from "graphql";
const {Meta} = Card;
const {Countdown} = Statistic;
const humanizeDuration = require("humanize-duration");

const ButtonContainer = styled.div`
  margin: 1rem 0;
  display: flex;
  justify-content: center;
`;
const StakeContainer = styled.div`
  margin: 1rem 0;
  display: flex;
  justify-content: space-around;
`;
const EventContainer = styled.div`
  display: flex;
  justify-content: center;
`;
const ContainerStaking = styled.div`
  width: fit-content;
  padding:20px;
    /* background: linear-gradient(#3f4241, #49ffdd); */
    background-color:#5E827B;
    border-radius:2px;
    margin: auto;
    h3{color:white; margin:0;    align-self: center;}
`;
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    📡 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS["kovan"]; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
const mainnetProvider = new JsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID);
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID)

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new JsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

function App(props) {
  const [amountStake, setamountStake] = useState("0.01");
  const [amountStake_token, setamountStake_token] = useState("1");

  const [amountSwap, setamountSwap] = useState(0.01);
  const [amountSwap_deep, setamountSwap_deep] = useState(1);


  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);
  if (DEBUG) console.log("👩‍💼 selected address:", address);

  // You can warn the user if you would like them to be on a specific network
  let localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  if (DEBUG) console.log("🏠 localChainId", localChainId);

  let selectedChainId = userProvider && userProvider._network && userProvider._network.chainId;
  if (DEBUG) console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice);

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);
  if (DEBUG) console.log("💵 yourLocalBalance", yourLocalBalance ? formatEther(yourLocalBalance) : "...");

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);
  if (DEBUG) console.log("💵 yourMainnetBalance", yourMainnetBalance ? formatEther(yourMainnetBalance) : "...");

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider);
  if (DEBUG) console.log("📝 readContracts", readContracts);

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  const writeContracts = useContractLoader(userProvider);
  if (DEBUG) console.log("🔐 writeContracts", writeContracts);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  //const mainnetDAIContract = useExternalContractLoader(mainnetProvider, DAI_ADDRESS, DAI_ABI)
  //console.log("🥇DAI contract on mainnet:",mainnetDAIContract)
  //
  // Then read your DAI balance like:
  //const myMainnetBalance = useContractReader({DAI: mainnetDAIContract},"DAI", "balanceOf",["0x34aA3F359A9D614239015126635CE7732c18fDF3"])
  //

  //keep track of contract balance to know how much has been staked total:
  const stakerContractBalance = useBalance(localProvider, readContracts && readContracts.Staker.address);

  if (DEBUG) console.log("💵 stakerContractBalance", stakerContractBalance && formatEther(stakerContractBalance) + 2);

  //keep track of total 'threshold' needed of ETH
  const threshold = useContractReader(readContracts, "Staker", "threshold");
  if (DEBUG) console.log("💵 threshold:", threshold);

  if(threshold){
    var CompletePercentaje =  formatEther(stakerContractBalance) * 100 / formatEther(threshold);
    console.log(CompletePercentaje);
  }
  // keep track of a variable from the contract in the local React state:
  const balanceStaked = useContractReader(readContracts, "Staker", "balances", [address]);



  var balancePool = useContractReader(readContracts, "Bank", "etherBalanceOf", [address]);
  var balancePool_token = useContractReader(readContracts, "Bank", "tokenBalanceOf", [address]);

  var reward = useContractReader(readContracts, "Bank", "getReward", [address]);
  var reward_token = useContractReader(readContracts, "Bank", "getReward_token", [address]);

  // if (reward) console.log("💸 reward:", formatEther(reward));

  if(balancePool) var balancePool_string = balancePool.toString();
  if(balancePool_token) var balancePool_token_string = balancePool_token.toString();

  if (DEBUG) console.log("💸 balanceStaked:", balanceStaked);
  //📟 Listen for broadcast events
  const stakeEvents = useEventListener(readContracts, "Staker", "Stake", localProvider, 1);
  const withdrawEvent = useEventListener(readContracts, "Staker", "Withdraw", localProvider, 1);
  const poolDepositEvent = useEventListener(readContracts, "Bank", "Deposit", localProvider, 1);
  const poolWithdrawEvent = useEventListener(readContracts, "Bank", "Withdraw", localProvider, 1);
  const buyTokenEvent = useEventListener(readContracts, "Bank", "BuyTokens", localProvider, 1);
  const sellTokenEvent = useEventListener(readContracts, "Bank", "SellTokens", localProvider, 1);

  if (DEBUG) console.log("📟 stake events:", stakeEvents);

  // keep track of a variable from the contract in the local React state:
  const timeLeft = useContractReader(readContracts, "Staker", "timeLeft");
  const deadLine = useContractReader(readContracts, "Staker", "deadline");

  // const ethtosell = useContractReader(readContracts, "Bank", "ETHforSell");
  console.log("⏳ deadLine:",deadLine && deadLine.toNumber());

  console.log("⏳ timeLeft:",timeLeft && timeLeft.toNumber() * 1000);

  const complete = useContractReader(readContracts, "ExampleExternalContract", "completed");
  if (DEBUG) console.log("✅ complete:", complete);

  const exampleExternalContractBalance = useBalance(
    localProvider,
    readContracts && readContracts.ExampleExternalContract.address,
  );
  if (DEBUG) console.log("💵 exampleExternalContractBalance", exampleExternalContractBalance);

  let completeDisplay = "";
  if (complete) {
    completeDisplay = (
      <div style={{ padding: 64, backgroundColor: "#eeffef", fontWeight: "bolder" }}>
        🚀 🎖 👩‍🚀 - Staking complete 🎉 🍾 🎊
        <Balance balance={exampleExternalContractBalance} fontSize={64} /> ETH staked!
      </div>
    );
  }

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */
  let networkDisplay = "";

  if (localChainId && selectedChainId && localChainId != selectedChainId) {
    let selectedChainName = NETWORK(selectedChainId);
    if (selectedChainName) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message={"⚠️ Wrong Network"}
            description={
              <div>
                You have <b>{NETWORK(selectedChainId).name}</b> selected and you need to be on{" "}
                <b>{NETWORK(localChainId).name}</b>.
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message={"⚠️ Wrong Network"}
            description={
              <div>
                You have wrong network selected, you need to be on <b>{NETWORK(localChainId).name}</b>.
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: 2, position: "absolute", right: 154, top: 28, padding: 16, color: "white" }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  let faucetHint = "";
  const [faucetClicked, setFaucetClicked] = useState(false);
  if (
    !faucetClicked &&
    localProvider &&
    localProvider._network &&
    localProvider._network.chainId == 31337 &&
    yourLocalBalance &&
    formatEther(yourLocalBalance) <= 0
  ) {
    faucetHint = (
      <div style={{ padding: 16 }}>
        <Button
          type={"primary"}
          onClick={() => {
            faucetTx({
              to: address,
              value: parseEther("0.01"),
            });
            setFaucetClicked(true);
          }}
        >
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    );
  }

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      {networkDisplay}
      <BrowserRouter>
        <Menu
          style={{ textAlign: "center", backgroundColor: "transparent", border: "none", color: "white" }}
          selectedKeys={[route]}
          mode="horizontal"
        >
          <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
              Staker
            </Link>
          </Menu.Item>
          {/* <Menu.Item key="/contracts">
            <Link onClick={()=>{setRoute("/contracts")}} to="/contracts">Debug Contracts</Link>
          </Menu.Item> */}
          <Menu.Item key="/pool">
            <Link
              onClick={() => {
                setRoute("/pool");
              }}
              to="/pool"
            >
              Pool
            </Link>
          </Menu.Item>
          <Menu.Item key="/swap">
            <Link
              onClick={() => {
                setRoute("/swap");
              }}
              to="/swap"
            >
              Swap
            </Link>
          </Menu.Item>
        </Menu>

        <Switch>
          <Route exact path="/">
            {completeDisplay}
            <div>
              <h2
                css={css`
                  color: white;
                  margin-bottom: 20px;
                `}
              >
                Staking with scaffold-eth
              </h2>
            </div>
            <ContainerStaking>
            
            <div style={{ padding: 8, display:"flex", justifyContent:"space-around"}}>
              <h3>Time left until execution:</h3>
              {/* {deadLine && <Countdown title="Countdown" value={Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 30} />} */}
              {deadLine && <Countdown title="" value={deadLine.toNumber() * 1000} format={`D [Days] HH:mm:ss`}/>}
              {/* {timeLeft && humanizeDuration(timeLeft.toNumber() * 1000, { units: ["h", "m","s"] ,spacer: " ", delimiter:" "})} */}
            </div>
            
            <StakeContainer>
              <div style={{ padding: 8 }}>
                <div>Total staked</div>
                <Balance balance={stakerContractBalance} fontSize={64} />/<Balance balance={threshold} fontSize={64} />
              </div>

              <div style={{ padding: 8 }}>
                <div>You staked</div>
                <Balance balance={balanceStaked} fontSize={64} />
              </div>
            </StakeContainer>
            <h3>Completed</h3>
            <Progress percent={CompletePercentaje && Math.round(CompletePercentaje)} status="active" />

            <ButtonContainer>
              <div style={{ padding: 8 }}>
                <Button
                  style={{ width: "150px" }}
                  type={"default"}
                  onClick={() => {
                    tx(writeContracts.Staker.execute());
                  }}
                >
                  📡 Execute!
                </Button>
              </div>

              <div style={{ padding: 8 }}>
                <Button
                  style={{ width: "150px" }}
                  type={"default"}
                  onClick={() => {
                    tx(writeContracts.Staker.withdraw(address));
                  }}
                >
                  🏧 Withdraw
                </Button>
              </div>

              <div style={{ padding: 8 }}>
                <Button
                  type={balanceStaked ? "success" : "primary"}
                  onClick={() => {
                    tx(writeContracts.Staker.stake({ value: parseEther("0.1") }));
                  }}
                >
                  🥩 Stake 0.1 ether!
                </Button>
              </div>
            </ButtonContainer>
            </ContainerStaking>
            {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}
            <EventContainer>
              <div style={{ width: 500, margin: "auto", marginTop: 64 }}>
                <div>Stake Events (Last 5):</div>
                <List
                  dataSource={stakeEvents.slice(0,4)}
                  renderItem={item => {
                    return (
                      <List.Item key={item[0] + item[1] + item.blockNumber}>
                        <Address value={item[0]} ensProvider={mainnetProvider} fontSize={16} /> =&gt;
                        <Balance balance={item[1]} />
                      </List.Item>
                    );
                  }}
                />
              </div>
              <div style={{ width: 500, margin: "auto", marginTop: 64 }}>
                <div>Withdraw Events (Last 5) :</div>
                <List
                  dataSource={withdrawEvent.slice(0,4)}
                  renderItem={item => {
                    return (
                      <List.Item key={item[0] + item[1] + item.blockNumber}>
                        <Address value={item[0]} ensProvider={mainnetProvider} fontSize={16} /> =&gt;
                        <Balance balance={item[1]} />
                      </List.Item>
                    );
                  }}
                />
              </div>
            </EventContainer>

            {/* uncomment for a second contract:
            <Contract
              name="SecondContract"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            */}

            {/* Uncomment to display and interact with an external contract (DAI on mainnet):
            <Contract
              name="DAI"
              customContract={mainnetDAIContract}
              signer={userProvider.getSigner()}
              provider={mainnetProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            */}
          </Route>
          <Route path="/contracts">
            <Contract
              name="Staker"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            <Contract
              name="ExampleExternalContract"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
          </Route>
          <Route path="/pool">
            <h2
                css={css`
                  color:white;
                  margin-top: 20px;
                `}
              >
                Active Pools
              </h2>
              <div css={css`display:flex; justify-content:space-evenly;`}>
            <Card        className="card"      title="Earn DEEP"           description="Stake ETH"              extra={
                <a target="_blank" href={`https://kovan.etherscan.io/address/${readContracts && readContracts.Bank.address}`}>
                Contract
              </a>
              }
              style={{ width: 400, margin: "20px 0", }}
              headStyle={{textAlign:"left"}}
              css={css`p,h3{margin:0;}`}
            >
              <p style={{color:"white"}}>Stake ETH</p>
              <div style={{ display: "flex", justifyContent: "space-between" ,    alignItems: "center", margin:"15px 0" }}>
                <p>APR: </p>
                <h3>300%</h3>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",alignItems: "center", margin:"15px 0" }}>
                <p>ETH Staking:</p>
                <h3 css={css`padding:0;`}><Balance balance={balancePool}  /></h3>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",alignItems: "center", margin:"15px 0" }}>
                <p>DEEP Earned:</p>
                
                {/* // <p>DEEP Earned(estimated): {humanizeDuration(timePool.toNumber())}</p> */}
                {reward && <h3>{formatEther(reward).substr(0,6)}</h3>} 
              </div>
              {balancePool_string == "0" ?
                <div css={css`margin: 30px 0 10px 0;display:flex;`}>
                  <InputNumber min={0.01} max={10000} defaultValue={0} stringMode step="0.01" size="large"
                  onChange={(value) =>{setamountStake(value.toString())}} />
                  <Button
                  size="large"
                  type="primary"
                  block
                  style={{}}
                  onClick={() => {
                    tx(writeContracts.Bank.deposit({ value: parseEther(amountStake) }));
                  }}
                >
                  Stake ETH
                </Button>
                </div>
                  
              :
              <div css={css`margin: 30px 0 10px 0;display:flex;`}>
                <Button
                  block
                  size="large"
                    type="primary"
                    onClick={() => {
                      tx(writeContracts.Bank.withdraw());
                    }}
                  >
                    Unstake
                  </Button>
              </div>
                  
              }
              
            </Card>
            <Card          className="card"    title="Earn DEEP"           description="Stake DEEP"              extra={
                <a target="_blank" href={`https://kovan.etherscan.io/address/${readContracts && readContracts.Bank.address}`}>
                Contract
              </a>
              }
              style={{ width: 400, margin: "20px 0", }}
              headStyle={{textAlign:"left"}}
              css={css`p,h3{margin:0;}`}
            >
              <p style={{color:"gray"}}>Stake DEEP</p>
              <div style={{ display: "flex", justifyContent: "space-between" ,    alignItems: "center", margin:"15px 0" }}>
                <p>APR: </p>
                <h3>500%</h3>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",alignItems: "center", margin:"15px 0" }}>
                <p>DEEP Staking:</p>
                <h3 css={css`padding:0;`}><Balance balance={balancePool_token}  /></h3>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",alignItems: "center", margin:"15px 0" }}>
                <p>DEEP Earned:</p>
                
                {/* // <p>DEEP Earned(estimated): {humanizeDuration(timePool.toNumber())}</p> */}
                {reward_token && <h3>{formatEther(reward_token).substr(0,6)}</h3>} 
              </div>
              {balancePool_token_string == "0" ?
                <div css={css`margin: 30px 0 10px 0;display:flex;`}>
                  <InputNumber min={0.01} max={10000} defaultValue={0} stringMode step="0.01" size="large"
                  onChange={(value) =>{setamountStake_token(value.toString())}} />
                  <Button
                  size="large"
                  type="primary"
                  block
                  onClick={() => {
                    tx(writeContracts.Bank.deposit_token(parseEther(amountStake_token)));
                  }}
                >
                  Stake DEEP
                </Button>
                </div>
                  
              :
              <div css={css`margin: 30px 0 10px 0;display:flex;`}>
                <Button
                  block
                  size="large"
                    type="primary"
                    onClick={() => {
                      tx(writeContracts.Bank.withdraw_token());
                    }}
                  >
                    Unstake
                  </Button>
              </div>
                  
              }
              
            </Card>
            </div>
            
            {/* <Contract
              name="Token"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            /> */}
            <EventContainer>
              <div style={{ width: 500, margin: "auto", marginTop: 64 }}>
                <div>Stake Events:</div>
                <List
                  dataSource={poolDepositEvent}
                  renderItem={item => {
                    return (
                      <List.Item key={item[0] + item[1] + item.blockNumber}>
                        <Address value={item[0]} ensProvider={mainnetProvider} fontSize={16} /> =&gt;
                        <Balance balance={item[1]} />
                      </List.Item>
                    );
                  }}
                />
              </div>
              <div style={{ width: 500, margin: "auto", marginTop: 64 }}>
                <div>Withdraw Events:</div>
                <List
                  dataSource={poolWithdrawEvent}
                  renderItem={item => {
                    return (
                      <List.Item key={item[0] + item[1] + item.blockNumber}>
                        <Address value={item[0]} ensProvider={mainnetProvider} fontSize={16} /> =&gt;
                        <Balance balance={item[1]} />
                      </List.Item>
                    );
                  }}
                />
              </div>
            </EventContainer>

            
          </Route>

          <Route path="/swap">
          <h2
                css={css`
                  color: white;
                  margin-top: 20px;
                `}
              >
                Swap our token
              </h2>
            <div css={css`display:flex; justify-content:space-evenly;`}>
            <Card       className="card"       title="Buy DEEP"    extra={
                <a target="_blank" href={`https://kovan.etherscan.io/address/${readContracts && readContracts.Token.address}`}>
                Token
              </a>
              }
              style={{ width: 400, margin: "20px 0", }}
              headStyle={{textAlign:"left"}}
              css={css`p,h3{margin:0;}`}
            >
              <p style={{color:"gray"}}>100 Tokens per ETH</p>
              <div style={{ display: "flex", justifyContent: "space-between",alignItems: "center", margin:"15px 0" }}>
                <p>ETH amount:</p>
                <InputNumber min={0.01} max={10000} defaultValue={0} step="0.01" size="large"
                  onChange={(value) =>{setamountSwap(value)}} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",alignItems: "center", margin:"15px 0" }}>
                <p>DEEP you get:</p>
                
                {/* // <p>DEEP Earned(estimated): {humanizeDuration(timePool.toNumber())}</p> */}
                <h3>{amountSwap *100}</h3>
              </div>
              <div css={css`margin: 30px 0 10px 0;display:flex;`}>
                  <Button
                  size="large"
                  type="primary"
                  block
                  style={{}}
                  onClick={() => {
                    tx(writeContracts.Bank.buyToken({ value: parseEther(amountSwap.toString()) }));
                  }}
                  >
                  Buy DEEP
                </Button>
              </div>
              
            </Card>
            <Card       className="card"       title="Sell DEEP"    extra={
                <a target="_blank" href={`https://kovan.etherscan.io/address/${readContracts && readContracts.Token.address}`}>
                  Token
                </a>
              }
              style={{ width: 400, margin: "20px 0", }}
              headStyle={{textAlign:"left"}}
              css={css`p,h3{margin:0;}`}
            >
              <p style={{color:"gray"}}>100 Tokens per ETH</p>
              <div style={{ display: "flex", justifyContent: "space-between",alignItems: "center", margin:"15px 0" }}>
                <p>DEEP amount:</p>
                <InputNumber min={0.01} max={10000} defaultValue={0} step="0.01" size="large"
                  onChange={(value) =>{setamountSwap_deep(value)}} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",alignItems: "center", margin:"15px 0" }}>
                <p>ETH you get:</p>
                
                {/* // <p>DEEP Earned(estimated): {humanizeDuration(timePool.toNumber())}</p> */}
                <h3>{amountSwap_deep /100}</h3>
              </div>
              <div css={css`margin: 30px 0 10px 0;display:flex;`}>
                  <Button
                  size="large"
                  type="primary"
                  block
                  style={{}}
                  onClick={() => {
                    tx(writeContracts.Bank.sellToken(parseEther(amountSwap_deep.toString())));
                  }}
                  >
                  Sell DEEP
                </Button>
              </div>
              
            </Card>
            </div>
            <EventContainer>
              <div style={{ width: 500, margin: "auto", marginTop: 64 }}>
                <div>BuyToken Events:</div>
                <List
                  dataSource={buyTokenEvent}
                  renderItem={item => {
                    return (
                      <List.Item key={item[0] + item[1] + item.blockNumber}>
                        <Address value={item[0]} ensProvider={mainnetProvider} fontSize={16} /> =&gt;
                        {/* <Balance balance={item[1]} /> */}
                        <Balance balance={item[2]} /> DEEP
                      </List.Item>
                    );
                  }}
                />
              </div>
              <div style={{ width: 500, margin: "auto", marginTop: 64 }}>
                <div>SellToken Events:</div>
                <List
                  dataSource={sellTokenEvent}
                  renderItem={item => {
                    return (
                      <List.Item key={item[0] + item[1] + item.blockNumber}>
                        <Address value={item[0]} ensProvider={mainnetProvider} fontSize={16} /> =&gt;
                        <Balance balance={item[2]} /> DEEP
                      </List.Item>
                    );
                  }}
                />
              </div>
            </EventContainer>
            {/* <Contract
              name="Bank"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            /> */}
            {/* <Contract
              name="Token"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            /> */}
          </Route>
          
        </Switch>
      </BrowserRouter>

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div
        style={{ position: "absolute", textAlign: "right", right: 0, top: 0, padding: 10, color: "white" }}
        css={css`
          .ant-typography a {
            color: white !important;
          }
        `}
      >
        <Account
          address={address}
          localProvider={localProvider}
          userProvider={userProvider}
          mainnetProvider={mainnetProvider}
          price={price}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
        />
        {faucetHint}
      </div>

      <div style={{ marginTop: 32, opacity: 0.8 }}>
        Created by{" "}
        <Address value={"0x2F2fbBA74D01787f037f54C03bC7Be71E1CE4eB4"} ensProvider={mainnetProvider} fontSize={16} style={{color:"white"}}/>
      </div>

      <div style={{ marginTop: 32, opacity: 0.8 }}>
        <a
          target="_blank"
          style={{ color: "white" }}
          href="https://github.com/austintgriffith/scaffold-eth"
        >
          🍴 Fork me!
        </a>
      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>
          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            <Button
              onClick={() => {
                window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button>
          </Col>
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {
              /*  if the local provider has a signer, let's show the faucet:  */
              localProvider &&
              localProvider.connection &&
              localProvider.connection.url &&
              localProvider.connection.url.indexOf(window.location.hostname) >= 0 &&
              !process.env.REACT_APP_PROVIDER &&
              price > 1 ? (
                <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>
    </div>
  );
}

/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

window.ethereum &&
  window.ethereum.on("chainChanged", chainId => {
    setTimeout(() => {
      window.location.reload();
    }, 1);
  });

export default App;
