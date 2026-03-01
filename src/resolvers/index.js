// This file brings everything together
// It combines the query resolvers, mutation resolvers, and field resolvers
// into one single object that Apollo Server uses

const driver = require("../db/neo4j");
const queries = require("./queries");
const mutations = require("./mutations");

const resolvers = {
    // These are the main query and mutation resolvers from the other files
    Query: queries,
    Mutation: mutations,

    // Below are "field resolvers" - they handle nested data
    // For example, when you query a wallet and also ask for its transactions,
    // GraphQL first gets the wallet, then uses these resolvers
    // to fetch the related transactions, user, etc.

    Wallet: {
        // Get all transactions that belong to this wallet
        // We follow the HAS_TX relationship from wallet to its transactions
        // and sort them by newest first
        transactions: async (parent) => {
            const session = driver.session();
            try {
                const result = await session.run(
                    "MATCH (w:Wallet {id: $id})-[:HAS_TX]->(t:Transaction) RETURN t ORDER BY t.timestamp DESC",
                    { id: parent.id }
                );
                return result.records.map((r) => r.get("t").properties);
            } finally {
                await session.close();
            }
        },

        // Get the user who owns this wallet
        // We go backwards through the OWNS_WALLET relationship to find the user
        user: async (parent) => {
            const session = driver.session();
            try {
                const result = await session.run(
                    "MATCH (u:User)-[:OWNS_WALLET]->(w:Wallet {id: $id}) RETURN u",
                    { id: parent.id }
                );
                if (result.records.length === 0) return null;
                return result.records[0].get("u").properties;
            } finally {
                await session.close();
            }
        },
    },

    Portfolio: {
        // Get all the crypto holdings inside this portfolio
        // We follow the HOLDS relationship from portfolio to its holdings
        holdings: async (parent) => {
            const session = driver.session();
            try {
                const result = await session.run(
                    "MATCH (p:Portfolio {id: $id})-[:HOLDS]->(h:PortfolioHolding) RETURN h",
                    { id: parent.id }
                );
                return result.records.map((r) => r.get("h").properties);
            } finally {
                await session.close();
            }
        },

        // Calculate the total value of the portfolio
        // This is not stored in the database - we calculate it on the fly
        // by adding up (quantity * averageBuyPrice) for each holding
        totalValue: async (parent) => {
            const session = driver.session();
            try {
                const result = await session.run(
                    `MATCH (p:Portfolio {id: $id})-[:HOLDS]->(h:PortfolioHolding)
           RETURN SUM(h.quantity * h.averageBuyPrice) AS total`,
                    { id: parent.id }
                );
                if (result.records.length === 0) return 0.0;
                const total = result.records[0].get("total");
                // Neo4j sometimes returns integers as special objects
                // so we need to convert them to regular JavaScript numbers
                if (total === null || total === undefined) return 0.0;
                if (typeof total === "number") return total;
                if (typeof total.toNumber === "function") return total.toNumber();
                return parseFloat(total) || 0.0;
            } finally {
                await session.close();
            }
        },

        // Get the user who owns this portfolio
        user: async (parent) => {
            const session = driver.session();
            try {
                const result = await session.run(
                    "MATCH (u:User)-[:HAS_PORTFOLIO]->(p:Portfolio {id: $id}) RETURN u",
                    { id: parent.id }
                );
                if (result.records.length === 0) return null;
                return result.records[0].get("u").properties;
            } finally {
                await session.close();
            }
        },
    },

    User: {
        // Get all wallets that this user owns
        // We follow the OWNS_WALLET relationship from user to wallets
        wallets: async (parent) => {
            const session = driver.session();
            try {
                const result = await session.run(
                    "MATCH (u:User {id: $id})-[:OWNS_WALLET]->(w:Wallet) RETURN w",
                    { id: parent.id }
                );
                return result.records.map((r) => r.get("w").properties);
            } finally {
                await session.close();
            }
        },
    },

    Alert: {
        // Get the user who created this alert
        user: async (parent) => {
            const session = driver.session();
            try {
                const result = await session.run(
                    "MATCH (u:User)-[:HAS_ALERT]->(a:Alert {id: $id}) RETURN u",
                    { id: parent.id }
                );
                if (result.records.length === 0) return null;
                return result.records[0].get("u").properties;
            } finally {
                await session.close();
            }
        },
    },
};

module.exports = resolvers;
