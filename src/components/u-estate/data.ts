import type { Listing, Property, Transaction, User } from "./types";

export const shortHash = () =>
  "0x" +
  Array.from({ length: 40 }, () =>
    "0123456789abcdef"[Math.floor(Math.random() * 16)],
  ).join("");

export const truncate = (s: string | undefined, head = 6, tail = 4) =>
  s ? s.slice(0, head) + "…" + s.slice(-tail) : "";

export const formatEth = (eth: string | number) => {
  const n = Number(eth);
  if (n < 0.001) return n.toFixed(6) + " ETH";
  if (n < 1) return n.toFixed(3) + " ETH";
  return n.toFixed(2) + " ETH";
};

export const formatUsd = (eth: string | number, rate = 2350) => {
  const n = Number(eth) * rate;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

export const formatBrl = (eth: string | number, rate = 12450) => {
  const n = Number(eth) * rate;
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
};

export const formatUnits = (n: number) => Number(n).toLocaleString("pt-BR");

export const initialProperties: Property[] = [
  {
    id: "prop-1",
    propertyId: "1",
    title: "Casa Vila Madalena",
    street: "Rua Harmonia",
    number: "432",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    postalCode: "05435-000",
    lat: "-23.553210",
    lng: "-46.689440",
    description:
      "Casa térrea com jardim em região arborizada, próxima ao metrô.",
    marketValueEth: "0.85",
    linkedValueBps: 2000,
    totalValueUnits: 1000000,
    linkedValueUnits: 200000,
    freeValueUnits: 800000,
    soldFreeValueUnits: 300000,
    activeListings: 1,
    status: "ActiveSale",
    thumbVariant: "mix",
    documents: [
      { type: "mock_deed", filename: "matricula_28734.pdf" },
      { type: "mock_owner_id", filename: "rg_proprietaria.pdf" },
      { type: "mock_tax_record", filename: "iptu_2026.pdf" },
    ],
    metadataHash: "0x9f3a7b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
    documentsHash: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
    locationHash: "0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d",
    valueTokenAddress: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    usufructTokenId: "1",
    ownerWallet: "0x1f8a23b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    createdAt: "2026-04-12T10:00:00Z",
  },
  {
    id: "prop-2",
    propertyId: "2",
    title: "Apartamento Pinheiros",
    street: "Rua dos Pinheiros",
    number: "1820",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    postalCode: "05422-001",
    lat: "-23.566180",
    lng: "-46.692300",
    description:
      "Apartamento de 2 dormitórios, vista para rua arborizada.",
    marketValueEth: "0.42",
    linkedValueBps: 2500,
    totalValueUnits: 1000000,
    linkedValueUnits: 250000,
    freeValueUnits: 750000,
    soldFreeValueUnits: 0,
    activeListings: 0,
    status: "Tokenized",
    thumbVariant: "orange",
    documents: [
      { type: "mock_deed", filename: "matricula_apt.pdf" },
      { type: "mock_owner_id", filename: "cnh.pdf" },
    ],
    metadataHash: "0x3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e",
    documentsHash: "0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f",
    locationHash: "0x5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
    valueTokenAddress: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
    usufructTokenId: "2",
    ownerWallet: "0x1f8a23b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    createdAt: "2026-04-18T15:30:00Z",
  },
  {
    id: "prop-3",
    propertyId: "3",
    title: "Sobrado Jardim Botânico",
    street: "Rua Pacheco Leão",
    number: "88",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    postalCode: "22460-030",
    lat: "-22.964820",
    lng: "-43.225600",
    description: "Sobrado em rua tranquila, próximo ao Jardim Botânico.",
    marketValueEth: "1.20",
    linkedValueBps: 3000,
    totalValueUnits: 1000000,
    linkedValueUnits: 300000,
    freeValueUnits: 700000,
    soldFreeValueUnits: 700000,
    activeListings: 0,
    status: "SoldOut",
    thumbVariant: "charcoal",
    documents: [
      { type: "mock_deed", filename: "matricula_sobrado.pdf" },
      { type: "mock_owner_id", filename: "rg.pdf" },
      { type: "mock_tax_record", filename: "iptu.pdf" },
    ],
    metadataHash: "0x6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
    documentsHash: "0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c",
    locationHash: "0x8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d",
    valueTokenAddress: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
    usufructTokenId: "3",
    ownerWallet: "0x1f8a23b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    createdAt: "2026-03-22T08:00:00Z",
  },
  {
    id: "prop-4",
    propertyId: "4",
    title: "Loft Centro Histórico",
    street: "Rua Sete de Setembro",
    number: "210",
    city: "Curitiba",
    state: "PR",
    country: "Brasil",
    postalCode: "80020-000",
    lat: "-25.428400",
    lng: "-49.272500",
    description: "Loft em prédio histórico restaurado.",
    marketValueEth: "0.28",
    linkedValueBps: 1500,
    totalValueUnits: 1000000,
    linkedValueUnits: 150000,
    freeValueUnits: 850000,
    soldFreeValueUnits: 100000,
    activeListings: 2,
    status: "ActiveSale",
    thumbVariant: "soft",
    documents: [
      { type: "mock_deed", filename: "matricula_loft.pdf" },
      { type: "mock_owner_id", filename: "rg_owner.pdf" },
    ],
    metadataHash: "0x9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
    documentsHash: "0x0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
    locationHash: "0x1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
    valueTokenAddress: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
    usufructTokenId: "4",
    ownerWallet: "0x1f8a23b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    createdAt: "2026-04-25T12:00:00Z",
  },
];

export const initialListings: Listing[] = [
  {
    listingId: "1",
    propertyId: "1",
    amount: 240000,
    priceWei: "0.204",
    seller: "0x1f8a23b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    status: "Active",
    listedAt: "2026-04-22T10:00:00Z",
    txHash: "0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
  },
  {
    listingId: "2",
    propertyId: "4",
    amount: 60000,
    priceWei: "0.0168",
    seller: "0x1f8a23b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    status: "Active",
    listedAt: "2026-04-26T14:00:00Z",
    txHash: "0xb0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
  },
  {
    listingId: "3",
    propertyId: "4",
    amount: 40000,
    priceWei: "0.0112",
    seller: "0x1f8a23b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    status: "Active",
    listedAt: "2026-04-27T09:00:00Z",
    txHash: "0xc1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
  },
];

export const initialTransactions: Transaction[] = [
  {
    id: "t1",
    type: "Cadastro",
    propertyTitle: "Casa Vila Madalena",
    valueEth: null,
    status: "Confirmado",
    date: "2026-04-12T10:05:00Z",
    txHash: "0xd2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
  },
  {
    id: "t2",
    type: "Análise concluída",
    propertyTitle: "Casa Vila Madalena",
    valueEth: null,
    status: "Confirmado",
    date: "2026-04-13T11:30:00Z",
    txHash: "0xe3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
  },
  {
    id: "t3",
    type: "Pronto pra publicar",
    propertyTitle: "Casa Vila Madalena",
    valueEth: null,
    status: "Confirmado",
    date: "2026-04-14T09:15:00Z",
    txHash: "0xf4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
  },
  {
    id: "t4",
    type: "Oferta publicada",
    propertyTitle: "Casa Vila Madalena",
    valueEth: null,
    status: "Confirmado",
    date: "2026-04-22T10:00:00Z",
    txHash: "0xa5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
  },
  {
    id: "t5",
    type: "Investimento",
    propertyTitle: "Casa Vila Madalena",
    valueEth: "0.054",
    status: "Confirmado",
    date: "2026-04-24T16:42:00Z",
    txHash: "0xb6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
  },
  {
    id: "t6",
    type: "Pronto pra publicar",
    propertyTitle: "Apartamento Pinheiros",
    valueEth: null,
    status: "Confirmado",
    date: "2026-04-19T14:00:00Z",
    txHash: "0xc7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  },
];

export const initialUser: User = {
  wallet: "0x1f8a23b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
  ensName: "pessoa-a.eth",
  role: "owner",
  network: "Sepolia",
};
