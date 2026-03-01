// Seed data script
require("dotenv").config();
const driver = require("./neo4j");
const { v4: uuidv4 } = require("uuid");

async function seed() {
    const session = driver.session();

    try {
        // Clean existing data
        console.log("Clearing existing data...");
        await session.run("MATCH (n) DETACH DELETE n");

        // Create Users
        console.log("Seeding Users...");
        const user1 = uuidv4();
        const user2 = uuidv4();

        await session.run(
            `CREATE (u1:User {id: $user1, name: "Raj", email: "raj@gmail.com", kycVerified: true})
       CREATE (u2:User {id: $user2, name: "Amit", email: "amit@gmail.com", kycVerified: false})`,
            { user1, user2 }
        );

        // Create Wallets — separate queries so MATCH works correctly
        console.log("Seeding Wallets...");
        const wallet1 = uuidv4();
        const wallet2 = uuidv4();

        await session.run(
            `MATCH (u:User {id: $user1})
       CREATE (w:Wallet {id: $wallet1, address: "0xabc123", cryptoType: "ETHEREUM", balance: 0.0})
       CREATE (u)-[:OWNS_WALLET]->(w)`,
            { user1, wallet1 }
        );

        await session.run(
            `MATCH (u:User {id: $user2})
       CREATE (w:Wallet {id: $wallet2, address: "btc123xyz", cryptoType: "BITCOIN", balance: 0.0})
       CREATE (u)-[:OWNS_WALLET]->(w)`,
            { user2, wallet2 }
        );

        // Create Transactions & update balances
        console.log("Seeding Transactions...");
        await session.run(
            `MATCH (w:Wallet {id: $wallet1})
       CREATE (t:Transaction {
         id: $txId,
         txHash: "0xhash1",
         type: "RECEIVE",
         amount: 5.0,
         timestamp: toString(datetime()),
         status: "CONFIRMED"
       })
       CREATE (w)-[:HAS_TX]->(t)
       SET w.balance = w.balance + 5.0`,
            { wallet1, txId: uuidv4() }
        );

        await session.run(
            `MATCH (w:Wallet {id: $wallet1})
       CREATE (t:Transaction {
         id: $txId,
         txHash: "0xhash2",
         type: "SEND",
         amount: 1.5,
         timestamp: toString(datetime()),
         status: "CONFIRMED"
       })
       CREATE (w)-[:HAS_TX]->(t)
       SET w.balance = w.balance - 1.5`,
            { wallet1, txId: uuidv4() }
        );

        await session.run(
            `MATCH (w:Wallet {id: $wallet2})
       CREATE (t:Transaction {
         id: $txId,
         txHash: "btcHash1",
         type: "RECEIVE",
         amount: 2.0,
         timestamp: toString(datetime()),
         status: "CONFIRMED"
       })
       CREATE (w)-[:HAS_TX]->(t)
       SET w.balance = w.balance + 2.0`,
            { wallet2, txId: uuidv4() }
        );

        // Create Portfolio
        console.log("Seeding Portfolio...");
        const portfolio1 = uuidv4();

        await session.run(
            `MATCH (u:User {id: $user1})
       CREATE (p:Portfolio {
         id: $portfolio1,
         name: "Raj Portfolio",
         createdAt: toString(datetime())
       })
       CREATE (u)-[:HAS_PORTFOLIO]->(p)`,
            { user1, portfolio1 }
        );

        // Create Holdings
        console.log("Seeding Holdings...");
        await session.run(
            `MATCH (p:Portfolio {id: $portfolio1})
       CREATE (h:PortfolioHolding {
         id: $holdingId,
         cryptoType: "ETHEREUM",
         quantity: 3.5,
         averageBuyPrice: 1800.0
       })
       CREATE (p)-[:HOLDS]->(h)`,
            { portfolio1, holdingId: uuidv4() }
        );

        await session.run(
            `MATCH (p:Portfolio {id: $portfolio1})
       CREATE (h:PortfolioHolding {
         id: $holdingId,
         cryptoType: "BITCOIN",
         quantity: 2.0,
         averageBuyPrice: 42000.0
       })
       CREATE (p)-[:HOLDS]->(h)`,
            { portfolio1, holdingId: uuidv4() }
        );

        // Create Alerts
        console.log("Seeding Alerts...");
        await session.run(
            `MATCH (u:User {id: $user1})
       CREATE (a:Alert {
         id: $alertId,
         cryptoType: "BITCOIN",
         targetPrice: 50000.0,
         condition: "ABOVE",
         triggered: false
       })
       CREATE (u)-[:HAS_ALERT]->(a)`,
            { user1, alertId: uuidv4() }
        );

        await session.run(
            `MATCH (u:User {id: $user2})
       CREATE (a:Alert {
         id: $alertId,
         cryptoType: "ETHEREUM",
         targetPrice: 1500.0,
         condition: "BELOW",
         triggered: false
       })
       CREATE (u)-[:HAS_ALERT]->(a)`,
            { user2, alertId: uuidv4() }
        );

        console.log("✅ Seeding completed successfully!");
    } catch (error) {
        console.error("❌ Seeding error:", error);
    } finally {
        await session.close();
        await driver.close();
    }
}

seed();