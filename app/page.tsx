'use client';

import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { processExcelFile, exportToExcel, type ProcessedRow } from '@/lib/excelProcessor';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setProcessedData(null);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await processExcelFile(file);
      setProcessedData(result);
    } catch (err) {
      setError('Error al procesar el archivo. Verifica que tenga el formato correcto.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedData) {
      exportToExcel(processedData, 'resultado_procesado.xlsx');
    }
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Procesador de Excel</h1>
          <p className="text-muted-foreground">
            Sube tu archivo de pedidos y obtén el resultado procesado automáticamente
          </p>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Cargar Archivo</CardTitle>
            <CardDescription>
              Selecciona el archivo Excel con los datos de pedidos a procesar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label
                htmlFor="file-upload"
                className="flex-1 cursor-pointer"
              >
                <div className="border-2 border-dashed border-border rounded-lg p-8 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {file ? file.name : 'Click para seleccionar archivo'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Archivo Excel (.xlsx, .xls)
                      </p>
                    </div>
                  </div>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-xs">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}

            <Button
              onClick={handleProcess}
              disabled={!file || processing}
              className="w-full"
              size="lg"
            >
              {processing ? 'Procesando...' : 'Procesar Archivo'}
            </Button>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        {processedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Procesamiento Completado
              </CardTitle>
              <CardDescription>
                Se procesaron {processedData.length} registros correctamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview de los primeros 5 registros */}
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Nro Pedido</th>
                      <th className="px-4 py-3 text-left font-medium">Item</th>
                      <th className="px-4 py-3 text-left font-medium">Código</th>
                      <th className="px-4 py-3 text-right font-medium">Diferencia</th>
                      <th className="px-4 py-3 text-right font-medium">Desc. Financiero</th>
                      <th className="px-4 py-3 text-right font-medium">Suma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {processedData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="hover:bg-muted/50">
                        <td className="px-4 py-3">{row.NroPedido}</td>
                        <td className="px-4 py-3">{row.item}</td>
                        <td className="px-4 py-3">{row.codigo}</td>
                        <td className="px-4 py-3 text-right">{row.diferencia}</td>
                        <td className="px-4 py-3 text-right">{row.descuentoFinanciero}</td>
                        <td className="px-4 py-3 text-right font-medium">{row.suma}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {processedData.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  Mostrando 5 de {processedData.length} registros
                </p>
              )}

              <Button
                onClick={handleDownload}
                className="w-full"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Archivo Procesado
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Selecciona el archivo Excel con los datos del pedido</li>
              <li>Haz click en &quot;Procesar Archivo&quot;</li>
              <li>Revisa la vista previa de los datos procesados</li>
              <li>Descarga el archivo Excel con los resultados</li>
            </ol>
            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="text-xs font-medium mb-2">Campos calculados:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>Diferencia:</strong> Valor del pedido Bs. - VALOR NETO</li>
                <li><strong>Descuento Financiero:</strong> VALOR NETO × 3%</li>
                <li><strong>Suma:</strong> Diferencia + Descuento Financiero</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

