<?php

namespace App\Services;

use RuntimeException;

class ChromePdfService
{
    public function renderViewToPdf(string $view, array $data): string
    {
        $html = view($view, $data)->render();

        return $this->renderHtmlToPdf($html);
    }

    public function renderHtmlToPdf(string $html): string
    {
        $chromeBinary = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

        if (!is_file($chromeBinary)) {
            throw new RuntimeException('Google Chrome binary not found for PDF rendering.');
        }

        $htmlPath = tempnam(sys_get_temp_dir(), 'invoice-html-');
        $pdfPath = tempnam(sys_get_temp_dir(), 'invoice-pdf-');

        if ($htmlPath === false || $pdfPath === false) {
            throw new RuntimeException('Unable to create temporary files for PDF rendering.');
        }

        $htmlPath .= '.html';
        $pdfPath .= '.pdf';

        if (file_put_contents($htmlPath, $html) === false) {
            @unlink($htmlPath);
            @unlink($pdfPath);
            throw new RuntimeException('Unable to write temporary HTML file for PDF rendering.');
        }

        $fileUrl = 'file://' . $htmlPath;

        $command = escapeshellarg($chromeBinary)
            . ' --headless=new'
            . ' --disable-gpu'
            . ' --no-sandbox'
            . ' --print-to-pdf=' . escapeshellarg($pdfPath)
            . ' ' . escapeshellarg($fileUrl)
            . ' 2>&1';

        exec($command, $output, $exitCode);

        if ($exitCode !== 0 || !is_file($pdfPath)) {
            @unlink($htmlPath);
            @unlink($pdfPath);
            throw new RuntimeException('Chrome PDF rendering failed: ' . implode("\n", $output));
        }

        $pdf = file_get_contents($pdfPath);

        @unlink($htmlPath);
        @unlink($pdfPath);

        if ($pdf === false) {
            throw new RuntimeException('Unable to read generated PDF file.');
        }

        return $pdf;
    }
}
