#!/bin/bash

# Script to convert all markdown chapters to PDF using Pandoc
# Prerequisites: Install Pandoc from https://pandoc.org/installing.html

echo "🚀 Converting Frontend Learning Materials to PDF..."
echo ""

# Check if Pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "❌ Error: Pandoc is not installed."
    echo "Please install Pandoc from: https://pandoc.org/installing.html"
    echo ""
    echo "On macOS: brew install pandoc"
    echo "On Ubuntu: sudo apt-get install pandoc"
    echo "On Windows: Download from https://pandoc.org/installing.html"
    exit 1
fi

echo "✅ Pandoc found"
echo ""

# Convert each chapter
for file in Chapter-*.md; do
    if [ -f "$file" ]; then
        output="${file%.md}.pdf"
        echo "📄 Converting: $file → $output"
        
        pandoc "$file" -o "$output" \
            --pdf-engine=xelatex \
            -V geometry:margin=1in \
            -V fontsize=11pt \
            --toc \
            --toc-depth=2 \
            --highlight-style=tango \
            2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "   ✅ Success!"
        else
            echo "   ⚠️  Warning: PDF engine may not be installed. Trying without TOC..."
            pandoc "$file" -o "$output" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo "   ✅ Success (basic conversion)!"
            else
                echo "   ❌ Failed"
            fi
        fi
        echo ""
    fi
done

# Convert Quick Reference Guide
if [ -f "Quick-Reference-Guide.md" ]; then
    echo "📄 Converting: Quick-Reference-Guide.md → Quick-Reference-Guide.pdf"
    pandoc "Quick-Reference-Guide.md" -o "Quick-Reference-Guide.pdf" \
        --pdf-engine=xelatex \
        -V geometry:margin=1in \
        -V fontsize=10pt \
        --highlight-style=tango \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Success!"
    else
        echo "   ⚠️  Warning: Using basic conversion..."
        pandoc "Quick-Reference-Guide.md" -o "Quick-Reference-Guide.pdf" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "   ✅ Success (basic conversion)!"
        else
            echo "   ❌ Failed"
        fi
    fi
    echo ""
fi

echo "🎉 Conversion complete!"
echo ""
echo "PDF files created in the current directory."
echo "If you see warnings about PDF engine, you may need to install:"
echo "  - MacTeX (macOS): brew install --cask mactex"
echo "  - TeX Live (Linux): sudo apt-get install texlive-xetex"
echo "  - MiKTeX (Windows): https://miktex.org/download"

