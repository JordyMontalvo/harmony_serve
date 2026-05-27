require('dotenv').config();
const { User, Tree } = require('./components/db');

let tree;

function total_points(id) {
  const node = tree.find((e) => e.id == id)
  if (!node) return
  node.total_points = node.points + node.affiliation_points
  node.childs.forEach((_id) => {
    node.total_points += total_points(_id)
  })
  return node.total_points
}

async function testNewClosure() {
  try {
    const users = await User.find({ tree: true });
    tree = await Tree.find({});
    
    tree.forEach((node) => {
        const user = users.find((e) => e.id == node.id)
        if (user) {
            node.points = Number(user.points || 0)
            node.affiliation_points = Number(user.affiliation_points || 0)
        }
    });

    console.log("Calling total_points on root...");
    total_points("5f0e0b67af92089b5866bcd0");
    console.log("Root total_points:", tree.find(n => n.id === "5f0e0b67af92089b5866bcd0").total_points);

  } catch(e) {
    console.error("Error:", e);
  }
}
testNewClosure();
