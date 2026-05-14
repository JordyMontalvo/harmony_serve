import db from "../../../components/db"
import lib from "../../../components/lib"

const { Banner } = db
const { success, midd } = lib

const DEFAULT_RANK_IMAGES = {
  id: "rank_images",
  millonario: "",
  oro: "",
  esmeralda: "",
  platino: "",
  diamante: "",
  diamante_azul: "",
  diamante_ejecutivo: "",
  doble_diamante: "",
  diamante_corona: "",
  top_harmony: "",
}

export default async (req, res) => {
  await midd(req, res)

  if(req.method == 'GET') {
    // Obtener imágenes de rangos
    let rankImages = await Banner.findOne({ id: "rank_images" })
    
    // Si no existe, crear uno vacío con las categorías
    if (!rankImages) {
      rankImages = { ...DEFAULT_RANK_IMAGES }
      await Banner.insert(rankImages)
    }

    // response
    return res.json(success({ rankImages }))
  }

  if(req.method == 'POST') {
    const { id, img, position } = req.body
    
    // Actualizar la imagen del rango específico
    const updateData = {}
    if (img && position) {
      updateData[position] = img
    }

    // Actualizar o insertar el documento
    const existingBanner = await Banner.findOne({ id: "rank_images" })
    if (existingBanner) {
      await Banner.update({ id: "rank_images" }, updateData)
    } else {
      const newBanner = {
        ...DEFAULT_RANK_IMAGES,
        ...updateData
      }
      await Banner.insert(newBanner)
    }

    return res.json(success())
  }
}
