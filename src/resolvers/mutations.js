// This file has all the mutation resolvers
// Mutations are used to CREATE or UPDATE data in the database
// Unlike queries which just read data, mutations actually change things

const driver = require("../db/neo4j");
const { v4: uuidv4 } = require("uuid");

const mutations = {
    // Create a new user in the database
    // We generate a unique ID using uuid, then create a User node in Neo4j
    // The user has a name, email, and a kycVerified flag (defaults to false)
    createUser: async (_, { input }) => {
        const session = driver.session();
        try {
            const id = uuidv4();
            const result = await session.run(
                `CREATE (u:User {
          id: $id,
          name: $name,
          email: $email,
          kycVerified: $kycVerified
        }) RETURN u`,
                {
                    id,
                    name: input.name,
                    email: input.email,
                    kycVerified: input.kycVerified || false,
                }
            );
            return result.records[0].get("u").properties;
        } finally {
            await session.close();
        }
    },

    // Create a new wallet and connect it to a user
    // First we find the user, then create the wallet with balance starting at 0
    // Then we create an OWNS_WALLET relationship between the user and wallet
    createWallet: async (_, { input }) => {
        const session = driver.session();
        try {
            const id = uuidv4();
            const result = await session.run(
                `MATCH (u:User {id: $userId})
         CREATE (w:Wallet {
           id: $id,
           address: $address,
           cryptoType: $cryptoType,
           balance: 0.0
         })
         CREATE (u)-[:OWNS_WALLET]->(w)
         RETURN w`,
                {
                    id,
                    address: input.address,
                    cryptoType: input.cryptoType,
                    userId: input.userId,
                }
            );
            return result.records[0].get("w").properties;
        } finally {
            await session.close();
        }
    },

    // Create a new transaction and update the wallet balance automatically
    // If someone receives crypto, the balance goes up
    // If someone sends crypto, the balance goes down
    // We also link the transaction to the wallet using HAS_TX relationship
    createTransaction: async (_, { input }) => {
        const session = driver.session();
        try {
            const id = uuidv4();

            // If it's a RECEIVE, we add the amount. If it's a SEND, we subtract it
            const balanceChange =
                input.type === "RECEIVE" ? input.amount : -input.amount;

            const result = await session.run(
                `MATCH (w:Wallet {id: $walletId})
         CREATE (t:Transaction {
           id: $id,
           txHash: $txHash,
           type: $type,
           amount: $amount,
           timestamp: toString(datetime()),
           status: $status
         })
         CREATE (w)-[:HAS_TX]->(t)
         SET w.balance = w.balance + $balanceChange
         RETURN t`,
                {
                    id,
                    walletId: input.walletId,
                    txHash: input.txHash,
                    type: input.type,
                    amount: input.amount,
                    status: input.status || "PENDING",
                    balanceChange,
                }
            );
            return result.records[0].get("t").properties;
        } finally {
            await session.close();
        }
    },

    // Create a new portfolio and link it to a user
    // A portfolio is like a folder where you keep track of your crypto investments
    // We connect it to the user using HAS_PORTFOLIO relationship
    createPortfolio: async (_, { input }) => {
        const session = driver.session();
        try {
            const id = uuidv4();
            const result = await session.run(
                `MATCH (u:User {id: $userId})
         CREATE (p:Portfolio {
           id: $id,
           name: $name,
           createdAt: toString(datetime())
         })
         CREATE (u)-[:HAS_PORTFOLIO]->(p)
         RETURN p`,
                {
                    id,
                    name: input.name,
                    userId: input.userId,
                }
            );
            return result.records[0].get("p").properties;
        } finally {
            await session.close();
        }
    },

    // Add a crypto holding to a portfolio
    // If the same crypto already exists in the portfolio, we update it
    // instead of creating a duplicate - we recalculate the average buy price
    // If it's a new crypto, we just create a fresh holding
    addHolding: async (_, { input }) => {
        const session = driver.session();
        try {
            // First check if this crypto already exists in the portfolio
            const existing = await session.run(
                `MATCH (p:Portfolio {id: $portfolioId})-[:HOLDS]->(h:PortfolioHolding {cryptoType: $cryptoType})
         RETURN h`,
                { portfolioId: input.portfolioId, cryptoType: input.cryptoType }
            );

            if (existing.records.length > 0) {
                // This crypto already exists, so we update the quantity
                // and recalculate the average buy price using weighted average formula
                const result = await session.run(
                    `MATCH (p:Portfolio {id: $portfolioId})-[:HOLDS]->(h:PortfolioHolding {cryptoType: $cryptoType})
           SET h.averageBuyPrice = ((h.averageBuyPrice * h.quantity) + ($averageBuyPrice * $quantity)) / (h.quantity + $quantity),
               h.quantity = h.quantity + $quantity
           RETURN h`,
                    {
                        portfolioId: input.portfolioId,
                        cryptoType: input.cryptoType,
                        quantity: input.quantity,
                        averageBuyPrice: input.averageBuyPrice,
                    }
                );
                return result.records[0].get("h").properties;
            } else {
                // This is a new crypto, so we create a fresh holding
                // and connect it to the portfolio using HOLDS relationship
                const id = uuidv4();
                const result = await session.run(
                    `MATCH (p:Portfolio {id: $portfolioId})
           CREATE (h:PortfolioHolding {
             id: $id,
             cryptoType: $cryptoType,
             quantity: $quantity,
             averageBuyPrice: $averageBuyPrice
           })
           CREATE (p)-[:HOLDS]->(h)
           RETURN h`,
                    {
                        id,
                        portfolioId: input.portfolioId,
                        cryptoType: input.cryptoType,
                        quantity: input.quantity,
                        averageBuyPrice: input.averageBuyPrice,
                    }
                );
                return result.records[0].get("h").properties;
            }
        } finally {
            await session.close();
        }
    },

    // Create a price alert for a user
    // The alert watches a specific crypto and triggers when the price
    // goes above or below the target price
    // It starts as triggered: false and gets set to true when the condition is met
    createAlert: async (_, { input }) => {
        const session = driver.session();
        try {
            const id = uuidv4();
            const result = await session.run(
                `MATCH (u:User {id: $userId})
         CREATE (a:Alert {
           id: $id,
           cryptoType: $cryptoType,
           targetPrice: $targetPrice,
           condition: $condition,
           triggered: false
         })
         CREATE (u)-[:HAS_ALERT]->(a)
         RETURN a`,
                {
                    id,
                    userId: input.userId,
                    cryptoType: input.cryptoType,
                    targetPrice: input.targetPrice,
                    condition: input.condition,
                }
            );
            return result.records[0].get("a").properties;
        } finally {
            await session.close();
        }
    },

    // Check all alerts for a specific crypto and trigger the ones where
    // the condition is met based on the current price
    // For example, if someone set an alert for Bitcoin ABOVE 50000
    // and the current price is 55000, the alert gets triggered
    checkAlerts: async (_, { cryptoType, currentPrice }) => {
        const session = driver.session();
        try {
            // Find all untriggered alerts for this crypto where the condition matches
            // Then set triggered to true for those alerts
            const result = await session.run(
                `MATCH (a:Alert {cryptoType: $cryptoType, triggered: false})
         WHERE (a.condition = "ABOVE" AND $currentPrice >= a.targetPrice)
            OR (a.condition = "BELOW" AND $currentPrice <= a.targetPrice)
         SET a.triggered = true
         RETURN a`,
                { cryptoType, currentPrice }
            );
            return result.records.map((r) => r.get("a").properties);
        } finally {
            await session.close();
        }
    },
};

module.exports = mutations;
