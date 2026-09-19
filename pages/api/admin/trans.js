import db from "../../../components/db";
import lib from "../../../components/lib";
import { MongoClient } from "mongodb";

const URL = process.env.DB_URL;
const name = process.env.DB_NAME;

const { Transaction } = db;
const { midd, success, error, rand, safe } = lib;

export default async (req, res) => {
  await midd(req, res);

  if (req.method === "GET") {
    const { filter, page = 1, limit = 20, search, timeRange } = req.query;
    console.log("Received request with page:", page, "and limit:", limit);
    console.log("Full query params:", req.query);
    const q = { all: {}, pending: { status: "pending" } };
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (!(filter in q)) return res.json(lib.error("invalid filter"));

    try {
      const client = new MongoClient(URL);
      await client.connect();
      const db = client.db(name);

      // Obtener todas las transacciones
      let transactions = await db
        .collection("transactions")
        .find(q[filter])
        .toArray();
      console.log("Found transactions:", transactions.length);

      // Obtener todos los IDs de usuarios únicos
      const userIds = [
        ...new Set(transactions.map((t) => [t.user_id, t._user_id]).flat()),
      ];
      console.log("Unique user IDs:", userIds.length);

      // Obtener información de usuarios
      const users = await db
        .collection("users")
        .find({ id: { $in: userIds } })
        .toArray();
      console.log("Found users:", users.length);
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Enriquecer transacciones con información de usuarios
      transactions = transactions.map((t) => ({
        ...t,
        user_info: userMap.get(t.user_id) || {},
        _user_info: userMap.get(t._user_id) || {},
      }));

      // Aplicar búsqueda si existe
      if (search) {
        const searchLower = search.toLowerCase();
        transactions = transactions.filter((t) => {
          const name = (t.name || "").toLowerCase();
          const id = (t.id || "").toLowerCase();
          const userId = (t.user_id || "").toLowerCase();
          const affiliationId = (t.affiliation_id || "").toLowerCase();

          // Buscar en nombres de usuarios
          const userName = (
            (t.user_info.name || "") +
            " " +
            (t.user_info.lastName || "")
          ).toLowerCase();
          const _userName = (
            (t._user_info.name || "") +
            " " +
            (t._user_info.lastName || "")
          ).toLowerCase();

          return (
            name.includes(searchLower) ||
            id.includes(searchLower) ||
            userId.includes(searchLower) ||
            affiliationId.includes(searchLower) ||
            userName.includes(searchLower) ||
            _userName.includes(searchLower)
          );
        });
      }

      // Aplicar filtro de tiempo si existe
      if (timeRange) {
        const now = new Date();
        let startDate;
        switch (timeRange) {
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case "year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }
        if (startDate) {
          transactions = transactions.filter(
            (t) => new Date(t.date) >= startDate
          );
        }
      }

      // Ordenar por fecha más reciente
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calcular total de items y páginas
      const totalItems = transactions.length;
      const totalPages = Math.ceil(totalItems / limitNum);

      // Obtener items de la página actual
      const skip = (pageNum - 1) * limitNum;
      const paginatedTransactions = transactions.slice(skip, skip + limitNum);

      client.close();

      return res.json(
        success({
          transactions: paginatedTransactions,
          totalItems,
          totalPages,
          currentPage: pageNum,
        })
      );
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json(lib.error("Database error"));
    }
  }

  if (req.method == "POST") {
    const { action } = req.body;

    if (action == "edit") {
      // el id debe ser un primitivo: con { "$ne": null } se editaria
      // una transaccion cualquiera
      const id = safe(req.body.id);
      if (id === null) return res.json(error("invalid id"));
      const {
        _user_id,
        _type,
        _value,
        _name,
        _affiliation_id,
        _virtual,
        _status,
      } = req.body.data;

      // Crear objeto de actualización solo con los campos que se envían
      const updateData = {};
      if (_user_id !== undefined) updateData.user_id = _user_id;
      if (_type !== undefined) updateData.type = _type;
      if (_value !== undefined) updateData.value = _value;
      if (_name !== undefined) updateData.name = _name;
      if (_affiliation_id !== undefined)
        updateData.affiliation_id = _affiliation_id;
      if (_virtual !== undefined) updateData.virtual = _virtual;
      if (_status !== undefined) updateData.status = _status;

      // LOGS DE DEPURACIÓN
      console.log("EDIT REQUEST:", { id, data: req.body.data });
      console.log("UPDATE DATA:", updateData);

      // Actualizar solo si hay campos para actualizar
      if (Object.keys(updateData).length > 0) {
        await Transaction.update({ id }, updateData);
      }
    }

    if (action == "add") {
      const { user_id, type, value, name, affiliation_id, virtual, status } =
        req.body.data;

      await Transaction.insert({
        id: rand(),
        date: new Date(),
        user_id,
        type,
        value,
        name,
        affiliation_id,
        virtual,
        status,
      });
    }

    if (action == "delete") {
      // el id debe ser un primitivo: con { "$ne": null } se borraria
      // una transaccion cualquiera
      const id = safe(req.body.id);
      if (id === null) return res.json(error("invalid id"));

      await Transaction.delete({ id });
    }

    // response
    return res.json(success({}));
  }
};
