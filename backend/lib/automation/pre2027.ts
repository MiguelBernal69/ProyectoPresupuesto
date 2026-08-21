/**
 * lib/automation/pre2027.ts
 *
 * Cliente HTTP para el sistema externo: planificacion.umss.edu.bo/pre2027/
 * Sistema PHP clásico — se automatizan mediante fetch() del lado servidor.
 *
 * IMPORTANTE:
 * - Nunca exponer cookies ni contraseñas al frontend.
 * - Nunca hacer console.log de credenciales.
 * - Si aparece CAPTCHA u otra barrera → lanzar error "INTERVENCION_REQUERIDA".
 */

const BASE_URL = "http://planificacion.umss.edu.bo/pre2027";

export type ResultadoLogin = {
  ok: boolean;
  cookies?: string; // Cookie de sesión PHP serializada (Set-Cookie headers)
  error?: string;
};

export type ResultadoCargaItem = {
  ok: boolean;
  idExterno?: string;
  error?: string;
  requiereIntervencion?: boolean; // true si apareció CAPTCHA u obstáculo
};

// ── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Extrae y serializa las cookies Set-Cookie de una respuesta HTTP.
 * Solo guarda el nombre=valor, no los atributos (Secure, HttpOnly, etc.)
 * que son del servidor externo y no aplican aquí.
 */
function extraerCookies(response: Response): string {
  const setCookieHeaders = response.headers.getSetCookie?.() ?? [];

  // getSetCookie puede no existir en algunos entornos — fallback manual
  if (setCookieHeaders.length === 0) {
    const raw = response.headers.get("set-cookie") ?? "";
    return raw
      .split(",")
      .map((c) => c.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");
  }

  return setCookieHeaders
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

/**
 * Detecta si la respuesta indica que se requiere intervención humana
 * (CAPTCHA, re-login, acceso bloqueado).
 */
function detectarIntervencion(html: string, url: string): boolean {
  const lowerHtml = html.toLowerCase();
  const lowerUrl = url.toLowerCase();

  // Redirigido al login → sesión expirada
  if (lowerUrl.includes("login") || lowerUrl.includes("index") && !lowerUrl.includes("ingreso")) {
    return true;
  }

  // Palabras clave de bloqueo
  const indicadores = ["captcha", "recaptcha", "acceso denegado", "session expired", "no autorizado"];
  return indicadores.some((ind) => lowerHtml.includes(ind));
}

// ── Obtener lista de actividades (AJAX endpoint) ──────────────────────────────
// El select de "Actividad" se popula dinámicamente. Este endpoint devuelve las
// opciones HTML para un dirId dado.

export async function obtenerActividades(
  dirId: string
): Promise<Array<{ value: string; label: string }>> {
  try {
    const body = new URLSearchParams();
    body.append("iddireccion", dirId);
    body.append("rnd", Date.now().toString());

    const response = await fetch(`${BASE_URL}/libraries/getActividad.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return [];

    const html = await response.text();

    // Parsear opciones del HTML: <option value="X">Texto</option>
    const opciones: Array<{ value: string; label: string }> = [];
    // El HTML devuelto tiene comillas simples o dobles en los atributos value
    const regex = /<option[^>]*value=['"]([^'"]*)['"][^>]*>([^<]*)<\/option>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const value = match[1].trim();
      const label = match[2].trim();
      if (value && label && label !== "Seleccionar") {
        opciones.push({ value, label });
      }
    }

    return opciones;
  } catch (err) {
    console.error("[pre2027] Error obteniendo actividades:", err);
    return [];
  }
}

// ── Login al sistema externo ─────────────────────────────────────────────────

export async function loginSistemaExterno(
  dirId: string,
  userId: string,
  password: string // Solo viaja aquí, nunca se guarda ni se loguea
): Promise<ResultadoLogin> {
  try {
    const body = new URLSearchParams();
    body.append("dirId", dirId);
    body.append("userId", userId);
    body.append("password", password);
    // ⚠️ NUNCA console.log(body) — contiene la contraseña

    const response = await fetch(`${BASE_URL}/system/login.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": `${BASE_URL}/`,
        "User-Agent": "Mozilla/5.0 (compatible; UMSS-PRE-Client/1.0)",
      },
      body: body.toString(),
      redirect: "manual", // Capturar la redirección sin seguirla automáticamente
      signal: AbortSignal.timeout(15_000),
    });

    const cookies = extraerCookies(response);

    // El sistema PHP hace redirect (301/302) al dashboard en caso de éxito
    // o recarga el formulario de login en caso de error
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("location") ?? "";
      if (location.includes("login") || location.includes("index")) {
        return { ok: false, error: "Credenciales incorrectas. Verifique DA, Actividad y contraseña." };
      }
      return { ok: true, cookies };
    }

    // Algunos sistemas responden 200 con formulario si hay error
    if (response.status === 200) {
      const html = await response.text();
      if (html.toLowerCase().includes("login") || html.toLowerCase().includes("contrase")) {
        return { ok: false, error: "Credenciales incorrectas o acceso denegado." };
      }
      // Si hay cookies y no parece error, asumimos éxito
      if (cookies) {
        return { ok: true, cookies };
      }
    }

    return { ok: false, error: `Respuesta inesperada del servidor externo (status ${response.status}).` };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "El sistema externo no respondió a tiempo. Inténtelo de nuevo." };
    }
    // Log técnico sin exponer contraseñas
    console.error("[pre2027] Error en login:", err instanceof Error ? err.message : "desconocido");
    return { ok: false, error: "No se pudo conectar al sistema externo. Verifique la conexión de red." };
  }
}

// ── Cargar un ítem al sistema externo ────────────────────────────────────────
// Esta función será completada en FASE 5, una vez que se conozca exactamente
// el formulario interno del sistema (URL + campos) con credenciales reales.

export async function cargarItemAlSistema(
  cookies: string,
  item: {
    objetoCodigo: string;
    itemCodigo: string;
    cantidad: string;
    precioUnitario: string;
    subtotal: string;
  }
): Promise<ResultadoCargaItem> {
  try {
    // 1. Obtener el saldo actual de la memoria de cálculo (para validación del form)
    const saldoRes = await fetch(`${BASE_URL}/system/crearMCal2.php`, {
      headers: { Cookie: cookies },
      signal: AbortSignal.timeout(10_000),
    });

    if (saldoRes.status === 301 || saldoRes.status === 302 || saldoRes.status === 403) {
       return { ok: false, error: "Sesión expirada o acceso denegado." };
    }

    const htmlSaldo = await saldoRes.text();
    const saldoMatch = htmlSaldo.match(/id="saldo"[^>]*value="([^"]+)"/);
    const saldo = saldoMatch ? saldoMatch[1] : "99999999";

    // 2. Obtener datos internos del ítem desde el sistema oficial (getObjeto2.php)
    const bObjeto = new URLSearchParams();
    bObjeto.append("iditem", item.itemCodigo);
    bObjeto.append("rnd", Date.now().toString());

    const objRes = await fetch(`${BASE_URL}/system/getObjeto2.php`, {
      method: "POST",
      headers: { Cookie: cookies, "Content-Type": "application/x-www-form-urlencoded" },
      body: bObjeto.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    const objData = await objRes.text();
    const arrayData = objData.split("~");
    
    if (arrayData.length < 5) {
      return { ok: false, error: `El ítem ${item.itemCodigo} no fue encontrado en el sistema externo.` };
    }

    const objetoExt = arrayData[0].trim();
    const descExt = arrayData[1].trim();
    const iditemExt = arrayData[4].trim();
    
    const objetoDisplay = `${objetoExt}.- ${descExt}`;

    // Lógica especial de consultores en el sistema externo
    const esConsultor = ["25210", "25220", "25810", "25820", "26990"].includes(objetoExt);
    
    let cantidadEnviar = item.cantidad;
    let precioEnviar = item.precioUnitario;
    let montoEnviar = parseFloat(item.subtotal).toFixed(2);

    if (esConsultor) {
      cantidadEnviar = "0";
      precioEnviar = "0";
      montoEnviar = "0";
    }

    // 3. Enviar el formulario a saveMcal.php
    const formParams = new URLSearchParams();
    formParams.append("saldo", saldo);
    formParams.append("iditem", iditemExt);
    formParams.append("item", item.itemCodigo);
    formParams.append("describe", "");
    formParams.append("objeto", objetoExt);
    formParams.append("objetoDisplay", objetoDisplay);
    formParams.append("bpu", "true");
    formParams.append("cantidad", cantidadEnviar);
    formParams.append("precio", precioEnviar);
    formParams.append("monto", montoEnviar);
    formParams.append("enter", "Guardar");

    const saveRes = await fetch(`${BASE_URL}/system/saveMcal.php`, {
      method: "POST",
      headers: { 
        Cookie: cookies, 
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": `${BASE_URL}/system/crearMCal2.php`
      },
      body: formParams.toString(),
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    // Éxito: El sistema externo responde con JS redirect a mcalList.php
    if (saveRes.status === 302 || saveRes.status === 301) {
      return { ok: true };
    }

    if (saveRes.status === 200) {
      const body = await saveRes.text();
      // El sistema responde con un script JS: window.location="mcalList.php"
      if (body.includes("mcalList.php") || body.includes("window.location")) {
        return { ok: true };
      }
      if (body.includes("sobrepasa el saldo")) {
        return { ok: false, error: "El monto sobrepasa el techo presupuestario en el sistema oficial." };
      }
      return { ok: false, error: "El sistema rechazó el formulario. Verifique los datos." };
    }

    return { ok: false, error: `Error desconocido (status ${saveRes.status})` };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    console.error("[pre2027] Error cargando ítem:", mensaje);

    if (detectarIntervencion("", "")) {
      return { ok: false, requiereIntervencion: true, error: "Se requiere intervención del usuario en el sistema externo." };
    }

    return { ok: false, error: `Error de red al cargar el ítem: ${mensaje}` };
  }
}

// ── Verificar sesión activa ───────────────────────────────────────────────────

export async function verificarSesion(cookies: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: cookies },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });

    // Si redirige al login, la sesión expiró
    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get("location") ?? "";
      return !location.includes("index.php") && !location.includes("login");
    }

    if (response.status === 200) {
      const html = await response.text();
      // Si el HTML contiene el formulario de login, la sesión es inválida
      if (html.includes('id="login"') || html.includes('Acceder al Modulo')) {
        return false;
      }
      return !detectarIntervencion(html, BASE_URL);
    }

    return false;
  } catch {
    return false;
  }
}
