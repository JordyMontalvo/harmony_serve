import db from "../../../components/db";
import lib from "../../../components/lib";

const { Material } = db;
const { midd, success } = lib;

export default async (req, res) => {
  await midd(req, res);

  if (req.method === "GET") {
    try {
      const materials = await Material.find({});
      return res.json(
        success({
          materials,
        })
      );
    } catch (err) {
      console.error("[API App Materials] Error getting materials:", err);
      return res.status(500).json({ error: true, msg: "internal error" });
    }
  }
};
