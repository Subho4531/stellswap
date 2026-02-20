export interface Token {
    symbol: string;
    name: string;
    contractId: string;
    poolId?: string;
    issuer?: string; // Classic asset issuer for trustline establishment
    decimals: number;
    icon: string;
}

export const AMM_CONTRACTS: Record<string, string> = {
    USDC: "CB27PD4Z2MGCKB33ECK2JZN3YE2GLHR4SQNSQMG53SMXTFU7ARRLTWV5",
    USDT: "CDEXWEXWDK3IV6EPNXTD6Z5HYK2RZHSAYG65SBVQGLNWVADBUWKWKOGR",
    SOL: "CD2W4QVZKUODJIF23FWCFD4PGYW5ZD2Y2LKC4DELA4ZM47E4OHR25UA2",
    EURC: "CAW63CFECTMHALGVODOXYBL2RPA3VQLRKDJIX4MFZ6SRD3YF5CEQZQHU",
    ETH: "CDTKTNWRP64JAAG72EINHQO4P7SSR6TEV7RH2M72ZZ2HMBNSI7ISGP7S",
};

export const TOKENS: Token[] = [
    {
        symbol: "XLM",
        name: "Stellar Lumens",
        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/stellar-xlm-logo.png",
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        contractId: "CBXR2752JBTXWCQXUAJ264TR3NDBCQNBXYRPFER2YHDWS2ZOMGOMNPTC",
        poolId: AMM_CONTRACTS.USDC,
        issuer: "GBPYULP2X3CPBZAMQITGBQWBZVO2ZOSEYEVGJCSYCUS7QFTX2V7NAV3X",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    },
    {
        symbol: "USDT",
        name: "Tether",
        contractId: "CAPNRKMHZHNCZ7K4UTSGR4GJVG54RSRFP3CPM7QJAVPE6V3A76TFDQ6E",
        poolId: AMM_CONTRACTS.USDT,
        issuer: "GD3HL7FB54XR3Q324PBIQAZNXSZULUCVL2BMYCBXZ6TIJXKUY4NUXFOS",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    },
    {
        symbol: "SOL",
        name: "Solana",
        contractId: "CCF3V7EDMPEUOVFJU7Y6PWF53SR46NQ6D27HPFYIDDS5KS3V6XNACXET",
        poolId: AMM_CONTRACTS.SOL,
        issuer: "GCJTAJW4XG3FMNMEORF46SXY3ZDWCHP5IDM4WA7BWUXOLRMZKFDCOLWI",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
    },
    {
        symbol: "EURC",
        name: "Euro Coin",
        contractId: "CBUKMCMIFNFHE66QUIYCNIZ3AUYLWJMY24F2RNHRIMVSD4GHM7QGMLC5",
        poolId: AMM_CONTRACTS.EURC,
        issuer: "GAIKKRQIQI5SSOHY2MSEYSUHBNHQI3DIJNXVBYRD2ZTCZBFZOLDC7JC4",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/euro-coin-eurc-logo.png",
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        contractId: "CDA2W5WTX4VVEMDFZ33VO4BE3RMJA4TZ3OZ2ZH3MYGUW3C4H4JLZ2IDR",
        poolId: AMM_CONTRACTS.ETH,
        issuer: "GAUDELCA4ELNESSXGAIF22KJ3KID2OFHBLI2APRQG27KMZ3QRHOJNJUC",
        decimals: 7,
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    }
];
