const { gql } = require("apollo-server-express");

const typeDefs = gql`
  enum CryptoType {
    BITCOIN
    ETHEREUM
    LITECOIN
    SOLANA
    POLYGON
    OTHER
  }

  enum TransactionType {
    SEND
    RECEIVE
    SWAP
  }

  enum TransactionStatus {
    PENDING
    CONFIRMED
    FAILED
  }

  enum AlertCondition {
    ABOVE
    BELOW
  }

  type User {
    id: ID!
    name: String!
    email: String!
    kycVerified: Boolean!
    wallets: [Wallet]
  }

  type Wallet {
    id: ID!
    address: String!
    cryptoType: CryptoType!
    balance: Float!
    transactions: [Transaction]
    user: User
  }

  type Transaction {
    id: ID!
    txHash: String!
    type: TransactionType!
    amount: Float!
    timestamp: String!
    status: TransactionStatus!
    wallet: Wallet
  }

  type Portfolio {
    id: ID!
    name: String!
    createdAt: String!
    user: User
    holdings: [PortfolioHolding]
    totalValue: Float
  }

  type PortfolioHolding {
    id: ID!
    cryptoType: CryptoType!
    quantity: Float!
    averageBuyPrice: Float!
  }

  type Alert {
    id: ID!
    user: User
    cryptoType: CryptoType!
    targetPrice: Float!
    condition: AlertCondition!
    triggered: Boolean!
  }

  input CreateUserInput {
    name: String!
    email: String!
    kycVerified: Boolean
  }

  input CreateWalletInput {
    address: String!
    cryptoType: CryptoType!
    userId: ID!
  }

  input CreateTransactionInput {
    walletId: ID!
    txHash: String!
    type: TransactionType!
    amount: Float!
    status: TransactionStatus
  }

  input CreatePortfolioInput {
    userId: ID!
    name: String!
  }

  input AddHoldingInput {
    portfolioId: ID!
    cryptoType: CryptoType!
    quantity: Float!
    averageBuyPrice: Float!
  }

  input CreateAlertInput {
    userId: ID!
    cryptoType: CryptoType!
    targetPrice: Float!
    condition: AlertCondition!
  }

  type Query {
    user(id: ID!): User
    wallet(address: String!): Wallet
    wallets(userId: ID!): [Wallet!]
    portfolio(id: ID!): Portfolio
    alerts(userId: ID!): [Alert!]
  }

  type Mutation {
    createUser(input: CreateUserInput!): User
    createWallet(input: CreateWalletInput!): Wallet
    createTransaction(input: CreateTransactionInput!): Transaction
    createPortfolio(input: CreatePortfolioInput!): Portfolio
    addHolding(input: AddHoldingInput!): PortfolioHolding
    createAlert(input: CreateAlertInput!): Alert
    checkAlerts(cryptoType: String!, currentPrice: Float!): [Alert!]
  }
`;

module.exports = typeDefs;