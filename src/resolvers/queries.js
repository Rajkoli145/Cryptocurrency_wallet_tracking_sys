// This file has all the query resolvers
// Queries are used to READ or FETCH data from the database
// They don't change anything, they just get the data and return it

const driver = require("../db/neo4j");

const queries = {
    // Get a user by their ID
    // We search for a User node in Neo4j that matches the given ID
    // If we find it, we return the user's details, otherwise we return null
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

    // Get a wallet by its address
    // Every wallet has a unique address like "0xabc123"
    // We find the wallet in Neo4j and return its details like balance and crypto type
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

    // Get all wallets that belong to a specific user
    // We follow the OWNS_WALLET relationship from User to Wallet
    // This returns a list of all wallets the user has
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

    // Get a portfolio by its ID
    // A portfolio is like a collection where you track your crypto investments
    // We find it in Neo4j and return its details
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

    // Get all price alerts set by a user
    // We follow the HAS_ALERT relationship from User to Alert
    // Each alert watches a crypto price and tells if it went above or below a target
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
