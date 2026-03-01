// Mutation resolvers — these handle all "write" operations (create, update, delete)
const driver = require("../db/neo4j");
const { v4: uuidv4 } = require("uuid");

const mutations = {
    // Create a new user
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

    // Create a new wallet and link it to a user
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

    // Create a transaction and update the wallet balance
    createTransaction: async (_, { input }) => {
        const session = driver.session();
        try {
            const id = uuidv4();
            // Determine how balance changes: +amount for RECEIVE, -amount for SEND
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

    // Create a portfolio and link it to a user
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

    // Add a holding to a portfolio (or update if same cryptoType exists)
    addHolding: async (_, { input }) => {
        const session = driver.session();
        try {
            // Check if a holding for this cryptoType already exists
            const existing = await session.run(
                `MATCH (p:Portfolio {id: $portfolioId})-[:HOLDS]->(h:PortfolioHolding {cryptoType: $cryptoType})
         RETURN h`,
                { portfolioId: input.portfolioId, cryptoType: input.cryptoType }
            );

            if (existing.records.length > 0) {
                // Update existing holding — recalculate average buy price
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
                // Create new holding
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

    // Check all untriggered alerts for a crypto — trigger if condition is met
    checkAlerts: async (_, { cryptoType, currentPrice }) => {
        const session = driver.session();
        try {
            // Find alerts where condition is met and trigger them
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
