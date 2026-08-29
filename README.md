# Plano de Obra

Aplicación web para organizar tareas, costos, materiales y avances de una obra.

Incluye tablero de prioridades, fechas estimadas de inicio y finalización, y una vista Roadmap con línea de tiempo para las tareas programadas.

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

El esquema se mantiene en `db/schema.js`, las migraciones versionadas están en `db/migrations/` y las 169 tareas iniciales se crean automáticamente en la primera consulta.
