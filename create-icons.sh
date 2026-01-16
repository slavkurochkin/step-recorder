#!/bin/bash
# Simple script to create placeholder icons using ImageMagick if available
# Or you can use the generate-icons.html file in a browser

if command -v convert &> /dev/null; then
  convert -size 16x16 xc:#2196F3 -fill white -draw "circle 8,8 8,3" -fill "#F44336" -draw "circle 8,8 8,5" icon16.png
  convert -size 48x48 xc:#2196F3 -fill white -draw "circle 24,24 24,9" -fill "#F44336" -draw "circle 24,24 24,15" icon48.png
  convert -size 128x128 xc:#2196F3 -fill white -draw "circle 64,64 64,24" -fill "#F44336" -draw "circle 64,64 64,40" icon128.png
  echo "Icons created successfully!"
else
  echo "ImageMagick not found. Please:"
  echo "1. Install ImageMagick, or"
  echo "2. Open generate-icons.html in your browser and save the icons manually"
fi
