import db from "../../../components/db";
import lib from "../../../components/lib";

const { Material } = db;
const { midd, success, rand } = lib;

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
      console.error("[API Admin Materials] Error getting materials:", err);
      return res.status(500).json({ error: true, msg: "internal error" });
    }
  }

  if (req.method === "POST") {
    const { action } = req.body;
    console.log("[API Admin Materials] POST Action:", action);

    try {
      if (action === "add") {
        const { title, description, link, img } = req.body.data;
        
        const newMaterial = {
          id: rand(),
          title: title || "",
          description: description || "",
          link: link || "",
          img: img || "",
          createdAt: new Date().getTime()
        };

        await Material.insert(newMaterial);
      }

      if (action === "edit") {
        const { id } = req.body;
        const { title, description, link, img } = req.body.data;

        await Material.update(
          { id },
          {
            title,
            description,
            link,
            img
          }
        );
      }

      if (action === "delete") {
        const { id } = req.body;
        await Material.delete({ id });
      }

      return res.json(success({}));
    } catch (err) {
      console.error(`[API Admin Materials] Error executing action ${action}:`, err);
      return res.status(500).json({ error: true, msg: "execution error" });
    }
  }
};
