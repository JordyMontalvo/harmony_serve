import db from "../../../components/db"
import lib from "../../../components/lib"

const { Banner } = db
const { success, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  if(req.method == 'GET') {
    // Obtener imágenes de rangos
    let rankImages = await Banner.findOne({ id: "rank_images" })
    
    // Si no existe, crear uno vacío con las categorías
    if (!rankImages) {
      rankImages = {
        id: "rank_images",
        master: "",
        plata: "",
        oro: "",
        zafiro: "",
        rubi: "",
        esmeralda: "",
        diamante: "",
        diamante_azul: "",
        diamante_negro: "",
        diamante_corona: "",
        diamante_imperial: "",
      }
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
        id: "rank_images",
        master: "",
        plata: "",
        oro: "",
        zafiro: "",
        rubi: "",
        esmeralda: "",
        diamante: "",
        diamante_azul: "",
        diamante_negro: "",
        diamante_corona: "",
        diamante_imperial: "",
        ...updateData
      }
      await Banner.insert(newBanner)
    }

    return res.json(success())
  }
}
