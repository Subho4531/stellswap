#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    token, Address, Env,
};

use crate::{StellarDex, StellarDexClient};

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

fn create_token<'a>(
    env: &'a Env,
    admin: &Address,
) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let addr = env.register_stellar_asset_contract_v2(admin.clone()).address();
    (
        token::Client::new(env, &addr),
        token::StellarAssetClient::new(env, &addr),
    )
}

fn create_dex(env: &Env) -> StellarDexClient {
    StellarDexClient::new(env, &env.register(StellarDex, ()))
}

// Rates matching the real-world deploy
const USDC_RATE: i128 = 61_900_000;
const ETH_RATE:  i128 = 121_200_000_000;

/// Seed DEX reserves by minting tokens directly into the contract
/// then calling add_liquidity to keep internal accounting correct.
fn seed(
    env:      &Env,
    dex:      &StellarDexClient,
    admin:    &Address,
    usdc_sac: &token::StellarAssetClient,
    eth_sac:  &token::StellarAssetClient,
    xlm:  i128,
    usdc: i128,
    eth:  i128,
) {
    if usdc > 0 { usdc_sac.mint(&dex.address, &usdc); }
    if eth  > 0 { eth_sac.mint(&dex.address,  &eth); }
    dex.add_liquidity(admin, &xlm, &usdc, &eth);
}

// ─────────────────────────────────────────────
//  1. INITIALISATION
// ────────────────────────────────────────────     

#[test]
fn test_init_stores_correct_state() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);

    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    let (ur, er) = dex.get_rates();
    assert_eq!(ur, USDC_RATE);
    assert_eq!(er, ETH_RATE);

    let (xr, ur2, er2) = dex.get_reserves();
    assert_eq!((xr, ur2, er2), (0, 0, 0));

    assert!(!dex.is_paused());

    let (um, em) = dex.mint_stats();
    assert_eq!((um, em), (0, 0));
}

#[test]
#[should_panic]
fn test_init_twice_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);

    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE); // must panic
}

// ─────────────────────────────────────────────
//  2. ADMIN CONTROLS
// ─────────────────────────────────────────────

#[test]
fn test_pause_and_unpause() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    dex.set_paused(&true);
    assert!(dex.is_paused());
    dex.set_paused(&false);
    assert!(!dex.is_paused());
}

#[test]
fn test_update_rates() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    dex.set_usdc_rate(&50_000_000_i128);
    dex.set_eth_rate(&100_000_000_000_i128);

    let (ur, er) = dex.get_rates();
    assert_eq!(ur, 50_000_000);
    assert_eq!(er, 100_000_000_000);
}

#[test]
fn test_transfer_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let admin     = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    dex.transfer_admin(&new_admin);
    // If admin changed correctly, further admin calls still work
    // (mock_all_auths accepts any auth)
    dex.set_usdc_rate(&42_000_000_i128);
    let (ur, _) = dex.get_rates();
    assert_eq!(ur, 42_000_000);
}

// ─────────────────────────────────────────────
//  3. MINTING
// ─────────────────────────────────────────────

#[test]
fn test_mint_usdc_balance_and_stats() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    dex.mint_usdc(&user, &1_000_i128);

    assert_eq!(usdc.balance(&user), 1_000);
    let (um, em) = dex.mint_stats();
    assert_eq!(um, 1_000);
    assert_eq!(em, 0);
}

#[test]
fn test_mint_eth_balance_and_stats() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, _)     = create_token(&env, &admin);
    let (eth,  eth_s) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    dex.mint_eth(&user, &5_i128);

    assert_eq!(eth.balance(&user), 5);
    let (um, em) = dex.mint_stats();
    assert_eq!(um, 0);
    assert_eq!(em, 5);
}

#[test]
#[should_panic]
fn test_mint_zero_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    dex.mint_usdc(&user, &0_i128);
}

#[test]
#[should_panic]
fn test_mint_while_paused_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    dex.set_paused(&true);
    dex.mint_usdc(&user, &100_i128);
}

// ─────────────────────────────────────────────
//  4. LIQUIDITY
// ─────────────────────────────────────────────

#[test]
fn test_add_liquidity_updates_reserves_and_lp() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    usdc_s.mint(&admin, &500_i128);
    eth_s.mint(&admin,  &2_i128);

    let lp = dex.add_liquidity(&admin, &1_000_000_000_i128, &500_i128, &2_i128);

    assert!(lp > 0);
    assert_eq!(dex.lp_balance(&admin), lp);
    assert_eq!(dex.total_lp(), lp);

    let (xr, ur, er) = dex.get_reserves();
    assert_eq!(xr, 1_000_000_000);
    assert_eq!(ur, 500);
    assert_eq!(er, 2);
}

#[test]
fn test_remove_liquidity_proportional_share() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    usdc_s.mint(&admin, &1_000_i128);
    eth_s.mint(&admin,  &10_i128);

    let lp = dex.add_liquidity(&admin, &6_190_000_000_i128, &1_000_i128, &10_i128);

    let half = lp / 2;
    let (xlm_out, usdc_out, eth_out) = dex.remove_liquidity(&admin, &half);

    assert!(xlm_out  > 0);
    assert!(usdc_out > 0);
    assert!(eth_out  > 0);
    assert_eq!(dex.lp_balance(&admin), lp - half);
    assert_eq!(dex.total_lp(),         lp - half);
}

#[test]
fn test_two_providers_lp_balances() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user2 = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  _)      = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    usdc_s.mint(&admin, &1_000_i128);
    let lp1 = dex.add_liquidity(&admin, &1_000_000_000_i128, &1_000_i128, &0_i128);

    usdc_s.mint(&user2, &500_i128);
    let lp2 = dex.add_liquidity(&user2, &500_000_000_i128, &500_i128, &0_i128);

    assert_eq!(dex.total_lp(),         lp1 + lp2);
    assert_eq!(dex.lp_balance(&admin), lp1);
    assert_eq!(dex.lp_balance(&user2), lp2);
}

#[test]
#[should_panic]
fn test_remove_more_lp_than_owned_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  _)      = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    usdc_s.mint(&admin, &100_i128);
    let lp = dex.add_liquidity(&admin, &0_i128, &100_i128, &0_i128);
    dex.remove_liquidity(&admin, &(lp + 1));
}

// ─────────────────────────────────────────────
//  5. SWAPS — CORRECT OUTPUT
// ─────────────────────────────────────────────

#[test]
fn test_swap_xlm_for_usdc() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 10_000_000_000, 10_000, 0);

    let xlm_in: i128 = 619_000_000; // ~61.9 XLM
    let quote = dex.quote_xlm_to_usdc(&xlm_in);
    assert!(quote > 0);

    let before = usdc.balance(&user);
    dex.swap_xlm_for_usdc(&user, &xlm_in, &0_i128);
    assert_eq!(usdc.balance(&user) - before, quote);
}

#[test]
fn test_swap_usdc_for_xlm() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 100_000_000_000, 1_000, 0);

    usdc_s.mint(&user, &100_i128);
    dex.swap_usdc_for_xlm(&user, &10_i128, &0_i128);

    assert_eq!(usdc.balance(&user), 90); // 10 spent
}

#[test]
fn test_swap_xlm_for_eth() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 1_000_000_000_000, 0, 100);

    let xlm_in: i128 = 121_200_000_000 * 10; // 10× ETH rate
    let quote = dex.quote_xlm_to_eth(&xlm_in);
    assert!(quote >= 9);

    let before = eth.balance(&user);
    dex.swap_xlm_for_eth(&user, &xlm_in, &0_i128);
    assert_eq!(eth.balance(&user) - before, quote);
}

#[test]
fn test_swap_eth_for_xlm() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 1_000_000_000_000, 0, 10);

    eth_s.mint(&user, &1_i128);
    dex.swap_eth_for_xlm(&user, &1_i128, &0_i128);
    assert_eq!(eth.balance(&user), 0);
}

#[test]
fn test_swap_usdc_for_eth_cross_pair() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 1_000_000_000_000, 10_000, 500);

    usdc_s.mint(&user, &1_000_i128);
    let before = eth.balance(&user);
    dex.swap_usdc_for_eth(&user, &100_i128, &0_i128);

    assert!(eth.balance(&user) > before);
    assert_eq!(usdc.balance(&user), 900);
}

#[test]
fn test_swap_eth_for_usdc_cross_pair() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 1_000_000_000_000, 10_000, 100);

    eth_s.mint(&user, &2_i128);
    let before = usdc.balance(&user);
    dex.swap_eth_for_usdc(&user, &1_i128, &0_i128);

    assert!(usdc.balance(&user) > before);
    assert_eq!(eth.balance(&user), 1);
}

// ─────────────────────────────────────────────
//  6. SLIPPAGE GUARDS
// ─────────────────────────────────────────────

#[test]
#[should_panic]
fn test_slippage_xlm_for_usdc_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 10_000_000_000, 1_000, 0);

    // 1 XLM gives ~0 USDC; demanding 9_999 should fail
    dex.swap_xlm_for_usdc(&user, &61_900_000_i128, &9_999_i128);
}

#[test]
#[should_panic]
fn test_slippage_usdc_for_xlm_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 10_000_000_000, 1_000, 0);

    usdc_s.mint(&user, &10_i128);
    dex.swap_usdc_for_xlm(&user, &10_i128, &999_999_999_999_i128);
}

// ─────────────────────────────────────────────
//  7. INSUFFICIENT RESERVES
// ─────────────────────────────────────────────

#[test]
#[should_panic]
fn test_swap_fails_on_empty_usdc_reserve() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    // No liquidity added
    dex.swap_xlm_for_usdc(&user, &1_000_000_i128, &0_i128);
}

#[test]
#[should_panic]
fn test_swap_fails_on_empty_eth_reserve() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    dex.swap_xlm_for_eth(&user, &1_000_000_i128, &0_i128);
}

// ─────────────────────────────────────────────
//  8. PAUSE GUARDS
// ─────────────────────────────────────────────

#[test]
#[should_panic]
fn test_swap_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 10_000_000_000, 1_000, 10);
    dex.set_paused(&true);
    dex.swap_xlm_for_usdc(&user, &61_900_000_i128, &0_i128);
}

#[test]
#[should_panic]
fn test_add_liquidity_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  _)      = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    dex.set_paused(&true);
    usdc_s.mint(&admin, &100_i128);
    dex.add_liquidity(&admin, &0_i128, &100_i128, &0_i128);
}

#[test]
fn test_swap_works_after_unpause() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 10_000_000_000, 1_000, 0);

    dex.set_paused(&true);
    dex.set_paused(&false);

    let out = dex.swap_xlm_for_usdc(&user, &619_000_000_i128, &0_i128);
    assert!(out > 0);
}

// ─────────────────────────────────────────────
//  9. QUOTE ACCURACY
// ─────────────────────────────────────────────

#[test]
fn test_quote_xlm_to_usdc_reflects_fee() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    // 619 XLM  → 619_000_000 * 0.997 / 61_900_000 = 9.97 → 9
    let q = dex.quote_xlm_to_usdc(&619_000_000_i128);
    assert_eq!(q, 9);
}

#[test]
fn test_quote_usdc_to_xlm_reflects_fee() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    // 9 USDC * 0.997 * 61_900_000 = 554_877_300
    let q = dex.quote_usdc_to_xlm(&9_i128);
    assert_eq!(q, 554_877_300);
}

#[test]
fn test_quote_eth_large_amount() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (usdc, _) = create_token(&env, &admin);
    let (eth,  _) = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);

    // 10× ETH worth of XLM should yield ≥9 ETH after fee
    let q = dex.quote_xlm_to_eth(&(ETH_RATE * 10));
    assert!(q >= 9);
}

// ─────────────────────────────────────────────
//  10. RESERVE ACCOUNTING INTEGRITY
// ─────────────────────────────────────────────

#[test]
fn test_reserves_update_correctly_after_xlm_usdc_swap() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 10_000_000_000, 5_000, 0);

    let (xlm_before, usdc_before, _) = dex.get_reserves();
    let xlm_in: i128 = 619_000_000;
    let usdc_out = dex.swap_xlm_for_usdc(&user, &xlm_in, &0_i128);

    let (xlm_after, usdc_after, _) = dex.get_reserves();
    assert_eq!(xlm_after,  xlm_before  + xlm_in);
    assert_eq!(usdc_after, usdc_before - usdc_out);
}

#[test]
fn test_reserves_update_correctly_after_eth_swap() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user  = Address::generate(&env);
    let (usdc, usdc_s) = create_token(&env, &admin);
    let (eth,  eth_s)  = create_token(&env, &admin);
    let dex = create_dex(&env);
    dex.initialize(&admin, &usdc.address, &eth.address, &USDC_RATE, &ETH_RATE);
    seed(&env, &dex, &admin, &usdc_s, &eth_s, 1_000_000_000_000, 0, 100);

    let (xlm_before, _, eth_before) = dex.get_reserves();
    let xlm_in: i128 = ETH_RATE * 10;
    let eth_out = dex.swap_xlm_for_eth(&user, &xlm_in, &0_i128);

    let (xlm_after, _, eth_after) = dex.get_reserves();
    assert_eq!(xlm_after, xlm_before + xlm_in);
    assert_eq!(eth_after, eth_before - eth_out);
}