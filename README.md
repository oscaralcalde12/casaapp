# Plano de Obra

Aplicación web para organizar tareas, costos, materiales y avances de una obra.

Incluye tablero de prioridades, fechas estimadas de inicio y finalización, y una vista Roadmap con línea de tiempo para las tareas programadas.

El tablero y la API están protegidos por un acceso privado de usuario y contraseña. La contraseña nunca se guarda en el repositorio: se deriva con PBKDF2 y la sesión se mantiene en una cookie `HttpOnly`, `Secure` y `SameSite=Strict`.

## Stack

- Vercel: hosting y funciones API
- Neon: PostgreSQL serverless
- GitHub: repositorio y despliegue continuo

## Puesta en marcha

1. Enlazar el proyecto con `neon link` y traer variables con `neon env pull`.
2. Ejecutar `npm install` y `npm run db:migrate`.
3. Iniciar la aplicación con `npm run dev`.
4. Subir el proyecto a GitHub e importarlo desde Vercel.
5. Añadir `DATABASE_URL` en las variables de entorno de Vercel.

## Configurar el acceso privado

1. Ejecutar `npm run auth:setup` en una terminal. El comando solicita los correos y una contraseña de al menos 12 caracteres para cada cuenta, sin mostrarlas.
2. Guardar las dos variables generadas (`APP_AUTH_USERS` y `APP_AUTH_SECRET`) en `.env.local` y en las variables de entorno de Vercel. `APP_AUTH_USERS` es un objeto JSON que relaciona cada correo con su hash PBKDF2.
3. Volver a desplegar la aplicación para aplicar las variables.

No subir `.env.local` al repositorio. Cambiar `APP_AUTH_SECRET` invalida todas las sesiones abiertas.

Las variables anteriores `APP_AUTH_USERNAME` y `APP_AUTH_PASSWORD_HASH` siguen siendo compatibles para instalaciones con una sola cuenta.

El esquema se mantiene en `db/schema.js`, las migraciones versionadas están en `db/migrations/` y las 169 tareas iniciales se crean automáticamente en la primera consulta.
