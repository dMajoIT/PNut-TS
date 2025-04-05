@echo off
for %%f in (*.spin2) do (
    echo Processing file: %%f
    if /i "%%~nf"=="isp_" (
        PNut_shell_v51 -cd %%f
    ) else if /i "%%~nf"=="debug_" (
        PNut_shell_v51 -cd %%f
    ) else (
        PNut_shell_v51 -c %%f
    )
    type Error.txt | findstr /i "okay" >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Issue found while processing %%f
        echo --- Error.txt content ---
        type Error.txt
        echo -------------------------
    )
)
echo All files processed.
