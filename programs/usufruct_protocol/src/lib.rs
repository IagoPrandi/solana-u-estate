use anchor_lang::prelude::*;

declare_id!("7L4m3nKBzAprH6L18nXHngA1djPAmYYt1XZVu7RqW8V1");

#[program]
pub mod usufruct_protocol {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        mock_verifier: Pubkey,
    ) -> Result<()> {
        let state = &mut ctx.accounts.protocol_state;
        state.admin = ctx.accounts.admin.key();
        state.mock_verifier = mock_verifier;
        state.next_property_id = 1;
        state.next_listing_id = 1;
        state.bump = ctx.bumps.protocol_state;
        state.reserved = [0; 32];

        emit!(ProtocolInitialized {
            admin: state.admin,
            mock_verifier: state.mock_verifier,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = admin,
        space = ProtocolState::SPACE,
        seeds = [b"protocol-state"],
        bump
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProtocolState {
    pub admin: Pubkey,
    pub mock_verifier: Pubkey,
    pub next_property_id: u64,
    pub next_listing_id: u64,
    pub bump: u8,
    pub reserved: [u8; 32],
}

impl ProtocolState {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 32;
}

#[event]
pub struct ProtocolInitialized {
    pub admin: Pubkey,
    pub mock_verifier: Pubkey,
}
