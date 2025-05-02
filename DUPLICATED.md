# Archivos Duplicados o No Utilizados

Este documento mantiene un registro de los archivos que se han movido a la carpeta "deprecated" por ser redundantes o no estar en uso activo en el proyecto actual.

## Componentes de Gestión de Sesiones

Los siguientes archivos se han unificado en un único componente `session-management.tsx`:

- `session-management-new.tsx` - Versión anterior del componente
- `session-management-updated.tsx` - Renombrado a `session-management.tsx`
- `sessions-management.tsx` - Versión anterior con distinto nombre

## Páginas No Utilizadas

Estas páginas han sido movidas a la carpeta "deprecated" ya que han sido reemplazadas por las nuevas páginas con pestañas:

- `recordings-page.tsx` - Reemplazado por la funcionalidad en SessionsPage
- `metrics-page.tsx` - Reemplazado por gráficas en el dashboard

## Rutas Antiguas Mantenidas por Compatibilidad

Las siguientes rutas se mantienen en App.tsx por compatibilidad, pero dirigen a las nuevas páginas con pestañas:

- `/cameras` → Ahora parte de `/device-management`
- `/sensors` → Ahora parte de `/live-monitoring`
- `/settings/sensors` → Ahora parte de `/device-management`
- `/player` → Ahora parte de `/live-monitoring`

## Componentes con Inconsistencias de Nomenclatura

Se corrigieron las siguientes inconsistencias de nomenclatura:

- `SensorCard.tsx` → Renombrado a `sensor-card.tsx` para seguir la convención kebab-case

## Próximas Mejoras

- Revisar y actualizar importaciones en todo el proyecto
- Unificar nombres de archivos siguiendo la convención kebab-case
- Eliminar completamente las rutas antiguas cuando ya no sean necesarias