require('dotenv').config();
const db = require('../components/db.js');

async function test() {
  try {
    const user = await db.User.findOne({ id: "5f0e0b67af92089b5866bcd0" });
    console.log("USER IN MONGO:");
    console.log(JSON.stringify(user, null, 2));

    const session = await db.Session.findOne({ id: "5f0e0b67af92089b5866bcd0" });
    console.log("SESSION IN MONGO:");
    console.log(JSON.stringify(session, null, 2));

    const lastAffiliation = await db.Affiliation.findOneLast({
      userId: "5f0e0b67af92089b5866bcd0"
    });
    console.log("LAST AFFILIATION IN MONGO:");
    console.log(JSON.stringify(lastAffiliation, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error running test:", err);
    process.exit(1);
  }
}

test();
