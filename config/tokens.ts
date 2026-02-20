export interface Token {
    symbol: string;
    name: string;
    decimals: number;
    icon: string;
}

export const TOKENS: Token[] = [
    {
        symbol: "XLM",
        name: "Stellar Lumens",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/stellar-xlm-logo.png",
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    },
    {
        symbol: "USDT",
        name: "Tether",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    },
    {
        symbol: "SOL",
        name: "Solana",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
    },
    {
        symbol: "EURC",
        name: "Euro Coin",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/euro-coin-eurc-logo.png",
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    }
];
