"""
pdf_generator.py
Generates a Clinical Trial Protocol PDF document from frontend data,
matching the Prot_1 reference structure using ReportLab.
"""

import os
import re
import io
import base64
from datetime import datetime
from functools import partial

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage


# ============================================================================
# HELPERS
# ============================================================================

def strip_html(text):
    if not isinstance(text, str):
        return str(text) if text is not None else ''
    return re.sub(r'<[^>]+>', '', text).strip()


def safe(val, fallback=''):
    v = strip_html(str(val)) if val is not None else ''
    return v if v else fallback


def sanitize(text):
    """Sanitize text for ReportLab standard fonts (replaces unicode chars)."""
    if not isinstance(text, str):
        text = str(text) if text is not None else ''
    replacements = {
        '\u2013': '-', '\u2014': '-', '\u2010': '-', '\u2011': '-',
        '\u2012': '-', '\u2015': '-', '\u2212': '-',
        '\u201c': '"', '\u201d': '"', '\u2018': "'", '\u2019': "'",
        '\u00a0': ' ', '\ufeff':  '', '\r': '',    '\u00ad': '-',
        '\u2022': '*', '\u200b': '', '\u200c': '', '\u200d': '',
        '\u200e': '', '\u200f': '', '\u202f': ' ', '\u2060': '',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r'[\u2010-\u2015\u2212\u00ad]', '-', text)
    text = re.sub(r'[\u00a0\u202f\u2007-\u2009]', ' ', text)
    try:
        text = text.encode('ascii', 'replace').decode('ascii')
    except Exception:
        sanitized = ''
        for ch in text:
            if 32 <= ord(ch) <= 126 or ord(ch) in (10, 13):
                sanitized += ch
            else:
                sanitized += '?'
        text = sanitized
    return text


def s(val):
    """Safe + sanitize in one step."""
    return sanitize(safe(val))


def get_image_stream(data_url):
    """Convert a base64 data URL → BytesIO (PNG) via PIL."""
    if not data_url or not isinstance(data_url, str):
        return None
    if data_url.startswith('data:image/'):
        try:
            _, encoded = data_url.split(',', 1)
            raw = base64.b64decode(encoded)
            buf = io.BytesIO(raw)
            pil = PILImage.open(buf)
            if pil.mode == 'RGBA':
                bg = PILImage.new('RGB', pil.size, (255, 255, 255))
                bg.paste(pil, mask=pil.split()[3])
                pil = bg
            out = io.BytesIO()
            pil.save(out, format='PNG')
            out.seek(0)
            return out
        except Exception:
            return None
    return None


def build_image_flowable(url, width=6 * inch):
    """Return a ReportLab Image flowable from a data URL or file path."""
    stream = get_image_stream(url)
    if stream:
        try:
            return Image(stream, width=width, height=4 * inch, kind='proportional')
        except Exception:
            return None
    path = url.lstrip('/') if isinstance(url, str) else None
    if path and os.path.exists(path):
        try:
            return Image(path, width=width, height=4 * inch, kind='proportional')
        except Exception:
            return None
    return None


# ============================================================================
# STYLES
# ============================================================================

def build_styles():
    styles = getSampleStyleSheet()

    def add(name, parent_name, **kwargs):
        if name not in styles:
            parent = styles[parent_name]
            styles.add(ParagraphStyle(name=name, parent=parent, **kwargs))
        return styles[name]

    add('PTitle',   'Heading1', fontSize=16, alignment=1, spaceAfter=24, fontName='Helvetica-Bold')
    add('PH1',      'Heading1', fontSize=14, spaceBefore=12, spaceAfter=6,  fontName='Helvetica-Bold')
    add('PH2',      'Heading2', fontSize=12, spaceBefore=10, spaceAfter=4,  fontName='Helvetica-Bold')
    add('PH3',      'Heading3', fontSize=11, spaceBefore=8,  spaceAfter=2,  fontName='Helvetica-Bold')
    add('PNormal',  'Normal',   fontSize=11, spaceAfter=6,   leading=14)
    add('PDetail',  'Normal',   fontSize=12, alignment=1,    spaceAfter=4)
    add('PTable',   'Normal',   fontSize=9,  spaceAfter=2)
    add('PBullet',  'Normal',   fontSize=11, leftIndent=18,  spaceAfter=3)
    add('PCaption', 'Normal',   fontSize=10, alignment=1,    fontName='Helvetica-Bold', spaceAfter=4)

    return styles


# ============================================================================
# HEADER / FOOTER CALLBACK
# ============================================================================

def draw_header_footer(canvas, doc, pd):
    canvas.saveState()
    w, h = letter

    title = sanitize(pd.get('protocol_title', 'Clinical Trial Protocol'))
    version = sanitize(str(pd.get('version_number', '1.0')))
    raw = pd.get('protocol_date', datetime.now().strftime('%Y-%m-%d'))
    try:
        formatted_date = sanitize(datetime.strptime(raw, '%Y-%m-%d').strftime('%d %b %Y'))
    except ValueError:
        formatted_date = sanitize(raw)

    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.grey)

    # Header
    canvas.drawString(inch, h - 0.5 * inch, title)
    canvas.drawRightString(w - inch, h - 0.5 * inch, f'Version {version}')
    canvas.drawRightString(w - inch, h - 0.65 * inch, formatted_date)

    # Footer
    footer_text = f'{title} - Version {version} {formatted_date}'
    canvas.drawCentredString(w / 2, 0.5 * inch, footer_text)
    canvas.drawCentredString(w / 2, 0.35 * inch, str(doc.page))

    canvas.restoreState()


# ============================================================================
# BUILDER HELPERS
# ============================================================================

def info_table(rows, styles, col_w=(2 * inch, 4 * inch)):
    """Two-column label/value table."""
    data = [[Paragraph(s(lbl), styles['PTable']), Paragraph(s(val), styles['PTable'])]
            for lbl, val in rows]
    t = Table(data, colWidths=list(col_w))
    t.setStyle(TableStyle([
        ('FONTNAME',  (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID',      (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN',    (0, 0), (-1, -1), 'TOP'),
        ('PADDING',   (0, 0), (-1, -1), 4),
    ]))
    return t


def dynamic_table(headers, rows, styles):
    """Generic multi-column table."""
    if not headers:
        return None
    col_w = 6.5 * inch / len(headers)
    data = [[Paragraph(s(h), styles['PTable']) for h in headers]]
    for row in (rows or []):
        if isinstance(row, list):
            data.append([Paragraph(s(row[i] if i < len(row) else ''), styles['PTable']) for i in range(len(headers))])
        elif isinstance(row, dict):
            data.append([Paragraph(s(row.get(h, '')), styles['PTable']) for h in headers])
    if len(data) < 2:
        return None
    t = Table(data, colWidths=[col_w] * len(headers), repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d6a4f')),
        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0, 0), (-1, -1), 9),
        ('GRID',       (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN',     (0, 0), (-1, -1), 'TOP'),
        ('WORDWRAP',   (0, 0), (-1, -1), True),
    ]))
    return t


def section_break(story):
    story.append(PageBreak())


def h1(text, styles):
    return Paragraph(s(text), styles['PH1'])


def h2(text, styles):
    return Paragraph(s(text), styles['PH2'])


def h3(text, styles):
    return Paragraph(s(text), styles['PH3'])


def para(text, styles):
    return Paragraph(s(text), styles['PNormal'])


def bullet(text, styles):
    return Paragraph(f'• {s(text)}', styles['PBullet'])


def sp(n=6):
    return Spacer(1, n)


# ============================================================================
# SECTION BUILDERS
# ============================================================================

def build_title_page(story, pd, styles):
    story.append(Paragraph(s(pd.get('protocol_title', 'Clinical Trial Protocol')), styles['PTitle']))
    story.append(sp(12))

    rows = [
        ('Protocol Number:',                                    pd.get('protocol_number', '')),
        ('National Clinical Trial (NCT) Identified Number:',    pd.get('nct_number', '')),
        ('Principal Investigator:',                             pd.get('principal_investigator', '')),
        ('IND/IDE Sponsor:',                                    pd.get('sponsor', '')),
        ('Funded by:',                                          pd.get('funded_by', '')),
        ('Version Number:',                                     pd.get('version_number', '')),
        ('Date:',                                               pd.get('protocol_date', datetime.now().strftime('%d %B %Y'))),
    ]
    story.append(info_table(rows, styles, col_w=(2.8 * inch, 3.7 * inch)))

    summary = s(pd.get('summary_changes', ''))
    if summary:
        story.append(sp(12))
        story.append(Paragraph('<b>Summary of Changes from Previous Version:</b>', styles['PNormal']))
        story.append(para(summary, styles))

    section_break(story)


def build_approval_section(story, pd, styles):
    approval = pd.get('approval_data') or {}
    details = approval.get('details') or {}

    has_detail = any(safe(v) for v in details.values())
    has_reps = bool(approval.get('sponsor_reps') or approval.get('cro_reps'))
    has_agree = bool(approval.get('investigator_agreement'))

    if not (has_detail or has_reps or has_agree):
        return

    story.append(h1('PROTOCOL APPROVAL & AGREEMENT', styles))

    detail_rows = [
        ('Protocol Name:',             details.get('protocol_name', '')),
        ('Protocol Number:',           details.get('protocol_number', '')),
        ('IMP:',                        details.get('imp', '')),
        ('Indication:',                details.get('indication', '')),
        ('Clinical Phase:',            details.get('clinical_phase', '')),
        ('Investigators:',             details.get('investigators', '')),
        ('Coordinating Investigator:', details.get('coordinating_investigator', '')),
        ('Expert Committee:',          details.get('expert_committee', '')),
        ('Sponsor Name & Address:',    details.get('sponsor_name_address', '')),
    ]
    story.append(info_table(detail_rows, styles, col_w=(2.5 * inch, 4 * inch)))
    story.append(sp(8))

    gcp = s(details.get('gcp_statement', ''))
    if gcp:
        story.append(h2('GCP Statement', styles))
        story.append(para(gcp, styles))

    approval_stmt = s(details.get('approval_statement', ''))
    if approval_stmt:
        story.append(h2('Approval Statement', styles))
        story.append(para(approval_stmt, styles))

    def render_rep(rep, label):
        story.append(h2(label, styles))
        rep_rows = [
            ('Name:', rep.get('name', '')), ('Title:', rep.get('title', '')),
            ('Organization:', rep.get('organization', '')), ('Date:', rep.get('date', '')),
        ]
        story.append(info_table(rep_rows, styles, col_w=(2 * inch, 4.5 * inch)))
        story.append(sp(4))

        sig_url = rep.get('signature')
        stream = get_image_stream(sig_url)
        story.append(Paragraph('<b>Signature:</b>', styles['PNormal']))
        if stream:
            try:
                story.append(Image(stream, width=1.5 * inch, height=0.5 * inch, kind='proportional'))
            except Exception:
                story.append(para('____________________', styles))
        else:
            story.append(para('____________________', styles))
        story.append(sp(6))

    for rep in (approval.get('sponsor_reps') or []):
        render_rep(rep, 'Sponsor Representative')

    for rep in (approval.get('cro_reps') or []):
        render_rep(rep, 'CRO Representative')

    agree = approval.get('investigator_agreement') or {}
    if any(safe(v) for k, v in agree.items() if k != 'signature'):
        story.append(h2('Investigator Agreement', styles))
        desc = s(agree.get('description', ''))
        if desc:
            story.append(para(desc, styles))

        agree_rows = [
            ('Investigator Name:', agree.get('name', '')),
            ('Title:', agree.get('title', '')),
            ('Facility:', agree.get('facility', '')),
            ('City:', agree.get('city', '')),
            ('State:', agree.get('state', '')),
            ('Date:', agree.get('date', '')),
        ]
        story.append(info_table(agree_rows, styles, col_w=(2 * inch, 4.5 * inch)))
        story.append(sp(4))

        sig_url = agree.get('signature')
        stream = get_image_stream(sig_url)
        story.append(Paragraph('<b>Signature:</b>', styles['PNormal']))
        if stream:
            try:
                story.append(Image(stream, width=1.5 * inch, height=0.5 * inch, kind='proportional'))
            except Exception:
                story.append(para('____________________', styles))
        else:
            story.append(para('____________________', styles))

    section_break(story)


def _safe_list(lst):
    return [x for x in (lst or []) if x]


def build_synopsis(story, pd, styles):
    s_data = pd.get('synopsis_data') or {}
    overview = s_data.get('overview') or {}
    objectives = s_data.get('objectives') or {}
    endpoints = s_data.get('endpoints') or {}
    inclusion = s_data.get('inclusion') or {}
    exclusion = s_data.get('exclusion') or {}
    team = s_data.get('team') or {}

    story.append(h2('1.1 Synopsis', styles))

    ov_rows = [
        ('Title:', overview.get('title', '')),
        ('Clinical Phase:', overview.get('clinical_phase', '')),
        ('Coordinating Investigator:', overview.get('coordinating_investigator', '')),
        ('Expert Committee:', overview.get('expert_committee', '')),
        ('Investigators:', overview.get('investigators', '')),
        ('Trial Sites:', overview.get('trial_sites', '')),
        ('Planned Study Period:', overview.get('planned_period', '')),
        ('FPFV:', overview.get('fpfv', '')),
        ('LPLV:', overview.get('lplv', '')),
        ('Number of Patients:', s_data.get('num_patients', '')),
    ]
    story.append(info_table(ov_rows, styles, col_w=(2.5 * inch, 4 * inch)))
    story.append(sp(8))

    def render_items(heading, items):
        if _safe_list(items):
            story.append(h3(heading, styles))
            for item in items:
                text = safe(item) if not isinstance(item, dict) else safe(item.get('text', str(item)))
                if text:
                    story.append(bullet(text, styles))

    render_items('Primary Objectives', objectives.get('primary', []))
    render_items('Secondary Objectives', objectives.get('secondary', []))
    render_items('Exploratory Objectives', objectives.get('exploratory', []))
    render_items('Primary Endpoints', endpoints.get('primary', []))
    render_items('Secondary Endpoints', endpoints.get('secondary', []))
    render_items('Exploratory Endpoints', endpoints.get('exploratory', []))

    inc_text = s(inclusion.get('text', ''))
    inc_points = _safe_list(inclusion.get('points', []))
    if inc_text or inc_points:
        story.append(h3('Inclusion Criteria', styles))
        if inc_text:
            story.append(para(inc_text, styles))
        for pt in inc_points:
            story.append(bullet(safe(pt), styles))

    exc_text = s(exclusion.get('text', ''))
    exc_points = _safe_list(exclusion.get('points', []))
    if exc_text or exc_points:
        story.append(h3('Exclusion Criteria', styles))
        if exc_text:
            story.append(para(exc_text, styles))
        for pt in exc_points:
            story.append(bullet(safe(pt), styles))

    stat = s(s_data.get('statistical_methods', ''))
    if stat:
        story.append(h3('Statistical Methods', styles))
        story.append(para(stat, styles))

    inv_desc = s(team.get('investigator_desc', ''))
    if inv_desc:
        story.append(h3('Investigators', styles))
        story.append(para(inv_desc, styles))
    coord_desc = s(team.get('coordinator_desc', ''))
    if coord_desc:
        story.append(h3('Coordinating Investigator', styles))
        story.append(para(coord_desc, styles))

    # Flowcharts
    flowcharts = s_data.get('flowcharts') or []
    if flowcharts:
        fc_title = s(s_data.get('flowchart_title', 'Study Schema / Flowchart'))
        story.append(h3(fc_title, styles))
        fc_desc = s(s_data.get('flowchart_description', ''))
        if fc_desc:
            story.append(para(fc_desc, styles))
        for fc in flowcharts:
            url = fc.get('url') if isinstance(fc, dict) else fc
            img = build_image_flowable(url)
            if img:
                story.append(img)
            cap = fc.get('caption', '') if isinstance(fc, dict) else ''
            if s(cap):
                story.append(Paragraph(f'<b>{s(cap)}</b>', styles['PCaption']))
            story.append(sp(8))

    # Custom tables
    for t in (s_data.get('tables') or []):
        headers = t.get('headers', [])
        rows = t.get('rows', [])
        if not headers:
            continue
        tbl_title = s(t.get('title', ''))
        if tbl_title:
            story.append(h3(tbl_title, styles))
        tbl = dynamic_table(headers, rows, styles)
        if tbl:
            story.append(tbl)
    story.append(sp(8))


def build_schema(story, pd, styles):
    schema = pd.get('schema_data') or {}
    images = schema.get('images') or []
    if not images and schema.get('image_url'):
        images = [{'url': schema['image_url'], 'caption': schema.get('caption', ''), 'description': schema.get('description', '')}]
    if not images:
        return

    story.append(h2('1.2 Schema', styles))
    for img_obj in images:
        url = img_obj.get('url') if isinstance(img_obj, dict) else img_obj
        img = build_image_flowable(url)
        if img:
            story.append(img)
        cap = img_obj.get('caption', '') if isinstance(img_obj, dict) else ''
        desc = img_obj.get('description', '') if isinstance(img_obj, dict) else ''
        if s(cap):
            story.append(Paragraph(f'<b>{s(cap)}</b>', styles['PCaption']))
        if s(desc):
            story.append(para(desc, styles))
        story.append(sp(8))


def build_soa(story, pd, styles):
    soa = pd.get('soa_data') or {}
    soa_img = soa.get('image') or {}
    soa_tbl = soa.get('table') or {}

    if not soa_img.get('url') and not soa_tbl.get('headers'):
        return

    story.append(h2('1.3 Schedule of Activities (SoA)', styles))

    if soa_img.get('url'):
        img = build_image_flowable(soa_img['url'])
        if img:
            story.append(img)
        if s(soa_img.get('caption', '')):
            story.append(Paragraph(f'<b>{s(soa_img["caption"])}</b>', styles['PCaption']))
        if s(soa_img.get('description', '')):
            story.append(para(soa_img['description'], styles))
        story.append(sp(8))

    headers = soa_tbl.get('headers', [])
    rows = soa_tbl.get('rows', {})
    if headers:
        # Split heavy tables into multiple parts if they have many columns
        MAX_COLS = 13  # Max columns (including Procedures) per table
        all_cols = list(headers)
        num_header_cols = len(all_cols)
        
        # Determine number of split tables needed
        # Each part will have 'Procedures' + some window of columns
        col_indices_list = list(range(num_header_cols))
        parts = []
        for i in range(0, num_header_cols, (MAX_COLS - 1)):
            parts.append(col_indices_list[i : i + (MAX_COLS - 1)])
        
        for p_idx, sub_indices in enumerate(parts):
            sub_headers = [all_cols[i] for i in sub_indices]
            col_headers = ['Procedures'] + sub_headers
            num_cols = len(col_headers)
            
            # Widths: 2.0 inch for Procedures, then distribute remaining 4.5 inches
            c_w = [1.8 * inch] + [(4.7 * inch) / (num_cols - 1)] * (num_cols - 1)
            
            data = [[Paragraph(s(h), styles['PTable']) for h in col_headers]]
            
            if isinstance(rows, dict):
                for proc, checks in rows.items():
                    r_vals = [Paragraph(s(proc), styles['PTable'])]
                    for i in sub_indices:
                        val = checks[i] if i < len(checks) else False
                        r_vals.append(Paragraph('X' if val else '', styles['PTable']))
                    data.append(r_vals)
            elif isinstance(rows, list):
                # If rows is a list of lists [ [proc, v1, v2...], ... ]
                for r in rows:
                    if not r: continue
                    proc_val = r[0]
                    r_vals = [Paragraph(s(str(proc_val)), styles['PTable'])]
                    for i in sub_indices:
                        val = r[i + 1] if (i + 1) < len(r) else ''
                        r_vals.append(Paragraph(s(str(val)), styles['PTable']))
                    data.append(r_vals)
            
            if len(data) > 1:
                if p_idx > 0:
                    story.append(Paragraph(f'<b>Schedule of Activities (Continued - Part {p_idx+1})</b>', styles['PH3']))
                t = Table(data, colWidths=c_w, repeatRows=1)
                t.setStyle(TableStyle([
                    ('FONTSIZE',   (0, 0), (-1, -1), 7),
                    ('GRID',       (0, 0), (-1, -1), 0.5, colors.black),
                    ('BACKGROUND', (0, 0), (-1, 0),  colors.lightgrey),
                    ('ALIGN',      (1, 0), (-1, -1),  'CENTER'),
                    ('VALIGN',     (0, 0), (-1, -1),  'MIDDLE'),
                ]))
                story.append(t)
                story.append(sp(12))
    story.append(sp(8))


def build_section3(story, pd, styles):
    s3 = pd.get('section3') or {}
    legacy = pd.get('objectives_endpoints', [])

    desc = s(s3.get('description', ''))
    tbl = s3.get('table') or {}
    img = s3.get('image') or {}

    if not desc and not tbl.get('headers') and not img.get('url') and not legacy:
        return

    if desc:
        story.append(para(desc, styles))

    if img.get('url'):
        flowable = build_image_flowable(img['url'])
        if flowable:
            story.append(flowable)
        if s(img.get('caption', '')):
            story.append(Paragraph(f'<b>Figure: {s(img["caption"])}</b>', styles['PCaption']))
        if s(img.get('description', '')):
            story.append(para(img['description'], styles))
        story.append(sp(6))

    if tbl.get('headers'):
        t = dynamic_table(tbl['headers'], tbl.get('rows', []), styles)
        if t:
            story.append(t)
    elif legacy:
        headers = ['Type', 'Objectives', 'Endpoints and Justification']
        rows = []
        for obj in legacy:
            ep = s(obj.get('Endpoint', ''))
            just = s(obj.get('Justification', ''))
            cell3 = f'{ep}\n\nJustification: {just}' if just else ep
            rows.append([s(obj.get('Type', '')), s(obj.get('Objective', '')), cell3])
        t = dynamic_table(headers, rows, styles)
        if t:
            story.append(t)
    story.append(sp(8))


def _add_images_to_story(story, images, styles):
    for img_obj in (images or []):
        url = img_obj.get('url') if isinstance(img_obj, dict) else img_obj
        flowable = build_image_flowable(url)
        if flowable:
            story.append(flowable)
        cap = img_obj.get('caption', '') if isinstance(img_obj, dict) else ''
        desc = img_obj.get('description', '') if isinstance(img_obj, dict) else ''
        if s(cap):
            story.append(Paragraph(f'<b>{s(cap)}</b>', styles['PCaption']))
        if s(desc):
            story.append(para(desc, styles))
        story.append(sp(6))


TEMPLATE_STRUCTURE = [
    {'id': 1,  'title': 'PROTOCOL SUMMARY'},
    {'id': 2,  'title': 'INTRODUCTION'},
    {'id': 3,  'title': 'OBJECTIVES AND ENDPOINTS'},
    {'id': 4,  'title': 'STUDY DESIGN'},
    {'id': 5,  'title': 'STUDY POPULATION'},
    {'id': 6,  'title': 'STUDY INTERVENTION'},
    {'id': 7,  'title': 'STUDY INTERVENTION DISCONTINUATION AND PARTICIPANT DISCONTINUATION/WITHDRAWAL'},
    {'id': 8,  'title': 'STUDY ASSESSMENTS AND PROCEDURES'},
    {'id': 9,  'title': 'STATISTICAL CONSIDERATIONS'},
    {'id': 10, 'title': 'SUPPORTING DOCUMENTATION AND OPERATIONAL CONSIDERATIONS'},
    {'id': 11, 'title': 'REFERENCES'},
]


def build_generic_sections(story, pd, styles):
    sections = pd.get('sections') or {}

    for sec_num in range(2, 12):
        sec_key = str(sec_num)
        template = next((t for t in TEMPLATE_STRUCTURE if t['id'] == sec_num), None)
        sec_title = f"{sec_num} {template['title']}" if template else f"{sec_num} SECTION {sec_num}"

        story.append(h1(sec_title, styles))

        sec_data = sections.get(sec_key) or {}
        main_text = s(sec_data.get('main', ''))
        if main_text:
            story.append(para(main_text, styles))

        _add_images_to_story(story, sec_data.get('images') or [], styles)

        subs = sec_data.get('subsections') or []

        if isinstance(subs, list):
            for i, sub in enumerate(subs):
                if isinstance(sub, dict):
                    sub_title = s(sub.get('title', ''))
                    sub_content = s(sub.get('content', ''))
                    story.append(h2(f'{sec_num}.{i+1} {sub_title}', styles))
                    if sub_content:
                        story.append(para(sub_content, styles))
                    _add_images_to_story(story, sub.get('images') or [], styles)

                    # Custom table inside subsection
                    c_tbl = sub.get('customTable') or {}
                    if c_tbl.get('headers'):
                        t = dynamic_table(c_tbl['headers'], c_tbl.get('rows', []), styles)
                        if t:
                            story.append(t)

                elif isinstance(sub, str) and sub.strip():
                    story.append(h2(f'{sec_num}.{i+1} {s(sub)}', styles))

        elif isinstance(subs, dict):
            for idx, content in sorted(subs.items(), key=lambda x: int(x[0])):
                if content:
                    story.append(h2(f'{sec_num}.{int(idx)+1} Subsection', styles))
                    story.append(para(str(content), styles))

        # Section 10: Abbreviations & Amendment History
        if sec_num == 10:
            abbrevs = pd.get('abbreviations') or sec_data.get('abbreviations') or []
            if abbrevs:
                story.append(h2('Abbreviations', styles))
                rows = [[s(ab.get('Abbreviation', ab.get('abbreviation', ''))),
                         s(ab.get('Full Form', ab.get('full_form', '')))]
                        for ab in abbrevs]
                t = dynamic_table(['Abbreviation', 'Full Form'], rows, styles)
                if t:
                    story.append(t)

            amendments = pd.get('amendment_history') or sec_data.get('amendment_history') or []
            if amendments:
                story.append(h2('Protocol Amendment History', styles))
                rows = [[s(am.get('Version', am.get('version', ''))),
                         s(am.get('Date', am.get('date', ''))),
                         s(am.get('Description', am.get('description', ''))),
                         s(am.get('Rationale', am.get('rationale', '')))]
                        for am in amendments]
                t = dynamic_table(['Version', 'Date', 'Description of Change', 'Brief Rationale'], rows, styles)
                if t:
                    story.append(t)

        story.append(PageBreak())


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def generate_pdf_document(protocol_data):
    """Generate PDF document matching the Prot_1 reference structure."""
    pd_data = protocol_data  # alias

    output_dir = 'generated_docs'
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    version = safe(pd_data.get('version_number', 'v1.0')).replace('.', '_').replace(' ', '_')
    filename = f'protocol_{version}_{timestamp}.pdf'
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch
    )

    styles = build_styles()
    story = []

    # ═══ TITLE PAGE ═══
    build_title_page(story, pd_data, styles)

    # ═══ PROTOCOL APPROVAL & AGREEMENT ═══
    build_approval_section(story, pd_data, styles)

    # ═══ STATEMENT OF COMPLIANCE ═══
    story.append(h1('STATEMENT OF COMPLIANCE', styles))
    compliance = (
        'The trial will be carried out in accordance with International Conference on Harmonisation Good '
        'Clinical Practice (ICH GCP) and the following: '
        '(1) United States (US) Code of Federal Regulations (CFR) applicable to clinical studies '
        '(45 CFR Part 46, 21 CFR Part 50, 21 CFR Part 56, 21 CFR Part 312, and/or 21 CFR Part 812). '
        '(2) NIH-funded investigators and clinical trial site staff who are responsible for the conduct, '
        'management, or oversight of NIH-funded clinical trials have completed Human Subjects Protection '
        'and ICH GCP Training. '
        '(3) The protocol, informed consent form(s), recruitment materials, and all participant materials '
        'will be submitted to the IRB for review and approval before any participant is enrolled.'
    )
    story.append(para(compliance, styles))
    story.append(PageBreak())

    # ═══ TABLE OF CONTENTS ═══
    story.append(h1('TABLE OF CONTENTS', styles))
    toc_items = ['STATEMENT OF COMPLIANCE', 'PROTOCOL APPROVAL & AGREEMENT', '1 PROTOCOL SUMMARY']
    for t in TEMPLATE_STRUCTURE:
        if t['id'] > 1:
            toc_items.append(f"{t['id']} {t['title']}")
    toc_items.append('APPENDICES')
    for item in toc_items:
        story.append(bullet(item, styles))
    story.append(PageBreak())

    # ═══ SECTION 1: PROTOCOL SUMMARY ═══
    story.append(h1('1 PROTOCOL SUMMARY', styles))
    build_synopsis(story, pd_data, styles)
    build_schema(story, pd_data, styles)
    build_soa(story, pd_data, styles)
    story.append(PageBreak())

    # ═══ SECTION 3 (standalone before rest) ═══
    story.append(h1('3 OBJECTIVES AND ENDPOINTS', styles))
    build_section3(story, pd_data, styles)

    # ═══ SECTIONS 2, 4–11 ═══
    build_generic_sections(story, pd_data, styles)

    # ═══ APPENDICES ═══
    appendices = pd_data.get('appendices') or []
    if appendices:
        story.append(h1('APPENDICES', styles))
        for i, appendix in enumerate(appendices, 1):
            story.append(h2(f'Appendix {i}', styles))
            app_title = s(appendix.get('title', ''))
            app_content = s(appendix.get('content', ''))
            if app_title:
                story.append(para(app_title, styles))
            if app_content:
                story.append(para(app_content, styles))

    hf = partial(draw_header_footer, pd=pd_data)
    doc.build(story, onFirstPage=hf, onLaterPages=hf)
    return filepath


def generate_interpreted_pdf_report(protocol_id):
    """Generates a specialized PDF report for the 12 interpreted fields."""
    from database import execute_query

    query = "SELECT field_name, field_value, confidence_score FROM protocol_interpretation WHERE protocol_id = %s ORDER BY field_name"
    data = execute_query(query, (protocol_id,), fetch=True)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    styles = getSampleStyleSheet()
    elements = []

    header_style = ParagraphStyle('HeaderStyle', parent=styles['Normal'], fontSize=9,
                                  textColor=colors.grey, alignment=2)
    elements.append(Paragraph(
        f"Protocol Interpretation Report | ID: {protocol_id} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        header_style
    ))
    elements.append(Spacer(1, 0.2 * inch))
    elements.append(Paragraph('Protocol Interpretation Report', styles['Title']))
    elements.append(Spacer(1, 0.2 * inch))
    elements.append(Paragraph('This report summarizes the core study parameters extracted and interpreted from the protocol source data.', styles['Normal']))
    elements.append(Spacer(1, 0.2 * inch))

    for item in (data or []):
        fname = str(item['field_name'])
        fval = str(item['field_value'])
        conf = float(item['confidence_score'] or 1.0)

        elements.append(Paragraph(fname, styles['Heading2']))
        if conf < 1.0:
            red_style = ParagraphStyle('RedVal', parent=styles['Normal'], textColor=colors.red)
            elements.append(Paragraph(f"{fval} <i>(Confidence: {int(conf * 100)}%)</i>", red_style))
        else:
            elements.append(Paragraph(fval, styles['Normal']))
        elements.append(Spacer(1, 0.1 * inch))

    footer_text = "<br/><br/><font color='grey' size='8'>Note: Fields highlighted in red indicate lower extraction confidence and should be manually verified.</font>"
    elements.append(Paragraph(footer_text, styles['Normal']))

    doc.build(elements)
    buffer.seek(0)
    return buffer
