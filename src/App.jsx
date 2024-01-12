import { useState, useEffect } from "react";
import { SignClient } from "@walletconnect/sign-client";
import { Web3Modal } from "@web3modal/standalone";
import { Verifier } from "bip322-js";

// Create your wallet connect project here at https://cloud.walletconnect.com/app
// and replace the projectId below with your dapp's projectId
const projectId = 'dappProjectId';
const web3Modal = new Web3Modal({
  projectId,
  walletConnectVersion: 2,
});

const getAddressFromAccount = (accountString) => {
  const parts = accountString.split(":");
  return parts.length === 3 ? parts[2] : null;
};
function App() {
  //const [initialized, setInitialized] = useState({ status: false });

  const [signClient, setSignClient] = useState();
  const [session, setSession] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [chains, setChains] = useState([]);
  const [account, setAccount] = useState();
  const [txnUrl, setTxnUrl] = useState();
 

  console.log(namespaces, chains);
  // Setup Wallet Connect Signer
  async function createClient() {
    try {
      const signClient = await SignClient.init({
        projectId,
        metadata: {
          description: "Earth Wallet Demo",
          url: "http://localhost:3000",
          icons: ["yourlogo.jpg"],
          name: "Your dApp here",
        },
      });
      if (signClient.session.length) {
        const lastKeyIndex = signClient.session.keys.length - 1;
        const _session = signClient.session.get(
          signClient.session.keys[lastKeyIndex]
        );
        console.log("RESTORED SESSION:", _session);
        parseSession(_session);
      }
      setSignClient(signClient);
      await subscribeToEvents(signClient);
    } catch (e) {
      console.log(e);
    }
  }
  const parseSession = (session) => {
    setSession(session);
    console.log("Established session:", session);
    const allNamespaceAccounts = Object.values(session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat();
    const allNamespaceChains = Object.keys(session.namespaces);
    setNamespaces(session.namespaces);
    setAccount(allNamespaceAccounts[0]);
    setChains(allNamespaceChains);
  };

  // Intiate Wallet Connection and pass pairing uri to modal
  async function connectWallet() {
    if (!signClient) throw Error("Client is not set");
    try {
      const requiredNamespaces = {
        bip122: {
          methods: [
            "btc_send",
            "btc_signMessage",
            "btc_signPsbt",
            "btc_inscribe",
          ],
          chains: ["bip122:000000000019d6689c085ae165831e93"],
          events: [],
        },
      };
      const { uri, approval } = await signClient.connect({
        requiredNamespaces,
      });

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

  const btc_inscribe = async () => {
    const payee = getAddressFromAccount(account); //for now self or dapp owner

    if (!signClient || !account)
      throw Error("No sign client or No Selected Account found");
    const content = {
      data: "earthwallet.io",
      mime: "text/plain;charset=utf-8",
    };
    const websiteFee = {
      websiteFeeInSats: 75000,
      websiteFeeReceiver: payee,
    };
    const inscriptionReceiver = getAddressFromAccount(account); // self
    const tx = {
      fromAddress: getAddressFromAccount(account),
      content,
      websiteFee,
      inscriptionReceiver,
    };
    try {
      // {commitTxId, revealTxId}
      const result = await signClient.request({
        topic: session.topic,
        chainId: "bip122:000000000019d6689c085ae165831e93",
        request: {
          method: "btc_inscribe",
          params: tx,
        },
      });
      console.log({ result });
      if(result.revealTxId != null){
        setTxnUrl(result.revealTxId);
      }
    } catch (e) {
      console.log(e);
    }
  };

  async function btc_send() {
    if (!account.length) throw Error("No account found");
    try {
      const result = await signClient.request({
        topic: session.topic,
        chainId: "bip122:000000000019d6689c085ae165831e93",
        request: {
          method: "btc_send",
          params: {
            fromAddress: getAddressFromAccount(account),
            inscriptionId: "",
            recipientAddress:
              "bc1pw7n03u20zu59cglupwuvkzy9hv4cjg7tj4mu84wc3qreryf2uh0qexzwlz",
            recipientAmount: 0.000012,
            feeRate: 10,
            payFee: false,
          },
        },
      });
      console.log({ result });
      setTxnUrl(result);
    } catch (e) {
      console.log(e);
    }
  }

  async function btc_signMessage() {
    if (!account.length) throw Error("No account found");
    try {
      const address = getAddressFromAccount(account);
      const message = "hello";
      const signature = await signClient.request({
        topic: session.topic,
        chainId: "bip122:000000000019d6689c085ae165831e93",
        request: {
          method: "btc_signMessage",
          params: {
            fromAddress: address,
            message: "hello",
          },
        },
      });
      console.log({ signature });
      const verify = Verifier.verifySignature(address, message, signature);
      if (verify) alert("Signature received and verified as true");
      else alert("Signature received but not verified as false");
    } catch (e) {
      console.log(e);
    }
  }

  async function btc_signPsbt() {
    if (!account.length) throw Error("No account found");
    try {
      const result = await signClient.request({
        topic: session.topic,
        chainId: "bip122:000000000019d6689c085ae165831e93",
        request: {
          method: "btc_signPsbt",
          params: {
            fromAddress: getAddressFromAccount(account),
            psbt: "??",
          },
        },
      });
      console.log({ result });
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
  };

  useEffect(() => {
    if (!signClient) {
      createClient();
    }
  }, [signClient]);

  return (
    <div className="App">
      <h1>Bitcoin Wallet Connect v2 Demo</h1>
      <p>
        Click the button and scan the QR code from your Earth Wallet mobile app.
      </p>
      <p>
        Select a Bitcoin address to securely interact with Bitcoin decentralized
        apps, Ethereum style!
      </p>
      {account ? (
        <>
          <p>{account}</p>
          <button onClick={btc_send}>Send Bitcoin</button>
          <button onClick={btc_signMessage}>Sign Message Bitcoin</button>
          <button onClick={btc_signPsbt}>Sign PSBT</button>
          <button onClick={btc_inscribe}>Inscribe on Bitcoin</button>
          <button onClick={disconnectWallet}>Disconnect</button>
          {txnUrl && (
            <h2>
              Check out your transaction{" "}
              <a
                href={`https://mempool.space/tx/${txnUrl.hash}`}
                target="_blank"
                rel="noreferrer"
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

export default App;
