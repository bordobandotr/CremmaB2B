#!/usr/bin/env python3
import os
import re

def add_datatable_helper_script(html_file):
    """Add datatable-helper.js script to HTML files that use DataTables"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if file already has datatable-helper.js
    if 'datatable-helper.js' in content:
        print(f"Skipping {html_file} - already has datatable-helper.js")
        return
    
    # Check if the file uses DataTables
    if 'DataTable' not in content and 'datatables' not in content.lower():
        print(f"Skipping {html_file} - no DataTables usage found")
        return
    
    # Find position to add the script - after the last script before </body> tag
    script_tags = re.findall(r'<script.*?</script>', content, re.DOTALL)
    
    if not script_tags:
        print(f"No script tags found in {html_file}")
        return
    
    # Get the last script tag before </body>
    body_close_pos = content.rfind('</body>')
    
    if body_close_pos == -1:
        print(f"No </body> tag found in {html_file}")
        return
    
    # Find the position of the last script before </body>
    last_script_pos = -1
    for match in re.finditer(r'<script.*?</script>', content, re.DOTALL):
        if match.end() < body_close_pos and match.end() > last_script_pos:
            last_script_pos = match.end()
    
    if last_script_pos == -1:
        print(f"No suitable position found to add script in {html_file}")
        return
    
    # Add our script after the last script tag
    new_content = content[:last_script_pos] + '\n    <script src="js/datatable-helper.js"></script>' + content[last_script_pos:]
    
    # Write updated content
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Added datatable-helper.js to {html_file}")

def main():
    # Walk through directory structure
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.html'):
                add_datatable_helper_script(os.path.join(root, file))

if __name__ == "__main__":
    main()
    print("Done! DataTable helper script has been added to all HTML files with DataTables.") 