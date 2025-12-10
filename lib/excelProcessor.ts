import * as XLSX from 'xlsx';

export interface ProcessedRow {
  NroPedido: string | number;
  item: string | number;
  codigo: string | number;
  diferencia: number;
  descuentoFinanciero: number;
  suma: number;
}

export interface InputRow {
  [key: string]: any;
}

export function processExcelFile(file: File): Promise<ProcessedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Obtener la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // 1. Buscar el número de pedido - buscar específicamente "N° PEDIDO"
        let nroPedido = '';
        console.log('Buscando N° PEDIDO en las primeras 15 filas...');
        
        for (let row = range.s.r; row <= Math.min(range.s.r + 15, range.e.r); row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            
            if (cell && cell.v) {
              const cellValue = String(cell.v).trim();
              
              // Log todas las celdas que contienen "PEDIDO" para debugging
              if (cellValue.toUpperCase().includes('PEDIDO')) {
                console.log(`Fila ${row}, Col ${col}: "${cellValue}"`);
                
                // Buscar exactamente "N° PEDIDO"
                if (cellValue === 'N° PEDIDO' || cellValue === 'N°PEDIDO' || cellValue === 'Nº PEDIDO' || cellValue === 'N PEDIDO') {
                  console.log(`✓ Encontrado "N° PEDIDO" en Fila ${row}, Col ${col}`);
                  
                  // Buscar en múltiples celdas cercanas
                  const posiblesCeldas = [
                    { r: row, c: col + 1 },      // Derecha
                    { r: row, c: col + 2 },      // 2 celdas a la derecha
                    { r: row + 1, c: col },       // Abajo
                    { r: row + 1, c: col + 1 },   // Abajo-derecha
                    { r: row + 1, c: col + 2 },   // Abajo-2 derecha
                  ];
                  
                  for (const pos of posiblesCeldas) {
                    const testCell = worksheet[XLSX.utils.encode_cell(pos)];
                    if (testCell && testCell.v) {
                      const valorStr = String(testCell.v).trim();
                      console.log(`  Probando celda ${XLSX.utils.encode_cell(pos)}: "${valorStr}"`);
                      
                      // Verificar que no sea un encabezado
                      if (valorStr && 
                          !valorStr.toUpperCase().includes('TIPO') && 
                          !valorStr.toUpperCase().includes('CLIENTE') &&
                          !valorStr.toUpperCase().includes('PEDIDO') &&
                          valorStr.length < 20) { // No muy largo
                        nroPedido = valorStr;
                        console.log(`✓ N° PEDIDO encontrado: ${nroPedido}`);
                        break;
                      }
                    }
                  }
                  
                  if (nroPedido) break;
                }
              }
            }
          }
          if (nroPedido) break;
        }
        
        // 2. Encontrar la fila de encabezados de la tabla (buscar "ITEM")
        let headerRow = -1;
        let colItem = -1, colCodigo = -1, colValorPedido = -1, colValorNeto = -1;
        const allHeaders: { [key: string]: number } = {};
        
        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            
            if (cell && cell.v) {
              const cellValue = String(cell.v).trim().toUpperCase();
              
              if (cellValue === 'ITEM' && headerRow === -1) {
                headerRow = row;
                colItem = col;
                
                // Buscar las otras columnas en la misma fila
                for (let c = col; c <= range.e.c; c++) {
                  const hCell = worksheet[XLSX.utils.encode_cell({ r: row, c })];
                  if (hCell && hCell.v) {
                    const hValue = String(hCell.v).trim();
                    const hValueUpper = hValue.toUpperCase();
                    
                    // Guardar todas las columnas para debugging
                    allHeaders[hValue] = c;
                    
                    if (hValueUpper === 'CODIGO' || hValueUpper === 'CÓDIGO') {
                      colCodigo = c;
                      console.log(`✓ Columna CODIGO encontrada en posición ${c}`);
                    } else if (hValueUpper.includes('VALOR') && hValueUpper.includes('PEDIDO') && (hValueUpper.includes('BS') || hValueUpper.includes('Bs'))) {
                      colValorPedido = c;
                      console.log(`✓ Columna "Valor del pedido Bs." encontrada en posición ${c}`);
                    } else if (hValueUpper === 'VALOR NETO' || hValue === 'VALOR NETO') {
                      colValorNeto = c;
                      console.log(`✓ Columna "VALOR NETO" encontrada en posición ${c}`);
                    }
                  }
                }
                break;
              }
            }
          }
          if (headerRow !== -1) break;
        }
        
        console.log('N° Pedido encontrado:', nroPedido);
        console.log('Fila de encabezados:', headerRow);
        console.log('Todas las columnas encontradas:', allHeaders);
        console.log('Columnas - Item:', colItem, 'Codigo:', colCodigo, 'ValorPedido:', colValorPedido, 'ValorNeto:', colValorNeto);
        
        // Mostrar qué hay en cada columna para debugging
        if (headerRow !== -1) {
          console.log('Verificando encabezados de columnas:');
          for (let c = 0; c <= 10; c++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })];
            if (cell && cell.v) {
              console.log(`  Col ${c}: "${cell.v}"`);
            }
          }
        }
        
        if (headerRow === -1 || colItem === -1) {
          throw new Error('No se encontró la tabla de items en el archivo Excel');
        }
        
        // 3. Procesar las filas de datos
        const processedData: ProcessedRow[] = [];
        
        for (let row = headerRow + 1; row <= range.e.r; row++) {
          const itemCell = worksheet[XLSX.utils.encode_cell({ r: row, c: colItem })];
          
          // Si no hay item o no es un número, detener o saltar
          if (!itemCell || !itemCell.v) continue;
          
          const itemValue = String(itemCell.v).trim();
          
          // Si es "Total" o similar, detener el procesamiento
          if (itemValue.toUpperCase().includes('TOTAL')) break;
          
          // Si no es un número, saltar
          if (isNaN(Number(itemValue))) continue;
          
          // Extraer los valores
          const item = itemValue;
          const codigo = colCodigo !== -1 
            ? String(worksheet[XLSX.utils.encode_cell({ r: row, c: colCodigo })]?.v || '').trim() 
            : '';
          
          // Leer valores directamente de las celdas
          const cellValorPedido = colValorPedido !== -1
            ? worksheet[XLSX.utils.encode_cell({ r: row, c: colValorPedido })]
            : null;
          
          const cellValorNeto = colValorNeto !== -1
            ? worksheet[XLSX.utils.encode_cell({ r: row, c: colValorNeto })]
            : null;
          
          const valorPedidoBSRaw = cellValorPedido?.v;
          const valorNetoRaw = cellValorNeto?.v;
          
          // Función auxiliar para parsear números preservando decimales exactos
          const parseNumber = (value: any, cellText?: string): number => {
            if (value === null || value === undefined) return 0;
            
            // Si hay texto formateado (celda.w), usarlo para preservar decimales exactos
            if (cellText) {
              // Extraer número del texto formateado (ej: "256.80" -> 256.80)
              const numStr = cellText.replace(/,/g, '').replace(/ /g, '').replace(/[^\d.-]/g, '');
              const parsed = parseFloat(numStr);
              if (!isNaN(parsed)) return parsed;
            }
            
            // Si no hay texto formateado, usar el valor raw pero redondear a 2 decimales
            const numStr = String(value).replace(/,/g, '').replace(/ /g, '');
            const parsed = parseFloat(numStr);
            return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100; // Redondear a 2 decimales
          };
          
          const valorPedidoBS = parseNumber(valorPedidoBSRaw, cellValorPedido?.w);
          const valorNeto = parseNumber(valorNetoRaw, cellValorNeto?.w);
          
          // Logging detallado para el primer item
          if (processedData.length === 0) {
            console.log(`\n=== DETALLES DE CELDAS ===`);
            console.log(`Celda Valor Pedido (${XLSX.utils.encode_cell({ r: row, c: colValorPedido })}):`, {
              valorRaw: cellValorPedido?.v,
              texto: cellValorPedido?.w,
              parseado: valorPedidoBS,
              tipo: typeof cellValorPedido?.v
            });
            console.log(`Celda Valor Neto (${XLSX.utils.encode_cell({ r: row, c: colValorNeto })}):`, {
              valorRaw: cellValorNeto?.v,
              texto: cellValorNeto?.w,
              parseado: valorNeto,
              tipo: typeof cellValorNeto?.v
            });
          }
          
          // Logging para debug - mostrar los primeros 3 items
          if (processedData.length === 0) {
            console.log(`\n=== PRIMER ITEM (Item ${item}) ===`);
            console.log(`Fila de datos: ${row}`);
            console.log('Valores de TODAS las columnas en esta fila:');
            for (let c = 0; c <= 10; c++) {
              const cell = worksheet[XLSX.utils.encode_cell({ r: row, c })];
              if (cell && cell.v) {
                console.log(`  Col ${c}: ${cell.v}`);
              }
            }
            console.log(`\nColumna Valor Pedido (${colValorPedido}): ${valorPedidoBSRaw}`);
            console.log(`Columna Valor Neto (${colValorNeto}): ${valorNetoRaw}`);
            console.log(`Diferencia calculada: ${valorPedidoBS} - ${valorNeto} = ${(valorPedidoBS - valorNeto).toFixed(2)}`);
          }
          
          if (processedData.length < 3) {
            console.log(`Item ${item}: diferencia = ${(valorPedidoBS - valorNeto).toFixed(2)}`);
          }
          
          // Cálculos - Valor del pedido Bs. MENOS VALOR NETO
          // Usar redondeo preciso para preservar decimales exactos
          const diferencia = Math.round((valorPedidoBS - valorNeto) * 100) / 100;
          const descuentoFinanciero = Math.round((valorNeto * 0.03) * 100) / 100; // 3%
          const suma = Math.round((diferencia + descuentoFinanciero) * 100) / 100;
          
          processedData.push({
            NroPedido: nroPedido,
            item: item,
            codigo: codigo,
            diferencia: Number(diferencia.toFixed(2)),
            descuentoFinanciero: Number(descuentoFinanciero.toFixed(2)),
            suma: Number(suma.toFixed(2))
          });
        }
        
        console.log('Datos procesados:', processedData.length, 'filas');
        resolve(processedData);
        
      } catch (error) {
        console.error('Error procesando Excel:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

// Función auxiliar para buscar una columna por varios nombres posibles
function findColumnValue(row: InputRow, possibleNames: string[]): any {
  for (const name of possibleNames) {
    if (row.hasOwnProperty(name) && row[name] !== null && row[name] !== undefined && row[name] !== '') {
      return row[name];
    }
  }
  
  // Si no encontramos por nombre exacto, buscar por contenido de valor
  // Esto ayuda cuando las columnas tienen nombres genéricos __EMPTY
  for (const key in row) {
    if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
      for (const possibleName of possibleNames) {
        if (key.includes(possibleName) || possibleName.includes(key)) {
          return row[key];
        }
      }
    }
  }
  
  return null;
}

export function exportToExcel(data: ProcessedRow[], filename: string = 'resultado.xlsx') {
  // Crear un nuevo libro de trabajo
  const workbook = XLSX.utils.book_new();
  
  // Convertir los datos a una hoja de trabajo
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Agregar la hoja al libro
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultado');
  
  // Generar el archivo y descargarlo
  XLSX.writeFile(workbook, filename);
}

