@echo off
REM Script to copy data files from the Processing version to the web version (Windows)

set SOURCE_DIR=..\conv_visualizer\visualizer\data
set DEST_DIR=.\data

if not exist "%SOURCE_DIR%" (
    echo Error: Source directory %SOURCE_DIR% does not exist
    exit /b 1
)

if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"

echo Copying data files...
copy "%SOURCE_DIR%\*.txt" "%DEST_DIR%\" >nul

echo Data files copied to %DEST_DIR%
