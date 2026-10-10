"use server";

import { Resend } from "resend";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | {
      status: "error";
      message: string;
      values: { name: string; email: string; msg: string };
    };

const MAX_NAME = 80;
const MAX_EMAIL = 120;
const MAX_MSG = 2000;

// Sin saltos de línea ni espacios; evita inyección de cabeceras.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINE_BREAK_RE = /[\r\n]/;

const field = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};

export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values = {
    name: field(formData, "name").trim(),
    email: field(formData, "email").trim(),
    msg: field(formData, "msg").trim(),
  };
  const fail = (message: string): ContactState => ({ status: "error", message, values });

  // Honeypot: un bot lo rellena; se responde éxito sin enviar nada.
  if (field(formData, "website") !== "") {
    return { status: "success", name: values.name };
  }

  if (!values.name || !values.email || !values.msg) {
    return fail("ERROR: FALTAN CAMPOS OBLIGATORIOS.");
  }
  if (
    values.name.length > MAX_NAME ||
    values.email.length > MAX_EMAIL ||
    values.msg.length > MAX_MSG
  ) {
    return fail("ERROR: UNO DE LOS CAMPOS ES DEMASIADO LARGO.");
  }
  if (
    LINE_BREAK_RE.test(values.name) ||
    LINE_BREAK_RE.test(values.email) ||
    !EMAIL_RE.test(values.email)
  ) {
    return fail("ERROR: DATOS NO VÁLIDOS. REVISA EL NOMBRE Y EL CORREO.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  // Con el remitente de pruebas, Resend solo entrega al correo de la cuenta.
  const to = process.env.CONTACT_TO_EMAIL || "wareg.amkar.mesm94@gmail.com";
  // Remitente de pruebas de Resend: funciona sin verificar dominio.
  const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("[contact] Faltan variables de entorno de Resend.");
    return fail("ERROR: NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO MÁS TARDE.");
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: values.email,
      subject: `[Arcade Vault] Mensaje de ${values.name}`,
      text: `Nombre: ${values.name}\nCorreo: ${values.email}\n\nMensaje:\n${values.msg}\n`,
    });
    if (error) {
      console.error(`[contact] Resend devolvió un error: ${error.name} (${error.statusCode}) ${error.message}`);
      return fail("ERROR: NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO MÁS TARDE.");
    }
  } catch (err) {
    console.error("[contact] Fallo al llamar a Resend:", err);
    return fail("ERROR: NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO MÁS TARDE.");
  }

  return { status: "success", name: values.name };
}
