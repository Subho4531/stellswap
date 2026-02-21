export interface Token {
    symbol: string;
    name: string;
    decimals: number;
    icon: string;
    contractId: string;
}

export const TOKENS: Token[] = [
    {
        symbol: "XLM",
        name: "Stellar Lumens",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/stellar-xlm-logo.png",
        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", // Native XLM Soroban ID
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
        contractId: process.env.NEXT_PUBLIC_USDC_TOKEN_ID || "",
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        contractId: process.env.NEXT_PUBLIC_ETH_TOKEN_ID || "",
    }
];
