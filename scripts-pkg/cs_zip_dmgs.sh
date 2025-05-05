#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

# Check that we are in desired directory
if [ "${PWD##*/}" != "DIST" ]; then
   echo "${SCRIPT}: ERROR: this script must be from from PropV2-Shared/.../DIST folder! Aborted"
   exit 1;
fi

arm64_dmg="_unzipped/macos/macos-arm64.dmg"
x64_dmg="_unzipped/macos/macos-x64.dmg"
arm64_zip="_UPLOAD/macos-arm64.zip"
x64_zip="_UPLOAD/macos-x64.zip"

(set -x;ditto -ck --norsrc "$arm64_dmg" "$arm64_zip")
(set -x;ditto -ck --norsrc "$x64_dmg" "$x64_zip")
