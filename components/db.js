const URL = process.env.DB_URL;
const name = process.env.DB_NAME;

const Client = require("mongodb").MongoClient;

class DB {
  constructor({
    User,
    Session,
    Affiliation,
    Product,
    Activation,
    Period,
    Banner,
    Promo,
    Prom,
    Plan,
    Token,
    Transaction,
    Tree,
    Collect,
    OfficeCollect,
    Office,
    Recharge,
    Closed,
    PaymentMethod,
    DashboardConfig,
    Flyer,
    Material,
  }) {
    this.User = User;
    this.Session = Session;
    this.Affiliation = Affiliation;
    this.Product = Product;
    this.Activation = Activation;
    this.Period = Period;
    this.Banner = Banner;
    this.Promo = Promo;
    this.Prom = Prom;
    this.Plan = Plan;
    this.Token = Token;
    this.Transaction = Transaction;
    this.Tree = Tree;
    this.Collect = Collect;
    this.OfficeCollect = OfficeCollect;
    this.Office = Office;
    this.Recharge = Recharge;
    this.Closed = Closed;
    this.PaymentMethod = PaymentMethod;
    this.DashboardConfig = DashboardConfig;
    this.Flyer = Flyer;
    this.Material = Material;
  }
}

class User {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const user = await db.collection("users").findOne(query);
    client.close();
    return user;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const users = await db.collection("users").find(query).toArray();
    client.close();
    return users;
  }
  async insert(user) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("users").insertOne(user);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("users").updateOne(query, { $set: values });
    return client.close();
  }

  async updateOne(q, vals) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("users").updateOne(q, { $set: vals });
    return client.close();
  }

  async updateMany(q, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("users").updateMany(q, { $set: values });
    return client.close();
  }

  async updateInc(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db
      .collection("users")
      .update(query, { $inc: values }, { multi: true });
    return client.close();
  }
}

class Session {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const session = await db.collection("sessions").findOne(query);
    client.close();
    return session;
  }
  async insert(session) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("sessions").insertOne(session);
    return client.close();
  }
  async delete(value) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("sessions").deleteOne({ value });
    return client.close();
  }

  async deleteMany(q) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("sessions").deleteMany(q);
    return client.close();
  }
}

class Affiliation {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const affiliation = await db.collection("affiliations").findOne(query);
    client.close();
    return affiliation;
  }
  async findOneLast(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const affiliation = await db
      .collection("affiliations")
      .find(query)
      .toArray();
    client.close();
    return affiliation ? affiliation[affiliation.length - 1] : null;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const affiliations = await db
      .collection("affiliations")
      .find(query)
      .toArray();
    client.close();
    return affiliations;
  }
  async insert(affiliation) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("affiliations").insertOne(affiliation);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("affiliations").updateOne(query, { $set: values });
    return client.close();
  }

  async updateMany(q, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("affiliations").updateMany(q, { $set: values });
    return client.close();
  }

  async delete(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("affiliations").deleteOne(query);
    return client.close();
  }
}

class Banner {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const banner = await db.collection("banner").findOne(query);
    client.close();
    return banner;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const banners = await db.collection("banner").find(query).toArray();
    client.close();
    return banners;
  }
  async insert(banner) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("banner").insertOne(banner);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("banner").updateOne(query, { $set: values });
    return client.close();
  }
}

class Promo {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const promo = await db.collection("promos").findOne(query);
    client.close();
    return promo;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const promos = await db.collection("promos").find(query).toArray();
    client.close();
    return promos;
  }
  async insert(promo) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("promos").insertOne(promo);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("promos").updateOne(query, { $set: values });
    return client.close();
  }
}

class Prom {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const promo = await db.collection("promo").findOne(query);
    client.close();
    return promo;
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("promo").updateOne(query, { $set: values });
    return client.close();
  }
}

class Product {
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const products = await db.collection("products").find(query).toArray();
    client.close();
    return products;
  }
  async insert(user) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("products").insertOne(user);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("products").updateOne(query, { $set: values });
    return client.close();
  }
  async un_update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("products").updateOne(query, { $unset: values });
    return client.close();
  }

  async delete(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("products").deleteOne(query);
    return client.close();
  }
}

class Activation {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const activation = await db.collection("activations").findOne(query);
    client.close();
    return activation;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const activations = await db
      .collection("activations")
      .find(query)
      .toArray();
    client.close();
    return activations;
  }
  async insert(activation) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("activations").insertOne(activation);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("activations").updateOne(query, { $set: values });
    return client.close();
  }

  async updateMany(q, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("activations").updateMany(q, { $set: values });
    return client.close();
  }

  async delete(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("activations").deleteOne(query);
    return client.close();
  }
}

class Period {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const period = await db.collection("periods").findOne(query);
    client.close();
    return period;
  }

  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const periods = await db.collection("periods").find(query).toArray();
    client.close();
    return periods;
  }

  async findOneLast(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const periods = await db.collection("periods").find(query).toArray();
    client.close();
    return periods && periods.length ? periods[periods.length - 1] : null;
  }

  async insert(period) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("periods").insertOne(period);
    return client.close();
  }

  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("periods").updateOne(query, { $set: values });
    return client.close();
  }
}

class Plan {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const plan = await db.collection("plans").findOne(query);
    client.close();
    return plan;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const plans = await db.collection("plans").find(query).toArray();
    client.close();
    return plans;
  }
  async update(query, data) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const plan = await db.collection("plans").updateOne(query, data);
    client.close();
    return plan;
  }
  async delete(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const plan = await db.collection("plans").deleteOne(query);
    client.close();
    return plan;
  }
  async insert(plan) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("plans").insertOne(plan);
    return client.close();
  }
}

class Token {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const token = await db.collection("tokens").findOne(query);
    client.close();
    return token;
  }
  async insert(token) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("tokens").insertOne(token);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("tokens").updateOne(query, { $set: values });
    return client.close();
  }
}

class Transaction {
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const transactions = await db
      .collection("transactions")
      .find(query)
      .toArray();
    client.close();
    return transactions;
  }
  async insert(transaction) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("transactions").insertOne(transaction);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("transactions").updateOne(query, { $set: values });
    return client.close();
  }
  async delete(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("transactions").deleteOne(query);
    return client.close();
  }
}

class Tree {
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const tree = await db.collection("tree").find(query).toArray();
    client.close();
    return tree;
  }
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const node = await db.collection("tree").findOne(query);
    client.close();
    return node;
  }
  async insert(node) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("tree").insertOne(node);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("tree").updateOne(query, { $set: values });
    return client.close();
  }
}

class Collect {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const collect = await db.collection("collects").findOne(query);
    client.close();
    return collect;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const collects = await db.collection("collects").find(query).toArray();
    client.close();
    return collects;
  }
  async findPaginated(query, skip, limit) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const collects = await db
      .collection("collects")
      .find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    client.close();
    return collects;
  }
  async count(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const total = await db.collection("collects").countDocuments(query);
    client.close();
    return total;
  }
  async insert(collect) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("collects").insertOne(collect);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("collects").updateOne(query, { $set: values });
    return client.close();
  }
}

class OfficeCollect {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const office_collect = await db
      .collection("office_collects")
      .findOne(query);
    client.close();
    return office_collect;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const office_collects = await db
      .collection("office_collects")
      .find(query)
      .toArray();
    client.close();
    return office_collects;
  }
  async insert(collect) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("office_collects").insertOne(collect);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("office_collects").updateOne(query, { $set: values });
    return client.close();
  }
}

class Office {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const office = await db.collection("offices").findOne(query);
    client.close();
    return office;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const offices = await db.collection("offices").find(query).toArray();
    client.close();
    return offices;
  }
  async insert(office) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("offices").insertOne(office);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("offices").updateOne(query, { $set: values });
    return client.close();
  }
}

class Recharge {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const recharge = await db.collection("recharges").findOne(query);
    client.close();
    return recharge;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const recharges = await db.collection("recharges").find(query).toArray();
    client.close();
    return recharges;
  }
  async insert(recharge) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("recharges").insertOne(recharge);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("recharges").updateOne(query, { $set: values });
    return client.close();
  }
}

class Closed {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const recharge = await db.collection("closeds").findOne(query);
    client.close();
    return recharge;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const closeds = await db.collection("closeds").find(query).toArray();
    client.close();
    return closeds;
  }
  async insert(recharge) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("closeds").insertOne(recharge);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("closeds").updateOne(query, { $set: values });
    return client.close();
  }
}

class PaymentMethod {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const paymentMethod = await db.collection("payment_methods").findOne(query);
    client.close();
    return paymentMethod;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const paymentMethods = await db.collection("payment_methods").find(query).toArray();
    client.close();
    return paymentMethods;
  }
  async insert(paymentMethod) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("payment_methods").insertOne(paymentMethod);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("payment_methods").updateOne(query, { $set: values });
    return client.close();
  }
  async deleteOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("payment_methods").deleteOne(query);
    return client.close();
  }
}

class DashboardConfig {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const config = await db.collection("dashboard_config").findOne(query);
    client.close();
    return config;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const configs = await db.collection("dashboard_config").find(query).toArray();
    client.close();
    return configs;
  }
  async insert(config) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("dashboard_config").insertOne(config);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("dashboard_config").updateOne(query, { $set: values });
    return client.close();
  }
}

class Flyer {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const flyer = await db.collection("flyers").findOne(query);
    client.close();
    return flyer;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const flyers = await db.collection("flyers").find(query).toArray();
    client.close();
    return flyers;
  }
  async insert(flyer) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("flyers").insertOne(flyer);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("flyers").updateOne(query, { $set: values });
    return client.close();
  }
  async delete(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("flyers").deleteOne(query);
    return client.close();
  }
}

class Material {
  async findOne(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const material = await db.collection("materials").findOne(query);
    client.close();
    return material;
  }
  async find(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    const materials = await db.collection("materials").find(query).toArray();
    client.close();
    return materials;
  }
  async insert(material) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("materials").insertOne(material);
    return client.close();
  }
  async update(query, values) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("materials").updateOne(query, { $set: values });
    return client.close();
  }
  async delete(query) {
    const client = new Client(URL, { useUnifiedTopology: true });
    const conn = await client.connect();
    const db = conn.db(name);
    await db.collection("materials").deleteOne(query);
    return client.close();
  }
}

module.exports = new DB({
  User: new User(),
  Session: new Session(),
  Affiliation: new Affiliation(),
  Product: new Product(),
  Activation: new Activation(),
  Period: new Period(),
  Banner: new Banner(),
  Promo: new Promo(),
  Prom: new Prom(),
  Plan: new Plan(),
  Token: new Token(),
  Transaction: new Transaction(),
  Tree: new Tree(),
  Collect: new Collect(),
  OfficeCollect: new OfficeCollect(),
  Office: new Office(),
  Recharge: new Recharge(),
  Closed: new Closed(),
  PaymentMethod: new PaymentMethod(),
  DashboardConfig: new DashboardConfig(),
  Flyer: new Flyer(),
  Material: new Material(),
});
