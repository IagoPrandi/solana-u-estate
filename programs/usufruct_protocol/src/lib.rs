use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{
    self, CloseAccount, Mint, MintTo, SetAuthority, Token, TokenAccount, TransferChecked,
};
use anchor_spl::token::spl_token::instruction::AuthorityType;

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

    pub fn tokenize_property(ctx: Context<TokenizeProperty>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.token_program.key(),
            anchor_spl::token::ID,
            ErrorCode::InvalidTokenProgram
        );
        require_keys_eq!(
            ctx.accounts.associated_token_program.key(),
            anchor_spl::associated_token::ID,
            ErrorCode::InvalidAssociatedTokenProgram
        );

        let property = &mut ctx.accounts.property;
        require!(
            property.status == PropertyStatus::MockVerified,
            ErrorCode::PropertyNotMockVerified
        );
        require!(
            property.value_mint == Pubkey::default()
                && property.usufruct_position == Pubkey::default(),
            ErrorCode::PropertyAlreadyTokenized
        );
        require!(
            property.total_value_units == TOTAL_VALUE_UNITS
                && property
                    .linked_value_units
                    .checked_add(property.free_value_units)
                    .ok_or(ErrorCode::MathOverflow)?
                    == property.total_value_units,
            ErrorCode::InvalidTotalUnits
        );
        require!(ctx.accounts.value_mint.decimals == 0, ErrorCode::InvalidDecimals);
        require!(
            ctx.accounts.value_mint.mint_authority == COption::Some(ctx.accounts.value_mint_authority.key()),
            ErrorCode::InvalidMintAuthority
        );
        require!(
            ctx.accounts.value_mint.freeze_authority == COption::None,
            ErrorCode::InvalidMintAuthority
        );

        let property_key = property.key();
        let authority_bump = ctx.bumps.value_mint_authority;
        let authority_seeds: &[&[u8]] = &[
            VALUE_MINT_AUTHORITY_SEED,
            property_key.as_ref(),
            &[authority_bump],
        ];
        let signer_seeds = &[authority_seeds];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.value_mint.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.value_mint_authority.to_account_info(),
                },
                signer_seeds,
            ),
            property.free_value_units,
        )?;

        token::set_authority(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    account_or_mint: ctx.accounts.value_mint.to_account_info(),
                    current_authority: ctx.accounts.value_mint_authority.to_account_info(),
                },
                signer_seeds,
            ),
            AuthorityType::MintTokens,
            None,
        )?;

        let usufruct_position = &mut ctx.accounts.usufruct_position;
        usufruct_position.property = property_key;
        usufruct_position.property_id = property.property_id;
        usufruct_position.holder = ctx.accounts.owner.key();
        usufruct_position.linked_value_units = property.linked_value_units;
        usufruct_position.linked_value_bps = property.linked_value_bps;
        usufruct_position.active = true;
        usufruct_position.bump = ctx.bumps.usufruct_position;
        usufruct_position.reserved = [0; 32];

        let old_status = property.status;
        property.value_mint = ctx.accounts.value_mint.key();
        property.usufruct_position = usufruct_position.key();
        property.status = PropertyStatus::Tokenized;

        emit!(PropertyTokenized {
            property: property_key,
            property_id: property.property_id,
            owner: property.owner,
            value_mint: property.value_mint,
            usufruct_position: property.usufruct_position,
            linked_value_units: property.linked_value_units,
            free_value_units: property.free_value_units,
        });
        emit!(PropertyStatusUpdated {
            property: property_key,
            property_id: property.property_id,
            old_status,
            new_status: property.status,
        });

        Ok(())
    }

    pub fn create_primary_sale_listing(
        ctx: Context<CreatePrimarySaleListing>,
        amount: u64,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.token_program.key(),
            anchor_spl::token::ID,
            ErrorCode::InvalidTokenProgram
        );
        require_keys_eq!(
            ctx.accounts.associated_token_program.key(),
            anchor_spl::associated_token::ID,
            ErrorCode::InvalidAssociatedTokenProgram
        );
        require!(amount > 0, ErrorCode::InvalidAmount);

        let property = &mut ctx.accounts.property;
        require!(
            property.status == PropertyStatus::Tokenized
                || property.status == PropertyStatus::ActiveSale,
            ErrorCode::PropertyNotTokenized
        );
        require_keys_eq!(
            ctx.accounts.value_mint.key(),
            property.value_mint,
            ErrorCode::InvalidMint
        );
        require!(
            ctx.accounts.value_mint.decimals == 0,
            ErrorCode::InvalidDecimals
        );
        require_keys_eq!(
            ctx.accounts.owner_token_account.mint,
            property.value_mint,
            ErrorCode::InvalidOwnerTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.owner_token_account.owner,
            ctx.accounts.owner.key(),
            ErrorCode::InvalidOwnerTokenAccount
        );
        require!(
            ctx.accounts.owner_token_account.amount >= amount,
            ErrorCode::InsufficientFreeValueBalance
        );

        let available_free_value = property
            .free_value_units
            .checked_sub(property.total_free_value_sold)
            .ok_or(ErrorCode::MathUnderflow)?
            .checked_sub(property.active_escrowed_amount)
            .ok_or(ErrorCode::MathUnderflow)?;
        require!(
            amount <= available_free_value,
            ErrorCode::InsufficientFreeValueBalance
        );

        let price_lamports = property
            .market_value_lamports
            .checked_mul(amount)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(property.total_value_units)
            .ok_or(ErrorCode::DivisionByZero)?;
        require!(price_lamports > 0, ErrorCode::PriceZero);

        token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.owner_token_account.to_account_info(),
                    mint: ctx.accounts.value_mint.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.value_mint.decimals,
        )?;

        let protocol_state = &mut ctx.accounts.protocol_state;
        let listing = &mut ctx.accounts.listing;
        let listing_id = protocol_state.next_listing_id;
        listing.listing_id = listing_id;
        listing.property = property.key();
        listing.property_id = property.property_id;
        listing.seller = ctx.accounts.owner.key();
        listing.value_mint = property.value_mint;
        listing.seller_token_account = ctx.accounts.owner_token_account.key();
        listing.escrow_token_account = ctx.accounts.escrow_token_account.key();
        listing.escrow_authority = ctx.accounts.escrow_authority.key();
        listing.amount = amount;
        listing.price_lamports = price_lamports;
        listing.status = SaleStatus::Active;
        listing.bump = ctx.bumps.listing;
        listing.reserved = [0; 32];

        protocol_state.next_listing_id = protocol_state
            .next_listing_id
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        let old_status = property.status;
        property.active_listings_count = property
            .active_listings_count
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        property.active_escrowed_amount = property
            .active_escrowed_amount
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;
        property.status = PropertyStatus::ActiveSale;

        emit!(PrimarySaleListed {
            listing: listing.key(),
            listing_id,
            property: property.key(),
            property_id: property.property_id,
            seller: listing.seller,
            value_mint: listing.value_mint,
            escrow_token_account: listing.escrow_token_account,
            amount,
            price_lamports,
        });
        emit!(PropertyStatusUpdated {
            property: property.key(),
            property_id: property.property_id,
            old_status,
            new_status: property.status,
        });

        Ok(())
    }

    pub fn buy_primary_sale_listing(
        ctx: Context<BuyPrimarySaleListing>,
        expected_amount: u64,
        expected_price_lamports: u64,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.token_program.key(),
            anchor_spl::token::ID,
            ErrorCode::InvalidTokenProgram
        );
        require_keys_eq!(
            ctx.accounts.associated_token_program.key(),
            anchor_spl::associated_token::ID,
            ErrorCode::InvalidAssociatedTokenProgram
        );

        let listing = &mut ctx.accounts.listing;
        let property = &mut ctx.accounts.property;
        require!(listing.status == SaleStatus::Active, ErrorCode::ListingNotActive);
        require_keys_neq!(
            ctx.accounts.buyer.key(),
            ctx.accounts.seller.key(),
            ErrorCode::BuyerCannotBeSeller
        );
        require!(
            expected_amount == listing.amount,
            ErrorCode::UnexpectedAmount
        );
        require!(
            expected_price_lamports == listing.price_lamports,
            ErrorCode::UnexpectedPrice
        );
        require_keys_eq!(
            ctx.accounts.value_mint.key(),
            listing.value_mint,
            ErrorCode::InvalidMint
        );
        require_keys_eq!(
            ctx.accounts.value_mint.key(),
            property.value_mint,
            ErrorCode::InvalidMint
        );
        require!(
            ctx.accounts.value_mint.decimals == 0,
            ErrorCode::InvalidDecimals
        );
        require_keys_eq!(
            ctx.accounts.escrow_token_account.key(),
            listing.escrow_token_account,
            ErrorCode::InvalidEscrowTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.escrow_token_account.owner,
            listing.escrow_authority,
            ErrorCode::InvalidEscrowTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.escrow_token_account.mint,
            listing.value_mint,
            ErrorCode::InvalidEscrowTokenAccount
        );
        require!(
            ctx.accounts.escrow_token_account.amount >= listing.amount,
            ErrorCode::InsufficientFreeValueBalance
        );
        require_keys_eq!(
            ctx.accounts.buyer_token_account.owner,
            ctx.accounts.buyer.key(),
            ErrorCode::InvalidBuyerTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.buyer_token_account.mint,
            listing.value_mint,
            ErrorCode::InvalidBuyerTokenAccount
        );

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            listing.price_lamports,
        )?;

        let listing_key = listing.key();
        let escrow_bump = ctx.bumps.escrow_authority;
        let escrow_seeds: &[&[u8]] = &[
            ESCROW_AUTHORITY_SEED,
            listing_key.as_ref(),
            &[escrow_bump],
        ];
        let signer_seeds = &[escrow_seeds];

        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    mint: ctx.accounts.value_mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                signer_seeds,
            ),
            listing.amount,
            ctx.accounts.value_mint.decimals,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_token_account.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer_seeds,
        ))?;

        listing.status = SaleStatus::Filled;
        property.active_listings_count = property
            .active_listings_count
            .checked_sub(1)
            .ok_or(ErrorCode::MathUnderflow)?;
        property.active_escrowed_amount = property
            .active_escrowed_amount
            .checked_sub(listing.amount)
            .ok_or(ErrorCode::MathUnderflow)?;
        property.total_free_value_sold = property
            .total_free_value_sold
            .checked_add(listing.amount)
            .ok_or(ErrorCode::MathOverflow)?;

        let old_status = property.status;
        property.status = if property.total_free_value_sold == property.free_value_units {
            PropertyStatus::SoldOut
        } else if property.active_listings_count > 0 {
            PropertyStatus::ActiveSale
        } else {
            PropertyStatus::Tokenized
        };

        emit!(PrimarySalePurchased {
            listing: listing_key,
            listing_id: listing.listing_id,
            property: property.key(),
            property_id: property.property_id,
            buyer: ctx.accounts.buyer.key(),
            seller: ctx.accounts.seller.key(),
            amount: listing.amount,
            price_lamports: listing.price_lamports,
        });
        emit!(PropertyStatusUpdated {
            property: property.key(),
            property_id: property.property_id,
            old_status,
            new_status: property.status,
        });

        Ok(())
    }

    pub fn cancel_primary_sale_listing(ctx: Context<CancelPrimarySaleListing>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.token_program.key(),
            anchor_spl::token::ID,
            ErrorCode::InvalidTokenProgram
        );
        require_keys_eq!(
            ctx.accounts.associated_token_program.key(),
            anchor_spl::associated_token::ID,
            ErrorCode::InvalidAssociatedTokenProgram
        );

        let listing = &mut ctx.accounts.listing;
        let property = &mut ctx.accounts.property;
        require!(listing.status == SaleStatus::Active, ErrorCode::ListingNotActive);
        require_keys_eq!(
            ctx.accounts.value_mint.key(),
            listing.value_mint,
            ErrorCode::InvalidMint
        );
        require_keys_eq!(
            ctx.accounts.value_mint.key(),
            property.value_mint,
            ErrorCode::InvalidMint
        );
        require!(
            ctx.accounts.value_mint.decimals == 0,
            ErrorCode::InvalidDecimals
        );
        require_keys_eq!(
            ctx.accounts.seller_token_account.key(),
            listing.seller_token_account,
            ErrorCode::InvalidOwnerTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.seller_token_account.owner,
            ctx.accounts.seller.key(),
            ErrorCode::InvalidOwnerTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.seller_token_account.mint,
            listing.value_mint,
            ErrorCode::InvalidOwnerTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.escrow_token_account.key(),
            listing.escrow_token_account,
            ErrorCode::InvalidEscrowTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.escrow_token_account.owner,
            listing.escrow_authority,
            ErrorCode::InvalidEscrowTokenAccount
        );
        require_keys_eq!(
            ctx.accounts.escrow_token_account.mint,
            listing.value_mint,
            ErrorCode::InvalidEscrowTokenAccount
        );
        require!(
            ctx.accounts.escrow_token_account.amount >= listing.amount,
            ErrorCode::InsufficientFreeValueBalance
        );

        let listing_key = listing.key();
        let escrow_bump = ctx.bumps.escrow_authority;
        let escrow_seeds: &[&[u8]] = &[
            ESCROW_AUTHORITY_SEED,
            listing_key.as_ref(),
            &[escrow_bump],
        ];
        let signer_seeds = &[escrow_seeds];

        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    mint: ctx.accounts.value_mint.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                signer_seeds,
            ),
            listing.amount,
            ctx.accounts.value_mint.decimals,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_token_account.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer_seeds,
        ))?;

        listing.status = SaleStatus::Cancelled;
        property.active_listings_count = property
            .active_listings_count
            .checked_sub(1)
            .ok_or(ErrorCode::MathUnderflow)?;
        property.active_escrowed_amount = property
            .active_escrowed_amount
            .checked_sub(listing.amount)
            .ok_or(ErrorCode::MathUnderflow)?;

        let old_status = property.status;
        property.status = if property.total_free_value_sold == property.free_value_units {
            PropertyStatus::SoldOut
        } else if property.active_listings_count > 0 {
            PropertyStatus::ActiveSale
        } else {
            PropertyStatus::Tokenized
        };

        emit!(PrimarySaleCancelled {
            listing: listing_key,
            listing_id: listing.listing_id,
            property: property.key(),
            property_id: property.property_id,
            seller: ctx.accounts.seller.key(),
            amount: listing.amount,
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

#[derive(Accounts)]
pub struct TokenizeProperty<'info> {
    #[account(
        mut,
        seeds = [PROPERTY_SEED, property.property_id.to_le_bytes().as_ref()],
        bump = property.bump,
        has_one = owner
    )]
    pub property: Account<'info, PropertyAccount>,
    #[account(
        init,
        payer = owner,
        space = UsufructPosition::SPACE,
        seeds = [USUFRUCT_POSITION_SEED, property.key().as_ref()],
        bump
    )]
    pub usufruct_position: Account<'info, UsufructPosition>,
    #[account(
        init,
        payer = owner,
        mint::decimals = 0,
        mint::authority = value_mint_authority,
        mint::token_program = token_program
    )]
    pub value_mint: Account<'info, Mint>,
    /// CHECK: PDA used only as temporary mint authority during tokenization.
    #[account(
        seeds = [VALUE_MINT_AUTHORITY_SEED, property.key().as_ref()],
        bump
    )]
    pub value_mint_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = owner,
        associated_token::mint = value_mint,
        associated_token::authority = owner,
        associated_token::token_program = token_program
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePrimarySaleListing<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_STATE_SEED],
        bump = protocol_state.bump
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    #[account(
        mut,
        seeds = [PROPERTY_SEED, property.property_id.to_le_bytes().as_ref()],
        bump = property.bump,
        has_one = owner
    )]
    pub property: Account<'info, PropertyAccount>,
    #[account(
        init,
        payer = owner,
        space = ListingAccount::SPACE,
        seeds = [
            LISTING_SEED,
            property.key().as_ref(),
            protocol_state.next_listing_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub listing: Account<'info, ListingAccount>,
    #[account(mut)]
    pub value_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = value_mint,
        associated_token::authority = owner,
        associated_token::token_program = token_program
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA used only as token escrow authority.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED, listing.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = owner,
        associated_token::mint = value_mint,
        associated_token::authority = escrow_authority,
        associated_token::token_program = token_program
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyPrimarySaleListing<'info> {
    #[account(
        mut,
        seeds = [
            LISTING_SEED,
            property.key().as_ref(),
            listing.listing_id.to_le_bytes().as_ref()
        ],
        bump = listing.bump
    )]
    pub listing: Account<'info, ListingAccount>,
    #[account(
        mut,
        seeds = [PROPERTY_SEED, property.property_id.to_le_bytes().as_ref()],
        bump = property.bump,
        constraint = listing.property == property.key() @ ErrorCode::InvalidMint
    )]
    pub property: Account<'info, PropertyAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        address = listing.seller @ ErrorCode::InvalidSeller
    )]
    pub seller: SystemAccount<'info>,
    #[account(mut)]
    pub value_mint: Account<'info, Mint>,
    /// CHECK: PDA used only as token escrow authority.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED, listing.key().as_ref()],
        bump,
        address = listing.escrow_authority @ ErrorCode::InvalidEscrowAuthority
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = value_mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelPrimarySaleListing<'info> {
    #[account(
        mut,
        seeds = [
            LISTING_SEED,
            property.key().as_ref(),
            listing.listing_id.to_le_bytes().as_ref()
        ],
        bump = listing.bump
    )]
    pub listing: Account<'info, ListingAccount>,
    #[account(
        mut,
        seeds = [PROPERTY_SEED, property.property_id.to_le_bytes().as_ref()],
        bump = property.bump,
        constraint = listing.property == property.key() @ ErrorCode::InvalidMint
    )]
    pub property: Account<'info, PropertyAccount>,
    #[account(
        mut,
        address = listing.seller @ ErrorCode::InvalidSeller
    )]
    pub seller: Signer<'info>,
    #[account(mut)]
    pub value_mint: Account<'info, Mint>,
    /// CHECK: PDA used only as token escrow authority.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED, listing.key().as_ref()],
        bump,
        address = listing.escrow_authority @ ErrorCode::InvalidEscrowAuthority
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = value_mint,
        associated_token::authority = seller,
        associated_token::token_program = token_program
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
