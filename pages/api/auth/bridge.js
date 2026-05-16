import { DB, User, Session } from "../../../components/db";

const db = new DB({
  User: new User(),
  Session: new Session(),
});

export default async function handler(req, res) {
  const { dni, admin_token, path = 'dashboard' } = req.query;

  // 1. Validar permiso de admin (Token Maestro o Sesión real)
  const MASTER_TOKEN = "otdxDIds3wtui3enxb";
  if (!admin_token || (admin_token !== MASTER_TOKEN)) {
    return res.status(401).send("Acceso Denegado: Admin Token Inválido");
  }

  try {
    // 2. Buscar al usuario socio
    const user = await db.User.findOne({ dni });
    if (!user) {
      return res.status(404).send("Usuario no encontrado");
    }

    // 3. Crear una sesión real en la DB
    const sessionValue = Math.random().toString(36).substring(2) + Date.now().toString(36);
    await db.Session.insert({
      value: sessionValue,
      user_id: user._id,
      dni: user.dni,
      createdAt: new Date()
    });

    // 4. Construir URL de redirección a la APP
    // Como el API y la APP suelen estar en el mismo dominio base o se conocen,
    // redirigimos directamente con los datos inyectados.
    const appUrl = process.env.VUE_APP_URL || "https://harmonyy-x5sr.vercel.app";
    const redirectUrl = new URL(`${appUrl}/${path.replace(/^\//, '')}`);
    
    redirectUrl.searchParams.set('session', sessionValue);
    redirectUrl.searchParams.set('dni', user.dni);
    redirectUrl.searchParams.set('name', user.name || '');
    redirectUrl.searchParams.set('lastName', user.lastName || '');
    redirectUrl.searchParams.set('affiliated', user.affiliated !== false ? 'true' : 'false');
    redirectUrl.searchParams.set('office_id', 'central');

    console.log(`Bridge: Redirigiendo a ${user.dni} -> ${redirectUrl.toString()}`);
    
    // 5. Redirección HTTP 302
    res.redirect(302, redirectUrl.toString());

  } catch (error) {
    console.error("Bridge Error:", error);
    res.status(500).send("Error interno en el Bridge");
  }
}
