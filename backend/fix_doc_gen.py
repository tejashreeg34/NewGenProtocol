import re
import os

filepath = r"c:\Users\2000171694\Downloads\generator (2)\generator\backend\document_generator.py"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = 0
for i, line in enumerate(lines):
    if skip > 0:
        skip -= 1
        continue
    
    # Replacement for create_synopsis_section primary objectives
    if 'for p in obj[\'primary\']:' in line and 'doc.add_paragraph(strip_html_tags(str(p)), style=\'BulletList\')' in lines[i+1]:
        new_lines.append('            for p_text in obj[\'primary\']:\n')
        new_lines.append('                p = doc.add_paragraph(style=\'BulletList\')\n')
        new_lines.append('                add_html_to_paragraph(p, p_text)\n')
        skip = 1
    # Replacement for create_synopsis_section primary endpoints
    elif 'for p in end[\'primary\']:' in line and 'doc.add_paragraph(strip_html_tags(str(p)), style=\'BulletList\')' in lines[i+1]:
        new_lines.append('            for p_text in end[\'primary\']:\n')
        new_lines.append('                p = doc.add_paragraph(style=\'BulletList\')\n')
        new_lines.append('                add_html_to_paragraph(p, p_text)\n')
        skip = 1
    # Replacement for gcp_statement
    elif 'if details.get(\'gcp_statement\'):' in line and 'doc.add_paragraph(strip_html_tags(details[\'gcp_statement\']), style=\'NormalText\')' in lines[i+2]:
        new_lines.append('    if details.get(\'gcp_statement\'):\n')
        new_lines.append('        doc.add_heading(\'GCP Statement\', level=2)\n')
        new_lines.append('        p = doc.add_paragraph(style=\'NormalText\')\n')
        new_lines.append('        add_html_to_paragraph(p, details[\'gcp_statement\'])\n')
        skip = 2
    # Replacement for approval_statement
    elif 'if details.get(\'approval_statement\'):' in line and 'doc.add_paragraph(strip_html_tags(details[\'approval_statement\']), style=\'NormalText\')' in lines[i+2]:
        new_lines.append('    if details.get(\'approval_statement\'):\n')
        new_lines.append('        doc.add_heading(\'Approval Statement\', level=2)\n')
        new_lines.append('        p = doc.add_paragraph(style=\'NormalText\')\n')
        new_lines.append('        add_html_to_paragraph(p, details[\'approval_statement\'])\n')
        skip = 2
    # Replacement for sections 2-11 main content
    elif 'doc.add_paragraph(content, style=\'NormalText\')' in line:
        indent = line[:line.find('doc.add_paragraph')]
        new_lines.append(f'{indent}p = doc.add_paragraph(style=\'NormalText\')\n')
        new_lines.append(f'{indent}add_html_to_paragraph(p, content)\n')
    # Cleanup strip_html_tags in sponsor reps
    elif 'p_name.add_run(strip_html_tags(rep.get(\'name\', \'\')))' in line:
        indent = line[:line.find('p_name.add_run')]
        new_lines.append(f'{indent}add_html_to_paragraph(p_name, rep.get(\'name\', \'\'))\n')
    elif 'p_title.add_run(strip_html_tags(rep.get(\'title\', \'\')))' in line:
        indent = line[:line.find('p_title.add_run')]
        new_lines.append(f'{indent}add_html_to_paragraph(p_title, rep.get(\'title\', \'\'))\n')
    elif 'p_org.add_run(strip_html_tags(rep.get(\'organization\', \'\')))' in line:
        indent = line[:line.find('p_org.add_run')]
        new_lines.append(f'{indent}add_html_to_paragraph(p_org, rep.get(\'organization\', \'\'))\n')
    elif 'p_date.add_run(strip_html_tags(rep.get(\'date\', \'\')))' in line:
        indent = line[:line.find('p_date.add_run')]
        new_lines.append(f'{indent}add_html_to_paragraph(p_date, rep.get(\'date\', \'\'))\n')
    # Replacement for investigator agreement
    elif 'p_inv.add_run(strip_html_tags(agree.get(\'name\', \'\')))' in line:
        indent = line[:line.find('p_inv.add_run')]
        new_lines.append(f'{indent}add_html_to_paragraph(p_inv, agree.get(\'name\', \'\'))\n')
    # Sections 4-11 main content
    elif 'doc.add_paragraph(sections[section_key][\'main\'], style=\'NormalText\')' in line:
        indent = line[:line.find('doc.add_paragraph')]
        new_lines.append(f'{indent}p = doc.add_paragraph(style=\'NormalText\')\n')
        new_lines.append(f'{indent}add_html_to_paragraph(p, sections[section_key][\'main\'])\n')
    # Subsection content
    elif 'doc.add_paragraph(content, style=\'NormalText\')' in line: # Already handled above but let's be safe
        pass 
    elif 'doc.add_paragraph(sub_content, style=\'NormalText\')' in line:
        indent = line[:line.find('doc.add_paragraph')]
        new_lines.append(f'{indent}p = doc.add_paragraph(style=\'NormalText\')\n')
        new_lines.append(f'{indent}add_html_to_paragraph(p, sub_content)\n')
    else:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Replacement successful")
