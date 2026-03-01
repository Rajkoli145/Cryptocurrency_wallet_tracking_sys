// Express + Apollo Server Entry point
require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const typeDefs = require("./schema/typeDefs");
const resolvers = require("./resolvers");

async function startServer() {
    const app = express();
    const port = process.env.PORT || 4000;

    // Create Apollo Server with our schema and resolvers
    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });

    // Start Apollo Server
    await server.start();

    // Connect Apollo to Express
    server.applyMiddleware({ app });

    // Start Express
    app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}${server.graphqlPath}`);
    });
}

startServer().catch((err) => {
    console.error("❌ Failed to start server:", err);
});