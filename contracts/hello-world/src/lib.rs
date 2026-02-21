#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, contractevent,
    token, Address, Env, Symbol, symbol_short,
    panic_with_error,
};

// ─────────────────────────────────────────────
//  Storage Keys
// ─────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    XlmToken,
    UsdcToken,
    EthToken,
    XlmReserve,
    UsdcReserve,
    EthReserve,
    UsdcRate,
    EthRate,
    TotalUsdcMinted,
    TotalEthMinted,
    LpBalance(Address),
    TotalLp,
    Paused,
}

// ─────────────────────────────────────────────
//  Error Codes  ← #[contracterror] is REQUIRED for panic_with_error!
// ─────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DexError {
    NotAdmin          = 1,
    ZeroAmount        = 2,
    InsufficientFunds = 3,
    SlippageExceeded  = 4,
    ContractPaused    = 5,
    AlreadyInit       = 6,
    BadToken          = 7,
    InsufficientLp    = 8,
}

// ─────────────────────────────────────────────
//  Events  ← #[contractevent] with .publish(&env)
// ─────────────────────────────────────────────
#[contractevent]
pub struct SwapEvent {
    #[topic]
    pub from_token: Symbol,
    #[topic]
    pub to_token:   Symbol,
    pub amount_in:  i128,
    pub amount_out: i128,
}

#[contractevent]
pub struct MintEvent {
    #[topic]
    pub token:  Symbol,
    pub to:     Address,
    pub amount: i128,
}

#[contractevent]
pub struct LiquidityEvent {
    #[topic]
    pub action:      Symbol,
    pub provider:    Address,
    pub xlm_amount:  i128,
    pub usdc_amount: i128,
    pub eth_amount:  i128,
    pub lp_shares:   i128,
}

// ─────────────────────────────────────────────
//  Contract
// ─────────────────────────────────────────────
#[contract]
pub struct StellarDex;

#[contractimpl]
impl StellarDex {

    // ═══════════════════════════════════════
    //  INITIALISATION
    // ═══════════════════════════════════════
    pub fn initialize(
        env: Env,
        admin: Address,
        xlm_token: Address,
        usdc_token: Address,
        eth_token: Address,
        xlm_per_usdc: i128,
        xlm_per_eth: i128,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, DexError::AlreadyInit);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin,     &admin);
        env.storage().instance().set(&DataKey::XlmToken,  &xlm_token);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::EthToken,  &eth_token);
        env.storage().instance().set(&DataKey::XlmReserve,  &0_i128);
        env.storage().instance().set(&DataKey::UsdcReserve, &0_i128);
        env.storage().instance().set(&DataKey::EthReserve,  &0_i128);
        env.storage().instance().set(&DataKey::UsdcRate, &xlm_per_usdc);
        env.storage().instance().set(&DataKey::EthRate,  &xlm_per_eth);
        env.storage().instance().set(&DataKey::TotalUsdcMinted, &0_i128);
        env.storage().instance().set(&DataKey::TotalEthMinted,  &0_i128);
        env.storage().instance().set(&DataKey::TotalLp,          &0_i128);
        env.storage().instance().set(&DataKey::Paused,            &false);
    }

    // ═══════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════
    pub fn set_paused(env: Env, paused: bool) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::Paused, &paused);
    }

    pub fn set_usdc_rate(env: Env, xlm_per_usdc: i128) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::UsdcRate, &xlm_per_usdc);
    }

    pub fn set_eth_rate(env: Env, xlm_per_eth: i128) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::EthRate, &xlm_per_eth);
    }

    pub fn transfer_admin(env: Env, new_admin: Address) {
        Self::require_admin(&env);
        new_admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    /// Set the XLM SAC token address (admin only, for post-deploy setup)
    pub fn set_xlm_token(env: Env, xlm_token: Address) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
    }

    /// Upgrade contract WASM in-place (admin only)
    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        Self::require_admin(&env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    // ═══════════════════════════════════════
    //  MINTING
    // ═══════════════════════════════════════
    pub fn mint_usdc(env: Env, to: Address, amount: i128) {
        Self::require_admin(&env);
        Self::require_not_paused(&env);
        if amount <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::StellarAssetClient::new(&env, &usdc).mint(&to, &amount);

        let prev: i128 = env.storage().instance().get(&DataKey::TotalUsdcMinted).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalUsdcMinted, &(prev + amount));

        MintEvent { token: symbol_short!("usdc"), to, amount }.publish(&env);
    }

    pub fn mint_eth(env: Env, to: Address, amount: i128) {
        Self::require_admin(&env);
        Self::require_not_paused(&env);
        if amount <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let eth: Address = env.storage().instance().get(&DataKey::EthToken).unwrap();
        token::StellarAssetClient::new(&env, &eth).mint(&to, &amount);

        let prev: i128 = env.storage().instance().get(&DataKey::TotalEthMinted).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalEthMinted, &(prev + amount));

        MintEvent { token: symbol_short!("eth"), to, amount }.publish(&env);
    }

    // ═══════════════════════════════════════
    //  LIQUIDITY
    // ═══════════════════════════════════════
    pub fn add_liquidity(
        env: Env,
        provider: Address,
        xlm_amount: i128,
        usdc_amount: i128,
        eth_amount: i128,
    ) -> i128 {
        provider.require_auth();
        Self::require_not_paused(&env);
        if xlm_amount <= 0 && usdc_amount <= 0 && eth_amount <= 0 {
            panic_with_error!(&env, DexError::ZeroAmount);
        }

        if xlm_amount > 0 {
            let xlm: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
            token::Client::new(&env, &xlm)
                .transfer(&provider, &env.current_contract_address(), &xlm_amount);
        }
        if usdc_amount > 0 {
            let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
            token::Client::new(&env, &usdc)
                .transfer(&provider, &env.current_contract_address(), &usdc_amount);
        }
        if eth_amount > 0 {
            let eth: Address = env.storage().instance().get(&DataKey::EthToken).unwrap();
            token::Client::new(&env, &eth)
                .transfer(&provider, &env.current_contract_address(), &eth_amount);
        }

        let xlm_res: i128  = env.storage().instance().get(&DataKey::XlmReserve).unwrap_or(0);
        let usdc_res: i128 = env.storage().instance().get(&DataKey::UsdcReserve).unwrap_or(0);
        let eth_res: i128  = env.storage().instance().get(&DataKey::EthReserve).unwrap_or(0);

        env.storage().instance().set(&DataKey::XlmReserve,  &(xlm_res  + xlm_amount));
        env.storage().instance().set(&DataKey::UsdcReserve, &(usdc_res + usdc_amount));
        env.storage().instance().set(&DataKey::EthReserve,  &(eth_res  + eth_amount));

        let usdc_rate: i128 = env.storage().instance().get(&DataKey::UsdcRate).unwrap();
        let eth_rate: i128  = env.storage().instance().get(&DataKey::EthRate).unwrap();
        let lp_shares = xlm_amount
            + (usdc_amount * usdc_rate)
            + (eth_amount  * eth_rate);

        let total_lp: i128 = env.storage().instance().get(&DataKey::TotalLp).unwrap_or(0);
        let prev_bal: i128 = env.storage().persistent()
            .get(&DataKey::LpBalance(provider.clone())).unwrap_or(0);

        env.storage().instance().set(&DataKey::TotalLp, &(total_lp + lp_shares));
        env.storage().persistent()
            .set(&DataKey::LpBalance(provider.clone()), &(prev_bal + lp_shares));

        LiquidityEvent {
            action: symbol_short!("add"),
            provider,
            xlm_amount,
            usdc_amount,
            eth_amount,
            lp_shares,
        }.publish(&env);
        lp_shares
    }

    pub fn remove_liquidity(env: Env, provider: Address, lp_amount: i128) -> (i128, i128, i128) {
        provider.require_auth();
        Self::require_not_paused(&env);
        if lp_amount <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let bal: i128 = env.storage().persistent()
            .get(&DataKey::LpBalance(provider.clone())).unwrap_or(0);
        if bal < lp_amount { panic_with_error!(&env, DexError::InsufficientLp); }

        let total_lp: i128 = env.storage().instance().get(&DataKey::TotalLp).unwrap();
        let xlm_res: i128  = env.storage().instance().get(&DataKey::XlmReserve).unwrap();
        let usdc_res: i128 = env.storage().instance().get(&DataKey::UsdcReserve).unwrap();
        let eth_res: i128  = env.storage().instance().get(&DataKey::EthReserve).unwrap();

        let xlm_out  = (lp_amount * xlm_res)  / total_lp;
        let usdc_out = (lp_amount * usdc_res) / total_lp;
        let eth_out  = (lp_amount * eth_res)  / total_lp;

        env.storage().instance().set(&DataKey::XlmReserve,  &(xlm_res  - xlm_out));
        env.storage().instance().set(&DataKey::UsdcReserve, &(usdc_res - usdc_out));
        env.storage().instance().set(&DataKey::EthReserve,  &(eth_res  - eth_out));
        env.storage().instance().set(&DataKey::TotalLp,      &(total_lp - lp_amount));
        env.storage().persistent()
            .set(&DataKey::LpBalance(provider.clone()), &(bal - lp_amount));

        if xlm_out > 0 {
            let xlm: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
            token::Client::new(&env, &xlm)
                .transfer(&env.current_contract_address(), &provider, &xlm_out);
        }
        if usdc_out > 0 {
            let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
            token::Client::new(&env, &usdc)
                .transfer(&env.current_contract_address(), &provider, &usdc_out);
        }
        if eth_out > 0 {
            let eth: Address = env.storage().instance().get(&DataKey::EthToken).unwrap();
            token::Client::new(&env, &eth)
                .transfer(&env.current_contract_address(), &provider, &eth_out);
        }

        LiquidityEvent {
            action: symbol_short!("remove"),
            provider,
            xlm_amount: xlm_out,
            usdc_amount: usdc_out,
            eth_amount: eth_out,
            lp_shares: lp_amount,
        }.publish(&env);
        (xlm_out, usdc_out, eth_out)
    }

    // ═══════════════════════════════════════
    //  SWAPS
    // ═══════════════════════════════════════
    pub fn swap_xlm_for_usdc(env: Env, buyer: Address, xlm_in: i128, min_usdc_out: i128) -> i128 {
        buyer.require_auth();
        Self::require_not_paused(&env);
        if xlm_in <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let rate: i128 = env.storage().instance().get(&DataKey::UsdcRate).unwrap();
        let usdc_out = (xlm_in * 997 / 1000) / rate;

        if usdc_out < min_usdc_out { panic_with_error!(&env, DexError::SlippageExceeded); }
        let usdc_res: i128 = env.storage().instance().get(&DataKey::UsdcReserve).unwrap();
        if usdc_res < usdc_out { panic_with_error!(&env, DexError::InsufficientFunds); }

        // Transfer XLM from buyer to contract
        let xlm: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&env, &xlm)
            .transfer(&buyer, &env.current_contract_address(), &xlm_in);

        let xlm_res: i128 = env.storage().instance().get(&DataKey::XlmReserve).unwrap();
        env.storage().instance().set(&DataKey::XlmReserve,  &(xlm_res  + xlm_in));
        env.storage().instance().set(&DataKey::UsdcReserve, &(usdc_res - usdc_out));

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::Client::new(&env, &usdc)
            .transfer(&env.current_contract_address(), &buyer, &usdc_out);

        SwapEvent { from_token: symbol_short!("xlm"), to_token: symbol_short!("usdc"), amount_in: xlm_in, amount_out: usdc_out }.publish(&env);
        usdc_out
    }

    pub fn swap_usdc_for_xlm(env: Env, seller: Address, usdc_in: i128, min_xlm_out: i128) -> i128 {
        seller.require_auth();
        Self::require_not_paused(&env);
        if usdc_in <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let rate: i128 = env.storage().instance().get(&DataKey::UsdcRate).unwrap();
        let xlm_out = (usdc_in * 997 / 1000) * rate;

        if xlm_out < min_xlm_out { panic_with_error!(&env, DexError::SlippageExceeded); }
        let xlm_res: i128 = env.storage().instance().get(&DataKey::XlmReserve).unwrap();
        if xlm_res < xlm_out { panic_with_error!(&env, DexError::InsufficientFunds); }

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::Client::new(&env, &usdc)
            .transfer(&seller, &env.current_contract_address(), &usdc_in);

        // Transfer XLM from contract to seller
        let xlm: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&env, &xlm)
            .transfer(&env.current_contract_address(), &seller, &xlm_out);

        let usdc_res: i128 = env.storage().instance().get(&DataKey::UsdcReserve).unwrap();
        env.storage().instance().set(&DataKey::XlmReserve,  &(xlm_res  - xlm_out));
        env.storage().instance().set(&DataKey::UsdcReserve, &(usdc_res + usdc_in));

        SwapEvent { from_token: symbol_short!("usdc"), to_token: symbol_short!("xlm"), amount_in: usdc_in, amount_out: xlm_out }.publish(&env);
        xlm_out
    }

    pub fn swap_xlm_for_eth(env: Env, buyer: Address, xlm_in: i128, min_eth_out: i128) -> i128 {
        buyer.require_auth();
        Self::require_not_paused(&env);
        if xlm_in <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let rate: i128 = env.storage().instance().get(&DataKey::EthRate).unwrap();
        let eth_out = (xlm_in * 997 / 1000) / rate;

        if eth_out < min_eth_out { panic_with_error!(&env, DexError::SlippageExceeded); }
        let eth_res: i128 = env.storage().instance().get(&DataKey::EthReserve).unwrap();
        if eth_res < eth_out { panic_with_error!(&env, DexError::InsufficientFunds); }

        // Transfer XLM from buyer to contract
        let xlm: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&env, &xlm)
            .transfer(&buyer, &env.current_contract_address(), &xlm_in);

        let xlm_res: i128 = env.storage().instance().get(&DataKey::XlmReserve).unwrap();
        env.storage().instance().set(&DataKey::XlmReserve, &(xlm_res + xlm_in));
        env.storage().instance().set(&DataKey::EthReserve, &(eth_res - eth_out));

        let eth: Address = env.storage().instance().get(&DataKey::EthToken).unwrap();
        token::Client::new(&env, &eth)
            .transfer(&env.current_contract_address(), &buyer, &eth_out);

        SwapEvent { from_token: symbol_short!("xlm"), to_token: symbol_short!("eth"), amount_in: xlm_in, amount_out: eth_out }.publish(&env);
        eth_out
    }

    pub fn swap_eth_for_xlm(env: Env, seller: Address, eth_in: i128, min_xlm_out: i128) -> i128 {
        seller.require_auth();
        Self::require_not_paused(&env);
        if eth_in <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let rate: i128 = env.storage().instance().get(&DataKey::EthRate).unwrap();
        let xlm_out = (eth_in * 997 / 1000) * rate;

        if xlm_out < min_xlm_out { panic_with_error!(&env, DexError::SlippageExceeded); }
        let xlm_res: i128 = env.storage().instance().get(&DataKey::XlmReserve).unwrap();
        if xlm_res < xlm_out { panic_with_error!(&env, DexError::InsufficientFunds); }

        let eth: Address = env.storage().instance().get(&DataKey::EthToken).unwrap();
        token::Client::new(&env, &eth)
            .transfer(&seller, &env.current_contract_address(), &eth_in);

        // Transfer XLM from contract to seller
        let xlm: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&env, &xlm)
            .transfer(&env.current_contract_address(), &seller, &xlm_out);

        let eth_res: i128 = env.storage().instance().get(&DataKey::EthReserve).unwrap();
        env.storage().instance().set(&DataKey::XlmReserve, &(xlm_res - xlm_out));
        env.storage().instance().set(&DataKey::EthReserve, &(eth_res  + eth_in));

        SwapEvent { from_token: symbol_short!("eth"), to_token: symbol_short!("xlm"), amount_in: eth_in, amount_out: xlm_out }.publish(&env);
        xlm_out
    }

    pub fn swap_usdc_for_eth(env: Env, swapper: Address, usdc_in: i128, min_eth_out: i128) -> i128 {
        swapper.require_auth();
        Self::require_not_paused(&env);
        if usdc_in <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let usdc_rate: i128 = env.storage().instance().get(&DataKey::UsdcRate).unwrap();
        let eth_rate:  i128 = env.storage().instance().get(&DataKey::EthRate).unwrap();
        let xlm_mid  = (usdc_in * 997 / 1000) * usdc_rate;
        let eth_out  = (xlm_mid * 997 / 1000) / eth_rate;

        if eth_out < min_eth_out { panic_with_error!(&env, DexError::SlippageExceeded); }
        let eth_res: i128 = env.storage().instance().get(&DataKey::EthReserve).unwrap();
        if eth_res < eth_out { panic_with_error!(&env, DexError::InsufficientFunds); }

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::Client::new(&env, &usdc)
            .transfer(&swapper, &env.current_contract_address(), &usdc_in);

        let usdc_res: i128 = env.storage().instance().get(&DataKey::UsdcReserve).unwrap();
        env.storage().instance().set(&DataKey::UsdcReserve, &(usdc_res + usdc_in));
        env.storage().instance().set(&DataKey::EthReserve,  &(eth_res  - eth_out));

        let eth: Address = env.storage().instance().get(&DataKey::EthToken).unwrap();
        token::Client::new(&env, &eth)
            .transfer(&env.current_contract_address(), &swapper, &eth_out);

        SwapEvent { from_token: symbol_short!("usdc"), to_token: symbol_short!("eth"), amount_in: usdc_in, amount_out: eth_out }.publish(&env);
        eth_out
    }

    pub fn swap_eth_for_usdc(env: Env, swapper: Address, eth_in: i128, min_usdc_out: i128) -> i128 {
        swapper.require_auth();
        Self::require_not_paused(&env);
        if eth_in <= 0 { panic_with_error!(&env, DexError::ZeroAmount); }

        let usdc_rate: i128 = env.storage().instance().get(&DataKey::UsdcRate).unwrap();
        let eth_rate:  i128 = env.storage().instance().get(&DataKey::EthRate).unwrap();
        let xlm_mid  = (eth_in * 997 / 1000) * eth_rate;
        let usdc_out = (xlm_mid * 997 / 1000) / usdc_rate;

        if usdc_out < min_usdc_out { panic_with_error!(&env, DexError::SlippageExceeded); }
        let usdc_res: i128 = env.storage().instance().get(&DataKey::UsdcReserve).unwrap();
        if usdc_res < usdc_out { panic_with_error!(&env, DexError::InsufficientFunds); }

        let eth: Address = env.storage().instance().get(&DataKey::EthToken).unwrap();
        token::Client::new(&env, &eth)
            .transfer(&swapper, &env.current_contract_address(), &eth_in);

        let eth_res: i128 = env.storage().instance().get(&DataKey::EthReserve).unwrap();
        env.storage().instance().set(&DataKey::EthReserve,  &(eth_res  + eth_in));
        env.storage().instance().set(&DataKey::UsdcReserve, &(usdc_res - usdc_out));

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::Client::new(&env, &usdc)
            .transfer(&env.current_contract_address(), &swapper, &usdc_out);

        SwapEvent { from_token: symbol_short!("eth"), to_token: symbol_short!("usdc"), amount_in: eth_in, amount_out: usdc_out }.publish(&env);
        usdc_out
    }

    // ═══════════════════════════════════════
    //  VIEW / QUOTE
    // ═══════════════════════════════════════
    pub fn get_rates(env: Env) -> (i128, i128) {
        let u: i128 = env.storage().instance().get(&DataKey::UsdcRate).unwrap_or(0);
        let e: i128 = env.storage().instance().get(&DataKey::EthRate).unwrap_or(0);
        (u, e)
    }

    pub fn get_reserves(env: Env) -> (i128, i128, i128) {
        let x: i128 = env.storage().instance().get(&DataKey::XlmReserve).unwrap_or(0);
        let u: i128 = env.storage().instance().get(&DataKey::UsdcReserve).unwrap_or(0);
        let e: i128 = env.storage().instance().get(&DataKey::EthReserve).unwrap_or(0);
        (x, u, e)
    }

    pub fn quote_xlm_to_usdc(env: Env, xlm_in: i128) -> i128 {
        let rate: i128 = env.storage().instance().get(&DataKey::UsdcRate).unwrap();
        (xlm_in * 997 / 1000) / rate
    }

    pub fn quote_xlm_to_eth(env: Env, xlm_in: i128) -> i128 {
        let rate: i128 = env.storage().instance().get(&DataKey::EthRate).unwrap();
        (xlm_in * 997 / 1000) / rate
    }

    pub fn quote_usdc_to_xlm(env: Env, usdc_in: i128) -> i128 {
        let rate: i128 = env.storage().instance().get(&DataKey::UsdcRate).unwrap();
        (usdc_in * 997 / 1000) * rate
    }

    pub fn quote_eth_to_xlm(env: Env, eth_in: i128) -> i128 {
        let rate: i128 = env.storage().instance().get(&DataKey::EthRate).unwrap();
        (eth_in * 997 / 1000) * rate
    }

    pub fn lp_balance(env: Env, user: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::LpBalance(user)).unwrap_or(0)
    }

    pub fn total_lp(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalLp).unwrap_or(0)
    }

    pub fn mint_stats(env: Env) -> (i128, i128) {
        let u: i128 = env.storage().instance().get(&DataKey::TotalUsdcMinted).unwrap_or(0);
        let e: i128 = env.storage().instance().get(&DataKey::TotalEthMinted).unwrap_or(0);
        (u, e)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    // ═══════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════
    fn require_admin(env: &Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused { panic_with_error!(env, DexError::ContractPaused); }
    }
}