#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# If any command in a pipeline fails, that return code is used as the return code of the whole pipeline.
set -o pipefail

# --- Configuration ---
# Repository URL for gh-pages deployment
REPO_URL="git@github.com:NewHumanity/Billetto-Dashboard.git"
# Directory to deploy
DIST_DIR="dist"
# Path to vite.config.ts
VITE_CONFIG_PATH="./vite.config.ts"
# Path to the index.html file in the dist directory
DIST_INDEX_HTML="${DIST_DIR}/index.html"

# Define the base path directly in the script
BASE_PATH="/Billetto-Dashboard/"

echo "--- Starting Billetto Dashboard Deployment ---"

# --- Step 1: Check for gh-pages dependency ---
echo "Checking for gh-pages CLI..."

# Directly construct the path to gh-pages executable
GH_PAGES_BIN="./node_modules/.bin/gh-pages"

if [ ! -f "${GH_PAGES_BIN}" ]; then
    echo "gh-pages CLI not found at ${GH_PAGES_BIN}. Please install it as a dev dependency:"
    echo "  npm install --save-dev gh-pages"
    exit 1
fi
echo "gh-pages CLI found."

# --- Step 2: Update vite.config.ts with the defined BASE_PATH ---
echo "Updating 'base' field in ${VITE_CONFIG_PATH} to: ${BASE_PATH}"

# Check if 'base:' field already exists in vite.config.ts
if grep -q "base:" "${VITE_CONFIG_PATH}"; then
    echo "'base' field found, updating its value."
    # Update existing 'base' field using sed
    sed -i '' "s|base:\s*'[^']*'|base: '${BASE_PATH}'|g" "${VITE_CONFIG_PATH}"
else
    echo "'base' field not found, adding it using awk."
    # Add 'base' field after 'return {' using awk
    awk -v base_path="${BASE_PATH}" '1; /return {/ && !x { print "      base: \047" base_path "\047,"; x=1 }' "${VITE_CONFIG_PATH}" > temp_vite_config.ts
    # echo "Content of temp_vite_config.ts:"
    # cat temp_vite_config.ts
    mv temp_vite_config.ts "${VITE_CONFIG_PATH}"
fi

echo "'base' field in vite.config.ts updated."

# --- Step 3: Build the project ---
echo "Building the Vite project..."
# Use the explicit vite build command from node_modules/.bin/
./node_modules/.bin/vite build && touch "${DIST_DIR}/.nojekyll"

echo "Project built successfully."

# --- Step 4: Update the base meta tag in index.html ---
echo "Updating <base> tag in ${DIST_INDEX_HTML}..."

# DEBUG: Print content of index.html before sed
# echo "Content of ${DIST_INDEX_HTML} before sed:"
# cat "${DIST_INDEX_HTML}"

# Use sed to replace the existing <base href="..."> with the extracted BASE_PATH
# This assumes there's only one <base> tag and it has an href attribute.
# The regex now explicitly handles and removes any leading whitespace within the href.
sed -i '' "s|<base href=\"[^\"]*\"[[:space:]]*/>|<base href=\"${BASE_PATH}\" />|g" "${DIST_INDEX_HTML}"

echo "<base> tag updated to: <base href=\"${BASE_PATH}\" />"

# --- Step 5: Deploy to GitHub Pages ---
echo "Deploying to GitHub Pages..."
"${GH_PAGES_BIN}" -d "${DIST_DIR}" --repo "${REPO_URL}"

echo "Deployment to GitHub Pages completed successfully!"
echo "--- Billetto Dashboard Deployment Finished ---"