#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

# Check that we are in desired directory
if [ "${PWD##*/}" != "DIST" ]; then
   echo "${SCRIPT}: ERROR: this script must be from from PropV2-Shared/.../DIST folder! Aborted"
   exit 1;
fi


# =============================================================================
# Usage info
#
show_help() {
	# takes $1 as as desired exit code
ERROR_LEVEL=$1
cat  >&2 << EOF

Usage: ${SCRIPT} [-dhv] {buildVersion}

 $SCRIPT v${SCRIPT_VERSION} compress our raw package folders into .zip files

where:
    -h          Display this (h)elp and exit
    -d          Enable script-(d)ebug output
    -v          Enable (v)erbose mode. Can be used multiple times for increased
                 verbosity.

    {buildVersion}  is XXYYZZ, where XX is the major version, YY is the minor version,
                    and ZZ is the patch version. For example, 014302 is
                    version 1.43.2.

Typical Use Cases:

	${SCRIPT}      		            # generate the pnut_ts .zip files
	${SCRIPT} -h     		    # display this help text

EOF
	exit ${ERROR_LEVEL}
}


# =============================================================================
#  Simple message printing functions
#
warningMessage () {
# takes $1 as message text
	MESSAGE=$1
	echo "${SCRIPT}:WARNING- ${MESSAGE}" >&2
}

infoMessage () {
# takes $1 as message text
	MESSAGE=$1
	echo "${SCRIPT}:INFO- ${MESSAGE}" >&2
}

errorMessage () {
# takes $1 as message text
	MESSAGE=$1
	echo "${SCRIPT}:ERROR- ${MESSAGE}" >&2
}

fatalMessage () {
# takes $1 as message text and $2 as exit code
	MESSAGE=$1
	ERROR_LEVEL=$2
	errorMessage "${MESSAGE}"
	exit ${ERROR_LEVEL}
}

debugMessage () {
# takes $1 as message text and (optional) $2 as gating debug level
#  ONLY displays message if DEBUG is enabled
## TODO add gating level logic
	MESSAGE=$1
	GATING_LEVEL=$2
	if [ -n "${DEBUG}" ]; then
		echo "${SCRIPT}(DBG): ${MESSAGE}" >&2
	fi
}

progressMessage () {
# takes $1 as message text
	MESSAGE=$1
	echo "${SCRIPT}: ${MESSAGE}"
}

verboseMessage () {
# takes $1 as message text and $2 as gating verbose level
#   if gating <= current then display message
## TODO add gating level logic
	MESSAGE=$1
	GATING_LEVEL=$2
	#echo "${SCRIPT}:Verbose(${GATING_LEVEL})- ${MESSAGE}" >&2

	if [ ${VERBOSE_LEVEL} -gt 0 ]; then
		echo "${SCRIPT}:Verbose- ${MESSAGE}" >&2
	fi
}



# =============================================================================
# Initialize our variables
#
export DEBUG=""
export DEBUG_LEVEL=0
export VERBOSE_LEVEL=0

# =============================================================================
#  Process the command line arguments
#
OPTIND=1 # Reset is necessary if getopts was used previously in the script.  It is a good idea to make this local in a function.
while getopts "hdv" opt; do
    case "$opt" in
        h)
            show_help 0
            ;;
        d)
        	  export DEBUG_LEVEL=$((DEBUG_LEVEL+1))
        	  export DEBUG=yes
        	  if [ ${DEBUG_LEVEL} -eq 1 ]; then
        	  	# when first setting debug set this too
        	  	export VERBOSE_LEVEL=$((VERBOSE_LEVEL+1))
        	  fi
            ;;
        v)
        	  export VERBOSE_LEVEL=$((VERBOSE_LEVEL+1))
        	  debugMessage "verbose set to ${VERBOSE_LEVEL}!"
            ;;
        '?')
        	  echo "$SCRIPT: Question Mark!" >&2
            show_help 0
            ;;
    esac
done

shift "$((OPTIND-1))" # Shift off the options and optional --.

BUILD_VERSION=$1

# =============================================================================
#  final checks and setup before execution
#

# Validate that BUILD_VERSION is a 6-digit decimal number
if [[ ! "$BUILD_VERSION" =~ ^[0-9]{6}$ ]]; then
    fatalMessage "BUILD_VERSION must be a 6-digit decimal number" 1
fi

export DATETIME=`date +%y%m%d%H%m`
debugMessage "date=[${DATETIME}]"

# zip command: ditto -ck --norsrc pnut_ts linux-x64.zip

# The zip_folder_contents function takes a folder path and an output zip file name, then zips the contents of the folder.
# The script defines an array base_dirs containing the base directories linux, macos, and win.
# It loops through each base directory, finds the two subfolders, and zips their contents.
# Error handling is included to check if directories exist and if the expected number of subfolders is found.

# Function to zip the contents of a folder
zip_folder_contents() {
    local folder_path=$1
    local output_zip=$2

    if [ -d "$folder_path" ]; then
        verboseMessage "Zipping contents of $folder_path into $output_zip"
        ditto -ck --norsrc "$folder_path" "$output_zip"
    else
        warningMessage "Folder $folder_path does not exist"
    fi
}

# Base directories
base_dirs=("_unzipped/linux" "_unzipped/macos" "_unzipped/win")
out_dir="_UPLOAD"
mkdir -p "$out_dir"

# Loop through each base directory
for base_dir in "${base_dirs[@]}"; do
    if [ -d "$base_dir" ]; then
        progressMessage "Processing base directory: $base_dir"

        # Locate the two folders within the base directory
        subfolders=($(find "$base_dir" -mindepth 1 -maxdepth 1 -type d))

        if [ ${#subfolders[@]} -eq 2 ]; then
            for subfolder in "${subfolders[@]}"; do
                folder_name=$(basename "$subfolder")
                output_zip="${out_dir}/pnut-ts-${folder_name}-${BUILD_VERSION}.zip"

                # Zip the contents of the folder
                zip_folder_contents "$subfolder" "$output_zip"
            done
        else
            warningMessage "Expected 2 subfolders in $base_dir, found ${#subfolders[@]}"
        fi
    else
        warningMessage "Base directory $base_dir does not exist"
    fi
done
