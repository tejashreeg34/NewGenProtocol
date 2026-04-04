import re
import os

filepath = r"c:\Users\2000171694\Downloads\generator (2)\generator\backend\pdf_generator.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Paragraph(sanitize_pdf_text(strip_html_tags(X)), styles[...]) 
# with Paragraph(sanitize_pdf_text(X), styles[...])
# for fields that might contain HTML
content = content.replace("Paragraph(sanitize_pdf_text(strip_html_tags(details['gcp_statement'])), styles['PDFNormal'])", 
                          "Paragraph(sanitize_pdf_text(details['gcp_statement']), styles['PDFNormal'])")

content = content.replace("Paragraph(sanitize_pdf_text(strip_html_tags(details['approval_statement'])), styles['PDFNormal'])", 
                          "Paragraph(sanitize_pdf_text(details['approval_statement']), styles['PDFNormal'])")

# In create_approval_section_pdf, the sponsor reps
content = re.sub(r"Paragraph\(f\"<b>Name:</b> {sanitize_pdf_text\(strip_html_tags\(rep\.get\('name', ''\)\)\)}\", styles\['PDFNormal'\]\)",
                 r"Paragraph(f\"<b>Name:</b> {sanitize_pdf_text(rep.get('name', ''))}\", styles['PDFNormal'])", content)

content = re.sub(r"Paragraph\(f\"<b>Title:</b> {sanitize_pdf_text\(strip_html_tags\(rep\.get\('title', ''\)\)\)}\", styles\['PDFNormal'\]\)",
                 r"Paragraph(f\"<b>Title:</b> {sanitize_pdf_text(rep.get('title', ''))}\", styles['PDFNormal'])", content)

content = re.sub(r"Paragraph\(f\"<b>Organization:</b> {sanitize_pdf_text\(strip_html_tags\(rep\.get\('organization', ''\)\)\)}\", styles\['PDFNormal'\]\)",
                 r"Paragraph(f\"<b>Organization:</b> {sanitize_pdf_text(rep.get('organization', ''))}\", styles['PDFNormal'])", content)

content = re.sub(r"Paragraph\(f\"<b>Date:</b> {sanitize_pdf_text\(strip_html_tags\(rep\.get\('date', ''\)\)\)}\", styles\['PDFNormal'\]\)",
                 r"Paragraph(f\"<b>Date:</b> {sanitize_pdf_text(rep.get('date', ''))}\", styles['PDFNormal'])", content)

# Investigator agreement
content = re.sub(r"Paragraph\(sanitize_pdf_text\(strip_html_tags\(agree\.get\('description', ''\)\)\), styles\['PDFNormal'\]\)",
                 r"Paragraph(sanitize_pdf_text(agree.get('description', '')), styles['PDFNormal'])", content)

content = re.sub(r"Paragraph\(f\"<b>Investigator Name:</b> {sanitize_pdf_text\(strip_html_tags\(agree\.get\('name', ''\)\)\)}\", styles\['PDFNormal'\]\)",
                 r"Paragraph(f\"<b>Investigator Name:</b> {sanitize_pdf_text(agree.get('name', ''))}\", styles['PDFNormal'])", content)

# Main Section Content in generate_pdf_document (using re search to handle the loop structure)
# Finding: if sec_data.get('main'): story.append(Paragraph(sanitize_pdf_text(sec_data['main']), styles['PDFNormal']))
# Wait, let's look at line 528 in pdf_generator.py from Step 585:
# 528:                 if sec_data.get('main'): story.append(Paragraph(sanitize_pdf_text(sec_data['main']), styles['PDFNormal']))
# It ALREADY DOES NOT have strip_html_tags for main content! NICE!

# Let's check subsections though (line 532 and 547)
# 532:                         if sub.get('content'): story.append(Paragraph(sanitize_pdf_text(sub['content']), styles['PDFNormal']))
# 547:                             if sub.get('content'): story.append(Paragraph(sanitize_pdf_text(sub['content']), styles['PDFNormal']))
# These ALSO don't have strip_html_tags!

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("PDF Replacement successful")
