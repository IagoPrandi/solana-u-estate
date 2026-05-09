# PRD Técnico — Migração do Usufruct Protocol para Solana

**Projeto:** Usufruct Protocol  
**Documento:** PRD específico de migração Ethereum/Sepolia → Solana  
**Versão:** 1.5 — incrementada com ErrorCode de Associated Token Program, eventos Anchor mínimos, lifecycle de ListingAccount/UsufructPosition, módulo único de offsets, rollback de CPI e preflight de saldo SOL  
**Data:** 2026-05-06  
**Rede-alvo da migração:** Solana Devnet  
**Rede anterior:** Ethereum Sepolia  
**Status:** Planejado  
**Prioridade:** P0  

---

## 1. Resumo executivo

Este PRD define a migração técnica do Usufruct Protocol da stack Ethereum/Sepolia para Solana Devnet.

A migração não deve ser tratada como troca simples de RPC. O projeto atual foi concebido para EVM, com Solidity, Foundry, ERC-721, ERC-20, `msg.sender`, `msg.value`, `address(this)`, `call`, eventos Solidity, wagmi e viem. Em Solana, a implementação deve usar programas on-chain em Rust com Anchor, contas de estado, PDAs, SPL Token clássico, ATAs, instruções explícitas e transações assinadas por wallets Solana.

O objetivo de produto permanece:

> A proprietária mantém o direito de uso da casa e uma participação econômica vinculada ao usufruto, enquanto vende parte do valor livre do imóvel para captar liquidez.

A versão 1.5 deste PRD incorpora os ajustes finais de clareza operacional: adiciona `InvalidAssociatedTokenProgram` ao `ErrorCode`, torna o `associated_token_program` obrigatório em tokenização, listing, compra e cancelamento, declara que `ListingAccount` não será fechada na Fase 0, define que `UsufructPosition.active` nasce `true` e não muda na Fase 0, adiciona eventos Anchor mínimos com payloads esperados, exige `createdSignature` real em `LocalSolanaListing`, centraliza offsets em módulo único compartilhado, adiciona testes de rollback quando CPI falha após atualização de estado e inclui preflight de saldo SOL para seller e buyer na UI.

---

## 2. Objetivos da migração

### 2.1 Objetivo principal

Reimplementar a camada blockchain do Usufruct Protocol em Solana, preservando o fluxo de demo da Fase 0:

1. Pessoa A cadastra uma casa.
2. Dados sensíveis ficam off-chain em `lowdb`.
3. Hashes/referências são registrados on-chain.
4. A casa é registrada e verificada de forma mockada.
5. A casa é tokenizada em três conceitos:
   - Direito de Usufruto;
   - Direito de Valor Vinculado;
   - Direito de Valor Livre.
6. Pessoa A cria uma oferta primária de Direito de Valor Livre.
7. Pessoa B compra a oferta pagando SOL.
8. Pessoa A recebe SOL.
9. Pessoa B recebe unidades tokenizadas do Direito de Valor Livre.
10. A UI mostra a distribuição econômica e valores informativos em SOL, USD e BRL quando disponíveis.

### 2.2 Objetivos secundários

- Remover dependência de abstrações EVM.
- Criar uma arquitetura nativa de Solana.
- Preservar o máximo possível da camada off-chain e da experiência de demo.
- Trocar Foundry por Anchor/Solana tooling.
- Criar testes equivalentes e testes adversariais próprios do modelo Solana.
- Criar critérios claros para aceitar a migração como concluída.

---

## 3. Premissas

- A primeira migração será feita para **Solana Devnet**, não Mainnet.
- O MVP continuará usando documentos mockados.
- O settlement on-chain será em **SOL/lamports**.
- Valores fiduciários continuarão sendo apenas informativos.
- O banco local continuará usando `lowdb` em `db.json`.
- A aplicação continuará sendo Next.js + TypeScript + Tailwind em Docker.
- A migração não precisa preservar compatibilidade com contratos Sepolia já deployados.
- Dados históricos Sepolia podem ser arquivados, mas não precisam ser migrados para Solana na Fase 0.

---

## 4. Fora de escopo da Fase 0 Solana

A migração para Solana não inclui:

- Deploy em Solana Mainnet.
- Ponte de ativos Ethereum → Solana.
- Migração automática de registros Sepolia existentes.
- Revenda secundária por compradores.
- Compra parcial de uma oferta.
- Token-2022 em produção.
- Transfer Hook em produção.
- Stablecoin como settlement canônico.
- Oracle on-chain para valor de mercado.
- Auditoria formal completa.
- Governança descentralizada completa.
- Indexador dedicado em produção.

Esses itens ficam mapeados em roadmap pós-MVP.

---

## 5. Decisões técnicas fechadas

| Tema | Decisão Fase 0 Solana |
|---|---|
| Rede | Solana Devnet |
| Framework on-chain | Anchor |
| Linguagem on-chain | Rust |
| Token de Direito de Valor Livre | SPL Token clássico |
| Token-2022 | Fora da Fase 0 |
| Transfer Hook | Fora da Fase 0; avaliação futura |
| Decimals do token livre | `0` |
| Token program | Exclusivamente SPL Token clássico; Token-2022 rejeitado na Fase 0 |
| Algoritmo de hashing off-chain | `keccak256` sobre JSON estável |
| Direito de Usufruto | PDA `UsufructPosition`, não NFT Metaplex na Fase 0 |
| Direito de Valor Vinculado | Campo interno da `UsufructPosition` |
| Direito de Valor Livre | SPL Token mint por imóvel |
| Mint authority | PDA do programa apenas durante tokenização; removida após mint inicial |
| Freeze authority | Não usada; mint criado sem freeze authority |
| Pagamento | SOL nativo |
| Unidade de pagamento | lamports |
| Marketplace | Oferta primária com compra integral obrigatória |
| `ListingAccount` | Não é fechada na Fase 0; mantém histórico auditável on-chain |
| Múltiplas listings por imóvel | Permitidas sem limite protocolar fixo na Fase 0; limite operacional pode existir apenas na UI/demo |
| Compra parcial | Não implementada |
| Escrow | ATA da `EscrowAuthority` PDA para o mint do imóvel; criação paga pelo seller/owner |
| Fechamento de escrow | Apenas a escrow token account fecha após compra/cancelamento; `ListingAccount` permanece on-chain |
| Associated Token Program | Obrigatório e validado como `associated_token::ID` em tokenização, criação de listing, compra e cancelamento |
| Transferências SPL | Obrigatoriamente `transfer_checked`; aritmética usa `checked_*` |
| Frontend web3 | `@solana/web3.js` + Solana Wallet Adapter |
| Índice primário da UI | lowdb como cache/índice local serializado por lock de escrita; apenas uma instância backend na Fase 0 |
| Fonte de verdade final | On-chain |
| Confirmação de UX | `confirmed`, com promoção objetiva posterior para `finalized` |
| Persistência definitiva preferencial | `finalized` quando viável |
| Deploy | Anchor deploy fora do container app |
| Upgrade authority Devnet | Chave/multisig controlada pelo projeto |
| Upgrade authority Mainnet | Roadmap: multisig + timelock/governança |

---

## 6. Stack e versões fixadas

A Fase 0 deve fixar versões para garantir reprodutibilidade de build, testes e demo.

### 6.1 Tooling on-chain

| Dependência | Versão fixada inicial |
|---|---:|
| Rust | `1.91.1` |
| Solana CLI / Agave CLI | `3.0.10` |
| Anchor CLI | `0.32.1` |
| Anchor crate | `0.32.1` |
| Node.js | `24.10.0` |
| Yarn | `1.22.1` |

Observação: se o projeto optar por Anchor `1.0.x`, deve abrir uma milestone técnica separada de compatibilidade. A Fase 0 fixa `0.32.1` para reduzir variabilidade.

### 6.2 Dependências frontend

| Pacote | Versão fixada inicial |
|---|---:|
| `@solana/web3.js` | `1.98.4` |
| `@solana/spl-token` | `0.4.14` |
| `@solana/wallet-adapter-base` | `0.9.27` |
| `@solana/wallet-adapter-react-ui` | `0.9.39` |
| `@solana/wallet-adapter-react` | fixar em lockfile do monorepo, compatível com `wallet-adapter-base@0.9.27` |

Regra obrigatória:

```text
Não usar ranges amplos como ^ ou ~ nas dependências críticas de Solana durante a migração.
O package-lock/yarn.lock deve ser versionado.
```

---

## 7. O que será mantido

### 7.1 Mantido sem mudança conceitual

- Tese do produto.
- Fluxo da demo guiada.
- Documentos mockados.
- Separação de dados sensíveis off-chain.
- Hashes on-chain como referências.
- Modelo econômico:
  - `TOTAL_VALUE_UNITS = 1_000_000`;
  - `BPS_DENOMINATOR = 10_000`;
  - exemplo-base 20% vinculado / 80% livre.
- `decimals = 0` para o Direito de Valor Livre.
- Compra total da oferta.
- Revenda secundária fora da Fase 0.
- Preço proporcional automático.
- Dashboard com separação entre usufruto, valor vinculado e valor livre.
- OKX como fonte informativa de cotação.
- Docker para aplicação.
- lowdb como persistência local.
- Hashing determinístico dos dados off-chain com `keccak256`, preservando compatibilidade conceitual com o PRD original.

### 7.2 Mantido com adaptação

| Item atual | Adaptação Solana |
|---|---|
| ETH | SOL |
| wei | lamports |
| endereço EVM `0x...` | public key Solana base58 |
| transaction hash EVM | signature Solana base58 |
| ERC-20 restrito | SPL Token clássico controlado por fluxos do programa |
| ERC-721 de usufruto | `UsufructPosition` PDA |
| `address(this)` escrow | PDA escrow authority + escrow token account |
| Foundry tests | Anchor Mocha/TypeScript tests |
| wagmi/viem | `@solana/web3.js` + wallet adapter |

---

## 8. O que será alterado

### 8.1 Substituições de arquitetura

| Ethereum atual | Solana novo |
|---|---|
| `PropertyRegistry` Solidity | Programa Anchor `usufruct_protocol` |
| `UsufructRightNFT` ERC-721 | `UsufructPosition` PDA |
| `PropertyValueToken` ERC-20 | SPL Token mint por imóvel |
| `PropertyValueTokenFactory` | Instrução `tokenize_property` cria mint |
| `PrimaryValueSale` | Instruções `create_listing`, `buy_listing`, `cancel_listing` |
| `Ownable` / `AccessControl` | ProtocolState admin + constraints Anchor |
| `msg.sender` | signer account explícita |
| `msg.value` | System Program transfer de lamports |
| `call` para ETH | `system_program::transfer` |
| `address(this)` | PDA |
| eventos Solidity | Anchor events + logs + signatures |

### 8.2 Alterações de preço

O preço automático passa de:

```text
priceWei = marketValueWei * amount / totalValueUnits
```

para:

```text
priceLamports = marketValueLamports * amount / totalValueUnits
```

A compra deve receber explicitamente:

```rust
expected_amount: u64
expected_price_lamports: u64
```

O programa deve validar:

```text
listing.amount == expected_amount
listing.price_lamports == expected_price_lamports
```

Isso é requisito obrigatório para evitar compra baseada em estado stale da UI/local cache.

### 8.3 Equivalência funcional com a Fase 0 EVM

A migração deve preservar **equivalência funcional**, não equivalência estrutural.

A Solana não deve tentar reproduzir literalmente ERC-20, ERC-721, `msg.sender`, `msg.value`, `address(this)`, `call`, ABIs EVM ou eventos Solidity. A equivalência exigida é que o usuário consiga executar o mesmo fluxo de produto e observar o mesmo resultado econômico.

#### Equivalência preservada

| Função da Fase 0 EVM | Equivalente Solana Fase 0 |
|---|---|
| Registro de imóvel em `PropertyRegistry` | Criação de `PropertyAccount` PDA |
| Mock verification por owner/verifier | `mock_verify_property` com owner, admin ou `mock_verifier` |
| Tokenização do imóvel | `tokenize_property` |
| NFT de usufruto ERC-721 restrito | `UsufructPosition` PDA |
| Valor vinculado interno | Campos de `UsufructPosition` |
| ERC-20 de Direito de Valor Livre | SPL Token clássico por imóvel, `decimals = 0` |
| Factory de ERC-20 por imóvel | Criação do mint SPL durante `tokenize_property` |
| Marketplace primário | `ListingAccount` + instruções de listing/compra/cancelamento |
| Escrow em `address(this)` | ATA da `EscrowAuthority` PDA |
| Compra total de oferta | `buy_primary_sale_listing` com `expected_amount` e `expected_price_lamports` |
| Pagamento em ETH para seller | Transferência SOL/lamports via System Program para seller |
| Dashboard de distribuição econômica | UI Solana reconciliada via PDAs, SPL balances, lowdb e `getProgramAccounts` |

#### Equivalência não literal

Os seguintes elementos EVM devem ser removidos ou arquivados, não simulados dentro de Solana:

- Solidity;
- Foundry;
- ERC-20;
- ERC-721;
- `msg.sender`;
- `msg.value`;
- `address(this)`;
- `call`;
- ABI EVM;
- eventos Solidity como fonte primária de indexação;
- wagmi/viem.

Critério de aceite:

```text
A migração é aceita se o fluxo de produto e a distribuição econômica final forem equivalentes à Fase 0 EVM, mesmo que a estrutura técnica on-chain seja nativa de Solana.
```

---

## 9. O que será apagado ou arquivado

### 9.1 Código a remover da rota ativa

- Contratos Solidity:
  - `PropertyRegistry.sol`;
  - `UsufructRightNFT.sol`;
  - `PropertyValueToken.sol`;
  - `PropertyValueTokenFactory.sol`;
  - `PrimaryValueSale.sol`.
- Interfaces Solidity equivalentes.
- Scripts Foundry de deploy Sepolia.
- Configuração ativa de Sepolia.
- Dependências EVM no frontend:
  - wagmi;
  - viem;
  - chains Sepolia;
  - ABI EVM geradas.
- Variáveis `NEXT_PUBLIC_*_ADDRESS` de contratos EVM.
- `.env.deploy` com `SEPOLIA_RPC_URL` e `DEPLOYER_PRIVATE_KEY` como caminho ativo.
- Preflight específico de Sepolia como fluxo principal.

### 9.2 Código a arquivar

O código Ethereum deve ser arquivado em:

```text
/archive/ethereum-sepolia-phase0/
```

O arquivo deve conter:

- contratos Solidity;
- scripts Foundry;
- ABIs;
- endereço dos deployments Sepolia;
- worklog da Fase 0 Ethereum;
- notas de demo legada.

Regra:

```text
Código arquivado não deve ser importado pelo app ativo Solana.
```

---

## 10. Arquitetura Solana proposta

### 10.1 Programa único

A Fase 0 deve usar um programa Anchor único:

```text
programs/usufruct_protocol/
```

Nome do programa:

```text
usufruct_protocol
```

Responsabilidades:

- inicializar estado de protocolo;
- registrar imóvel;
- mock verify;
- tokenizar imóvel;
- criar mint SPL de Direito de Valor Livre;
- criar posição de usufruto;
- criar listing primária;
- mover tokens para escrow;
- comprar listing;
- cancelar listing;
- reconciliar status da propriedade;
- emitir eventos Anchor.

### 10.2 Programas Solana usados

- System Program.
- SPL Token Program clássico.
- Associated Token Account Program.
- Rent Sysvar, se necessário.

Regra obrigatória:

```text
O `associated_token_program` deve ser recebido e validado nas instruções `tokenize_property`, `create_primary_sale_listing`, `buy_primary_sale_listing` e `cancel_primary_sale_listing` sempre que a instrução usa, cria ou valida ATAs canônicas.
```

### 10.3 Decisão sobre Token-2022

A Fase 0 **não usa Token-2022**.

Motivos:

- reduz complexidade do MVP;
- evita introduzir Transfer Hook antes de necessidade real;
- mantém integração SPL mais simples;
- mantém foco em registro, tokenização, escrow e compra primária.

Roadmap:

```text
Token-2022 e Transfer Hook serão avaliados apenas se a transferência secundária fora da plataforma se tornar um problema real para a tese de produto ou compliance.
```

---

## 11. Modelo de contas on-chain

### 11.1 `ProtocolState`

Conta global para configuração e contadores da demo.

```rust
pub struct ProtocolState {
    pub admin: Pubkey,
    pub mock_verifier: Pubkey,
    pub next_property_id: u64,
    pub next_listing_id: u64,
    pub bump: u8,
    pub reserved: [u8; 32],
}
```

### 11.1.1 Política de `admin` e `mock_verifier`

Na Fase 0, `admin` e `mock_verifier` são definidos apenas em `initialize_protocol`.

Regras obrigatórias:

- `mock_verifier` é imutável na Fase 0.
- Não haverá instrução para alterar `mock_verifier`.
- Não haverá instrução para alterar `admin`.
- Rotação de `mock_verifier` ou `admin` em Devnet exige redeploy/reinicialização da demo ou nova versão do programa/IDL.
- `admin` e `mock_verifier` devem aparecer apenas em área técnica/admin read-only da UI.
- O dashboard comum do usuário não deve destacar `admin` ou `mock_verifier`, exceto em modo debug/demo.

Regra importante:

```text
ProtocolState com contador global é uma simplificação de demo.
Não deve ser tratado como arquitetura definitiva de produção.
```

Riscos do contador global:

- concorrência em alta escala;
- gargalo de escrita;
- maior necessidade de conta mutável compartilhada.

Roadmap obrigatório antes de escala real:

- substituir o contador global por nonce por owner, seed externa controlada, sharding por owner/propriedade ou indexador dedicado;
- evitar conta global mutável como gargalo de escrita;
- manter `ProtocolState.next_property_id` e `ProtocolState.next_listing_id` apenas como simplificação da Fase 0/demo.

### 11.2 `PropertyAccount`

```rust
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
```

### 11.3 `UsufructPosition`

```rust
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
```

#### 11.3.1 Política de `active`

`UsufructPosition.active` nasce obrigatoriamente como `true` durante `tokenize_property`.

Regras da Fase 0:

- nenhuma instrução altera `active` para `false`;
- o usufruto não é vendido, transferido, revogado ou encerrado na Fase 0;
- o campo existe para compatibilidade futura com transferência, revogação, encerramento ou migração de posição de usufruto;
- testes devem validar que `active == true` após tokenização e permanece `true` após criação, compra e cancelamento de listings.


### 11.4 `ListingAccount`

```rust
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
```

#### 11.4.1 Lifecycle da `ListingAccount`

Na Fase 0, `ListingAccount` **não será fechada**.

Regras:

- listings `Filled` permanecem on-chain como histórico auditável;
- listings `Cancelled` permanecem on-chain como histórico auditável;
- nenhum rent da `ListingAccount` é devolvido na Fase 0;
- apenas a escrow token account associada à listing deve ser fechada após compra ou cancelamento quando seu saldo chegar a zero;
- `getProgramAccounts` pode continuar descobrindo listings preenchidas/canceladas para histórico e reconciliação.


---

## 12. Enums

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PropertyStatus {
    PendingMockVerification,
    MockVerified,
    Tokenized,
    ActiveSale,
    SoldOut,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SaleStatus {
    Active,
    Filled,
    Cancelled,
}
```

Definição de `SoldOut`:

```text
SoldOut significa que 100% do freeValueUnits foi vendido em ofertas primárias.
Não significa venda total do imóvel.
Não afeta o Direito de Usufruto nem o Direito de Valor Vinculado.
```

---

## 13. Seeds completas de PDAs

Todas as seeds devem ser estáveis e documentadas. Todos os bumps devem ser salvos nas contas correspondentes quando aplicável.

### 13.1 Tabela de PDAs

| Conta / autoridade | Seeds | Observações |
|---|---|---|
| `ProtocolState` | `[b"protocol_state"]` | Conta global de demo |
| `PropertyAccount` | `[b"property", property_id.to_le_bytes()]` | Usa contador do `ProtocolState` |
| `UsufructPosition` | `[b"usufruct", property.key().as_ref()]` | Uma posição por imóvel |
| `ValueMintAuthority` | `[b"mint_authority", property.key().as_ref()]` | Autoridade da mint livre |
| `ListingAccount` | `[b"listing", property.key().as_ref(), listing_id.to_le_bytes()]` | Listing enumerável |
| `EscrowAuthority` | `[b"escrow_authority", listing.key().as_ref()]` | Assina movimentação do escrow |
| `EscrowTokenAccount` | ATA do `EscrowAuthority` para `value_mint` | Forma única permitida na Fase 0; token account arbitrária deve ser rejeitada |

### 13.2 Regras de derivação

- `property_id` e `listing_id` devem ser `u64` em little-endian nas seeds.
- Nenhuma seed deve depender de string mutável de UI.
- `localPropertyId` nunca entra em seed PDA.
- Public keys devem ser validadas via constraints Anchor.
- O frontend deve derivar PDAs de forma determinística antes de enviar transações.

---

## 14. Algoritmo de hashing off-chain

### 14.1 Decisão fechada

A Fase 0 Solana mantém o algoritmo de hashing definido no PRD original:

```text
keccak256(stableJson(payload))
```

Não usar `sha256` na Fase 0.

### 14.2 Formato

- Os hashes são armazenados on-chain como `[u8; 32]`.
- No lowdb e na UI, os hashes são strings hex lowercase com prefixo `0x`.
- O frontend/server converte `0x...` para `[u8; 32]` antes da instrução Anchor.
- O programa valida que hashes não são `[0u8; 32]`.

### 14.3 Justificativa

Manter `keccak256` evita alterar o contrato lógico dos hashes off-chain já definido no produto e preserva compatibilidade conceitual com os dados mockados existentes.

---

## 15. Política de mint authority

### 15.1 Fase de tokenização

A mint authority do `value_mint` será a PDA:

```text
ValueMintAuthority = PDA(["mint_authority", property])
```

Durante `tokenize_property`, o programa deve:

1. criar a mint SPL com `decimals = 0`;
2. definir mint authority como `ValueMintAuthority`;
3. mintar exatamente `free_value_units` para a ATA da proprietária;
4. impedir mint adicional fora da instrução de tokenização.

### 15.2 Após mint inicial

Decisão fechada da Fase 0:

```text
A mint authority deve ser removida imediatamente após o mint inicial de `free_value_units`.
Não existe fallback permitido mantendo mint authority ativa.
Nenhuma instrução da Fase 0 pode mintar tokens adicionais depois da tokenização.
```

Validações obrigatórias:

- `property.status == MockVerified` antes da tokenização.
- `property.value_mint == Pubkey::default()` antes de criar mint.
- `amount_minted == free_value_units`.
- `mint.decimals == 0`.
- `mint.mint_authority == ValueMintAuthority` durante o mint inicial.
- `mint.mint_authority == None` após o mint inicial.
- Não existe instrução administrativa de remint na Fase 0.

### 15.3 Freeze authority

Decisão fechada da Fase 0:

```text
A Fase 0 não usa freeze authority.
O `value_mint` deve ser criado com `freeze_authority = None`.
Qualquer mint com freeze authority configurada deve ser rejeitada nos testes.
```

---

## 16. Política de escrow

### 16.1 Criação de escrow

Decisão fechada:

```text
A criação da escrow ATA é paga pelo seller/owner que cria a oferta.
Na Fase 0, seller é sempre uma wallet de usuário/System Account assinante, nunca PDA, multisig, conta custodial ou programa.
```

Ao criar uma listing, o programa deve:

1. validar que o seller é owner do `PropertyAccount`;
2. validar que a propriedade está `Tokenized` ou `ActiveSale`;
3. validar saldo livre suficiente;
4. calcular `price_lamports` proporcional;
5. criar ou validar a ATA da `EscrowAuthority` PDA para o `value_mint`;
6. transferir `amount` da ATA do seller para a escrow ATA usando `transfer_checked`;
7. salvar a escrow ATA na `ListingAccount`;
8. atualizar contadores da propriedade.

### 16.2 Compra

Ao comprar, o programa deve:

1. validar listing ativa;
2. validar buyer diferente do seller;
3. validar `expected_amount`;
4. validar `expected_price_lamports`;
5. transferir SOL do buyer para seller via System Program;
6. transferir tokens do escrow para ATA do buyer usando `transfer_checked` assinada pela `EscrowAuthority` PDA;
7. mudar listing para `Filled`;
8. atualizar contadores e status da propriedade;
9. fechar a escrow token account se o saldo for zero.

Regra de histórico:

```text
A `ListingAccount` não é fechada após compra. Ela permanece on-chain com status `Filled`.
```

Política da ATA do buyer:

```text
A ATA do buyer para o `value_mint` deve ser criada pela UI antes de chamar `buy_primary_sale_listing`.
A UI pode criar a ATA em uma transação anterior ou em uma transação composta que execute a criação antes da instrução de compra.
O buyer é o payer do rent da própria ATA.
O programa Anchor não cria a ATA do buyer dentro de `buy_primary_sale_listing`; ele apenas valida que `buyer_value_ata` é exatamente a ATA esperada do buyer para o mint da propriedade.
Se a ATA não existir ou não for a ATA canônica, a compra deve falhar com `InvalidBuyerTokenAccount`.
```

### 16.3 Cancelamento

Ao cancelar, o programa deve:

1. validar listing ativa;
2. validar seller signer;
3. devolver tokens do escrow para ATA do seller usando `transfer_checked`;
4. mudar listing para `Cancelled`;
5. atualizar contadores e status;
6. fechar a escrow token account se o saldo for zero.

Regra de histórico:

```text
A `ListingAccount` não é fechada após cancelamento. Ela permanece on-chain com status `Cancelled`.
```

### 16.4 Rent do fechamento

Quando a escrow token account for fechada:

| Fluxo | Destino do rent |
|---|---|
| Compra concluída | seller |
| Cancelamento | seller |
| Erro/revert | nenhum fechamento deve ocorrer |

Regra:

```text
O seller é o beneficiário do rent recuperado porque a escrow token account existe para custodiar tokens da oferta do seller.
```

---

## 17. Instruções do programa

### 17.1 `initialize_protocol`

```rust
pub fn initialize_protocol(ctx: Context<InitializeProtocol>, mock_verifier: Pubkey) -> Result<()>;
```

Responsável por:

- criar `ProtocolState`;
- definir `admin`;
- definir `mock_verifier`;
- inicializar `next_property_id = 1`;
- inicializar `next_listing_id = 1`.

### 17.2 `register_property`

```rust
pub fn register_property(
    ctx: Context<RegisterProperty>,
    market_value_lamports: u64,
    linked_value_bps: u16,
    metadata_hash: [u8; 32],
    documents_hash: [u8; 32],
    location_hash: [u8; 32],
) -> Result<()>;
```

Responsável por:

- criar `PropertyAccount`;
- calcular `linked_value_units` e `free_value_units`;
- salvar hashes;
- definir status `PendingMockVerification`;
- incrementar `next_property_id`.

### 17.3 `mock_verify_property`

```rust
pub fn mock_verify_property(ctx: Context<MockVerifyProperty>) -> Result<()>;
```

Chamadores autorizados:

- owner do imóvel;
- `mock_verifier` definido em `ProtocolState`;
- admin do protocolo.

### 17.4 `tokenize_property`

```rust
pub fn tokenize_property(ctx: Context<TokenizeProperty>) -> Result<()>;
```

Responsável por:

- criar `UsufructPosition`;
- criar mint SPL do Direito de Valor Livre;
- mintar `free_value_units` para ATA do owner;
- salvar `value_mint` e `usufruct_position` na propriedade;
- mudar status para `Tokenized`.

### 17.5 `create_primary_sale_listing`

```rust
pub fn create_primary_sale_listing(
    ctx: Context<CreatePrimarySaleListing>,
    amount: u64,
) -> Result<()>;
```

Responsável por:

- criar `ListingAccount`;
- calcular preço proporcional em lamports;
- mover tokens livres para escrow;
- atualizar contadores e status.

### 17.6 `buy_primary_sale_listing`

```rust
pub fn buy_primary_sale_listing(
    ctx: Context<BuyPrimarySaleListing>,
    expected_amount: u64,
    expected_price_lamports: u64,
) -> Result<()>;
```

Responsável por:

- validar listing;
- validar preço esperado;
- transferir SOL para seller;
- transferir tokens para buyer;
- fechar escrow token account;
- atualizar status.

### 17.7 `cancel_primary_sale_listing`

```rust
pub fn cancel_primary_sale_listing(ctx: Context<CancelPrimarySaleListing>) -> Result<()>;
```

Responsável por:

- validar seller;
- devolver tokens;
- fechar escrow token account;
- atualizar status.

---

## 18. Constraints Anchor obrigatórias

Esta seção é normativa. As constraints abaixo devem ser implementadas no código Anchor, não apenas descritas em testes.

### 18.1 `InitializeProtocol`

- `protocol_state`:
  - `init`;
  - `payer = admin`;
  - `seeds = [b"protocol_state"]`;
  - `bump`;
  - `space = ProtocolState::SPACE`.
- `admin`:
  - `mut`;
  - `signer`.
- `system_program` obrigatório.

### 18.2 `RegisterProperty`

- `protocol_state`:
  - `mut`;
  - `seeds = [b"protocol_state"]`;
  - `bump = protocol_state.bump`.
- `property`:
  - `init`;
  - `payer = owner`;
  - `seeds = [b"property", protocol_state.next_property_id.to_le_bytes().as_ref()]`;
  - `bump`;
  - `space = PropertyAccount::SPACE`.
- `owner`:
  - `mut`;
  - `signer`.
- `system_program` obrigatório.

### 18.3 `MockVerifyProperty`

- `protocol_state`:
  - `seeds = [b"protocol_state"]`;
  - `bump = protocol_state.bump`.
- `property`:
  - `mut`;
  - `seeds = [b"property", property.property_id.to_le_bytes().as_ref()]`;
  - `bump = property.bump`.
- `verifier`:
  - `signer`.
- Constraint lógica:
  - `verifier == property.owner || verifier == protocol_state.mock_verifier || verifier == protocol_state.admin`.

### 18.4 `TokenizeProperty`

- `property`:
  - `mut`;
  - `has_one = owner`;
  - PDA seeds válidas.
- `owner`:
  - `mut`;
  - `signer`.
- `usufruct_position`:
  - `init`;
  - `payer = owner`;
  - `seeds = [b"usufruct", property.key().as_ref()]`;
  - `bump`;
  - `space = UsufructPosition::SPACE`.
- `value_mint`:
  - `init`;
  - `payer = owner`;
  - `mint::decimals = 0`;
  - `mint::authority = mint_authority`.
- `mint_authority`:
  - PDA seeds `[b"mint_authority", property.key().as_ref()]`.
- `owner_value_ata`:
  - ATA do owner para `value_mint`;
  - mint correto;
  - owner correto.
- Programas obrigatórios:
  - token program com `key == spl_token::ID`;
  - associated token program com `key == associated_token::ID`;
  - system program;
  - rent, se necessário.

### 18.5 `CreatePrimarySaleListing`

- `property`:
  - `mut`;
  - `has_one = owner`.
- `owner`:
  - `mut`;
  - `signer`.
- `listing`:
  - `init`;
  - `payer = owner`;
  - seeds `[b"listing", property.key().as_ref(), protocol_state.next_listing_id.to_le_bytes().as_ref()]`;
  - `space = ListingAccount::SPACE`.
- `value_mint`:
  - `constraint = value_mint.key() == property.value_mint`.
- `seller_value_ata`:
  - token account owner == owner;
  - mint == property.value_mint.
- `token_program`:
  - `constraint = token_program.key() == spl_token::ID`;
  - Token-2022 deve ser rejeitado.
- `associated_token_program`:
  - `constraint = associated_token_program.key() == associated_token::ID`.
- `escrow_authority`:
  - PDA seeds `[b"escrow_authority", listing.key().as_ref()]`.
- `escrow_token_account`:
  - token account owner == escrow_authority;
  - mint == property.value_mint.
- Transferência:
  - obrigatoriamente `transfer_checked`.

### 18.6 `BuyPrimarySaleListing`

- `listing`:
  - `mut`;
  - seeds `[b"listing", property.key().as_ref(), listing.listing_id.to_le_bytes().as_ref()]`;
  - `bump = listing.bump`.
- `property`:
  - `mut`;
  - `constraint = listing.property == property.key()`.
- `buyer`:
  - `mut`;
  - `signer`.
- `seller`:
  - `mut`;
  - `constraint = seller.key() == listing.seller`.
- `value_mint`:
  - `constraint = value_mint.key() == listing.value_mint`;
  - `constraint = value_mint.key() == property.value_mint`.
- `escrow_authority`:
  - PDA seeds `[b"escrow_authority", listing.key().as_ref()]`.
- `escrow_token_account`:
  - `mut`;
  - owner == escrow_authority;
  - mint == listing.value_mint;
  - key == listing.escrow_token_account.
- `buyer_value_ata`:
  - owner == buyer;
  - mint == listing.value_mint;
  - deve ser a ATA canônica do buyer para `listing.value_mint`;
  - deve existir antes da instrução `buy_primary_sale_listing`;
  - a criação é responsabilidade da UI, com rent pago pelo buyer.
- `token_program`:
  - `constraint = token_program.key() == spl_token::ID`;
  - Token-2022 deve ser rejeitado.
- `associated_token_program`:
  - obrigatório na instrução;
  - `constraint = associated_token_program.key() == associated_token::ID`.
- Transferências:
  - SOL via System Program;
  - token via `transfer_checked`.
- Fechamento:
  - escrow token account fechada para seller quando saldo final = 0.

### 18.7 `CancelPrimarySaleListing`

- `listing`:
  - `mut`;
  - active;
  - seller correto.
- `seller`:
  - `mut`;
  - `signer`;
  - `constraint = seller.key() == listing.seller`.
- `property`:
  - `mut`;
  - `constraint = listing.property == property.key()`.
- `value_mint`:
  - mint correto.
- `escrow_authority`:
  - PDA correta.
- `escrow_token_account`:
  - owner == escrow_authority;
  - mint == listing.value_mint.
- `seller_value_ata`:
  - owner == seller;
  - mint == listing.value_mint;
  - deve ser a ATA canônica do seller para `listing.value_mint`.
- `token_program`:
  - `constraint = token_program.key() == spl_token::ID`;
  - Token-2022 deve ser rejeitado.
- `associated_token_program`:
  - obrigatório na instrução;
  - `constraint = associated_token_program.key() == associated_token::ID`.
- Token return:
  - obrigatoriamente `transfer_checked`.
- Fechamento:
  - escrow token account fechada para seller quando saldo final = 0.

### 18.8 Ordem normativa de validações, estado e CPIs por fluxo

Esta seção é normativa. Cada instrução deve validar todas as contas relevantes antes de executar CPIs. A ordem abaixo substitui qualquer ordem genérica anterior.

#### 18.8.1 Tokenização

Ordem obrigatória em `tokenize_property`:

1. Validar `owner` como signer.
2. Validar `PropertyAccount` por seeds/bump e `has_one = owner`.
3. Validar `property.status == MockVerified`.
4. Validar que `property.value_mint == Pubkey::default()`.
5. Validar `token_program.key() == spl_token::ID`.
6. Validar `associated_token_program.key() == associated_token::ID`.
7. Validar `mint_authority` PDA.
8. Criar `UsufructPosition`.
9. Criar `value_mint` com `decimals = 0`, mint authority PDA e freeze authority `None`.
10. Criar/validar ATA do owner para `value_mint`.
11. Mintar exatamente `free_value_units` para a ATA do owner.
12. Remover mint authority com `set_authority` para `None`.
13. Atualizar `PropertyAccount` com `value_mint`, `usufruct_position` e status `Tokenized`.
14. Emitir evento Anchor.

#### 18.8.2 Criação de listing

Ordem obrigatória em `create_primary_sale_listing`:

1. Validar `owner/seller` como signer e System Account/wallet de usuário.
2. Validar `PropertyAccount` por seeds/bump e `has_one = owner`.
3. Validar status `Tokenized` ou `ActiveSale`.
4. Validar `value_mint == property.value_mint`.
5. Validar `token_program.key() == spl_token::ID`.
6. Validar `associated_token_program.key() == associated_token::ID`.
7. Validar ATA do seller como ATA canônica do seller para `property.value_mint`.
8. Validar saldo livre suficiente.
9. Validar `amount > 0`.
10. Calcular `price_lamports` com `checked_*` e validar `price_lamports > 0`.
11. Criar `ListingAccount`.
12. Derivar e validar `EscrowAuthority` PDA.
13. Criar/validar escrow token account como ATA da `EscrowAuthority` PDA, com rent pago pelo seller/owner.
14. Transferir tokens seller → escrow com `transfer_checked`.
15. Atualizar contadores da propriedade e status.
16. Emitir evento Anchor.

#### 18.8.3 Compra

Ordem obrigatória em `buy_primary_sale_listing`:

1. Validar `buyer` como signer.
2. Validar `ListingAccount` por seeds/bump.
3. Validar `PropertyAccount` e `listing.property == property.key()`.
4. Validar `seller` como System Account/wallet e `seller.key() == listing.seller`.
5. Validar `buyer != seller`.
6. Validar `listing.status == Active`.
7. Validar `expected_amount == listing.amount`.
8. Validar `expected_price_lamports == listing.price_lamports`.
9. Validar `value_mint == listing.value_mint == property.value_mint`.
10. Validar `token_program.key() == spl_token::ID`.
11. Validar `associated_token_program.key() == associated_token::ID` se a instrução receber essa conta para validação de ATA.
12. Validar `EscrowAuthority` PDA.
13. Validar escrow ATA como ATA canônica da `EscrowAuthority` para `value_mint`.
14. Validar buyer ATA como ATA canônica do buyer para `value_mint`; ela deve existir antes da instrução.
15. Atualizar estado da listing para `Filled` antes das CPIs de saída sempre que possível.
16. Atualizar contadores da propriedade e status.
17. Transferir SOL buyer → seller via System Program.
18. Transferir tokens escrow → buyer com `transfer_checked`.
19. Fechar escrow token account para seller quando saldo final for zero.
20. Emitir evento Anchor.

#### 18.8.4 Cancelamento

Ordem obrigatória em `cancel_primary_sale_listing`:

1. Validar `seller` como signer e System Account/wallet de usuário.
2. Validar `ListingAccount` por seeds/bump.
3. Validar `listing.status == Active`.
4. Validar `seller.key() == listing.seller`.
5. Validar `PropertyAccount` e `listing.property == property.key()`.
6. Validar `value_mint == listing.value_mint == property.value_mint`.
7. Validar `token_program.key() == spl_token::ID`.
8. Validar `associated_token_program.key() == associated_token::ID` se a instrução receber essa conta para validação de ATA.
9. Validar `EscrowAuthority` PDA.
10. Validar escrow ATA como ATA canônica da `EscrowAuthority` para `value_mint`.
11. Validar seller ATA como ATA canônica do seller para `value_mint`.
12. Atualizar estado da listing para `Cancelled` antes das CPIs de saída sempre que possível.
13. Atualizar contadores da propriedade e status.
14. Transferir tokens escrow → seller com `transfer_checked`.
15. Fechar escrow token account para seller quando saldo final for zero.
16. Emitir evento Anchor.

Critério de segurança:

```text
Nenhuma CPI deve ocorrer antes de validar todas as contas relevantes do fluxo.
A transação Solana é atômica, mas a ordem estado → CPI deve continuar clara para auditoria e para evitar efeitos inesperados em CPIs.
```

#### 18.8.5 Rollback em falha de CPI

Os testes devem comprovar a atomicidade esperada quando uma CPI falha depois de uma atualização de estado dentro da mesma instrução.

Cenários mínimos:

- compra marca a listing como `Filled`, mas a CPI de `transfer_checked` falha por escrow ATA inválida;
- cancelamento marca a listing como `Cancelled`, mas a CPI de devolução de tokens falha;
- tokenização cria/minta, mas a CPI de remoção de mint authority falha em cenário controlado de teste.

Critério de aprovação:

```text
Após a transação falhar, o estado on-chain deve permanecer como antes da tentativa:
- listing continua `Active`;
- contadores da propriedade não mudam;
- escrow balance não muda;
- buyer não recebe tokens;
- seller não recebe SOL;
- mint authority não fica em estado intermediário inesperado.
```
---

## 19. Requisitos de cálculo seguro

### 19.1 Checked arithmetic

Todas as operações aritméticas on-chain devem usar métodos checked:

- `checked_add`;
- `checked_sub`;
- `checked_mul`;
- `checked_div`.

Isso é requisito obrigatório, não mitigação opcional.

### 19.2 Cálculo de unidades

```rust
linked_value_units = total_value_units
    .checked_mul(linked_value_bps as u64)?
    .checked_div(BPS_DENOMINATOR)?;

free_value_units = total_value_units
    .checked_sub(linked_value_units)?;
```

### 19.3 Cálculo de preço

```rust
price_lamports = market_value_lamports
    .checked_mul(amount)?
    .checked_div(total_value_units)?;
```

Validações obrigatórias:

- `price_lamports > 0`;
- `amount > 0`;
- `amount <= free_value_units`;
- `amount <= seller_token_balance`;
- `linked_value_units + free_value_units == total_value_units`.

---

## 20. ErrorCode completo

O programa deve expor um enum `ErrorCode` estável. Os testes devem validar os erros esperados.

```rust
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

    #[msg("Property is not ready for tokenization")]
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
```

### 20.1 Eventos Anchor mínimos

O programa deve emitir eventos Anchor mínimos para indexação, debug, reconciliação e equivalência funcional com os eventos Solidity da Fase 0 EVM.

Eventos são auxiliares de indexação e observabilidade. A fonte final de verdade continua sendo o estado on-chain das contas e os saldos SPL.

#### `ProtocolInitialized`

```rust
#[event]
pub struct ProtocolInitialized {
    pub admin: Pubkey,
    pub mock_verifier: Pubkey,
}
```

Emitido em `initialize_protocol`.

#### `PropertyRegistered`

```rust
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
```

Emitido em `register_property`.

#### `PropertyMockVerified`

```rust
#[event]
pub struct PropertyMockVerified {
    pub property: Pubkey,
    pub property_id: u64,
    pub verifier: Pubkey,
}
```

Emitido em `mock_verify_property`.

#### `PropertyTokenized`

```rust
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
```

Emitido em `tokenize_property`.

#### `PrimarySaleListed`

```rust
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
```

Emitido em `create_primary_sale_listing`.

#### `PrimarySalePurchased`

```rust
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
```

Emitido em `buy_primary_sale_listing`.

#### `PrimarySaleCancelled`

```rust
#[event]
pub struct PrimarySaleCancelled {
    pub listing: Pubkey,
    pub listing_id: u64,
    pub property: Pubkey,
    pub property_id: u64,
    pub seller: Pubkey,
    pub amount: u64,
}
```

Emitido em `cancel_primary_sale_listing`.

#### `PropertyStatusUpdated`

```rust
#[event]
pub struct PropertyStatusUpdated {
    pub property: Pubkey,
    pub property_id: u64,
    pub old_status: PropertyStatus,
    pub new_status: PropertyStatus,
}
```

Emitido sempre que `PropertyAccount.status` mudar.

### 20.2 Expectativa de erros para contas ausentes em Anchor

`PropertyNotFound` e `ListingNotFound` não devem ser exigidos em todos os testes de conta ausente.

Em Anchor, quando uma conta tipada obrigatória não existe, não é inicializada, tem owner incorreto ou não consegue ser desserializada, a falha pode ocorrer antes de entrar no handler da instrução. Nesses casos, o teste pode esperar erro nativo do Anchor, como erro de desserialização, owner inválido ou conta não inicializada.

Regras:

- `PropertyNotFound` e `ListingNotFound` devem ser usados apenas em fluxos onde o programa valida existência lógica explicitamente.
- Testes de PDA ausente tipada podem aceitar erro Anchor pré-handler.
- Testes de PDA falsa com conta inicializada devem validar constraints de seeds/bump ou relação entre contas.

---

## 21. Cálculo de `space` das contas

O PRD deve ser implementado com constantes `SPACE` por conta. O cálculo abaixo é a base mínima e deve ser revisado no código com os tamanhos finais de enum/discriminators.

### 21.1 Regra geral

Toda conta Anchor precisa incluir:

```text
8 bytes de discriminator
+ bytes dos campos serializados
```

### 21.2 Tamanhos base

| Tipo | Bytes |
|---|---:|
| `u8` | 1 |
| `u16` | 2 |
| `u64` | 8 |
| `bool` | 1 |
| `Pubkey` | 32 |
| `[u8; 32]` | 32 |
| enum simples Anchor | 1, se representado com variantes compactas |

### 21.3 `ProtocolState::SPACE`

Campos:

- discriminator: 8
- `admin`: 32
- `mock_verifier`: 32
- `next_property_id`: 8
- `next_listing_id`: 8
- `bump`: 1
- `reserved`: 32

```text
ProtocolState::SPACE = 8 + 32 + 32 + 8 + 8 + 1 + 32 = 121 bytes
```

Recomendação prática:

```rust
pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 32;
```

### 21.4 `PropertyAccount::SPACE`

Campos:

- discriminator: 8
- `property_id`: 8
- `owner`: 32
- `market_value_lamports`: 8
- `total_value_units`: 8
- `linked_value_units`: 8
- `free_value_units`: 8
- `linked_value_bps`: 2
- `metadata_hash`: 32
- `documents_hash`: 32
- `location_hash`: 32
- `value_mint`: 32
- `usufruct_position`: 32
- `active_listings_count`: 8
- `total_free_value_sold`: 8
- `active_escrowed_amount`: 8
- `status`: 1
- `bump`: 1
- `reserved`: 32

```text
PropertyAccount::SPACE = 8 + 8 + 32 + 8 + 8 + 8 + 8 + 2 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 32 = 300 bytes
```

Recomendação:

```rust
pub const SPACE: usize = 300;
```

### 21.5 `UsufructPosition::SPACE`

Campos:

- discriminator: 8
- `property`: 32
- `property_id`: 8
- `holder`: 32
- `linked_value_units`: 8
- `linked_value_bps`: 2
- `active`: 1
- `bump`: 1
- `reserved`: 32

```text
UsufructPosition::SPACE = 8 + 32 + 8 + 32 + 8 + 2 + 1 + 1 + 32 = 124 bytes
```

### 21.6 `ListingAccount::SPACE`

Campos:

- discriminator: 8
- `listing_id`: 8
- `property`: 32
- `property_id`: 8
- `seller`: 32
- `value_mint`: 32
- `seller_token_account`: 32
- `escrow_token_account`: 32
- `escrow_authority`: 32
- `amount`: 8
- `price_lamports`: 8
- `status`: 1
- `bump`: 1
- `reserved`: 32

```text
ListingAccount::SPACE = 8 + 8 + 32 + 8 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + 32 = 266 bytes
```

### 21.7 Padding obrigatório

Decisão fechada da Fase 0:

```text
Todas as contas principais terão `reserved: [u8; 32]`.
Não existe opção sem padding para a Fase 0.
```

Contas com padding obrigatório:

- `ProtocolState`;
- `PropertyAccount`;
- `UsufructPosition`;
- `ListingAccount`.

Regras:

- `reserved` deve ser inicializado com `[0u8; 32]`.
- `reserved` não pode ser usado para campos não documentados.
- Qualquer uso futuro do padding deve gerar nova versão do PRD/IDL.
- Testes devem falhar se `SPACE` ficar incompatível com o tamanho serializado real da struct.

---

## 22. Múltiplas listings por imóvel

### 22.1 Decisão fechada

A Fase 0 permite múltiplas listings ativas por imóvel **sem limite protocolar fixo**.

```text
Não existe `MAX_ACTIVE_LISTINGS_PER_PROPERTY` na regra on-chain da Fase 0.
Não existe erro obrigatório `TooManyActiveListings`.
```

Motivo:

- preserva equivalência funcional com a Fase 0 EVM, que permitia listagens enumeráveis por imóvel;
- evita hardcode de limite de produto no programa;
- mantém o limite real baseado em saldo disponível, escrow ativo e capacidade operacional da demo.

### 22.2 Regras

- Apenas o owner do `PropertyAccount` pode criar listings primárias.
- Compradores não podem criar listings na Fase 0.
- Não há compra parcial. Cada listing continua sendo comprada integralmente.
- O owner pode criar múltiplas listings enquanto possuir saldo livre suficiente.
- Cada listing tem seu próprio `ListingAccount`, `EscrowAuthority` e `EscrowTokenAccount`.
- `active_escrowed_amount` deve ser a soma das quantidades de todas as listings ativas.
- `total_free_value_sold` só aumenta quando uma listing é preenchida.
- A UI pode aplicar limite operacional de demo para evitar poluição visual, mas esse limite não deve ser regra on-chain nem critério de aceite do programa.

### 22.3 Critério de aceite

- Deve ser possível criar múltiplas listings ativas para o mesmo imóvel enquanto houver saldo livre disponível.
- Criar listing com saldo insuficiente deve reverter com `InsufficientFreeValueBalance`.
- Cancelar ou preencher uma listing deve reduzir `active_listings_count` e `active_escrowed_amount`.
- Não deve existir teste obrigatório de “11ª listing” ou erro `TooManyActiveListings` na Fase 0.


## 23. lowdb como índice da UI

### 23.1 Decisão

`lowdb` é o índice primário da UI e cache operacional local.

`lowdb` não é a fonte final de verdade.

Fonte final de verdade:

```text
On-chain Solana accounts + SPL Token balances
```

### 23.2 Política de lock e serialização de escrita

A Fase 0 assume explicitamente **uma única instância backend Next.js** escrevendo no `lowdb`.

```text
lowdb não é aprovado para múltiplas instâncias backend, deploy horizontal, múltiplos containers escrevendo o mesmo arquivo, ou ambiente serverless concorrente.
```

Todas as escritas no `db.json` devem ser serializadas pelo backend local.

Requisitos:

- Browser nunca escreve diretamente no `db.json`.
- Todas as rotas/server actions que alteram lowdb devem usar mutex, fila de escrita ou lock de arquivo.
- Nenhuma operação read-modify-write pode ocorrer sem lock.
- Operações críticas como compra, cancelamento, reconciliação e reset de demo devem ser atômicas do ponto de vista do lowdb.
- Falha durante escrita deve preservar o arquivo anterior ou gravar backup antes da mutação.
- Testes devem simular duas escritas concorrentes e comprovar que não há perda de update.

### 23.3 Responsabilidades do lowdb

- guardar dados sensíveis off-chain;
- guardar dados textuais da propriedade;
- guardar documentos mockados;
- guardar hashes usados on-chain;
- indexar propriedades por wallet conectada;
- guardar signatures de transações;
- guardar últimos snapshots on-chain;
- acelerar carregamento da UI;
- suportar modo demo e fallback.

### 23.4 Campos que devem ser reconciliados

- status da propriedade;
- `valueMint`;
- `usufructPositionPda`;
- listings ativas;
- listings preenchidas/canceladas;
- saldos SPL por participante;
- `activeListingsCount`;
- `activeEscrowedAmount`;
- `totalFreeValueSold`;
- último commitment visto.

### 23.5 Regra de conflito

```text
Se lowdb divergir do estado on-chain, a UI deve mostrar aviso de sincronização e atualizar lowdb a partir da blockchain.
```

A UI nunca deve enviar compra baseada apenas em lowdb. Antes de comprar, deve buscar a `ListingAccount` on-chain e comparar:

- listing ativa;
- seller;
- mint;
- amount;
- price;
- escrow token account.

---

## 24. Estratégia de reconciliação lowdb ↔ on-chain

### 24.1 Momentos de reconciliação

A aplicação deve reconciliar:

1. ao conectar wallet;
2. ao abrir dashboard;
3. ao abrir detalhes de propriedade;
4. antes de criar listing;
5. antes de comprar listing;
6. após confirmação de transação;
7. ao carregar marketplace;
8. ao executar reset da demo.

### 24.2 Níveis de reconciliação

#### Nível 1 — Por propriedade conhecida

Usar PDAs já salvas no lowdb:

- `propertyPda`;
- `usufructPositionPda`;
- `valueMint`;
- known listings.

#### Nível 2 — Por wallet

Buscar holdings via token accounts da wallet para mints conhecidos no lowdb.

#### Nível 3 — Por programa

Usar `getProgramAccounts` com filtros para descobrir propriedades e listings do programa.

### 24.3 Estado de sincronização no banco

Cada entidade indexada deve conter:

```json
{
  "syncStatus": "synced | stale | missing_on_chain | local_only | conflict",
  "lastSyncedAt": "2026-05-06T00:00:00.000Z",
  "lastSyncedSlot": 0,
  "lastCommitment": "confirmed | finalized"
}
```

### 24.4 Erros de reconciliação

- Se uma listing existe no lowdb, mas não existe on-chain: marcar `missing_on_chain`.
- Se uma listing está ativa no lowdb, mas `Filled` on-chain: atualizar para `Filled`.
- Se preço local diverge do preço on-chain: usar on-chain e marcar evento de correção.
- Se seller local diverge do seller on-chain: bloquear ação e marcar `conflict`.
- Se mint local diverge da mint on-chain: bloquear ação e marcar `conflict`.

---

## 25. Commitment e confirmação de transações

### 25.1 Decisão

| Uso | Commitment |
|---|---|
| Envio e UX imediata | `processed` apenas para assinatura/envio inicial |
| Confirmação exibida ao usuário | `confirmed` |
| Persistência definitiva preferencial | `finalized` |
| Reconciliação periódica | `confirmed`, com upgrade para `finalized` quando disponível |

### 25.2 Regra de UI

A UI pode mostrar:

```text
Transação enviada
```

após signature retornada.

A UI só pode mostrar:

```text
Transação confirmada
```

após `confirmed`.

A UI só deve marcar entidade como definitivamente sincronizada quando:

- commitment `finalized`; ou
- commitment `confirmed` + reconciliação posterior bem-sucedida.

### 25.3 Política objetiva de promoção `confirmed` → `finalized`

A promoção de uma transação `confirmed` para `finalized` deve seguir política objetiva:

```text
Após uma transação atingir `confirmed`, o backend deve tentar promovê-la para `finalized` em até 20 tentativas, com intervalo de 3 segundos entre tentativas.
Janela total aproximada: 60 segundos.
```

Resultados possíveis:

| Resultado | Ação no lowdb |
|---|---|
| Atingiu `finalized` | atualizar `commitment = finalized`, preencher `finalizedAt` e `lastSyncedSlot` |
| Permaneceu `confirmed` após 20 tentativas | manter `commitment = confirmed`, marcar `finalizationStatus = pending`, reconciliar em próxima abertura de dashboard |
| Transação não encontrada | marcar `syncStatus = stale` e exigir reconciliação manual/automática |
| Estado on-chain diverge do esperado | marcar `syncStatus = conflict` e bloquear ação dependente |

A UI pode liberar fluxo após `confirmed`, mas a definição de estado definitivo deve preferir `finalized`.

### 25.4 Persistência de signature

Cada transação salva no lowdb deve conter:

```json
{
  "signature": "base58_signature",
  "slot": 0,
  "commitment": "confirmed",
  "submittedAt": "2026-05-06T00:00:00.000Z",
  "confirmedAt": "2026-05-06T00:00:00.000Z",
  "finalizedAt": null
}
```

### 25.5 Bloqueio de double-submit na UI

A UI deve bloquear double-submit em todas as transações críticas:

- `register_property`;
- `mock_verify_property`;
- `tokenize_property`;
- `create_primary_sale_listing`;
- `buy_primary_sale_listing`;
- `cancel_primary_sale_listing`.

Requisitos:

- O botão de ação crítica deve ficar disabled enquanto houver assinatura, envio ou confirmação pendente.
- A UI deve criar e persistir um `clientRequestId` ou `localPendingActionId` por tentativa crítica.
- Reenvio da mesma ação antes de `confirmed`, `finalized` ou `failed` deve mostrar o estado pendente, não abrir nova assinatura.
- Após falha explícita, a UI pode liberar retry com novo `clientRequestId`.
- Após `confirmed`, a UI deve reconciliar estado on-chain antes de permitir ação dependente.

Critérios de teste:

- clique duplo em “Tokenizar” não cria duas tentativas de assinatura;
- clique duplo em “Criar oferta” não cria duas listings;
- clique duplo em “Comprar” não envia duas compras;
- refresh da página durante estado pendente recupera `localPendingActionId` do lowdb e exibe estado correto.

### 25.6 Preflight de saldo SOL na UI

A UI deve executar preflight de saldo SOL antes de abrir o wallet prompt em ações que exigem fees, rent ou pagamento.

#### Criar listing

Antes de `create_primary_sale_listing`, o seller deve ter SOL suficiente para:

- fee da transação;
- rent da `ListingAccount`;
- rent da escrow ATA, quando ela ainda não existir;
- margem operacional mínima configurável para evitar falha por pequenas variações de fee/rent.

#### Comprar listing

Antes de `buy_primary_sale_listing`, o buyer deve ter SOL suficiente para:

- `expected_price_lamports`;
- fee da transação de compra;
- rent da ATA do buyer se a UI precisar criá-la antes da compra;
- fee da transação de criação da ATA, se separada;
- margem operacional mínima configurável.

#### Cancelar listing

Antes de `cancel_primary_sale_listing`, o seller deve ter SOL suficiente para:

- fee da transação de cancelamento.

Regras:

- saldo insuficiente deve bloquear o botão antes do wallet prompt;
- a UI deve informar o motivo: preço insuficiente, rent insuficiente ou fee insuficiente;
- o preflight é apenas UX/segurança operacional e não substitui validações on-chain.

---

## 26. Formato exato de dados no banco

### 26.1 Public keys

Public keys Solana devem ser strings base58.

```json
{
  "ownerWallet": "7Yf...base58",
  "programId": "9xQe...base58",
  "propertyPda": "2fD...base58",
  "valueMint": "Mint...base58"
}
```

Regras:

- não usar prefixo `0x`;
- validar com `new PublicKey(value)`;
- serializar sempre como `publicKey.toBase58()`.

### 26.2 Signatures

Signatures devem ser strings base58.

```json
{
  "registerSignature": "5Xj...base58"
}
```

### 26.3 Hashes

Hashes de metadata, documentos e localização continuam sendo bytes32 e devem ser armazenados como hex lowercase com prefixo `0x`.

```json
{
  "metadataHash": "0xabc123...64hexchars",
  "documentsHash": "0xabc123...64hexchars",
  "locationHash": "0xabc123...64hexchars"
}
```

Ao enviar para Solana:

```text
hex 0x... → [u8; 32]
```

Ao ler de Solana:

```text
[u8; 32] → 0x lowercase hex
```

### 26.4 Valores numéricos grandes

Todos os valores que possam exceder precisão segura de JS devem ser strings no banco:

```json
{
  "marketValueLamports": "200000000",
  "priceLamports": "60000000",
  "amount": "300000"
}
```

### 26.5 Schema mínimo de propriedade Solana no lowdb

```ts
type LocalSolanaProperty = {
  localPropertyId: string;
  chain: "solana";
  cluster: "devnet";
  programId: string;

  ownerWallet: string;
  propertyPda: string | null;
  usufructPositionPda: string | null;
  valueMint: string | null;

  marketValueLamports: string;
  linkedValueBps: number;
  totalValueUnits: string;
  linkedValueUnits: string;
  freeValueUnits: string;

  metadataHash: `0x${string}`;
  documentsHash: `0x${string}`;
  locationHash: `0x${string}`;

  status: "LocalDraft" | "PendingMockVerification" | "MockVerified" | "Tokenized" | "ActiveSale" | "SoldOut";

  transactions: LocalSolanaTransaction[];
  syncStatus: "synced" | "stale" | "missing_on_chain" | "local_only" | "conflict";
  lastSyncedAt: string | null;
  lastSyncedSlot: number | null;
  lastCommitment: "processed" | "confirmed" | "finalized" | null;
};
```

### 26.6 Schema local de listing Solana

```ts
type LocalSolanaListing = {
  localListingId: string;
  chain: "solana";
  cluster: "devnet";
  programId: string;

  listingPda: string;
  listingId: string;
  propertyPda: string;
  propertyId: string;

  seller: string;
  valueMint: string;
  sellerTokenAccount: string;
  escrowAuthorityPda: string;
  escrowAta: string;

  amount: string;
  priceLamports: string;
  status: "Active" | "Filled" | "Cancelled";

  createdSignature: string;
  filledSignature?: string;
  cancelledSignature?: string;

  syncStatus: "synced" | "stale" | "missing_on_chain" | "local_only" | "conflict";
  lastSyncedAt: string | null;
  lastSyncedSlot: number | null;
  lastCommitment: "processed" | "confirmed" | "finalized" | null;

  createdAt: string;
  updatedAt: string;
};
```

Regras:

- `listingPda`, `propertyPda`, `seller`, `valueMint`, `sellerTokenAccount`, `escrowAuthorityPda` e `escrowAta` são base58.
- `amount`, `priceLamports`, `listingId` e `propertyId` são strings decimais.
- `createdSignature` é obrigatório e deve ser uma signature base58 real de uma transação confirmada ou em processo de confirmação.
- `LocalSolanaListing` representa apenas listings reais on-chain; não pode representar draft local nem simulação sem signature.
- Listings simuladas devem usar schema separado, como `LocalDemoListing`, ou transação `demo_simulation` em `LocalSolanaTransaction`.

### 26.7 Schema local de listing simulada

Listings sem transação real não podem usar `LocalSolanaListing`.

```ts
type LocalDemoListing = {
  localListingId: string;
  kind: "demo_simulation";
  chain: "solana";
  cluster: "devnet";
  programId: "local-simulation";

  propertyLocalId: string;
  seller: string;
  amount: string;
  priceLamports: string;

  signature: null;
  syncStatus: "local_only";
  createdAt: string;
  updatedAt: string;
};
```

Regras:

- `LocalDemoListing` deve exibir banner de simulação na UI.
- `LocalDemoListing` não pode cumprir critério de aceite on-chain.
- `LocalDemoListing` não pode ser misturada com listings reais no mesmo componente sem separação visual clara.

### 26.8 Schema local de transação Solana

```ts
type LocalSolanaTransaction = {
  localTransactionId: string;
  signature: string | null;
  kind:
    | "initialize_protocol"
    | "register_property"
    | "mock_verify_property"
    | "tokenize_property"
    | "create_primary_sale_listing"
    | "buy_primary_sale_listing"
    | "cancel_primary_sale_listing"
    | "demo_simulation";

  status: "draft" | "submitted" | "confirmed" | "finalized" | "failed" | "simulated";
  commitment: "processed" | "confirmed" | "finalized" | null;
  finalizationStatus: "not_applicable" | "pending" | "finalized" | "failed";

  slot?: number;
  propertyPda?: string;
  listingPda?: string;
  wallet: string;

  expectedAmount?: string;
  expectedPriceLamports?: string;
  errorCode?: string;

  submittedAt?: string;
  confirmedAt?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

Regras:

- Transações reais devem ter `signature` base58.
- Transações simuladas devem ter `signature = null`, `status = "simulated"` e `finalizationStatus = "not_applicable"`.
- Critérios de aceite on-chain só podem considerar transações com `signature` real e pelo menos commitment `confirmed`.


---

## 27. Cotações fiduciárias

### 27.1 Alteração principal

A rota base passa de ETH para SOL.

| Antes | Depois |
|---|---|
| `ETH-USDC` | `SOL-USDC` |
| `USDC-BRL` | `USDC-BRL` |
| `ETH_USD ≈ ETH_USDC` | `SOL_USD ≈ SOL_USDC` |
| `ETH_BRL = ETH_USDC * USDC_BRL` | `SOL_BRL = SOL_USDC * USDC_BRL` |

### 27.2 Variáveis

```env
FIAT_PRICE_PROVIDER=okx
FIAT_SUPPORTED_CURRENCIES=brl,usd
FIAT_OPTIONAL_CURRENCIES=eur,jpy
FIAT_CACHE_TTL_SECONDS=60
FIAT_REQUEST_TIMEOUT_MS=3000
FIAT_MAX_STALENESS_SECONDS=3600
OKX_API_BASE_URL=https://www.okx.com
OKX_SOL_USDC_INST_ID=SOL-USDC
OKX_USDC_BRL_INST_ID=USDC-BRL
OKX_USDC_EUR_INST_ID=
OKX_USDC_JPY_INST_ID=
```

### 27.3 Regra de settlement

Valores fiduciários não afetam settlement.

O programa usa apenas:

- SOL;
- lamports;
- unidades inteiras.

---

## 28. Variáveis de ambiente

### 28.1 `.env.app`

```env
NEXT_PUBLIC_CHAIN=solana
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_USUFRUCT_PROGRAM_ID=

LOCAL_DB_PATH=/app/offchain-db/db.json

FIAT_PRICE_PROVIDER=okx
FIAT_SUPPORTED_CURRENCIES=brl,usd
FIAT_OPTIONAL_CURRENCIES=eur,jpy
FIAT_CACHE_TTL_SECONDS=60
FIAT_REQUEST_TIMEOUT_MS=3000
FIAT_MAX_STALENESS_SECONDS=3600
OKX_API_BASE_URL=https://www.okx.com
OKX_SOL_USDC_INST_ID=SOL-USDC
OKX_USDC_BRL_INST_ID=USDC-BRL
OKX_USDC_EUR_INST_ID=
OKX_USDC_JPY_INST_ID=

DEMO_PERSON_A_PUBKEY=
DEMO_PERSON_B_PUBKEY=
```

### 28.2 `.env.deploy`

```env
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=
ANCHOR_PROVIDER_URL=
ANCHOR_WALLET=~/.config/solana/id.json
USUFRUCT_PROGRAM_ID=
UPGRADE_AUTHORITY_KEYPAIR_PATH=
MOCK_VERIFIER_PUBKEY=
PERSON_A_PUBKEY=
PERSON_B_PUBKEY=
```

### 28.3 Regra obrigatória

```text
Keypairs privadas de deploy, upgrade authority, Person A e Person B nunca devem entrar no .env.app nem na imagem Docker da aplicação.
```

---

## 29. Upgrade authority

### 29.1 Devnet

Na Fase 0 Devnet:

- upgrade authority pode ser uma chave controlada pelo projeto;
- o caminho da keypair fica apenas em `.env.deploy`;
- a keypair não entra no container app;
- cada deploy deve registrar:
  - program id;
  - upgrade authority pubkey;
  - slot de deploy;
  - commit git;
  - IDL hash.

### 29.2 Mainnet futura

Antes de Mainnet:

- upgrade authority deve migrar para multisig;
- deve haver política de aprovação;
- deve haver timelock ou janela de contestação;
- deve haver runbook de emergency pause ou emergency upgrade;
- deve haver auditoria independente.

---

## 30. Indexação e descoberta de dados

### 30.1 Fase 0

A Fase 0 usa uma combinação de:

- lowdb como índice primário da UI;
- PDAs conhecidas salvas após transações;
- reconciliação por contas conhecidas;
- `getProgramAccounts` com filtros mínimos obrigatórios;
- fallback manual de leitura direta por PDA quando o índice local estiver incompleto.

### 30.1.1 Equivalência com leitura/indexação EVM

Na stack EVM, a UI da Fase 0 podia depender de uma combinação de:

- getters dos contratos;
- eventos/logs Solidity;
- ABIs;
- indexação por endereço de contrato;
- leituras diretas via wagmi/viem.

Em Solana, essa infraestrutura não é equivalente literalmente. A combinação de PDAs conhecidas, `getProgramAccounts`, filtros por discriminator/offset, SPL token accounts e reconciliação lowdb/on-chain cumpre o papel funcional de leitura/indexação da Fase 0.

Critério:

```text
`getProgramAccounts` e reconciliação não são funcionalidades extras; são parte da infraestrutura mínima equivalente à leitura/indexação usada no fluxo EVM.
```

### 30.2 Filtros mínimos de `getProgramAccounts` na Fase 0

A Fase 0 já deve implementar filtros mínimos para descoberta e reconciliação.

#### Buscar propriedades

Filtros obrigatórios:

- `dataSize == PropertyAccount::SPACE`;
- `memcmp` no offset `0` para o discriminator Anchor de `PropertyAccount`;
- quando buscando por owner, `memcmp` no offset do campo `owner`;
- quando buscando por status, `memcmp` no offset do campo `status`, se o layout fixo permitir.

#### Buscar listings

Filtros obrigatórios:

- `dataSize == ListingAccount::SPACE`;
- `memcmp` no offset `0` para o discriminator Anchor de `ListingAccount`;
- `memcmp` no offset do campo `property`;
- filtro por `status == Active`, quando o layout fixo permitir;
- filtro por `seller`, quando listando ofertas do owner.

#### Buscar posições de usufruto

Filtros obrigatórios:

- `dataSize == UsufructPosition::SPACE`;
- `memcmp` no offset `0` para o discriminator Anchor de `UsufructPosition`;
- `memcmp` no offset do campo `property`;
- `memcmp` no offset do campo `holder`, quando buscando por wallet.

### 30.3 Constantes normativas de offset

O frontend não pode usar offsets mágicos. Os offsets abaixo devem ser exportados por um módulo único compartilhado, por exemplo:

```text
src/shared/solana/account-layout.ts
```

Regras:

- frontend, rotas API, testes de reconciliação e filtros `getProgramAccounts` devem importar offsets deste módulo único;
- é proibido duplicar offsets manualmente em componentes, rotas API ou testes;
- o módulo deve exportar também os `SPACE` esperados e os discriminators usados nos filtros;
- qualquer mudança de struct Anchor exige atualizar esse módulo, `SPACE`, testes e IDL.

#### `ProtocolState` offsets

```ts
export const PROTOCOL_STATE_OFFSETS = {
  discriminator: 0,
  admin: 8,
  mockVerifier: 40,
  nextPropertyId: 72,
  nextListingId: 80,
  bump: 88,
  reserved: 89,
} as const;
```

#### `PropertyAccount` offsets

```ts
export const PROPERTY_ACCOUNT_OFFSETS = {
  discriminator: 0,
  propertyId: 8,
  owner: 16,
  marketValueLamports: 48,
  totalValueUnits: 56,
  linkedValueUnits: 64,
  freeValueUnits: 72,
  linkedValueBps: 80,
  metadataHash: 82,
  documentsHash: 114,
  locationHash: 146,
  valueMint: 178,
  usufructPosition: 210,
  activeListingsCount: 242,
  totalFreeValueSold: 250,
  activeEscrowedAmount: 258,
  status: 266,
  bump: 267,
  reserved: 268,
} as const;
```

#### `UsufructPosition` offsets

```ts
export const USUFRUCT_POSITION_OFFSETS = {
  discriminator: 0,
  property: 8,
  propertyId: 40,
  holder: 48,
  linkedValueUnits: 80,
  linkedValueBps: 88,
  active: 90,
  bump: 91,
  reserved: 92,
} as const;
```

#### `ListingAccount` offsets

```ts
export const LISTING_ACCOUNT_OFFSETS = {
  discriminator: 0,
  listingId: 8,
  property: 16,
  propertyId: 48,
  seller: 56,
  valueMint: 88,
  sellerTokenAccount: 120,
  escrowTokenAccount: 152,
  escrowAuthority: 184,
  amount: 216,
  priceLamports: 224,
  status: 232,
  bump: 233,
  reserved: 234,
} as const;
```

Requisitos:

- Testes devem validar que os offsets usados pelo frontend batem com o layout serializado real das contas Anchor.
- Qualquer mudança de struct exige atualização dos offsets, `SPACE`, testes e versão do PRD/IDL.
- Filtros por `status` só podem ser usados se o enum continuar serializado em 1 byte.

### 30.4 Limites da Fase 0

`getProgramAccounts` é aceitável para a Fase 0 porque o volume da demo é pequeno.

Não deve ser tratado como arquitetura de escala real.

### 30.5 Roadmap de indexador dedicado

Antes de escala real ou Mainnet, o projeto deve adicionar indexador dedicado.

Opções futuras:

- indexador próprio consumindo RPC/WebSocket;
- index store relacional;
- indexador baseado em eventos Anchor e contas;
- provider de indexação externo;
- jobs de reconciliação periódica;
- verificação cruzada com SPL balances e ATAs.

Critério de produção:

```text
Mainnet não deve depender apenas de lowdb + getProgramAccounts para descoberta global.
```

## 31. Política de reset da demo Devnet

### 31.1 Objetivo

Permitir que a demo volte a um estado conhecido sem apagar segredos e sem misturar dados antigos com novo programa.

### 31.2 Reset permitido

Script sugerido:

```text
scripts/solana-demo-reset.ts
```

Responsabilidades:

1. validar cluster `devnet`;
2. validar program id esperado;
3. limpar entidades Solana do lowdb;
4. opcionalmente criar novo arquivo `db.demo.backup.<timestamp>.json`;
5. solicitar airdrop para wallets de demo quando possível;
6. inicializar `ProtocolState` se ainda não existir;
7. registrar estado inicial da demo;
8. imprimir checklist de wallets, balances, program id e RPC.

### 31.3 Reset proibido

O script não pode:

- apagar keypairs;
- sobrescrever `.env.deploy`;
- enviar private keys para frontend;
- operar em Mainnet;
- operar se `NEXT_PUBLIC_SOLANA_CLUSTER != devnet`.

### 31.4 Estratégia quando contas on-chain antigas continuam existindo

Como contas antigas da Devnet podem continuar existindo:

- preferir novo `programId` para demo limpa; ou
- reinicializar lowdb com novo namespace `demoRunId`; ou
- filtrar apenas entidades do `programId` atual.

### 31.5 Fallback de demo sem transação real

A aplicação pode ter fallback visual de demo sem transação real apenas para apresentação em caso de falha de RPC, carteira ou faucet.

Regras obrigatórias:

- Deve exibir banner permanente: `SIMULAÇÃO LOCAL — NÃO É TRANSAÇÃO DEVNET`.
- Não pode gravar campos `signature`, `slot`, `confirmedAt` ou `finalizedAt` como se fossem reais.
- Não pode ser usado para cumprir critérios de aceite on-chain.
- Não pode ser misturado com propriedades reais da Devnet no mesmo `demoRunId`.
- O reset da demo deve limpar simulações separadamente de dados on-chain reconciliados.

---

## 32. Roadmap: stablecoin e oracle

### 32.1 Estado Fase 0

A Fase 0 usa SOL/lamports como settlement e OKX apenas para exibição informativa.

### 32.2 Problema futuro

Para produção, usar SOL como unidade de valor canônico expõe o protocolo à volatilidade do SOL.

### 32.3 Opções futuras

- Settlement em stablecoin SPL, como USDC em Solana.
- Valor canônico em USD usando oracle.
- Pagamento em SOL com conversão via oracle na criação da listing.
- Pagamento híbrido: SOL para demo, stablecoin para produção.

### 32.4 Fora da Fase 0

Não implementar oracle na Fase 0.

Adicionar milestone futura:

```text
S11 — Preço canônico com stablecoin/oracle
```

---

## 33. Roadmap: Transfer Hook e Token-2022

### 33.1 Estado Fase 0

A Fase 0 usa SPL Token clássico.

### 33.2 Quando considerar Transfer Hook

Avaliar Token-2022 + Transfer Hook se:

- compradores conseguirem transferir tokens fora da plataforma e isso quebrar a tese;
- compliance exigir whitelist ou validação por transferência;
- revenda secundária for adicionada;
- o mercado precisar impedir OTC não rastreado.

### 33.3 Riscos de Transfer Hook

- maior complexidade;
- maior superfície de bugs;
- necessidade de suporte em carteiras e integrações;
- testes adicionais;
- risco de UX pior.

### 33.4 Decisão

```text
Transfer Hook não é requisito da Fase 0.
Será avaliado em milestone futura antes de mercado secundário.
```

---

## 34. Roadmap: mercado secundário

### 34.1 Estado Fase 0

A Fase 0 não permite revenda por compradores. Apenas o owner original do `PropertyAccount` pode criar listings primárias.

### 34.2 Modelo futuro

Antes de habilitar mercado secundário, o projeto deve definir uma das abordagens:

1. marketplace secundário permissionado dentro do mesmo programa;
2. programa separado de mercado secundário;
3. Token-2022 + Transfer Hook para validar transferências;
4. whitelist/KYC off-chain com enforcement on-chain;
5. modelo híbrido com book off-chain e settlement on-chain.

### 34.3 Requisitos mínimos futuros

- Política de quem pode vender.
- Política de quem pode comprar.
- Regras de compliance.
- Eventos/indexação para histórico de titularidade.
- Tratamento de preço, taxas e royalties, se houver.
- Estratégia para impedir ou aceitar OTC fora da plataforma.

---

## 35. Roadmap: modularização de programas

### 35.1 Estado Fase 0

A Fase 0 usa um único programa Anchor `usufruct_protocol` para reduzir complexidade de deploy e demo.

### 35.2 Separação futura

Antes de produção, avaliar separação em módulos ou programas:

- `registry_program`: registro, verificação e propriedades;
- `tokenization_program`: mint e posição de usufruto;
- `marketplace_program`: listings, escrow e compras;
- `governance_program`: parâmetros administrativos, upgrade e roles.

### 35.3 Critério de separação

Separar programas apenas se houver necessidade real de:

- reduzir superfície de upgrade;
- isolar permissões;
- permitir auditoria modular;
- escalar marketplace independentemente;
- introduzir governança progressiva.

---

## 36. Caminho para Mainnet, auditoria, governança e compliance

Antes de Mainnet, o projeto deve cumprir:

### 36.1 Segurança

- auditoria externa do programa Anchor;
- revisão independente de constraints;
- fuzz/property tests para aritmética e estados;
- testes adversariais de contas falsas;
- revisão de upgrade authority;
- revisão de rent/close accounts;
- revisão de token mint authority;
- revisão de reconciliação lowdb/on-chain.

### 36.2 Operação

- RPC dedicado;
- indexador dedicado;
- monitoramento de transações;
- alertas de falhas de sincronização;
- runbook de incidentes;
- backups do banco off-chain;
- versionamento de IDL.

### 36.3 Governança

- multisig para upgrade authority;
- política de aprovação;
- timelock;
- comunicação pública de upgrades;
- plano de migração de programa;
- plano de congelamento de programa, se aplicável.

### 36.4 Produto

- definição jurídica dos direitos;
- política de KYC/compliance, se aplicável;
- decisão entre SOL, stablecoin ou outro settlement;
- política de mercado secundário;
- termos de risco para compradores.

### 36.5 Stablecoin/oracle como bloqueador de Mainnet

Antes de Mainnet, o projeto deve fechar o modelo de valor canônico.

Decisão de Fase 0:

```text
Fase 0 usa SOL/lamports apenas para demo.
Mainnet exige decisão explícita sobre stablecoin e/ou oracle antes de qualquer lançamento com valor real.
```

Opções a avaliar:

- USDC SPL como settlement primário;
- SOL como pagamento, mas preço canônico em USD via oracle;
- oracle para conversão SOL/USD no momento de criação da listing;
- stablecoin para reduzir volatilidade e simplificar demonstração econômica.

### 36.6 Política jurídica e compliance

Antes de Mainnet, o projeto deve ter política jurídica formal para os direitos tokenizados.

Itens mínimos:

- natureza jurídica do Direito de Usufruto representado;
- natureza jurídica do Direito de Valor Vinculado;
- natureza jurídica do Direito de Valor Livre;
- restrições de oferta pública/privada;
- KYC/AML quando aplicável;
- restrições geográficas;
- suitability do comprador, se aplicável;
- termos de uso e disclaimers;
- política para documentos reais;
- governança de disputas e correções;
- análise regulatória antes de mercado secundário.

Critério:

```text
Mainnet não pode ser aprovada apenas por critérios técnicos.
Aprovação jurídica/compliance é bloqueador obrigatório.
```

---


### 36.7 Bloqueadores técnicos antes de qualquer valor real

Antes de qualquer lançamento com valor real, não apenas Mainnet, o projeto deve cumprir:

- substituir `lowdb` por banco real transacional, como Postgres, SQLite gerenciado com locking robusto ou banco equivalente;
- adicionar indexador dedicado para propriedades, listings, SPL balances, ATAs e histórico de transações;
- substituir ou mitigar `ProtocolState` com contador global por nonce/sharding/indexador;
- definir stablecoin/oracle como modelo de valor canônico;
- definir mercado secundário, inclusive se será permitido, permissionado ou bloqueado;
- concluir análise jurídica/compliance dos direitos tokenizados;
- revisar KYC/AML, restrições geográficas e suitability quando aplicável.

Critério:

```text
A Fase 0 pode operar em Devnet com SOL/lamports, lowdb e contador global.
Qualquer valor real exige banco real, indexador, modelo canônico de preço e aprovação jurídica/compliance.
```

### 36.8 Roadmap de substituição do lowdb

`lowdb` é aceito apenas para demo local e backend único.

Roadmap mínimo:

1. definir banco transacional;
2. migrar schemas `LocalSolanaProperty`, `LocalSolanaListing` e `LocalSolanaTransaction`;
3. adicionar migrações versionadas;
4. adicionar locks transacionais;
5. adicionar backups;
6. adicionar observabilidade de reconciliação;
7. remover dependência de arquivo local compartilhado.


## 37. Milestones da migração

## Milestone S0 — Arquitetura final e freeze Ethereum

**Objetivo:** congelar evolução da stack Ethereum.

### Checklist

- [x] Arquivar código Ethereum.
- [x] Remover dependências EVM do caminho ativo.

### Critérios de aprovação

- [x] Documento de decisão técnica aprovado.
- [x] Código Ethereum movido para `/archive/ethereum-sepolia-phase0/`.
- [x] Nenhuma rota ativa depende de contrato Sepolia.
- [x] Variáveis EVM removidas do `.env.app` ativo.

---

## Milestone S1 — Setup Solana/Anchor

**Objetivo:** preparar ambiente Solana reproduzível.

### Checklist

- [x] Instalar versões fixadas.
- [x] Criar workspace Anchor.
- [x] Criar programa `usufruct_protocol`.
- [x] Configurar `Anchor.toml` para Devnet e localnet.
- [x] Criar `.env.deploy` Solana.
- [x] Criar `.env.app` Solana.
- [x] Gerar IDL.
- [x] Criar script de deploy Devnet.
- [x] Criar script de preflight Solana.
- [x] Garantir que keypairs privadas não entram no container app.

### Critérios de aprovação

- [x] `anchor build` passa.
- [x] `anchor test` mínimo passa.
- [x] `anchor deploy` em Devnet funciona.
- [x] `programId` é salvo no `.env.app`.
- [x] App lê `programId` sem chave privada.

### Testes

- [x] Teste de versão de tooling.
- [x] Teste de build Anchor.
- [x] Teste de IDL gerada.
- [x] Teste de Docker sem secrets.

---

## Milestone S2 — Estado, PDAs, space e ErrorCode

**Objetivo:** criar as contas base e validações estruturais.

### Checklist

- [x] Implementar `ProtocolState`.
- [x] Implementar `PropertyAccount`.
- [x] Implementar `UsufructPosition`.
- [x] Implementar `ListingAccount`.
- [x] Implementar enums.
- [x] Implementar `ErrorCode` completo, incluindo `InvalidAssociatedTokenProgram`.
- [x] Implementar eventos Anchor mínimos e payloads esperados.
- [x] Implementar constantes `SPACE`.
- [x] Implementar `reserved: [u8; 32]` nas contas principais.
- [x] Implementar seeds de todas as PDAs.
- [x] Salvar bumps.
- [x] Documentar que `ProtocolState` é demo-only.
- [x] Documentar que testes paralelos devem isolar ou serializar acesso ao `ProtocolState`.

### Critérios de aprovação

- [x] Contas são criadas com `space` correto.
- [x] Seeds são determinísticas.
- [x] Bumps são salvos e usados.
- [x] Erros esperados são retornados.
- [x] Eventos Anchor mínimos são emitidos com payload correto.

### Testes

- [x] Derivação de `ProtocolState`.
- [x] Derivação de `PropertyAccount`.
- [x] Derivação de `UsufructPosition`.
- [x] Derivação de `ListingAccount`.
- [x] Derivação de `EscrowAuthority`.
- [x] Falha com PDA falsa.
- [x] Falha com bump incorreto.
- [x] Teste de `space` mínimo.
- [x] Teste que falha quando `SPACE` declarado fica incompatível com o tamanho serializado da struct.
- [x] Testes paralelos usam program id/ProtocolState isolado ou rodam serializados.

---

## Milestone S3 — Registro e mock verification

**Objetivo:** migrar registro on-chain e verificação mockada.

### Checklist

- [x] Implementar `initialize_protocol`.
- [x] Implementar `register_property`.
- [x] Implementar `mock_verify_property`.
- [x] Validar hashes `[u8; 32]` não zerados.
- [x] Validar `market_value_lamports > 0`.
- [x] Validar `linked_value_bps > 0 && < 10_000`.
- [x] Calcular unidades com checked arithmetic.
- [x] Atualizar status.
- [x] Emitir eventos Anchor.

### Critérios de aprovação

- [x] Pessoa A registra imóvel em Devnet.
- [x] Property PDA guarda hashes e parâmetros.
- [x] Status inicial é `PendingMockVerification`.
- [x] Owner ou mock verifier aprova documentação.
- [x] Status vira `MockVerified`.

### Testes

- [x] Registro válido.
- [x] Valor zero reverte.
- [x] BPS inválido reverte.
- [x] Hash zero reverte.
- [x] Verificação por owner funciona.
- [x] Verificação por mock verifier funciona.
- [x] Verificação por conta não autorizada reverte.
- [x] Conta `PropertyAccount` falsa reverte.
- [x] `ProtocolState` falso reverte.

---

## Milestone S4 — Tokenização SPL e usufruto

**Objetivo:** criar a mint SPL do valor livre e a posição de usufruto.

### Checklist

- [x] Implementar `tokenize_property`.
- [x] Criar `UsufructPosition` PDA.
- [x] Criar mint SPL com `decimals = 0`.
- [x] Usar `ValueMintAuthority` PDA.
- [x] Mintar `free_value_units` para ATA do owner.
- [x] Salvar `value_mint` na propriedade.
- [x] Criar `UsufructPosition.active = true` e manter inalterado na Fase 0.
- [x] Bloquear tokenização duplicada.
- [x] Remover mint authority após mint inicial.
- [x] Criar mint sem freeze authority.
- [x] Validar `token_program == spl_token::ID`.
- [x] Validar `associated_token_program == associated_token::ID`.

### Critérios de aprovação

- [x] Pessoa A tokeniza imóvel registrado somente após validação mock/documental.
- [x] Owner recebe `free_value_units`.
- [x] UsufructPosition mostra `linked_value_units`.
- [x] Mint usa `decimals = 0`.
- [x] Property status vira `Tokenized`.

### Testes

- [x] Tokenização válida.
- [x] Tokenização após registro sem mock verification é permitida.
- [x] Tokenização duplicada reverte.
- [x] Mint falso reverte.
- [x] ATA falsa do owner reverte.
- [x] Decimals diferente de 0 reverte.
- [x] Mint authority falsa reverte.
- [x] Mint authority remanescente após tokenização falha no teste.
- [x] Freeze authority configurada falha no teste.
- [x] Token-2022/token program incorreto reverte.
- [x] Associated Token Program falso reverte.
- [x] `UsufructPosition.active` nasce `true` e permanece `true`.
- [x] Rollback preserva estado se CPI pós-atualização falhar.
- [x] Mint adicional não autorizado reverte.

---

## Milestone S5 — Listing e escrow

**Objetivo:** criar ofertas primárias com escrow por PDA.

### Checklist

- [x] Implementar `create_primary_sale_listing`.
- [x] Validar owner signer.
- [x] Validar propriedade `Tokenized` ou `ActiveSale`.
- [x] Calcular `price_lamports` com checked arithmetic.
- [x] Validar `price_lamports > 0`.
- [x] Criar `ListingAccount`.
- [x] Criar/validar `EscrowAuthority` PDA.
- [x] Criar/validar escrow token account como ATA da EscrowAuthority PDA.
- [x] Seller/owner paga criação da escrow ATA.
- [x] Transferir tokens com `transfer_checked`.
- [x] Atualizar contadores.
- [x] Permitir múltiplas listings enquanto houver saldo livre suficiente.

### Critérios de aprovação

- [x] Pessoa A cria listing de 300.000 unidades.
- [x] Preço é calculado proporcionalmente.
- [x] Tokens saem da ATA do owner e entram no escrow.
- [x] Property status vira `ActiveSale`.
- [x] Marketplace lista a oferta.

### Testes

- [x] Listing válida.
- [x] Amount zero reverte.
- [x] Saldo insuficiente reverte.
- [x] Seller falso reverte.
- [x] Owner token account falsa reverte.
- [x] Mint falso reverte.
- [x] Escrow authority falsa reverte.
- [x] Escrow token account falsa reverte.
- [x] Propriedade não tokenizada reverte.
- [x] Preço zero reverte.
- [x] Múltiplas listings ativas funcionam enquanto houver saldo livre suficiente.
- [x] Listing com saldo insuficiente reverte com `InsufficientFreeValueBalance`.
- [x] Token-2022/token program incorreto reverte.
- [x] Associated Token Program falso reverte.

---

## Milestone S6 — Compra de listing

**Objetivo:** permitir compra total segura com `expected_price_lamports`.

### Checklist

- [x] Implementar `buy_primary_sale_listing`.
- [x] Validar listing ativa.
- [x] Validar buyer diferente do seller.
- [x] Validar `expected_amount`.
- [x] Validar `expected_price_lamports`.
- [x] Transferir SOL do buyer para seller.
- [x] UI cria ATA do buyer antes da instrução, com rent pago pelo buyer; programa apenas valida ATA canônica.
- [x] Transferir tokens do escrow para buyer com `transfer_checked`.
- [x] Atualizar listing para `Filled`.
- [x] Atualizar contadores da propriedade.
- [x] Atualizar status para `Tokenized`, `ActiveSale` ou `SoldOut`.
- [x] Fechar escrow token account quando saldo zerar.
- [x] Enviar rent para seller.
- [x] Manter `ListingAccount` aberta com status final.

### Critérios de aprovação

- [x] Pessoa B compra listing pagando preço exato em SOL.
- [x] Pessoa A recebe SOL.
- [x] Pessoa B recebe SPL tokens livres.
- [x] Listing vira `Filled`.
- [x] Escrow é fechado e rent vai para seller.
- [x] Dashboard mostra distribuição 70/30 no exemplo-base.

### Testes

- [x] Compra válida.
- [x] Buyer igual seller reverte.
- [x] `expected_price_lamports` incorreto reverte.
- [x] `expected_amount` incorreto reverte.
- [x] Listing preenchida não pode ser comprada.
- [x] Buyer ATA falsa reverte.
- [x] Buyer sem ATA não consegue comprar até a UI criar a ATA antes da instrução.
- [x] Compra funciona após UI criar a ATA do buyer e buyer pagar o rent.
- [x] Mint falso reverte.
- [x] Seller falso reverte.
- [x] Escrow token account falsa reverte.
- [x] Escrow authority falsa reverte.
- [x] Property falsa reverte.
- [x] Rent retorna ao seller.
- [x] `SoldOut` é calculado corretamente.

---

## Milestone S7 — Cancelamento de listing

**Objetivo:** permitir cancelamento seguro de oferta ativa.

### Checklist

- [x] Implementar `cancel_primary_sale_listing`.
- [x] Validar seller signer.
- [x] Validar listing ativa.
- [x] Devolver tokens ao seller com `transfer_checked`.
- [x] Atualizar listing para `Cancelled`.
- [x] Atualizar contadores.
- [x] Atualizar status da propriedade.
- [x] Fechar escrow token account.
- [x] Enviar rent para seller.
- [x] Manter `ListingAccount` aberta com status final.

### Critérios de aprovação

- [x] Pessoa A cancela listing ativa.
- [x] Tokens voltam para ATA da Pessoa A.
- [x] Listing vira `Cancelled`.
- [x] Escrow fecha e rent volta para seller.
- [x] Status volta para `Tokenized` se não houver listings ativas.

### Testes

- [x] Cancelamento válido.
- [x] Cancelamento por não seller reverte.
- [x] Cancelamento de listing preenchida reverte.
- [x] Cancelamento de listing cancelada reverte.
- [x] Seller ATA falsa reverte.
- [x] Mint falso reverte.
- [x] Escrow falso reverte.
- [x] Rent retorna ao seller.

---

## Milestone S8 — Frontend Solana e lowdb

**Objetivo:** substituir integração wallet/web3 e adaptar persistência.

### Checklist

- [x] Remover wagmi/viem da UI ativa.
- [x] Adicionar Solana Wallet Adapter.
- [x] Conectar wallet Solana.
- [x] Detectar Devnet.
- [x] Derivar PDAs no frontend.
- [x] Converter hashes hex para `[u8; 32]`.
- [x] Converter lamports string para `bigint`.
- [x] Persistir public keys base58.
- [x] Persistir signatures base58.
- [x] Persistir sync status.
- [x] Implementar lock/serialização de escrita lowdb.
- [x] Validar que Fase 0 roda com uma única instância backend.
- [x] Implementar schemas `LocalSolanaListing` e `LocalSolanaTransaction`.
- [x] Implementar módulo único compartilhado de offsets para `getProgramAccounts`.
- [x] Implementar reconciliação antes de ações críticas.
- [x] Implementar filtros mínimos de `getProgramAccounts` para propriedades, usufrutos e listings.
- [x] Bloquear double-submit em transações críticas.
- [x] Implementar preflight de saldo SOL para seller e buyer antes do wallet prompt.
- [x] Atualizar dashboard para SOL.
- [x] Exibir `admin` e `mock_verifier` em área técnica/admin read-only, sem ações de alteração.
- [x] Atualizar marketplace.

### Critérios de aprovação

- [x] Usuário conecta wallet Solana.
- [x] Usuário registra imóvel.
- [x] Usuário verifica mock.
- [x] Usuário tokeniza.
- [x] Usuário cria listing.
- [x] Outro usuário compra.
- [x] lowdb é atualizado após confirmações.
- [x] Divergências on-chain/local são detectadas.

### Testes

- [x] Testes unitários de conversão base58.
- [x] Testes unitários de hash hex ↔ bytes.
- [x] Testes de escrita concorrente no lowdb.
- [x] Testes de reconciliação listing stale.
- [x] Testes de reconciliação mint divergente.
- [x] Testes de buyer/seller wallet scoping.
- [x] Testes que validam offsets usados no frontend contra layout serializado.
- [x] Testes de UI para estado `stale`.
- [x] Testes de double-submit para tokenização, criação de listing, compra e cancelamento.

---

## Milestone S9 — Cotações SOL e demo Devnet

**Objetivo:** adaptar cotação e preparar demo confiável.

### Checklist

- [x] Trocar ETH por SOL na API de fiat.
- [x] Consultar `SOL-USDC`.
- [x] Manter `USDC-BRL` runtime.
- [x] Atualizar cache lowdb.
- [x] Atualizar UI para SOL/USD/BRL.
- [x] Criar script de reset Devnet.
- [x] Criar script de preflight Devnet.
- [x] Validar balances de Person A e Person B.
- [x] Criar seed de demo local.
- [x] Criar fallback de demo sem transação real com banner obrigatório e separado do aceite on-chain.

### Critérios de aprovação

- [x] UI mostra valores em SOL e USD.
- [x] BRL aparece quando rota disponível.
- [x] Reset Devnet prepara demo limpa.
- [x] Preflight valida program id, RPC, wallets e balances.
- [x] Demo roda em até 5 minutos.
- [x] Fallback simulado não é contado como aceite on-chain.

### Testes

- [x] API sucesso SOL-USDC.
- [x] API fallback cache.
- [x] API BRL indisponível sem bloquear SOL/USD.
- [x] Reset não roda em Mainnet.
- [x] Reset não apaga keypairs.
- [x] Preflight falha sem program id.
- [x] Preflight falha sem balance mínimo.

---

## Milestone S10 — Segurança, reconciliação e aceite final

**Objetivo:** validar fluxo completo e cenários adversariais.

### Checklist

- [x] Rodar todos os testes Anchor.
- [x] Rodar todos os testes frontend.
- [x] Rodar testes de contas falsas.
- [x] Rodar testes de mint falso.
- [x] Rodar testes de ATA falsa.
- [x] Rodar testes de seller falso.
- [x] Rodar testes de stale lowdb.
- [x] Rodar demo completa em Devnet.
- [x] Validar fechamento de escrow.
- [x] Validar rent destino seller.
- [x] Validar commitment `confirmed`.
- [x] Validar reconciliação pós-demo.
- [x] Atualizar documentação de runbook.

### Critérios de aprovação

- [x] Fluxo completo funciona em Devnet.
- [x] Todos os testes P0 passam.
- [x] Mint authority removida após tokenização.
- [x] Freeze authority ausente.
- [x] Token program SPL clássico validado.
- [x] Associated Token Program validado.
- [x] `InvalidAssociatedTokenProgram` implementado e testado.
- [x] Eventos Anchor mínimos emitidos e testados.
- [x] `UsufructPosition.active` nasce `true` e permanece inalterado.
- [x] `ListingAccount` permanece aberta após compra/cancelamento.
- [x] Escrow usa ATA da EscrowAuthority.
- [x] lowdb usa escrita serializada.
- [x] Nenhuma dependência Ethereum ativa permanece.
- [x] Escrow não fica com saldo após compra/cancelamento.
- [x] Estado lowdb reconcilia com on-chain.
- [x] Demo final mostra Pessoa A com usufruto e valor vinculado, e Pessoa B apenas com valor livre.

### Testes

- [x] Teste end-to-end localnet.
- [x] Teste end-to-end Devnet.
- [x] Testes adversariais de contas.
- [x] Testes de recovery/reconciliação.
- [x] Testes de reset demo.
- [x] Testes de regressão da UI.

---

## 38. Matriz de testes obrigatórios

### 38.1 Anchor/unit/integration

| Área | Testes obrigatórios |
|---|---|
| Inicialização | cria ProtocolState, rejeita duplicado, admin correto, testes paralelos isolam ou serializam ProtocolState |
| Registro | parâmetros válidos, valor zero, BPS inválido, hashes zero |
| Mock verify | owner, mock verifier, admin, unauthorized |
| Tokenização | status correto, mint SPL clássico, token program correto, decimals 0, amount correto, remove mint authority, sem freeze authority, tokenização duplicada |
| Mint authority | PDA correta, mint falso, authority falsa, mint adicional bloqueado |
| Listing | owner only, múltiplas listings sem limite protocolar fixo, escrow ATA da EscrowAuthority, preço proporcional, amount inválido, saldo insuficiente |
| Compra | expected price, expected amount, buyer != seller, seller correto, transfer SOL, transfer token |
| Cancelamento | seller only, active only, token return, escrow close |
| Contas falsas | property falsa, listing falsa, mint falso, ATA falsa, seller falso, buyer ATA falsa |
| Aritmética | checked add/sub/mul/div, overflow, underflow, price zero |
| Status | Tokenized, ActiveSale, SoldOut, volta para Tokenized |
| Rent | rent de escrow retorna ao seller |
| Space | `SPACE` declarado compatível com tamanho serializado; falha se struct mudar sem atualizar `SPACE` |

### 38.2 Frontend/API

| Área | Testes obrigatórios |
|---|---|
| Wallet | conecta Solana wallet, detecta Devnet, rejeita cluster errado |
| PDAs | deriva seeds corretas, bloqueia divergência, valida offsets do módulo único compartilhado com `getProgramAccounts` |
| Hashes | hex ↔ bytes, lowercase, prefixo 0x |
| lowdb | schema Solana, `LocalSolanaListing`, `LocalSolanaTransaction`, base58 public keys, signatures, sync status, lock de escrita, concorrência sem perda de update, backend único |
| Reconciliação | stale listing, filled listing, mint divergente, seller divergente |
| Cotação | SOL/USD, SOL/BRL, cache, fallback, erro padronizado |
| UI | fluxo guiado, dashboard, marketplace, estados de loading/erro, double-submit bloqueado, preflight de saldo SOL |
| Demo reset | Devnet only, backup db, não apaga secrets, simulação local separada de aceite on-chain |

### 38.3 E2E

Fluxo completo:

1. reset demo Devnet;
2. conecta Person A;
3. registra propriedade;
4. mock verify;
5. tokeniza;
6. cria listing de 300.000 unidades;
7. conecta Person B;
8. compra listing com `expected_price_lamports` correto;
9. reconcilia lowdb;
10. valida distribuição 70/30.

---

## 39. Invariantes críticas

- `linked_value_units + free_value_units == total_value_units`.
- Cada `PropertyAccount` tem exatamente uma `UsufructPosition` após tokenização.
- Cada imóvel tem exatamente uma mint SPL de Direito de Valor Livre.
- Mint SPL usa `decimals = 0`.
- Mint SPL usa exclusivamente SPL Token clássico.
- Mint authority é removida após o mint inicial.
- Freeze authority é `None`.
- Supply inicial mintado é exatamente `free_value_units`.
- Direito de Valor Vinculado não é token SPL.
- Direito de Valor Vinculado não pode ser vendido separadamente.
- Compradores não podem criar listings na Fase 0.
- `UsufructPosition.active` nasce `true` e não muda na Fase 0.
- Cada imóvel pode ter múltiplas listings ativas na Fase 0 enquanto houver saldo livre suficiente.
- Cada listing ativa possui escrow próprio.
- Tokens em escrow são mantidos na ATA da EscrowAuthority PDA.
- Compra exige `expected_price_lamports` exato.
- Compra exige `expected_amount` exato.
- Compra total apenas.
- Escrow token account é fechada após compra/cancelamento quando saldo zerar.
- `ListingAccount` não é fechada na Fase 0.
- Rent do escrow retorna ao seller.
- lowdb nunca substitui validação on-chain.
- Valores fiduciários não afetam settlement.
- Associated Token Program é validado como `associated_token::ID` nos fluxos que usam ATAs.
- Transferências SPL no programa usam `transfer_checked`.
- Aritmética on-chain usa `checked_*`.

---

## 40. Sequência final da demo Solana

1. Pessoa A abre app local via Docker.
2. Pessoa A conecta wallet Solana Devnet.
3. Pessoa A acessa “Tokenizar minha casa”.
4. Pessoa A informa valor de mercado: `0.2 SOL`.
5. UI mostra valor aproximado em USD e, se disponível, BRL.
6. Pessoa A define valor vinculado: 20%.
7. Pessoa A informa endereço, localização e documentos mockados.
8. Dados sensíveis são salvos em lowdb.
9. Hashes são gerados localmente.
10. Pessoa A registra imóvel on-chain em Solana.
11. `PropertyAccount` é criada.
12. Pessoa A executa mock verify.
13. Pessoa A tokeniza imóvel.
14. Programa cria `UsufructPosition`.
15. Programa cria mint SPL de Direito de Valor Livre.
16. Programa minta 800.000 unidades para Pessoa A.
17. Pessoa A cria listing de 300.000 unidades.
18. Programa calcula preço: `0.06 SOL`.
19. Tokens são movidos para escrow PDA.
20. Pessoa B conecta wallet.
21. UI reconcilia listing on-chain.
22. Pessoa B compra com `expected_amount = 300000` e `expected_price_lamports = 60000000`.
23. Programa transfere SOL para Pessoa A.
24. Programa transfere tokens livres para Pessoa B.
25. Programa fecha escrow token account e envia rent para Pessoa A.
26. lowdb reconcilia com on-chain.
27. Dashboard mostra:
    - Pessoa A mantém usufruto;
    - Pessoa A mantém 20% vinculado;
    - Pessoa A mantém 50% livre;
    - Pessoa A tem 70% econômico total;
    - Pessoa B possui 30% econômico total;
    - Pessoa B não possui direito de uso;
    - valores aparecem em SOL, USD e BRL quando disponível.

---

## 41. Definição de pronto da migração

A migração para Solana está pronta quando:

- [x] Stack Ethereum foi arquivada e removida do caminho ativo.
- [x] App conecta wallet Solana Devnet.
- [x] Programa Anchor está deployado na Devnet.
- [x] `ProtocolState` inicializado.
- [x] Registro de imóvel funciona.
- [x] Mock verification funciona.
- [x] Tokenização SPL funciona.
- [x] `UsufructPosition` funciona.
- [x] Mint SPL usa `decimals = 0`.
- [x] Mint authority está definida conforme PRD.
- [x] Listings múltiplas funcionam.
- [x] Escrow PDA funciona.
- [x] Compra exige `expected_price_lamports`.
- [x] Compra transfere SOL para seller.
- [x] Compra transfere tokens para buyer.
- [x] Escrow fecha após compra/cancelamento.
- [x] Rent volta para seller.
- [x] lowdb usa formato base58/hex/string definido.
- [x] lowdb inclui `LocalSolanaListing` e `LocalSolanaTransaction`.
- [x] Offsets de `getProgramAccounts` vêm de módulo único compartilhado e são testados.
- [x] Reconciliação local/on-chain funciona.
- [x] Testes de contas falsas passam.
- [x] Testes de mint falso passam.
- [x] Testes de ATA falsa passam.
- [x] Testes de seller falso passam.
- [x] Testes de rollback por falha de CPI passam.
- [x] Preflight de saldo SOL do buyer/seller funciona.
- [x] API de cotação usa SOL.
- [x] Demo reset Devnet funciona.
- [x] Demo completa roda em até 5 minutos.
- [x] Todos os testes P0 passam.
- [x] Mint authority removida após tokenização.
- [x] Freeze authority ausente.
- [x] Token program SPL clássico validado.
- [x] Associated Token Program validado.
- [x] `InvalidAssociatedTokenProgram` implementado e testado.
- [x] Eventos Anchor mínimos emitidos e testados.
- [x] `UsufructPosition.active` nasce `true` e permanece inalterado.
- [x] `ListingAccount` permanece aberta após compra/cancelamento.
- [x] Escrow usa ATA da EscrowAuthority.
- [x] lowdb usa escrita serializada.

---

## 42. Referências técnicas usadas para esta versão

- Solana Docs — instalação de Rust, Solana CLI e Anchor.
- Solana Docs — Wallet Adapter com React.
- Anchor releases — versões Anchor disponíveis.
- npm — versões de `@solana/web3.js`, `@solana/spl-token` e wallet adapter.
- Solana Docs — PDAs, tokens e confirmação de transações.
