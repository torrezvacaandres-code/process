# Procesador de Excel

Sistema web para procesar archivos Excel de pedidos y generar reportes automáticos.

## Características

- ✅ Interfaz moderna estilo shadcn (blanco y negro)
- ✅ Carga de archivos Excel (.xlsx, .xls)
- ✅ Procesamiento automático de datos
- ✅ Cálculos automáticos:
  - Diferencia: Valor del pedido Bs. - VALOR NETO
  - Descuento Financiero: VALOR NETO × 3%
  - Suma: Diferencia + Descuento Financiero
- ✅ Vista previa de resultados
- ✅ Descarga del archivo procesado

## Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Uso

1. Selecciona el archivo Excel con los datos del pedido
2. Haz click en "Procesar Archivo"
3. Revisa la vista previa de los datos procesados
4. Descarga el archivo Excel con los resultados

## Estructura del Proyecto

```
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/
│       ├── button.tsx
│       └── card.tsx
├── lib/
│   ├── excelProcessor.ts
│   └── utils.ts
└── docs/
    ├── pedido prueba.xlsx
    └── plantilla.xlsx
```

## Tecnologías

- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **xlsx** - Procesamiento de archivos Excel
- **Lucide React** - Iconos

