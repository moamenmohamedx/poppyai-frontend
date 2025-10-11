# PowerShell script to convert all markdown chapters to PDF using Pandoc
# Prerequisites: Install Pandoc from https://pandoc.org/installing.html

Write-Host "🚀 Converting Frontend Learning Materials to PDF..." -ForegroundColor Cyan
Write-Host ""

# Check if Pandoc is installed
$pandocInstalled = Get-Command pandoc -ErrorAction SilentlyContinue

if (-not $pandocInstalled) {
    Write-Host "❌ Error: Pandoc is not installed." -ForegroundColor Red
    Write-Host "Please install Pandoc from: https://pandoc.org/installing.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "On Windows: Download and run the installer from https://pandoc.org/installing.html" -ForegroundColor Yellow
    Write-Host "Or use Chocolatey: choco install pandoc" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Pandoc found" -ForegroundColor Green
Write-Host ""

# Convert each chapter
Get-ChildItem -Path . -Filter "Chapter-*.md" | ForEach-Object {
    $inputFile = $_.Name
    $outputFile = $_.BaseName + ".pdf"
    
    Write-Host "📄 Converting: $inputFile → $outputFile" -ForegroundColor White
    
    # Try with full options
    pandoc $inputFile -o $outputFile `
        --pdf-engine=xelatex `
        -V geometry:margin=1in `
        -V fontsize=11pt `
        --toc `
        --toc-depth=2 `
        --highlight-style=tango `
        2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Success!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Warning: PDF engine may not be installed. Trying basic conversion..." -ForegroundColor Yellow
        pandoc $inputFile -o $outputFile 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Success (basic conversion)!" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Convert Quick Reference Guide
if (Test-Path "Quick-Reference-Guide.md") {
    Write-Host "📄 Converting: Quick-Reference-Guide.md → Quick-Reference-Guide.pdf" -ForegroundColor White
    
    pandoc "Quick-Reference-Guide.md" -o "Quick-Reference-Guide.pdf" `
        --pdf-engine=xelatex `
        -V geometry:margin=1in `
        -V fontsize=10pt `
        --highlight-style=tango `
        2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Success!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Warning: Using basic conversion..." -ForegroundColor Yellow
        pandoc "Quick-Reference-Guide.md" -o "Quick-Reference-Guide.pdf" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Success (basic conversion)!" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed" -ForegroundColor Red
        }
    }
    Write-Host ""
}

Write-Host "🎉 Conversion complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "PDF files created in the current directory." -ForegroundColor White
Write-Host "If you see warnings about PDF engine, you may need to install:" -ForegroundColor Yellow
Write-Host "  - MiKTeX: https://miktex.org/download" -ForegroundColor Yellow
Write-Host "  - Or use basic conversion (limited formatting)" -ForegroundColor Yellow

