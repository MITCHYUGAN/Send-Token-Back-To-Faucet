import { ChangeEvent, Component, MouseEvent, ReactNode, useState } from "react";
import { Coin, StargateClient, SigningStargateClient } from "@cosmjs/stargate";
import { AccountData, OfflineSigner } from "@cosmjs/proto-signing"
import { ChainInfo, Window as KeplrWindow } from "@keplr-wallet/types";
import styles from '../styles/Home.module.css'

declare global {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Window extends KeplrWindow {}
}

interface FaucetSenderState {
    denom: string
    faucetBalance: string
    chainID: string
    myAddress: string
    myBalance: string
    toSend: string
    TxHash: string
    gasUsed: number
    gasWanted: number
    TxHeight: number
}

export interface FaucetSenderProps {
    faucetAddress: string
    rpcUrl: string
}


export class FaucetSender extends Component<FaucetSenderProps, FaucetSenderState> {
    // Set the initial state
    constructor(props: FaucetSenderProps){
        super(props)
        this.state = {
            denom: "Loading...",
            faucetBalance: "Loading...",
            chainID: "Loading...",
            myAddress: "Connect Keplr",
            myBalance: "Connect Keplr",
            toSend: "0",
            TxHash: "Send Token First",
            gasUsed: 0,
            gasWanted: 0,
            TxHeight: 0,
        }
        setTimeout(this.init, 200)
    }

    init = async() => this.updateFaucetBalance(
        await StargateClient.connect(this.props.rpcUrl)
    )
    

    updateFaucetBalance = async(client: StargateClient ) => {
        const balances: readonly Coin[] = await client.getAllBalances(
            this.props.faucetAddress
        )
        const getChainId: string = await client.getChainId()
        const first: Coin = balances[0]
        this.setState({
            denom: first.denom,
            faucetBalance: first.amount,
            chainID: getChainId
        })
    }
    
    // Store changed token amount to state
    onToSendChanged = (e: ChangeEvent<HTMLInputElement>) => this.setState({
        toSend: e.currentTarget.value
    })

    // Adding Chain To Keplr and Signing In with SigningStargateClient and getting address and balance
    connectChaintoKeplr = async () => {
        const { keplr } = window
        if(!keplr){
            alert("You need to install Keplr Wallet")
            return ;
        }
        // Suggest the testnet chain to Keplr
        await keplr?.experimentalSuggestChain(this.getTestnetChainInfo())

        // Get the current state and amount of tokens that we want to transfer
        const { denom, chainID, } = this.state
        const { rpcUrl } = this.props

        // Create the signing client
        const offLineSigner = window.getOfflineSigner!(chainID)
        const signingClient  = SigningStargateClient.connectWithSigner(
            rpcUrl,
            offLineSigner
        ) 
        // Get the address and balance of your user
        const account: AccountData = (await offLineSigner.getAccounts())[0]
        this.setState({
            myAddress: account.address,
            myBalance: ( await ( (await signingClient).getBalance(account.address, denom))).amount
        })

        console.log("Signing Successfull")
    }

    // When the user clicks the "send token button"
    onSendClicked = async (e: MouseEvent<HTMLButtonElement>) => {
        // Get the current state and amount of tokens that we want to transfer
        const { denom, toSend } = this.state
        const { faucetAddress, rpcUrl } = this.props
        
        // Create the signing client
        const offlineSigner: OfflineSigner = window.getOfflineSigner!("theta-testnet-001")
        const signingClient = await SigningStargateClient.connectWithSigner(
            rpcUrl,
            offlineSigner,
        )

        const account: AccountData = (await offlineSigner.getAccounts())[0]

        // Submit the transaction to send tokens to the faucet
        const sendResult = await signingClient.sendTokens(
            account.address,
            faucetAddress,
            [
                {
                    denom: denom,
                    amount: toSend,
                },
            ],
            {
                amount: [{ denom: "uatom", amount: "500" }],
                gas: "200000",
            },
        )
        // Print the result to the console
        console.log("Result: ", sendResult)

        // Update the balance in the user interface
        this.setState({
            myBalance: (await signingClient.getBalance(account.address, denom))
                .amount,
            faucetBalance: (
                await signingClient.getBalance(faucetAddress, denom)
            ).amount,
            TxHash: sendResult.transactionHash,
            gasUsed: sendResult.gasUsed,
            gasWanted: sendResult.gasWanted,
            TxHeight: sendResult.height,
        })
    }

    // Add the CosmosHub testnet Chain to Keplr
    getTestnetChainInfo = (): ChainInfo => ({
        chainId: this.state.chainID,
        chainName: this.state.chainID,
        rpc: this.props.rpcUrl,
        rest: "https://rest.sentry-01.theta-testnet.polypore.xyz/",
        bip44: {
            coinType: 118,
        },
        bech32Config: {
            bech32PrefixAccAddr: "cosmos",
            bech32PrefixAccPub: "cosmos" + "pub",
            bech32PrefixValAddr: "cosmos" + "valoper",
            bech32PrefixValPub: "cosmos" + "valoperpub",
            bech32PrefixConsAddr: "cosmos" + "valcons",
            bech32PrefixConsPub: "cosmos" + "valconspub",
        },
        currencies: [
            {
                coinDenom: "ATOM",
                coinMinimalDenom: this.state.denom,
                coinDecimals: 6,
                coinGeckoId: "cosmos",
            },
            {
                coinDenom: "THETA",
                coinMinimalDenom: "theta",
                coinDecimals: 0,
            },
            {
                coinDenom: "LAMBDA",
                coinMinimalDenom: "lambda",
                coinDecimals: 0,
            },
            {
                coinDenom: "RHO",
                coinMinimalDenom: "rho",
                coinDecimals: 0,
            },
            {
                coinDenom: "EPSILON",
                coinMinimalDenom: "epsilon",
                coinDecimals: 0,
            },
        ], 
        feeCurrencies: [
            {
                coinDenom: "ATOM",
                coinMinimalDenom: this.state.denom,
                coinDecimals: 6,
                coinGeckoId: "cosmos",
                gasPriceStep: {
                    low: 1,
                    average: 1,
                    high: 1,
                },
            },
        ],
        stakeCurrency: {
            coinDenom: "ATOM",
            coinMinimalDenom: this.state.denom,
            coinDecimals: 6,
            coinGeckoId: "cosmos",
        },
        coinType: 118,
        features: ["stargate", "ibc-transfer", "no-legacy-stdTx"],
    })


    // The render function that draws the component at init and at state change
    render() {
        const { denom, faucetBalance, myAddress, chainID, myBalance, toSend, TxHash, gasUsed, gasWanted, TxHeight, } = this.state
        const { faucetAddress } = this.props
        console.log(toSend)

        // The web page structure itself
        return (
            <section className={styles.body}>
                <div className={styles.main}>
                    <h1 className={styles.description}>
                        Send back to the faucet
                    </h1>
                    <fieldset className={styles.card}>
                        <legend className={styles.card_heading}>Faucet</legend>
                        <p>Address: <span>{faucetAddress}</span></p>
                        <p>Balance: <span className={styles.balance}>{faucetBalance}</span></p>
                    </fieldset>
                    <fieldset className={styles.card}>
                        <legend>Your Wallet</legend>
                        <p>chainID: <span>{chainID}</span></p>
                        <p>Address: <span>{myAddress}</span></p>
                        <p>Balance: <span className={styles.balance}>{myBalance}</span></p>
                        <button className={styles.button} onClick={this.connectChaintoKeplr}>Connect Keplr</button>
                    </fieldset>
                    <fieldset className={styles.card}>
                        <legend>Send Token</legend>
                        <p>To faucet: </p>
                        <input value={toSend} type="number" onChange={this.onToSendChanged} /> 
                        <span className={styles.balance}>{denom}</span>
                        <br />
                        <br />
                        <button className={styles.button} onClick={this.onSendClicked}>Send Token</button>
                    </fieldset>
                </div>

                <div className={styles.results}>
                    <h1>Results</h1>
                    <div>
                        <p>Height: <span>{TxHeight}</span></p>
                        <p>Transaction Hash: <span>{TxHash}</span></p>
                        <p>Gas Used: <span>{gasUsed}</span></p>
                        <p>Gas Wanted: <span>{gasWanted}</span></p>
                    </div>
                </div>
            </section>
        )
    }
}