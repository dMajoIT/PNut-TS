@echo off
@for %%f in (*.spin2) do (
    @echo Processing file: %%f
    @PNut_shell_v51 -cd %%f
    @type Error.txt | findstr /i "okay" >nul 2>&1
)
echo All files processed.
