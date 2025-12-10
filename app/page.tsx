'use client';

import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { processExcelFile, exportToExcel, type ProcessedRow } from '@/lib/excelProcessor';

interface ProcessedFile {
  file: File;
  data: ProcessedRow[];
  processed: boolean;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Resetear el input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = '';
  };

  const addFiles = (newFiles: File[]) => {
    const excelFiles = newFiles.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension === 'xlsx' || extension === 'xls';
    });

    if (excelFiles.length > 0) {
      setFiles(prev => [...prev, ...excelFiles]);
      setError(null);
    } else if (newFiles.length > 0) {
      setError('Por favor selecciona solo archivos Excel (.xlsx, .xls)');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    // También remover de procesados si existe
    setProcessedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessFile = async (file: File, index: number) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await processExcelFile(file);
      setProcessedFiles(prev => {
        const newProcessed = [...prev];
        newProcessed[index] = {
          file,
          data: result,
          processed: true
        };
        return newProcessed;
      });
    } catch (err) {
      setError(`Error al procesar ${file.name}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessAll = async () => {
    if (files.length === 0) {
      setError('Por favor selecciona al menos un archivo');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const results = await Promise.all(
        files.map(file => processExcelFile(file))
      );

      setProcessedFiles(
        files.map((file, index) => ({
          file,
          data: results[index],
          processed: true
        }))
      );
    } catch (err) {
      setError('Error al procesar uno o más archivos. Verifica que tengan el formato correcto.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    const allData = processedFiles
      .filter(pf => pf.processed)
      .flatMap(pf => pf.data);
    
    if (allData.length > 0) {
      exportToExcel(allData, 'resultado_procesado.xlsx');
    }
  };

  const allProcessedData = processedFiles
    .filter(pf => pf.processed)
    .flatMap(pf => pf.data);
  
  const totalProcessed = processedFiles.filter(pf => pf.processed).length;

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
            <CardTitle>Cargar Archivos</CardTitle>
            <CardDescription>
              Selecciona uno o múltiples archivos Excel para procesar. Puedes agregar más archivos y procesarlos todos juntos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label
                htmlFor="file-upload"
                className="flex-1 cursor-pointer"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div
                  className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5 border-solid'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="space-y-1">
                      <p className={`text-sm font-medium ${isDragging ? 'text-primary' : ''}`}>
                        {isDragging
                          ? 'Suelta los archivos aquí'
                          : files.length > 0
                          ? `${files.length} archivo(s) seleccionado(s)`
                          : 'Arrastra archivos aquí o click para seleccionar'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Archivos Excel (.xlsx, .xls) - Puedes seleccionar múltiples
                      </p>
                    </div>
                  </div>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Archivos seleccionados ({files.length})</p>
                  <Button
                    onClick={handleProcessAll}
                    disabled={processing}
                    size="sm"
                    variant="outline"
                  >
                    {processing ? 'Procesando...' : 'Procesar Todos'}
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {files.map((file, index) => {
                    const processedFile = processedFiles[index];
                    return (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-2 text-sm bg-muted p-3 rounded-md"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                          {processedFile?.processed && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!processedFile?.processed && (
                            <Button
                              onClick={() => handleProcessFile(file, index)}
                              disabled={processing}
                              size="sm"
                              variant="ghost"
                            >
                              Procesar
                            </Button>
                          )}
                          <Button
                            onClick={() => handleRemoveFile(index)}
                            disabled={processing}
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        {allProcessedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Procesamiento Completado
              </CardTitle>
              <CardDescription>
                {totalProcessed} archivo(s) procesado(s) - {allProcessedData.length} registros totales acumulados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de archivos procesados */}
              {processedFiles.filter(pf => pf.processed).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Archivos procesados:</p>
                  <div className="space-y-1">
                    {processedFiles
                      .filter(pf => pf.processed)
                      .map((pf, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground bg-muted p-2 rounded flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <FileSpreadsheet className="h-3 w-3" />
                            {pf.file.name}
                          </span>
                          <span>{pf.data.length} registros</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Preview de los primeros 10 registros */}
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
                    {allProcessedData.slice(0, 10).map((row, index) => (
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

              {allProcessedData.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  Mostrando 10 de {allProcessedData.length} registros totales
                </p>
              )}

              <Button
                onClick={handleDownload}
                className="w-full"
                size="lg"
                disabled={allProcessedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Archivo Procesado ({allProcessedData.length} registros)
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </main>
  );
}

