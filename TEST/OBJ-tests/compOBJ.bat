@echo off
for %%f in (*.spin2) do (
    echo Processing file: %%f
    PNut_shell_v51 -c %%f
    findstr /i "okay" Error.txt >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Issue found while processing %%f
        echo --- Error.txt content ---
        type Error.txt
        echo -------------------------
    )
)
echo All files processed.
