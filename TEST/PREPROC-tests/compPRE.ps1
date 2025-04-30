
# This is a PowerShell script
Write-Output ""  # one blank line at start

# Cleanup section: Remove specified files before compiling
Remove-Item -Force -ErrorAction SilentlyContinue *__pre.spin2, *.obj, *.bin, *.lst, *.GOLD

Get-ChildItem -Filter *.spin2 | ForEach-Object {
        $fileName = $_.Name
        #Write-Output "Processing file: $fileName"

        # Skip any *__pre.spin2 files
        if ($fileName -like "*__pre.spin2") {
                #Write-Output "Skipping file: $fileName"
                return
        }
        # Skip include.spin2 file (we can't test #include on PNut)
        if ($fileName -like "include.spin2") {
                #Write-Output "Skipping file: $fileName"
                return
        }
        # Skip condNestCodeCmdLn.spin2 file (we can't test #error on PNut)
        if ($fileName -like "condNestCodeCmdLn.spin2") {
                #Write-Output "Skipping file: $fileName"
                return
        }
        # NOTE: in this suite of tests, no DEBUG compiles are needed
        if ($fileName -like "demo*") {
                # Compile demo_* files with different switches
                & PNut_shell_v51 -cd $fileName > $null 2>&1
        }
        else {
                # Compile other files with the default switch
                & PNut_shell_v51 -c $fileName > $null 2>&1
        }

        # Output the contents of Error.txt
        if (Test-Path Error.txt) {
                $errorContent = Get-Content Error.txt -Raw
                Write-Output "* $fileName -- $errorContent"
                #Write-Output ""
        }
        else {
                Write-Output "Error.txt not found."
        }
}
Write-Output "All files processed."
