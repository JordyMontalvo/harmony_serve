import db from "../../../components/db";
import lib from "../../../components/lib";

const { Material } = db;
const { midd, success, error, rand } = lib;

function materialQuery(id) {
  if (!id) return null;
  return { id: String(id) };
}

async function ensureMaterialIds(materials) {
  const normalized = [];

  for (const material of materials) {
    if (material && material.id) {
      normalized.push(material);
      continue;
    }

    const newId = rand() + rand();
    const query = material && material._id ? { _id: material._id } : null;

    if (query) {
      await Material.update(query, { id: newId });
      normalized.push({ ...material, id: newId });
    } else {
      normalized.push(material);
    }
  }

  return normalized;
}

async function findMaterialById(id) {
  const query = materialQuery(id);
  if (!query) return null;
  return Material.findOne(query);
}

export default async (req, res) => {
  await midd(req, res);

  if (req.method === "GET") {
    try {
      const materials = await ensureMaterialIds(await Material.find({}));
      return res.json(
        success({
          materials,
        })
      );
    } catch (err) {
      console.error("[API Admin Materials] Error getting materials:", err);
      return res.status(500).json({ error: true, msg: "internal error" });
    }
  }

  if (req.method === "POST") {
    const { action } = req.body;
    console.log("[API Admin Materials] POST Action:", action);

    try {
      if (action === "add") {
        const { title, description, link, img } = req.body.data || {};

        const newMaterial = {
          id: rand() + rand(),
          title: title || "",
          description: description || "",
          link: link || "",
          img: img || "",
          createdAt: new Date().getTime(),
        };

        await Material.insert(newMaterial);
      }

      if (action === "edit") {
        const { id } = req.body;
        const { title, description, link, img } = req.body.data || {};
        const query = materialQuery(id);

        if (!query) {
          return res.json(error("invalid material id"));
        }

        const existing = await findMaterialById(id);
        if (!existing) {
          return res.json(error("material not found"));
        }

        await Material.update(query, {
          title: title || "",
          description: description || "",
          link: link || "",
          img: img || "",
        });
      }

      if (action === "delete") {
        const { id } = req.body;
        const query = materialQuery(id);

        if (!query) {
          return res.json(error("invalid material id"));
        }

        const existing = await findMaterialById(id);
        if (!existing) {
          return res.json(error("material not found"));
        }

        await Material.delete(query);
      }

      const materials = await ensureMaterialIds(await Material.find({}));
      return res.json(success({ materials }));
    } catch (err) {
      console.error(`[API Admin Materials] Error executing action ${action}:`, err);
      return res.status(500).json({ error: true, msg: "execution error" });
    }
  }
};
