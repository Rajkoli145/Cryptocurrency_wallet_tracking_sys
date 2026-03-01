// Query resolvers — these handle all "read" operations
const driver = require("../db/neo4j");

const queries = {
    // Fetch a single user by ID
    // Example: query { user(id: "abc") { name email } }
    user: async (_, args) => {
        const session = driver.session();
        try {
            const result = await session.run(
                "MATCH (u:User {id: $id}) RETURN u",
                { id: args.id }
            );
            if (result.records.length === 0) return null;
            return result.records[0].get("u").properties;
        } finally {
            await session.close();
        }
    },

    // Fetch a wallet by its address
    // Example: query { wallet(address: "0xabc123") { balance cryptoType } }
    wallet: async (_, args) => {
        const session = driver.session();
        try {
            const result = await session.run(
                "MATCH (w:Wallet {address: $address}) RETURN w",
                { address: args.address }
            );
            if (result.records.length === 0) return null;
            return result.records[0].get("w").properties;
        } finally {
            await session.close();
        }
    },

    // Fetch all wallets belonging to a user
    // Example: query { wallets(userId: "abc") { address balance } }
    wallets: async (_, args) => {
        const session = driver.session();
        try {
            const result = await session.run(
                "MATCH (u:User {id: $userId})-[:OWNS_WALLET]->(w:Wallet) RETURN w",
                { userId: args.userId }
            );
            return result.records.map((r) => r.get("w").properties);
        } finally {
            await session.close();
        }
    },

    // Fetch a portfolio by ID
    // Example: query { portfolio(id: "xyz") { name holdings { cryptoType } } }
    portfolio: async (_, args) => {
        const session = driver.session();
        try {
            const result = await session.run(
                "MATCH (p:Portfolio {id: $id}) RETURN p",
                { id: args.id }
            );
            if (result.records.length === 0) return null;
            return result.records[0].get("p").properties;
        } finally {
            await session.close();
        }
    },

    // Fetch all alerts for a user
    // Example: query { alerts(userId: "abc") { cryptoType targetPrice triggered } }
    alerts: async (_, args) => {
        const session = driver.session();
        try {
            const result = await session.run(
                "MATCH (u:User {id: $userId})-[:HAS_ALERT]->(a:Alert) RETURN a",
                { userId: args.userId }
            );
            return result.records.map((r) => r.get("a").properties);
        } finally {
            await session.close();
        }
    },
};

module.exports = queries;
