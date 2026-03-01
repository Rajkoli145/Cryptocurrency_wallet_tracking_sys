// Barrel file — combines queries, mutations, and field resolvers
const driver = require("../db/neo4j");
const queries = require("./queries");
const mutations = require("./mutations");

const resolvers = {
    // Root Query — maps to type Query in typeDefs
    Query: queries,

    // Root Mutation — maps to type Mutation in typeDefs
    Mutation: mutations,

    // --- Field Resolvers ---
    // These run when someone queries a NESTED field.
    // For example: query { wallet(address: "0x...") { transactions { ... } } }
    // GraphQL first calls the `wallet` query resolver, gets the wallet object,
    // then calls Wallet.transactions with that wallet as `parent`.

    Wallet: {
        // When someone queries wallet { transactions { ... } }
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

        // When someone queries wallet { user { ... } }
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
        // When someone queries portfolio { holdings { ... } }
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

        // Computed field — totalValue = sum of (quantity × averageBuyPrice) for all holdings
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
                if (total === null || total === undefined) return 0.0;
                if (typeof total === "number") return total;
                if (typeof total.toNumber === "function") return total.toNumber();
                return parseFloat(total) || 0.0;
            } finally {
                await session.close();
            }
        },

        // When someone queries portfolio { user { ... } }
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
        // When someone queries user { wallets { ... } }
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
        // When someone queries alert { user { ... } }
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
