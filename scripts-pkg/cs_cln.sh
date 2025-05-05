#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

# Check that we are in desired directory
if [ "${PWD##*/}" != "DIST" ]; then
   echo "${SCRIPT}: ERROR: this script must be from from PropV2-Shared/.../DIST folder! Aborted"
   exit 1;
fi

upload_dir="_UPLOAD"
unzipped_dir="_unzipped"

# Prompt the user for confirmation
read -p "Are you sure you want to remove the output files? [Y/N] (default: N): " confirm
confirm=${confirm:-N} # Default to 'N' if no input is provided

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

(set -x; rm -f ${upload_dir}/*)
(set -x; rm -rf ${unzipped_dir}/*/*)
