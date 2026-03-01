# Cryptocurrency Wallet Tracking System

A GraphQL API for tracking cryptocurrency wallets, transactions, portfolios, and price alerts. Built with Node.js, Express, Apollo Server, and Neo4j graph database.

## Tech Stack

- Node.js
- Express
- Apollo Server (GraphQL)
- Neo4j (Graph Database)
- Cypher Query Language

## Project Structure

```
src/
├── index.js                 # Server entry point
├── db/
│   ├── neo4j.js             # Neo4j driver connection
│   └── seed.js              # Sample data seeder
├── schema/
│   └── typeDefs.js          # GraphQL type definitions
└── resolvers/
    ├── index.js             # Combines all resolvers
    ├── queries.js           # Read operations
    └── mutations.js         # Write operations
```

## Prerequisites

- Node.js 18 or higher
- Neo4j 5 or higher (Neo4j Desktop or Docker)

## Setup

1. Clone the repository

```bash
git clone https://github.com/Rajkoli145/Cryptocurrency_wallet_tracking_sys.git
cd Cryptocurrency_wallet_tracking_sys
```

2. Install dependencies

```bash
npm install
```

3. Start Neo4j

Using Docker:
```bash
docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:5
```

Or download Neo4j Desktop from https://neo4j.com/download/

4. Create a `.env` file in the project root

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
PORT=4000
```

5. Seed the database with sample data

```bash
npm run seed
```

6. Start the server

```bash
npm start
```

The GraphQL playground will be available at http://localhost:4000/graphql

## Database Model

The data is stored as a graph with the following structure:

```
(:User)-[:OWNS_WALLET]->(:Wallet)-[:HAS_TX]->(:Transaction)
(:User)-[:HAS_PORTFOLIO]->(:Portfolio)-[:HOLDS]->(:PortfolioHolding)
(:User)-[:HAS_ALERT]->(:Alert)
```

### Models

- **User** - id, name, email, kycVerified
- **Wallet** - id, address, cryptoType, balance
- **Transaction** - id, txHash, type, amount, timestamp, status
- **Portfolio** - id, name, createdAt, totalValue (computed)
- **PortfolioHolding** - id, cryptoType, quantity, averageBuyPrice
- **Alert** - id, cryptoType, targetPrice, condition, triggered

## Sample Queries

### Get wallet balance and transactions

```graphql
query {
  wallet(address: "0xabc123") {
    cryptoType
    balance
    transactions {
      type
      amount
      timestamp
      status
    }
  }
}
```

### Get portfolio with holdings

```graphql
query {
  portfolio(id: "portfolio-id-here") {
    name
    holdings {
      cryptoType
      quantity
      averageBuyPrice
    }
    totalValue
  }
}
```

### Get price alerts for a user

```graphql
query {
  alerts(userId: "user-id-here") {
    cryptoType
    targetPrice
    condition
    triggered
  }
}
```

## Sample Mutations

### Create a wallet

```graphql
mutation {
  createWallet(input: {
    address: "0xnew456"
    cryptoType: ETHEREUM
    userId: "user-id-here"
  }) {
    id
    balance
  }
}
```

### Set a price alert

```graphql
mutation {
  createAlert(input: {
    userId: "user-id-here"
    cryptoType: BITCOIN
    targetPrice: 50000
    condition: ABOVE
  }) {
    id
    targetPrice
    triggered
  }
}
```

### Check and trigger alerts

```graphql
mutation {
  checkAlerts(cryptoType: "BITCOIN", currentPrice: 55000) {
    id
    targetPrice
    triggered
  }
}
```

## Features

- Wallet balance updates automatically when transactions are created
- Full transaction history linked to each wallet
- Portfolio value is calculated as the sum of all holdings
- Price alerts trigger when the specified condition is met
- Holdings track average buy price and recalculate when adding more of the same crypto
- Supports multiple cryptocurrency types
- Transaction status tracking (pending, confirmed, failed)

## Available Scripts

- `npm start` - Start the server
- `npm run seed` - Seed the database with sample data
- `npm run dev` - Start with nodemon (requires nodemon installed)

## License

ISC
