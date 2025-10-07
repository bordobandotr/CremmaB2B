#!/bin/bash

# Find all HTML files with a sidebar
files=$(find . -name "*.html" -type f -exec grep -l "class=\"sidebar\"" {} \;)

# Loop through each file
for file in $files; do
  # Check if the file already includes sidebar-toggle.js
  if ! grep -q "sidebar-toggle.js" "$file"; then
    # Find the line with orientation.js
    if grep -q "orientation.js" "$file"; then
      # Add sidebar-toggle.js after orientation.js
      sed -i '' '/orientation.js/a\\
    <script src="js/sidebar-toggle.js"></script>' "$file"
      echo "Added sidebar-toggle.js to $file"
    # If orientation.js doesn't exist, look for sidebar-user.js
    elif grep -q "sidebar-user.js" "$file"; then
      # Add sidebar-toggle.js after sidebar-user.js
      sed -i '' '/sidebar-user.js/a\\
    <script src="js/sidebar-toggle.js"></script>' "$file"
      echo "Added sidebar-toggle.js to $file"
    # If sidebar-user.js doesn't exist, look for nav-menu.js
    elif grep -q "nav-menu.js" "$file"; then
      # Add sidebar-toggle.js after nav-menu.js
      sed -i '' '/nav-menu.js/a\\
    <script src="js/sidebar-toggle.js"></script>' "$file"
      echo "Added sidebar-toggle.js to $file"
    # If none of the above, add it before </head>
    else
      sed -i '' '/<\/head>/i\\
    <script src="js/sidebar-toggle.js"></script>' "$file"
      echo "Added sidebar-toggle.js to $file"
    fi
  else
    echo "sidebar-toggle.js already exists in $file"
  fi
done

echo "Done! Sidebar toggle script has been added to all HTML files with a sidebar." 