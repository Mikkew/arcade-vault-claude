# SPEC 03 — Página Acerca de y formulario de contacto con Resend

> **Estado:** Approved
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-08
> **Objetivo:** Portar la página "Acerca de" de `resources/templates/home-about/about.jsx` a `/about` y hacer que su formulario de contacto envíe un correo real al equipo mediante Resend.

---

## Por qué existe este spec

La spec 02 dejó "Acerca de" y su formulario fuera de alcance y ocultó el enlace en el `Nav` hasta que existiera la ruta. En el template el envío es simulado (`setSent(...)` sin red). Esta spec porta la página tal cual y sustituye esa simulación por una Server Action que llama a Resend. Es la primera funcionalidad del proyecto con secretos y con efectos fuera del navegador, por eso incluye validación en servidor y manejo de errores.

---

## Alcance

**Dentro:**

- Nueva ruta `/about` con la página del template: sección "ACERCA DE ARCADE VAULT" (misión y tres destacados con icono), divisor de píxeles y sección "CONTÁCTANOS".
- Formulario con nombre, correo y mensaje, con el estado de éxito en estilo terminal "VAULT-OS // TERMINAL" y el botón "ENVIAR OTRO MENSAJE".
- Server Action `sendContactMessage` en `app/about/actions.ts` que valida y envía el correo con el SDK `resend`.
- Validación en servidor (campos obligatorios, formato de correo, límites de longitud) y campo honeypot oculto.
- Mensaje de error inline en estilo terminal cuando falla la validación del servidor, faltan variables de entorno o Resend devuelve error. Los datos escritos se conservan.
- Correo al equipo con `reply_to` igual al correo del visitante.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`, documentadas en `.env.example`.
- Añadir "Acerca de" (`/about`) al `Nav` (escritorio y menú móvil) con lógica de activo.
- Portar a `app/globals.css` las clases de `ABOUT PAGE` (líneas 1071–1150 de `resources/templates/home-about/styles.css`) que falten, incluida la animación `shake` si no existe.
- Reutilizar `RevealObserver` de la spec 02 para las secciones `.reveal`.

**Fuera de alcance (para otros specs):**

- Correo de confirmación o autorrespuesta al visitante.
- Límite de frecuencia por IP (rate limit), captcha o cualquier anti-spam más allá del honeypot y la validación.
- Guardar los mensajes en base de datos o mostrarlos en un panel.
- Plantilla HTML de correo con React Email; el correo es texto plano.
- Verificar un dominio propio en Resend; en desarrollo se usa el remitente de pruebas de Resend.
- Sesión de usuario y rellenar el formulario con datos de la cuenta.
- Enlace a "Acerca de" en el `Footer`.
- Migrar los estilos a utilidades Tailwind.
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

Nuevo archivo `app/about/actions.ts` con el tipo del estado de la acción. No se persiste nada.

```ts
export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | {
      status: "error";
      message: string;                       // texto mostrado, sin detalles internos
      values: { name: string; email: string; msg: string };
    };

export async function sendContactMessage(
  prev: ContactState,
  formData: FormData,
): Promise<ContactState>;
```

Campos del `FormData`:

| Campo | Regla |
| --- | --- |
| `name` | Obligatorio tras `trim()`, máximo 80 caracteres. |
| `email` | Obligatorio tras `trim()`, formato de correo válido, máximo 120 caracteres. |
| `msg` | Obligatorio tras `trim()`, máximo 2000 caracteres. |
| `website` (honeypot) | Debe llegar vacío. Si trae contenido, la acción devuelve `success` sin llamar a Resend. |

Variables de entorno (solo servidor, sin prefijo `NEXT_PUBLIC_`):

| Variable | Uso |
| --- | --- |
| `RESEND_API_KEY` | Clave de la API de Resend. |
| `CONTACT_TO_EMAIL` | Destinatario de los mensajes. |
| `CONTACT_FROM_EMAIL` | Remitente. Para pruebas, `onboarding@resend.dev`. |

Convenciones:

- Asunto del correo: `[Arcade Vault] Mensaje de <name>`.
- Cuerpo en texto plano con nombre, correo y mensaje.
- Los textos de la página se copian tal cual del template, incluidas tildes y puntuación.
- Los valores de `name`, `email` y `msg` nunca se interpolan en HTML.

---

## Mapa de rutas

| Pantalla | Ruta | Archivo | Tipo |
| --- | --- | --- | --- |
| Acerca de | `/about` | `app/about/page.tsx` | Server, con isla cliente (`ContactForm`) |

Archivos nuevos:

- `app/about/page.tsx`: hero "Acerca de", divisor y sección de contacto; monta `RevealObserver`.
- `app/about/actions.ts`: Server Action (`'use server'`).
- `components/ContactForm.tsx` (cliente): formulario con `useActionState`, shake y estado terminal.
- `components/HighlightIcon.tsx` (servidor): iconos `HEART`, `BROWSER` y `PLANT`.
- `.env.example`: nombres de variables sin valores.

Archivos que cambian:

- `components/Nav.tsx`: enlace "Acerca de" y su lógica de activo (`pathname.startsWith("/about")`) en escritorio y panel móvil.
- `app/globals.css`: clases de `ABOUT PAGE` que falten.
- `package.json`: dependencia `resend`.

---

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` las guías de Server Actions / formularios (`useActionState`), variables de entorno y metadata. Consultar la documentación vigente del SDK `resend` para Node.js.

1. Portar a `app/globals.css` las clases de `ABOUT PAGE` que falten (`.about-*`, `.highlight*`, `.contact-*`, `.terminal-success`, `.term-*`) y la animación `shake` si no existe, sin duplicar reglas. Verificación: `npm run build` pasa y las pantallas de las specs 01 y 02 se ven igual.
2. Crear `components/HighlightIcon.tsx` y `app/about/page.tsx` con el hero, el divisor y la sección de contacto con un formulario estático de solo lectura aún sin acción. Montar `RevealObserver` una sola vez. Verificación: `/about` se ve como el template.
3. Añadir "Acerca de" al `Nav` (escritorio y menú móvil) con su estado activo. Verificación: el enlace lleva a `/about` y se marca activo solo en `/about`.
4. Instalar `resend`, crear `.env.example` y escribir `app/about/actions.ts` con validación, honeypot y llamada a `resend.emails.send` con `reply_to`. Verificación: `npx tsc --noEmit` pasa.
5. Crear `components/ContactForm.tsx` con `useActionState(sendContactMessage, { status: "idle" })`, el campo honeypot oculto, el shake ante error de validación, el estado terminal de éxito y el estado de error inline. Reemplazar el formulario estático de `app/about/page.tsx`. Verificación: con `.env.local` configurado, enviar el formulario entrega el correo al destinatario.
6. Revisar con `npm run lint` y `npm run build`, retirar imports sin uso y confirmar que `RESEND_API_KEY` no aparece en el bundle del cliente. Verificación: ambos comandos pasan.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `/about` muestra, en este orden: "ACERCA DE ARCADE VAULT" con el párrafo de misión, 3 destacados, el divisor de píxeles y "CONTÁCTANOS".
- [ ] Los 3 destacados son "HECHO CON ❤️ PARA JUGADORES", "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR" y "PROYECTO EN CONSTANTE CRECIMIENTO", cada uno con su icono.
- [ ] La sección de contacto muestra los textos "RESPUESTA EN 24-48H", "SUGERENCIAS BIENVENIDAS" y "SIN SPAM, JAMÁS".
- [ ] El `Nav` muestra "Acerca de", lo marca activo solo en `/about` y el menú móvil lo incluye.
- [ ] Con nombre, correo y mensaje válidos y variables correctas, el destinatario `CONTACT_TO_EMAIL` recibe un correo con asunto `[Arcade Vault] Mensaje de <name>` y cuerpo con nombre, correo y mensaje.
- [ ] Al pulsar "Responder" en ese correo, el destinatario es el correo escrito por el visitante.
- [ ] Tras el envío correcto el formulario muestra "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>." y el botón "ENVIAR OTRO MENSAJE" devuelve el formulario vacío.
- [ ] Con algún campo vacío o correo con formato inválido no se envía correo y el formulario hace shake y muestra un error.
- [ ] Una petición con `msg` de más de 2000 caracteres es rechazada por la acción aunque se salte el formulario.
- [ ] Una petición con el campo `website` relleno no genera ningún correo en Resend.
- [ ] Sin `RESEND_API_KEY` o con una clave inválida, el formulario conserva lo escrito y muestra un error en estilo terminal sin nombrar la variable ni el error de Resend.
- [ ] `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` no aparecen en el JavaScript enviado al navegador.
- [ ] `.env.example` lista las tres variables sin valores y `.env.local` sigue ignorado por git.
- [ ] Mientras la acción está en curso el botón queda deshabilitado y evita doble envío.
- [ ] Las secciones `.reveal` quedan visibles tras hacer scroll y, con `prefers-reduced-motion: reduce`, sin animación.
- [ ] Con ancho menor a 768 px `/about` no tiene scroll horizontal.
- [ ] No hay errores de hidratación ni errores en la consola al cargar `/about`, y `/`, `/juegos` y `/salon` siguen sin cambios.

---

## Decisiones

- **Sí:** ruta `/about`, tal como se pidió. Coincide con el nombre del template y con "Acerca de" del `Nav`.
- **No:** `/acerca`. Las rutas existentes están en español, pero el usuario eligió `/about` y no se reabre.
- **Sí:** Server Action con `useActionState`. No expone un endpoint público extra y la API key permanece en el servidor.
- **No:** Route Handler `/api/contact`. Añade una superficie pública sin un segundo consumidor que lo justifique.
- **Sí:** destinatario y remitente en variables de entorno. El correo no queda en el repositorio y el remitente cambia al verificar un dominio sin tocar código.
- **No:** valores fijos en el código.
- **Sí:** validación en servidor además del `shake` en cliente. El cliente se puede saltar; el servidor es la barrera real.
- **Sí:** honeypot `website`, que responde `success` sin enviar. Frena bots simples sin fricción para el usuario.
- **No:** rate limit en memoria. Es poco fiable en entornos serverless y se puede añadir después con almacenamiento externo.
- **Sí:** `reply_to` con el correo del visitante. Permite contestar desde la bandeja sin copiar el correo del cuerpo.
- **Sí:** error inline en estilo terminal que conserva los datos escritos. Mantiene la estética del template y no obliga a reescribir el mensaje.
- **Sí:** mensajes de error genéricos hacia el cliente y detalle solo en el log del servidor. Evita filtrar configuración.
- **Sí:** correo en texto plano. Evita inyección de HTML con contenido del visitante y no requiere dependencias de plantillas.
- **No:** autorrespuesta al visitante. Duplica envíos y exige dominio verificado en Resend.
- **Sí:** añadir "Acerca de" al `Nav` en esta spec. La spec 02 lo pospuso explícitamente hasta que existiera la ruta.
- **Sí:** copiar las clases a `app/globals.css`. Mismo criterio que las specs 01 y 02.
- **Sí:** textos en español, igual que el template.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Sin dominio verificado, Resend solo entrega desde `onboarding@resend.dev` al correo de la propia cuenta | Usar ese remitente en desarrollo con `CONTACT_TO_EMAIL` igual al correo de la cuenta. Verificar un dominio queda para producción. |
| La API key se filtra al cliente o al repositorio | Variable sin `NEXT_PUBLIC_`, uso solo en `actions.ts`, `.env*` ya ignorado y verificación en el paso 6. |
| Spam o abuso del formulario (consumo de cuota de Resend) | Honeypot y límites de longitud. Rate limit y captcha quedan para otra spec si el abuso aparece. |
| Inyección de cabeceras o de HTML con `name` y `email` | Validar formato y longitud, no permitir saltos de línea en `name` y `email`, y enviar solo texto plano. |
| Resend cambia su API respecto a lo que conozco | Consultar la documentación vigente del SDK antes del paso 4 y no asumir firmas de memoria. |
| Next.js 16 cambia APIs de Server Actions y formularios | Leer `node_modules/next/dist/docs/` antes del paso 4. |
| `.reveal` empieza con `opacity: 0` y deja la página oculta antes de hidratar | Aceptado, igual que en la spec 02, con la regla `prefers-reduced-motion`. |

---

## Qué **no** está en este spec

- Autorrespuesta o correo de confirmación al visitante.
- Rate limit, captcha o anti-spam adicional.
- Base de datos, panel de mensajes o historial.
- Plantillas HTML de correo y dominio propio verificado en Resend.
- Sesión de usuario y prellenado de datos.
- Enlace a "Acerca de" en el `Footer`.
- Migración a Tailwind o rediseño visual.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propio spec.
