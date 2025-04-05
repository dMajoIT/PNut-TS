@echo off
@for %%f in (*.spin2) do (
    @echo Processing file: %%f
    @if /i "%%~nf"=="flash_fs_demo" (
        PNut_shell_v51 -cd %%f
    ) else (
        PNut_shell_v51 -c %%f
    )
    @type Error.txt | findstr /i "okay" >nul 2>&1
)
echo All files processed.
