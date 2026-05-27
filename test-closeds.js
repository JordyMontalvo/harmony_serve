require('dotenv').config();
const { Closed } = require('./components/db');

async function test() {
  try {
    const closeds = await Closed.find({}, { projection: { tree: 0 } });
    const size = Buffer.byteLength(JSON.stringify(closeds));
    console.log("Success! Found", closeds.length, "closeds");
    console.log("Total JSON size in MB:", (size / 1024 / 1024).toFixed(2));
  } catch (err) {
    console.error("Error occurred:", err);
  }
}
test();
