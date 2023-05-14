import { useState, useEffect } from "react";
import { SignClient } from "@walletconnect/sign-client";
import { Web3Modal } from "@web3modal/standalone";

const web3Modal = new Web3Modal({
  projectId: '<your wallet connect id>',
  walletConnectVersion: 2
});

function App() {
  const [signClient, setSignClient] = useState();
  const [session, setSession] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [chains, setChains] = useState([]);
  const [account, setAccount] = useState();
  const [txnUrl, setTxnUrl] = useState();

  // Setup Wallet Connect Signer
  async function createClient() {
    try {
      const signClient = await SignClient.init({
        projectId: '<your wallet connect id>',
        metadata: {
          description: "Earth Wallet Demo",
          url: "http://localhost:3000",
          icons: ["yourlogo.jpg"],
          name: "Your dApp here"
        }
      });
      setSignClient(signClient);
      await subscribeToEvents(signClient);
    } catch (e) {
      console.log(e);
    }
  }

  // Intiate Wallet Connection and pass pairing uri to modal
  async function connectWallet() {
    if (!signClient) throw Error("Client is not set");
    try {
      const requiredNamespaces = {
        bip122: {
          methods: ["btc_send","btc_signMessage", "btc_signPsbt"],
          chains: ["bip122:000000000019d6689c085ae165831e93"],
          events: []
        }
      };
      const { uri, approval } = await signClient.connect({ requiredNamespaces });

      if (uri) {
        // QRCodeModal.open(uri) - Could also generate a custom QR code
        web3Modal.openModal({ uri });
        const sessionNamespace = await approval();
        onSessionConnected(sessionNamespace);
        web3Modal.closeModal();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function disconnectWallet() {
    try {
      await signClient.disconnect({
        topic: session.topic,
        message: "User disconnected",
        code: 6000,
      });
      setAccount();
      setSession([]);
      setNamespaces([]);
      setChains([]);
    } catch (e) {
      console.log(e);
    }
  }

  async function subscribeToEvents(client) {
    if (!client)
      throw Error("Unable to subscribe to events. Client does not exist.");
    try {
      client.on("session_delete", () => {
        console.log("The user has disconnected the session from their wallet.");
        setAccount();
        setSession([]);
        setNamespaces([]);
        setChains([]);
      });
    } catch (e) {
      console.log(e);
    }
  }

  async function btc_send() {
    if (!account.length) throw Error("No account found");
    try {
      const result = await signClient.request({
        topic: session.topic,
        chainId: "bip122:000000000019d6689c085ae165831e93",
        request: {
          method: "btc_send",
          params: [tx],
        },
      });
      setTxnUrl(result);
    } catch (e) {
      console.log(e);
    }
  }

  const onSessionConnected = (session) => {
    console.log("Established Session:", session);
    // setSession(session)
    setSession(session);
    
    const allNamespaceAccounts = Object.values(session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat();
    setAccount(allNamespaceAccounts[0]);
    const allNamespaceChains = Object.keys(session.namespaces);
    setChains(allNamespaceChains);
    
  }

  useEffect(() => {
    if (!signClient) {
      createClient();
    }
  }, [signClient]);

  return (
    <div className="App">
      <h1>Bitcoin Wallet Connect v2 Demo</h1>
      <p>Click the button and scan the QR code from your Earth Wallet mobile app.</p>
      <p>Select a Bitcoin address to securely interact with Bitcoin decentralized apps, Ethereum style!</p>
      {account ? (
        <>
          <p>{account}</p>
          <button onClick={btc_send}>Send Bitcoin (demo coming soon)</button>
          <button onClick={disconnectWallet}>Disconnect</button>
          {txnUrl && (
            <h2>
              Check out your transaction{" "}
              <a
                href={`https://www.blockchain.com/explorer/tx/${txnUrl}`}
                target="_blank"
              >
                here
              </a>
              !
            </h2>
          )}
        </>
      ) : (
        <button onClick={connectWallet} disabled={!signClient}>
          Connect
        </button>
      )}
    </div>
  );
}

export default App
