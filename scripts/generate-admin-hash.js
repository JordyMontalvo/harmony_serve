/**
 * Genera el hash bcrypt para la contrasena del panel administrativo.
 *
 * Uso:
 *   node scripts/generate-admin-hash.js              -> genera una contrasena aleatoria fuerte
 *   node scripts/generate-admin-hash.js "MiClave"    -> usa la contrasena indicada
 *
 * El hash resultante se configura en el servidor:
 *   heroku config:set ADMIN_PANEL_PASSWORD_HASH='<hash>' -a <tu-app>
 *
 * La contrasena en claro NO se guarda en ningun sitio: anotala en tu
 * gestor de claves antes de cerrar la terminal.
 */

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const ROUNDS = 12;

function randomPassword(length = 24) {
  // Sin caracteres ambiguos (0/O, 1/l/I) para evitar errores al transcribir.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[crypto.randomInt(alphabet.length)];
  }
  return out;
}

const provided = process.argv[2];
const generated = !provided;
const password = provided || randomPassword();

if (password.length < 12) {
  console.error("\nERROR: usa una contrasena de al menos 12 caracteres.\n");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, ROUNDS);

console.log("");
if (generated) {
  console.log("CONTRASENA GENERADA (guardala en tu gestor de claves AHORA):");
  console.log("   " + password);
  console.log("");
}

console.log("HASH BCRYPT (este valor va en la variable de entorno):");
console.log("   " + hash);
console.log("");
console.log("Comando para Heroku:");
console.log("   heroku config:set ADMIN_PANEL_PASSWORD_HASH='" + hash + "' -a TU-APP");
console.log("");

// Comprobacion de que el hash es correcto antes de configurarlo.
const ok = bcrypt.compareSync(password, hash);
const rejectsOther = !bcrypt.compareSync("harmony2026", hash);
console.log("Verificacion: acepta la contrasena =", ok, "| rechaza la antigua =", rejectsOther);
console.log("");
