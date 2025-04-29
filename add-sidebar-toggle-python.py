#!/usr/bin/env python3
import os
import re

def add_sidebar_toggle_script(html_file):
    """Add sidebar-toggle.js script to an HTML file if it has a sidebar"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if file already has sidebar-toggle.js
    if 'sidebar-toggle.js' in content:
        print(f"Skipping {html_file} - already has sidebar-toggle.js")
        return
    
    # Check if file has a sidebar
    if 'class="sidebar"' not in content:
        print(f"Skipping {html_file} - no sidebar found")
        return
    
    # Location patterns to add the script
    orientation_pattern = r'(<script\s+src="js/orientation\.js"></script>)'
    sidebar_user_pattern = r'(<script\s+src="js/sidebar-user\.js"></script>)'
    nav_menu_pattern = r'(<script\s+src="js/nav-menu\.js"></script>)'
    head_pattern = r'(</head>)'
    
    # Replacement with our script
    toggle_script = r'\1\n    <script src="js/sidebar-toggle.js"></script>'
    toggle_script_head = r'    <script src="js/sidebar-toggle.js"></script>\n\1'
    
    # Try to add after orientation.js first
    new_content = re.sub(orientation_pattern, toggle_script, content)
    if new_content == content:
        # Try to add after sidebar-user.js
        new_content = re.sub(sidebar_user_pattern, toggle_script, content)
        if new_content == content:
            # Try to add after nav-menu.js
            new_content = re.sub(nav_menu_pattern, toggle_script, content)
            if new_content == content:
                # Last resort: add before </head>
                new_content = re.sub(head_pattern, toggle_script_head, content)
    
    # Only write if we actually made a change
    if new_content != content:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Added sidebar-toggle.js to {html_file}")
    else:
        print(f"Couldn't add sidebar-toggle.js to {html_file}")

def main():
    # Walk through directory structure
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.html'):
                add_sidebar_toggle_script(os.path.join(root, file))

if __name__ == "__main__":
    main()
    print("Done! Sidebar toggle script has been processed for all HTML files.") 