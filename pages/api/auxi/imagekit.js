const cors = require('micro-cors')()
const ImageKit = require("imagekit")

const publicKey = process.env.IMAGEKIT_PUBLIC
const privateKey = process.env.IMAGEKIT_PRIVATE

console.log('imagekit !!! ....................................')

var imagekit = new ImageKit({
  publicKey,
  privateKey,
  urlEndpoint: "https://ik.imagekit.io/ur69moyfky/",
})

module.exports = cors((req, res) => {
  return res.json(imagekit.getAuthenticationParameters())
})




// const authenticationParameters = imagekit.getAuthenticationParameters()
// return res.json(authenticationParameters)
