from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem, Image
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io
import os
import json
import base64
import re
from datetime import datetime
from PIL import Image as PILImage
import re

def strip_html_tags(text):
    """Remove HTML tags from a string"""
    if not isinstance(text, str):
        return str(text)
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

# Define the standard structure for sections
TEMPLATE_STRUCTURE = [
    {
        "id": 1,
        "title": "PROTOCOL SUMMARY",
        "subsections": ["Synopsis", "Schema", "Schedule of Activities (SoA)"]
    },
    {
        "id": 2,
        "title": "INTRODUCTION",
        "subsections": [
            "Study Rationale", "Background", "Risk/Benefit Assessment",
            "Known Potential Risks", "Known Potential Benefits", "Assessment of Potential Risks and Benefits"
        ]
    },
    {"id": 3, "title": "OBJECTIVES AND ENDPOINTS", "subsections": []},
    {
        "id": 4,
        "title": "STUDY DESIGN",
        "subsections": [
            "Overall Design", "Scientific Rationale for Study Design",
            "Justification for Dose", "End of Study Definition"
        ]
    },
    {
        "id": 5,
        "title": "STUDY POPULATION",
        "subsections": [
            "Inclusion Criteria", "Exclusion Criteria", "Lifestyle Considerations",
            "Screen Failures", "Strategies for Recruitment and Retention"
        ]
    },
    {
        "id": 6,
        "title": "STUDY INTERVENTION",
        "subsections": [
            "Study Intervention(s) Administration", "Study Intervention Description",
            "Dosing and Administration", "Preparation/Handling/Storage/Accountability",
            "Acquisition and accountability", "Formulation, Appearance, Packaging, and Labeling",
            "Product Storage and Stability", "Preparation", "Measures to Minimize Bias: Randomization and Blinding",
            "Study Intervention Compliance", "Concomitant Therapy", "Rescue Medicine"
        ]
    },
    {
        "id": 7,
        "title": "STUDY INTERVENTION DISCONTINUATION AND PARTICIPANT DISCONTINUATION/WITHDRAWAL",
        "subsections": [
            "Discontinuation of Study Intervention",
            "Participant Discontinuation/Withdrawal from the Study",
            "Lost to Follow-Up"
        ]
    },
    {
        "id": 8,
        "title": "STUDY ASSESSMENTS AND PROCEDURES",
        "subsections": [
            "Efficacy Assessments", "Safety and Other Assessments",
            "Adverse Events and Serious Adverse Events", "Definition of Adverse Events (AE)",
            "Definition of Serious Adverse Events (SAE)", "Classification of an Adverse Event",
            "Time Period and Frequency for Event Assessment and Follow-Up",
            "Adverse Event Reporting", "Serious Adverse Event Reporting",
            "Reporting Events to Participants", "Events of Special Interest",
            "Reporting of Pregnancy", "Unanticipated Problems",
            "Definition of Unanticipated Problems (UP)", "Unanticipated Problem Reporting",
            "Reporting Unanticipated Problems to Participants"
        ]
    },
    {
        "id": 9,
        "title": "STATISTICAL CONSIDERATIONS",
        "subsections": [
            "Statistical Hypotheses", "Sample Size Determination", "Populations for Analyses",
            "Statistical Analyses", "General Approach", "Analysis of the Primary Efficacy Endpoint(s)",
            "Analysis of the Secondary Endpoint(s)", "Safety Analyses", "Baseline Descriptive Statistics",
            "Planned Interim Analyses", "Sub-Group Analyses", "Tabulation of Individual participant Data",
            "Exploratory Analyses"
        ]
    },
    {
        "id": 10,
        "title": "SUPPORTING DOCUMENTATION AND OPERATIONAL CONSIDERATIONS",
        "subsections": [
            "Regulatory, Ethical, and Study Oversight Considerations", "Informed Consent Process",
            "Study Discontinuation and Closure", "Confidentiality and Privacy",
            "Future Use of Stored Specimens and Data", "Key Roles and Study Governance",
            "Safety Oversight", "Clinical Monitoring", "Quality Assurance and Quality Control",
            "Data Handling and Record Keeping", "Protocol Deviations", "Publication and Data Sharing Policy",
            "Conflict of Interest Policy", "Additional Considerations", "Abbreviations",
            "Protocol Amendment History"
        ]
    },
    {"id": 11, "title": "REFERENCES", "subsections": []}
]

def get_image_from_data_url(data_url):
    """Convert base64 data URL to a bytes stream for ReportLab/docx"""
    if not data_url:
        return None
    if isinstance(data_url, str) and data_url.startswith('data:image/'):
        try:
            # Format: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
            header, encoded = data_url.split(",", 1)
            data = base64.b64decode(encoded)
            return io.BytesIO(data)
        except Exception:
            return None
    return None

def create_approval_section_pdf(protocol_data, styles, story):
    """Create the Protocol Approval & Agreement section for PDF"""
    approval_data = protocol_data.get('approval_data')
    if not approval_data or not approval_data.get('details'):
        return

    story.append(Paragraph("PROTOCOL APPROVAL & AGREEMENT", styles['PDFHeader1']))
    details = approval_data['details']
    
    table_data = [
        [sanitize_pdf_text("Protocol Name:"), sanitize_pdf_text(strip_html_tags(details.get('protocol_name', '')))],
        [sanitize_pdf_text("Protocol Number:"), sanitize_pdf_text(strip_html_tags(details.get('protocol_number', '')))],
        [sanitize_pdf_text("IMP:"), sanitize_pdf_text(strip_html_tags(details.get('imp', '')))],
        [sanitize_pdf_text("Indication:"), sanitize_pdf_text(strip_html_tags(details.get('indication', '')))],
        [sanitize_pdf_text("Clinical Phase:"), sanitize_pdf_text(strip_html_tags(details.get('clinical_phase', '')))],
        [sanitize_pdf_text("Investigators:"), sanitize_pdf_text(strip_html_tags(details.get('investigators', '')))],
        [sanitize_pdf_text("Coordinating Investigator:"), sanitize_pdf_text(strip_html_tags(details.get('coordinating_investigator', '')))],
        [sanitize_pdf_text("Expert Committee:"), sanitize_pdf_text(strip_html_tags(details.get('expert_committee', '')))]
    ]
    
    t = Table(table_data, colWidths=[2*inch, 4*inch])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))
    
    if details.get('gcp_statement'):
        story.append(Paragraph("GCP Statement", styles['PDFHeader2']))
        story.append(Paragraph(sanitize_pdf_text(details['gcp_statement']), styles['PDFNormal']))
        
    if details.get('approval_statement'):
        story.append(Paragraph("Approval Statement", styles['PDFHeader2']))
        story.append(Paragraph(sanitize_pdf_text(details['approval_statement']), styles['PDFNormal']))

    if approval_data.get('sponsor_reps'):
        story.append(Paragraph("Sponsor Representatives", styles['PDFHeader2']))
        for rep in approval_data['sponsor_reps']:
            story.append(Paragraph(f"<b>Name:</b> {sanitize_pdf_text(strip_html_tags(rep.get('name', '')))}", styles['PDFNormal']))
            story.append(Paragraph(f"<b>Title:</b> {sanitize_pdf_text(strip_html_tags(rep.get('title', '')))}", styles['PDFNormal']))
            story.append(Paragraph(f"<b>Organization:</b> {sanitize_pdf_text(strip_html_tags(rep.get('organization', '')))}", styles['PDFNormal']))
            story.append(Paragraph(f"<b>Date:</b> {sanitize_pdf_text(strip_html_tags(rep.get('date', '')))}", styles['PDFNormal']))
            
            # --- DIGITAL SIGNATURE ---
            sig_url = rep.get('signature')
            signature_embedded = False
            
            if sig_url:
                # Try as Base64 first
                sig_stream = get_image_from_data_url(sig_url)
                if sig_stream:
                    try:
                        sig_stream.seek(0)
                        # Use PIL to ensure image is well-formed for ReportLab
                        pil_img = PILImage.open(sig_stream)
                        if pil_img.mode == 'RGBA':
                            # Create a white background for transparent images
                            background = PILImage.new("RGB", pil_img.size, (255, 255, 255))
                            background.paste(pil_img, mask=pil_img.split()[3])
                            pil_img = background
                        
                        # Save to a fresh BytesIO for ReportLab
                        temp_buf = io.BytesIO()
                        pil_img.save(temp_buf, format='PNG')
                        temp_buf.seek(0)
                        
                        story.append(Paragraph("<b>Signature:</b>", styles['PDFNormal']))
                        img = Image(temp_buf, width=1.5*inch, height=0.5*inch, kind='proportional')
                        story.append(img)
                        signature_embedded = True
                    except Exception as e:
                        story.append(Paragraph(f"<b>Signature Error:</b> {str(e)}", styles['PDFNormal']))
                else:
                    # Try as local path
                    img_path = sig_url.lstrip('/')
                    if os.path.exists(img_path):
                        try:
                            story.append(Paragraph("<b>Signature:</b>", styles['PDFNormal']))
                            story.append(Image(img_path, width=1.5*inch, height=0.5*inch, kind='proportional'))
                            signature_embedded = True
                        except Exception as e:
                            story.append(Paragraph(f"<b>Signature Error:</b> {str(e)}", styles['PDFNormal']))
            
            if not signature_embedded:
                story.append(Paragraph("<b>Signature:</b> ____________________", styles['PDFNormal']))

            story.append(Spacer(1, 6))
            story.append(Paragraph("-" * 40, styles['PDFNormal']))
            story.append(Spacer(1, 6))

    agree = approval_data.get('investigator_agreement')
    if agree:
        story.append(Paragraph("Investigator Agreement", styles['PDFHeader2']))
        story.append(Paragraph(sanitize_pdf_text(strip_html_tags(agree.get('description', ''))), styles['PDFNormal']))
        story.append(Paragraph(f"<b>Investigator Name:</b> {sanitize_pdf_text(strip_html_tags(agree.get('name', '')))}", styles['PDFNormal']))
        story.append(Paragraph(f"<b>Title:</b> {sanitize_pdf_text(strip_html_tags(agree.get('title', '')))}", styles['PDFNormal']))
        story.append(Paragraph(f"<b>Facility:</b> {sanitize_pdf_text(strip_html_tags(agree.get('facility', '')))}", styles['PDFNormal']))
        story.append(Paragraph(f"<b>Date:</b> {sanitize_pdf_text(strip_html_tags(agree.get('date', '')))}", styles['PDFNormal']))

        # --- DIGITAL SIGNATURE ---
        sig_url = agree.get('signature')
        signature_embedded = False
        
        if sig_url:
            sig_stream = get_image_from_data_url(sig_url)
            if sig_stream:
                try:
                    sig_stream.seek(0)
                    pil_img = PILImage.open(sig_stream)
                    if pil_img.mode == 'RGBA':
                        background = PILImage.new("RGB", pil_img.size, (255, 255, 255))
                        background.paste(pil_img, mask=pil_img.split()[3])
                        pil_img = background
                    
                    temp_buf = io.BytesIO()
                    pil_img.save(temp_buf, format='PNG')
                    temp_buf.seek(0)
                    
                    story.append(Paragraph("<b>Signature:</b>", styles['PDFNormal']))
                    img = Image(temp_buf, width=1.5*inch, height=0.5*inch, kind='proportional')
                    story.append(img)
                    signature_embedded = True
                except Exception as e:
                    story.append(Paragraph(f"<b>Signature Error:</b> {str(e)}", styles['PDFNormal']))
            else:
                img_path = sig_url.lstrip('/')
                if os.path.exists(img_path):
                    try:
                        story.append(Paragraph("<b>Signature:</b>", styles['PDFNormal']))
                        story.append(Image(img_path, width=1.5*inch, height=0.5*inch, kind='proportional'))
                        signature_embedded = True
                    except Exception as e:
                        story.append(Paragraph(f"<b>Signature Error:</b> {str(e)}", styles['PDFNormal']))
        
        if not signature_embedded:
            story.append(Paragraph("<b>Signature:</b> ____________________", styles['PDFNormal']))

    story.append(PageBreak())

def draw_header_footer(canvas, doc, protocol_data):
    """Callback to draw header and footer on each page"""
    canvas.saveState()
    
    # Page dimensions
    width, height = letter
    
    # Font settings for header/footer
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.grey)
    
    # Protocol Metadata
    title = sanitize_pdf_text(protocol_data.get('protocol_title', 'Clinical Trial Protocol'))
    version = sanitize_pdf_text(str(protocol_data.get('version_number', '1.0')))
    raw_date = protocol_data.get('protocol_date', datetime.now().strftime('%Y-%m-%d'))
    try:
        dt_obj = datetime.strptime(raw_date, '%Y-%m-%d')
        formatted_date = sanitize_pdf_text(dt_obj.strftime('%d %b %Y'))
    except ValueError:
        formatted_date = sanitize_pdf_text(raw_date)
        
    # --- HEADER ---
    # Left: Protocol Title
    canvas.drawString(inch, height - 0.5*inch, title)
    # Right: Version and Date
    canvas.drawRightString(width - inch, height - 0.5*inch, f"Version {version}")
    canvas.drawRightString(width - inch, height - 0.65*inch, formatted_date)
    
    # --- FOOTER ---
    # Center: Title - Version - Date
    # Use a simple dash '-' instead of en-dash
    footer_text = f"{title} - Version {version} {formatted_date}"
    canvas.drawCentredString(width/2, 0.5*inch, sanitize_pdf_text(footer_text))
    # Bottom Center: Page Number
    canvas.drawCentredString(width/2, 0.35*inch, f"{doc.page}")
    
    canvas.restoreState()

def sanitize_pdf_text(text):
    """Replace special characters that often cause black boxes in ReportLab"""
    if not isinstance(text, str):
        return str(text)
    
    # Comprehensive replacement for characters known to cause issues with Standard Fonts (WinAnsi)
    replacements = {
        '\u2013': '-', # en-dash
        '\u2014': '-', # em-dash
        '\u2010': '-', # hyphen
        '\u2011': '-', # non-breaking hyphen
        '\u2012': '-', # figure dash
        '\u2015': '-', # horizontal bar
        '\u2212': '-', # minus sign
        '\u201b': "'", # single high-reversed-9 quotation mark
        '\u201c': '"', # left double quotation mark
        '\u201d': '"', # right double quotation mark
        '\u2018': "'", # left single quotation mark
        '\u2019': "'", # right single quotation mark
        '\u00a0': ' ', # non-breaking space
        '\ufeff': '',  # byte order mark
        '\r': '',      # carriage return
        '\u00ad': '-', # soft hyphen
        '\u2022': '*', # bullet point
        '\u200b': '',  # zero width space
        '\u200c': '',  # zero width non-joiner
        '\u200d': '',  # zero width joiner
        '\u200e': '',  # left-to-right mark
        '\u200f': '',  # right-to-left mark
        '\u202f': ' ', # narrow non-breaking space
        '\u2060': '',  # word joiner
        '\u005f': '_', # underscore
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
        
    # Regex to catch any remaining variants of hyphen/dash/space in Unicode
    text = re.sub(r'[\u2010-\u2015\u2212\u00ad]', '-', text)
    text = re.sub(r'[\u00a0\u202f\u2007\u2008\u2009]', ' ', text)
    
    # Final pass: any character above 126 that isn't handled might still cause a box
    # Convert remaining high Unicode characters to closest ASCII or question mark
    # First try to encode to latin-1 which ReportLab handles better, then fallback to ASCII
    try:
        # Most Western chars fit in latin-1, but ReportLab's Helvetica works best with ASCII
        # for maximum compatibility without font embedding.
        text = text.encode('ascii', 'replace').decode('ascii')
    except:
        # If encoding fails, manually strip/replace
        sanitized = ""
        for char in text:
            if 32 <= ord(char) <= 126 or ord(char) in [10, 13]:
                sanitized += char
            else:
                sanitized += '?'
        text = sanitized
        
    return text

def generate_pdf_document(protocol_data):
    """Generate PDF document using ReportLab"""
    output_dir = "generated_docs"
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    version = str(protocol_data.get('version_number', '1.0')).replace('.', '_')
    filename = f"protocol_{version}_{timestamp}.pdf"
    filepath = os.path.join(output_dir, filename)

    # Use 1 inch margins all around to match Word
    doc = SimpleDocTemplate(
        filepath, 
        pagesize=letter, 
        rightMargin=inch, 
        leftMargin=inch, 
        topMargin=inch, 
        bottomMargin=inch
    )
    story = []
    
    styles = getSampleStyleSheet()
    if 'ProtocolTitle' not in styles:
        styles.add(ParagraphStyle(name='ProtocolTitle', parent=styles['Heading1'], alignment=1, fontSize=16, spaceAfter=24))
    if 'PDFHeader1' not in styles:
        styles.add(ParagraphStyle(name='PDFHeader1', parent=styles['Heading1'], fontSize=14, spaceBefore=12, spaceAfter=6))
    if 'PDFHeader2' not in styles:
        styles.add(ParagraphStyle(name='PDFHeader2', parent=styles['Heading2'], fontSize=12, spaceBefore=10, spaceAfter=4))
    if 'PDFHeader3' not in styles:
        styles.add(ParagraphStyle(name='PDFHeader3', parent=styles['Heading3'], fontSize=11, spaceBefore=8, spaceAfter=2))
    if 'PDFNormal' not in styles:
        styles.add(ParagraphStyle(name='PDFNormal', parent=styles['Normal'], fontSize=11, spaceAfter=6))
    if 'PDFTable' not in styles:
        styles.add(ParagraphStyle(name='PDFTable', parent=styles['Normal'], fontSize=9))
    if 'ProtocolDetail' not in styles:
        styles.add(ParagraphStyle(name='ProtocolDetail', parent=styles['Normal'], fontSize=12, alignment=1, spaceAfter=2))
    
    story.append(Paragraph(sanitize_pdf_text(protocol_data.get('protocol_title', 'Clinical Trial Protocol')), styles['ProtocolTitle']))
    
    doc_details = [
        ("Protocol Number:", sanitize_pdf_text(protocol_data.get('protocol_number', ''))),
        ("NCT Number:", sanitize_pdf_text(protocol_data.get('nct_number', ''))),
        ("Principal Investigator:", sanitize_pdf_text(protocol_data.get('principal_investigator', ''))),
        ("Sponsor:", sanitize_pdf_text(protocol_data.get('sponsor', ''))),
        ("Funded by:", sanitize_pdf_text(protocol_data.get('funded_by', ''))),
        ("Version Number:", sanitize_pdf_text(protocol_data.get('version_number', ''))),
        ("Date:", sanitize_pdf_text(protocol_data.get('protocol_date', datetime.now().strftime('%d %B %Y'))))
    ]
    
    for label, value in doc_details:
        story.append(Paragraph(f"<b>{label}</b> {value}", styles['ProtocolDetail']))
        story.append(Spacer(1, 6))
    
    story.append(PageBreak())
    
    story.append(Paragraph("TABLE OF CONTENTS", styles['ProtocolTitle']))
    toc_items = ["STATEMENT OF COMPLIANCE", "PROTOCOL APPROVAL & AGREEMENT", "1 PROTOCOL SUMMARY"]
    for i in range(2, 12):
        sec = next((s for s in TEMPLATE_STRUCTURE if s['id'] == i), None)
        if sec: toc_items.append(f"{i} {sec['title']}")
    toc_items.append("APPENDICES")
    for item in toc_items: story.append(Paragraph(f"• {sanitize_pdf_text(item)}", styles['PDFNormal']))
    story.append(PageBreak())
    
    story.append(Paragraph("STATEMENT OF COMPLIANCE", styles['PDFHeader1']))
    story.append(Paragraph("The trial will be carried out in accordance with International Conference on Harmonisation Good Clinical Practice (ICH GCP)...", styles['PDFNormal']))
    story.append(PageBreak())

    create_approval_section_pdf(protocol_data, styles, story)
    
    story.append(Paragraph("1 PROTOCOL SUMMARY", styles['PDFHeader1']))
    
    s_data = protocol_data.get('synopsis_data')
    if s_data and s_data.get('overview', {}).get('title'):
        story.append(Paragraph("1.1 Synopsis", styles['PDFHeader2']))
        ov = s_data['overview']
        story.append(Paragraph(f"<b>Title:</b> {sanitize_pdf_text(ov.get('title', ''))}", styles['PDFNormal']))
        story.append(Paragraph(f"<b>Clinical Phase:</b> {sanitize_pdf_text(ov.get('clinical_phase', ''))}", styles['PDFNormal']))
        obj = s_data.get('objectives', {})
        if obj.get('primary'):
            story.append(Paragraph("Primary Objectives", styles['PDFHeader3']))
            for item in obj['primary']: story.append(Paragraph(f"• {sanitize_pdf_text(str(item))}", styles['PDFNormal']))
    elif protocol_data.get('synopsis'):
        story.append(Paragraph("1.1 Synopsis", styles['PDFHeader2']))
        table_data = [[sanitize_pdf_text(k), sanitize_pdf_text(v)] for k, v in protocol_data['synopsis'].items() if v]
        if table_data:
            synopsis_table = Table(table_data, colWidths=[2*inch, 4*inch])
            synopsis_table.setStyle(TableStyle([('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'), ('GRID', (0,0), (-1,-1), 1, colors.black)]))
            story.append(synopsis_table)
    story.append(Spacer(1, 12))

    schema_data = protocol_data.get('schema_data')
    if schema_data and (schema_data.get('image_url') or schema_data.get('images')):
        story.append(Paragraph("1.2 Schema", styles['PDFHeader2']))
        images_to_process = schema_data.get('images', [])
        if not images_to_process and schema_data.get('image_url'):
            images_to_process = [{'url': schema_data['image_url'], 'caption': schema_data.get('caption'), 'description': schema_data.get('description')}]
        for img_obj in images_to_process:
            if not img_obj.get('url'): continue
            ip = img_obj['url'].lstrip('/')
            if os.path.exists(ip):
                try: story.append(Image(ip, width=6*inch, height=4*inch, kind='proportional'))
                except: pass
            if img_obj.get('caption'): story.append(Paragraph(f"<b>{sanitize_pdf_text(img_obj['caption'])}</b>", styles['PDFTable']))
            if img_obj.get('description'): story.append(Paragraph(sanitize_pdf_text(img_obj['description']), styles['PDFNormal']))
            story.append(Spacer(1, 0.2*inch))
            
    if protocol_data.get('soa_data', {}):
        soa_data = protocol_data.get('soa_data', {})
        
        # Only add heading if there is content to render
        if soa_data.get('image') or soa_data.get('table'):
            story.append(Paragraph("1.3 Schedule of Activities (SoA)", styles['PDFHeader2']))
        
        # Render Image if exists
        soa_image = soa_data.get('image')
        if soa_image and soa_image.get('url'):
            ip = soa_image['url'].lstrip('/')
            if os.path.exists(ip):
                try: story.append(Image(ip, width=6*inch, height=4*inch, kind='proportional'))
                except: pass
            if soa_image.get('caption'): story.append(Paragraph(f"<b>{sanitize_pdf_text(soa_image['caption'])}</b>", styles['PDFTable']))
            if soa_image.get('description'): story.append(Paragraph(sanitize_pdf_text(soa_image['description']), styles['PDFNormal']))
            story.append(Spacer(1, 0.2*inch))
            
        if soa_data.get('table'):
            soa_table_data = soa_data['table']
            headers = soa_table_data.get('headers', [])
            rows = soa_table_data.get('rows', [])
            
            data = []
            if isinstance(rows, dict):
                data = [["Procedures"] + [sanitize_pdf_text(h) for h in headers]]
                for proc, checks in rows.items(): 
                    data.append([sanitize_pdf_text(proc)] + ["X" if c else "" for c in checks])
            elif isinstance(rows, list):
                if headers:
                    data = [[sanitize_pdf_text(str(h)) for h in headers]]
                    for row in rows:
                        data.append([sanitize_pdf_text(str(c)) for c in row])
            
            if len(data) > 1:
                soa_table = Table(data)
                soa_table.setStyle(TableStyle([('FONTSIZE', (0,0), (-1,-1), 6), ('GRID', (0,0), (-1,-1), 0.5, colors.black), ('BACKGROUND', (0,0), (-1,0), colors.lightgrey)]))
                story.append(soa_table)
            
    sections = protocol_data.get('sections', {})
    for section_num in range(2, 12):
        section_key = str(section_num)
        template_section = next((s for s in TEMPLATE_STRUCTURE if s['id'] == section_num), None)
        if section_key in sections or template_section: 
            story.append(Paragraph(f"{section_num} {template_section['title'] if template_section else ''}", styles['PDFHeader1']))
            if section_key in sections:
                sec_data = sections[section_key]
                if sec_data.get('main'): story.append(Paragraph(sanitize_pdf_text(sec_data['main']), styles['PDFNormal']))
                if sec_data.get('subsections'):
                    for sub in sec_data['subsections']:
                        if sub.get('title'): story.append(Paragraph(sanitize_pdf_text(sub['title']), styles['PDFHeader2']))
                        if sub.get('content'): story.append(Paragraph(sanitize_pdf_text(sub['content']), styles['PDFNormal']))
                
                if sec_data.get('images'):
                    for img_obj in sec_data['images']:
                        if img_obj.get('url'):
                            ip = img_obj['url'].lstrip('/')
                            if os.path.exists(ip):
                                try: story.append(Image(ip, width=6*inch, height=4*inch, kind='proportional'))
                                except: pass
                        if img_obj.get('caption'): story.append(Paragraph(f"<b>{sanitize_pdf_text(img_obj['caption'])}</b>", styles['PDFTable']))
                        if img_obj.get('description'): story.append(Paragraph(sanitize_pdf_text(img_obj['description']), styles['PDFNormal']))
                if sec_data.get('subsections'):
                    for i, sub in enumerate(sec_data['subsections']):
                        if isinstance(sub, dict):
                            story.append(Paragraph(f"{section_num}.{i+1} {sanitize_pdf_text(sub.get('title',''))}", styles['PDFHeader2']))
                            if sub.get('content'): story.append(Paragraph(sanitize_pdf_text(sub['content']), styles['PDFNormal']))
                            if sub.get('images'):
                                for img_obj in sub['images']:
                                    if img_obj.get('url'):
                                        ip = img_obj['url'].lstrip('/')
                                        if os.path.exists(ip):
                                            try: story.append(Image(ip, width=6*inch, height=4*inch, kind='proportional'))
                                            except: pass
                                    if img_obj.get('caption'): story.append(Paragraph(f"<b>{sanitize_pdf_text(img_obj['caption'])}</b>", styles['PDFTable']))
                                    if img_obj.get('description'): story.append(Paragraph(sanitize_pdf_text(img_obj['description']), styles['PDFNormal']))
                        elif isinstance(sub, str): story.append(Paragraph(f"{section_num}.{i+1} {sanitize_pdf_text(sub)}", styles['PDFHeader2']))
    
    custom_keys = sorted([k for k in sections.keys() if k.isdigit() and int(k) > 11], key=lambda x: int(x))
    for k in custom_keys:
        sec = sections[k]
        story.append(Paragraph(f"{k} {sanitize_pdf_text(sec.get('title', 'Section'))}", styles['PDFHeader1']))
        if sec.get('main'): story.append(Paragraph(sanitize_pdf_text(sec['main']), styles['PDFNormal']))
        if sec.get('images'):
            for img_obj in sec['images']:
                if img_obj.get('url'):
                    ip = img_obj['url'].lstrip('/')
                    if os.path.exists(ip):
                        try: story.append(Image(ip, width=6*inch, height=4*inch, kind='proportional'))
                        except: pass
                if img_obj.get('caption'): story.append(Paragraph(f"<b>{sanitize_pdf_text(img_obj['caption'])}</b>", styles['PDFTable']))
                if img_obj.get('description'): story.append(Paragraph(sanitize_pdf_text(img_obj['description']), styles['PDFNormal']))
    
    # Use onPage parameter to draw header/footer on every page
    doc.build(story, onFirstPage=lambda canvas, doc: draw_header_footer(canvas, doc, protocol_data),
              onLaterPages=lambda canvas, doc: draw_header_footer(canvas, doc, protocol_data))
    return filepath
def generate_interpreted_pdf_report(protocol_id):
    """
    Generates a specialized PDF report containing only the 12 interpreted fields.
    Highlights low-confidence extractions in red.
    """
    from database import execute_query
    
    # 1. Fetch data
    query = "SELECT field_name, field_value, confidence_score FROM protocol_interpretation WHERE protocol_id = %s ORDER BY field_name"
    data = execute_query(query, (protocol_id,), fetch=True)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    styles = getSampleStyleSheet()
    elements = []
    
    # Header styled as a paragraph for simplicity in SimpleDocTemplate
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        alignment=2 # Right
    )
    elements.append(Paragraph(f"Protocol Interpretation Report | ID: {protocol_id} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", header_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Title
    elements.append(Paragraph("Protocol Interpretation Report", styles['Title']))
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("This report summarizes the core study parameters extracted and interpreted from the protocol source data.", styles['Normal']))
    elements.append(Spacer(1, 0.2*inch))
    
    # 2. Build Content (Non-Tabular)
    for item in data:
        fname = str(item['field_name'])
        fval = str(item['field_value'])
        conf = float(item['confidence_score'] or 1.0)
        
        # Field Name as Section Header
        elements.append(Paragraph(fname, styles['Heading2']))
        
        # Field Value
        if conf < 1.0:
            # Red color for low confidence
            red_style = ParagraphStyle('RedVal', parent=styles['Normal'], textColor=colors.red)
            elements.append(Paragraph(f"{fval} <i>(Confidence: {int(conf * 100)}%)</i>", red_style))
        else:
            elements.append(Paragraph(fval, styles['Normal']))
        
        elements.append(Spacer(1, 0.1*inch))
    
    footer_text = "<br/><br/><font color='grey' size='8'>Note: Fields highlighted in red indicate lower extraction confidence and should be manually verified by a domain expert.</font>"
    elements.append(Paragraph(footer_text, styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
