#!/usr/bin/env node
// Genera entradas de usuario (con la contraseña cifrada) para la variable APP_USERS,
// y también un AUTH_SECRET al azar. La contraseña NUNCA se guarda en texto plano.
//
// Uso:
//   node scripts/usuario.mjs <usuario> <contraseña> "<Nombre a mostrar>" [rol]
//   node scripts/usuario.mjs --secreto        (genera un AUTH_SECRET)
//
// Ejemplos:
//   node scripts/usuario.mjs ana "Clave#2024" "Ana López" admin
//   node scripts/usuario.mjs luis "otra-clave" "Luis Pérez"
import { scryptSync, randomBytes } from "node:crypto";

const args = process.argv.slice(2);

if (args[0] === "--secreto" || args[0] === "-s") {
  console.log("\nAUTH_SECRET (cópialo tal cual a Netlify):\n");
  console.log(randomBytes(48).toString("base64url"));
  console.log("");
  process.exit(0);
}

if (args.length < 3) {
  console.error("Uso: node scripts/usuario.mjs <usuario> <contraseña> \"<Nombre>\" [rol]");
  console.error("     node scripts/usuario.mjs --secreto");
  process.exit(1);
}

const [usuario, contrasena, nombre, rol = "usuario"] = args;
const salt = randomBytes(16);
const hash = scryptSync(String(contrasena), salt, 32);
const entrada = {
  usuario: String(usuario).toLowerCase(),
  nombre,
  rol,
  hash: `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
};

console.log("\nEntrada de usuario (agrégala al arreglo de APP_USERS):\n");
console.log(JSON.stringify(entrada, null, 2));
console.log("\nComo parte del arreglo APP_USERS (una sola línea, para pegar en Netlify):\n");
console.log(JSON.stringify([entrada]));
console.log("");
