#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

# Check that we are in desired directory
if [ "${PWD##*/}" != "DIST" ]; then
   echo "${SCRIPT}: ERROR: this script must be from from PropV2-Shared/.../DIST folder! Aborted"
   exit 1;
fi

dmg_src_folder="_unzipped/macos"

# add notarize steps here
current_dmg=${dmg_src_folder}/macos-arm64.dmg
(set -x;xcrun notarytool submit ${current_dmg} --keychain-profile "pnut-ts-notary" --wait)
echo "${SCRIPT}: Hint: run 'staple'  when this command completes successfully"
echo "" # blank line
echo "xcrun stapler staple ${current_dmg}"
echo "xcrun stapler validate ${current_dmg}"
echo "# to check log do:"
echo "xcrun notarytool log '<submission-id>' --keychain-profile \"pnut-ts-notary\""
