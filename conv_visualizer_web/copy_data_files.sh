#!/bin/bash
# Script to copy data files from the Processing version to the web version

SOURCE_DIR="../conv_visualizer/visualizer/data"
DEST_DIR="./data"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory $SOURCE_DIR does not exist"
    exit 1
fi

mkdir -p "$DEST_DIR"

echo "Copying data files..."
cp "$SOURCE_DIR"/*.txt "$DEST_DIR/" 2>/dev/null || echo "Some files may not have been copied"

echo "Data files copied to $DEST_DIR"
