use anchor_lang::prelude::*;

declare_id!("7L4m3nKBzAprH6L18nXHngA1djPAmYYt1XZVu7RqW8V1");

pub const TOTAL_VALUE_UNITS: u64 = 1_000_000;
pub const BPS_DENOMINATOR: u64 = 10_000;

pub const PROTOCOL_STATE_SEED: &[u8] = b"protocol_state";
pub const PROPERTY_SEED: &[u8] = b"property";
pub const USUFRUCT_POSITION_SEED: &[u8] = b"usufruct_position";
pub const LISTING_SEED: &[u8] = b"listing";
pub const ESCROW_AUTHORITY_SEED: &[u8] = b"escrow_authority";
pub const VALUE_MINT_AUTHORITY_SEED: &[u8] = b"value_mint_authority";

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

    pub fn register_property(
        ctx: Context<RegisterProperty>,
        market_value_lamports: u64,
        linked_value_bps: u16,
        metadata_hash: [u8; 32],
        documents_hash: [u8; 32],
        location_hash: [u8; 32],
    ) -> Result<()> {
        require!(market_value_lamports > 0, ErrorCode::InvalidMarketValue);
        require!(
            linked_value_bps > 0 && (linked_value_bps as u64) < BPS_DENOMINATOR,
            ErrorCode::InvalidLinkedValueBps
        );
        require!(metadata_hash != [0; 32], ErrorCode::InvalidMetadataHash);
        require!(documents_hash != [0; 32], ErrorCode::InvalidDocumentsHash);
        require!(location_hash != [0; 32], ErrorCode::InvalidLocationHash);

        let protocol_state = &mut ctx.accounts.protocol_state;
        let property = &mut ctx.accounts.property;
        let property_id = protocol_state.next_property_id;
        let linked_value_units = TOTAL_VALUE_UNITS
            .checked_mul(linked_value_bps as u64)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(ErrorCode::DivisionByZero)?;
        let free_value_units = TOTAL_VALUE_UNITS
            .checked_sub(linked_value_units)
            .ok_or(ErrorCode::MathUnderflow)?;

        property.property_id = property_id;
        property.owner = ctx.accounts.owner.key();
        property.market_value_lamports = market_value_lamports;
        property.total_value_units = TOTAL_VALUE_UNITS;
        property.linked_value_units = linked_value_units;
        property.free_value_units = free_value_units;
        property.linked_value_bps = linked_value_bps;
        property.metadata_hash = metadata_hash;
        property.documents_hash = documents_hash;
        property.location_hash = location_hash;
        property.value_mint = Pubkey::default();
        property.usufruct_position = Pubkey::default();
        property.active_listings_count = 0;
        property.total_free_value_sold = 0;
        property.active_escrowed_amount = 0;
        property.status = PropertyStatus::PendingMockVerification;
        property.bump = ctx.bumps.property;
        property.reserved = [0; 32];

        protocol_state.next_property_id = protocol_state
            .next_property_id
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(PropertyRegistered {
            property: property.key(),
            property_id,
            owner: property.owner,
            market_value_lamports,
            linked_value_bps,
            metadata_hash,
            documents_hash,
            location_hash,
        });

        Ok(())
    }

    pub fn mock_verify_property(ctx: Context<MockVerifyProperty>) -> Result<()> {
        let verifier = ctx.accounts.verifier.key();
        let protocol_state = &ctx.accounts.protocol_state;
        let property = &mut ctx.accounts.property;

        require!(
            verifier == property.owner
                || verifier == protocol_state.mock_verifier
                || verifier == protocol_state.admin,
            ErrorCode::Unauthorized
        );
        require!(
            property.status == PropertyStatus::PendingMockVerification,
            ErrorCode::PropertyNotPendingMockVerification
        );

        let old_status = property.status;
        property.status = PropertyStatus::MockVerified;

        emit!(PropertyMockVerified {
            property: property.key(),
            property_id: property.property_id,
            verifier,
        });
        emit!(PropertyStatusUpdated {
            property: property.key(),
            property_id: property.property_id,
            old_status,
            new_status: property.status,
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
        seeds = [PROTOCOL_STATE_SEED],
        bump
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterProperty<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_STATE_SEED],
        bump = protocol_state.bump
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    #[account(
        init,
        payer = owner,
        space = PropertyAccount::SPACE,
        seeds = [PROPERTY_SEED, protocol_state.next_property_id.to_le_bytes().as_ref()],
        bump
    )]
    pub property: Account<'info, PropertyAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MockVerifyProperty<'info> {
    #[account(
        seeds = [PROTOCOL_STATE_SEED],
        bump = protocol_state.bump
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    #[account(
        mut,
        seeds = [PROPERTY_SEED, property.property_id.to_le_bytes().as_ref()],
        bump = property.bump
    )]
    pub property: Account<'info, PropertyAccount>,
    pub verifier: Signer<'info>,
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

#[account]
pub struct PropertyAccount {
    pub property_id: u64,
    pub owner: Pubkey,
    pub market_value_lamports: u64,
    pub total_value_units: u64,
    pub linked_value_units: u64,
    pub free_value_units: u64,
    pub linked_value_bps: u16,
    pub metadata_hash: [u8; 32],
    pub documents_hash: [u8; 32],
    pub location_hash: [u8; 32],
    pub value_mint: Pubkey,
    pub usufruct_position: Pubkey,
    pub active_listings_count: u64,
    pub total_free_value_sold: u64,
    pub active_escrowed_amount: u64,
    pub status: PropertyStatus,
    pub bump: u8,
    pub reserved: [u8; 32],
}

impl PropertyAccount {
    pub const SPACE: usize = 300;
}

#[account]
pub struct UsufructPosition {
    pub property: Pubkey,
    pub property_id: u64,
    pub holder: Pubkey,
    pub linked_value_units: u64,
    pub linked_value_bps: u16,
    pub active: bool,
    pub bump: u8,
    pub reserved: [u8; 32],
}

impl UsufructPosition {
    pub const SPACE: usize = 124;
}

#[account]
pub struct ListingAccount {
    pub listing_id: u64,
    pub property: Pubkey,
    pub property_id: u64,
    pub seller: Pubkey,
    pub value_mint: Pubkey,
    pub seller_token_account: Pubkey,
    pub escrow_token_account: Pubkey,
    pub escrow_authority: Pubkey,
    pub amount: u64,
    pub price_lamports: u64,
    pub status: SaleStatus,
    pub bump: u8,
    pub reserved: [u8; 32],
}

impl ListingAccount {
    pub const SPACE: usize = 266;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PropertyStatus {
    PendingMockVerification,
    MockVerified,
    Tokenized,
    ActiveSale,
    SoldOut,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SaleStatus {
    Active,
    Filled,
    Cancelled,
}

#[event]
pub struct ProtocolInitialized {
    pub admin: Pubkey,
    pub mock_verifier: Pubkey,
}

#[event]
pub struct PropertyRegistered {
    pub property: Pubkey,
    pub property_id: u64,
    pub owner: Pubkey,
    pub market_value_lamports: u64,
    pub linked_value_bps: u16,
    pub metadata_hash: [u8; 32],
    pub documents_hash: [u8; 32],
    pub location_hash: [u8; 32],
}

#[event]
pub struct PropertyMockVerified {
    pub property: Pubkey,
    pub property_id: u64,
    pub verifier: Pubkey,
}

#[event]
pub struct PropertyTokenized {
    pub property: Pubkey,
    pub property_id: u64,
    pub owner: Pubkey,
    pub value_mint: Pubkey,
    pub usufruct_position: Pubkey,
    pub linked_value_units: u64,
    pub free_value_units: u64,
}

#[event]
pub struct PrimarySaleListed {
    pub listing: Pubkey,
    pub listing_id: u64,
    pub property: Pubkey,
    pub property_id: u64,
    pub seller: Pubkey,
    pub value_mint: Pubkey,
    pub escrow_token_account: Pubkey,
    pub amount: u64,
    pub price_lamports: u64,
}

#[event]
pub struct PrimarySalePurchased {
    pub listing: Pubkey,
    pub listing_id: u64,
    pub property: Pubkey,
    pub property_id: u64,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub price_lamports: u64,
}

#[event]
pub struct PrimarySaleCancelled {
    pub listing: Pubkey,
    pub listing_id: u64,
    pub property: Pubkey,
    pub property_id: u64,
    pub seller: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PropertyStatusUpdated {
    pub property: Pubkey,
    pub property_id: u64,
    pub old_status: PropertyStatus,
    pub new_status: PropertyStatus,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid market value")]
    InvalidMarketValue,
    #[msg("Invalid linked value basis points")]
    InvalidLinkedValueBps,
    #[msg("Invalid metadata hash")]
    InvalidMetadataHash,
    #[msg("Invalid documents hash")]
    InvalidDocumentsHash,
    #[msg("Invalid location hash")]
    InvalidLocationHash,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Property not found")]
    PropertyNotFound,
    #[msg("Property is not pending mock verification")]
    PropertyNotPendingMockVerification,
    #[msg("Property is not mock verified")]
    PropertyNotMockVerified,
    #[msg("Property already tokenized")]
    PropertyAlreadyTokenized,
    #[msg("Property is not tokenized")]
    PropertyNotTokenized,
    #[msg("Invalid property status")]
    InvalidPropertyStatus,
    #[msg("Invalid total units")]
    InvalidTotalUnits,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Math underflow")]
    MathUnderflow,
    #[msg("Division by zero")]
    DivisionByZero,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient free value balance")]
    InsufficientFreeValueBalance,
    #[msg("Price is zero")]
    PriceZero,
    #[msg("Invalid token program")]
    InvalidTokenProgram,
    #[msg("Invalid associated token program")]
    InvalidAssociatedTokenProgram,
    #[msg("Listing not found")]
    ListingNotFound,
    #[msg("Listing is not active")]
    ListingNotActive,
    #[msg("Buyer cannot be seller")]
    BuyerCannotBeSeller,
    #[msg("Unexpected amount")]
    UnexpectedAmount,
    #[msg("Unexpected price")]
    UnexpectedPrice,
    #[msg("Invalid seller")]
    InvalidSeller,
    #[msg("Invalid buyer")]
    InvalidBuyer,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid escrow authority")]
    InvalidEscrowAuthority,
    #[msg("Invalid escrow token account")]
    InvalidEscrowTokenAccount,
    #[msg("Invalid owner token account")]
    InvalidOwnerTokenAccount,
    #[msg("Invalid buyer token account")]
    InvalidBuyerTokenAccount,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    #[msg("Escrow close failed")]
    EscrowCloseFailed,
    #[msg("Stale local state")]
    StaleLocalState,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::AccountSerialize;

    fn serialized_len<T: AccountSerialize>(account: &T) -> usize {
        let mut data = Vec::new();
        account.try_serialize(&mut data).unwrap();
        data.len()
    }

    #[test]
    fn account_space_matches_serialized_layout() {
        let key = Pubkey::default();

        assert_eq!(
            ProtocolState::SPACE,
            serialized_len(&ProtocolState {
                admin: key,
                mock_verifier: key,
                next_property_id: 1,
                next_listing_id: 1,
                bump: 255,
                reserved: [0; 32],
            })
        );

        assert_eq!(
            PropertyAccount::SPACE,
            serialized_len(&PropertyAccount {
                property_id: 1,
                owner: key,
                market_value_lamports: 1,
                total_value_units: TOTAL_VALUE_UNITS,
                linked_value_units: 200_000,
                free_value_units: 800_000,
                linked_value_bps: 2_000,
                metadata_hash: [1; 32],
                documents_hash: [2; 32],
                location_hash: [3; 32],
                value_mint: key,
                usufruct_position: key,
                active_listings_count: 0,
                total_free_value_sold: 0,
                active_escrowed_amount: 0,
                status: PropertyStatus::PendingMockVerification,
                bump: 255,
                reserved: [0; 32],
            })
        );

        assert_eq!(
            UsufructPosition::SPACE,
            serialized_len(&UsufructPosition {
                property: key,
                property_id: 1,
                holder: key,
                linked_value_units: 200_000,
                linked_value_bps: 2_000,
                active: true,
                bump: 255,
                reserved: [0; 32],
            })
        );

        assert_eq!(
            ListingAccount::SPACE,
            serialized_len(&ListingAccount {
                listing_id: 1,
                property: key,
                property_id: 1,
                seller: key,
                value_mint: key,
                seller_token_account: key,
                escrow_token_account: key,
                escrow_authority: key,
                amount: 300_000,
                price_lamports: 60_000_000,
                status: SaleStatus::Active,
                bump: 255,
                reserved: [0; 32],
            })
        );
    }
}
