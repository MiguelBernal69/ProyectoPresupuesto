const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
require('dotenv').config();

const prisma = new PrismaClient();

function getEncKey() {
  return crypto.createHash('sha256').update(process.env.SESSION_SECRET || 'dev-secret-change-me').digest();
}

function desc(cifrado) {
  const key = getEncKey();
  const [ivHex, tagHex, encHex] = cifrado.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

async function main() {
  const s = await prisma.sesionCargaExterna.findFirst();
  if(!s) return console.log('NO SESION');
  const c = desc(s.cookiescifradas);
  
  // 1. Obtener saldo
  const r1 = await fetch('http://planificacion.umss.edu.bo/pre2027/system/crearMCal2.php', {
    headers: { Cookie: c }
  });
  const html = await r1.text();
  const saldoMatch = html.match(/id="saldo" value="([^"]+)"/);
  const saldo = saldoMatch ? saldoMatch[1] : "850000";
  console.log('Saldo:', saldo);

  // 2. Obtener datos del item 5076
  const b2 = new URLSearchParams();
  b2.append("iditem", "5076");
  b2.append("rnd", Date.now().toString());
  const r2 = await fetch('http://planificacion.umss.edu.bo/pre2027/system/getObjeto2.php', {
    method: "POST",
    headers: { Cookie: c, "Content-Type": "application/x-www-form-urlencoded" },
    body: b2.toString()
  });
  const data2 = await r2.text();
  const arrayData = data2.split('~');
  if (arrayData.length < 5) return console.log('Failed:', data2);

  const iditem = arrayData[4];
  const objeto = arrayData[0];
  const objetoDisplay = objeto + '.- ' + arrayData[1];
  console.log('Item:', { iditem, objeto, objetoDisplay });

  // 3. POST a saveMcal.php — log exacto de respuesta
  const form = new URLSearchParams();
  form.append("saldo", saldo);
  form.append("iditem", iditem);
  form.append("item", "5076");
  form.append("describe", "");
  form.append("objeto", objeto);
  form.append("objetoDisplay", objetoDisplay);
  form.append("bpu", "true");
  form.append("cantidad", "1");
  form.append("precio", "1");
  form.append("monto", "1");
  form.append("enter", "Guardar");

  const saveRes = await fetch('http://planificacion.umss.edu.bo/pre2027/system/saveMcal.php', {
    method: "POST",
    headers: { 
      Cookie: c,
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": "http://planificacion.umss.edu.bo/pre2027/system/crearMCal2.php"
    },
    body: form.toString(),
    redirect: "manual"
  });
  
  console.log('Status:', saveRes.status);
  console.log('Location:', saveRes.headers.get('location'));
  const body = await saveRes.text();
  console.log('Body (first 300):', body.slice(0, 300));
}

main().then(() => prisma.$disconnect());
