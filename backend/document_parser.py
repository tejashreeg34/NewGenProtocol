"""
document_parser.py

PRIMARY:  Groq LLM (llama-3.3-70b-versatile)
          Split into THREE small focused calls to stay within token budget:
            Call 1 – Metadata (cover page text ~2500 chars)
            Call 2 – Synopsis / Criteria (targeted section text ~4000 chars)
            Call 3 – SoA table (raw table pipe-text only)
          + Python structural extraction for ALL sections/subsections (no token cost)

FALLBACK: Regex heuristics if Groq is unavailable or fails
"""

import re
import io
import os
import json
import uuid
import logging
from typing import Optional, List, Dict, Any, Tuple

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL   = "llama-3.3-70b-versatile"

# ────────────────────────────────────────────────
# Standard protocol heading → section number map
# ────────────────────────────────────────────────
SECTION_HEADING_MAP = {
    'PROTOCOL SUMMARY': '1', 'SYNOPSIS': '1', 'SUMMARY': '1',
    'INTRODUCTION': '2', 'BACKGROUND': '2', 'RATIONALE': '2',
    'OBJECTIVES AND ENDPOINTS': '3', 'OBJECTIVES': '3', 'ENDPOINTS': '3',
    'STUDY DESIGN': '4', 'OVERALL DESIGN': '4',
    'STUDY POPULATION': '5', 'POPULATION': '5', 'ELIGIBILITY': '5',
    'STUDY INTERVENTION': '6', 'INTERVENTION': '6', 'TREATMENT': '6', 'INVESTIGATIONAL': '6',
    'DISCONTINUATION': '7', 'WITHDRAWAL': '7',
    'STUDY ASSESSMENTS': '8', 'ASSESSMENTS AND PROCEDURES': '8', 'SCHEDULE': '8',
    'STATISTICAL': '9', 'STATISTICS': '9',
    'SUPPORTING DOCUMENTATION': '10', 'REGULATORY': '10', 'ETHICAL': '10',
    'REFERENCES': '11', 'BIBLIOGRAPHY': '11',
}

SECTION_NUMBER_RE = re.compile(r'^(\d{1,2})[\.\)\s]+(.{3,120})$')  # "1. Introduction"
SUBSECTION_RE     = re.compile(r'^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})*)[\.\)\s]+(.{2,120})$')  # "1.1 Background"

# ────────────────────────────────────────────────
# GROQ PROMPT 1 — Metadata (scalar fields only)
# ────────────────────────────────────────────────
META_SYSTEM = (
    "You are a clinical trial protocol data extractor. "
    "Return ONLY a single valid JSON object. No markdown, no fences, no explanation. "
    "Only extract what is explicitly present in the text."
)

META_PROMPT = """\
Extract these fields from the clinical protocol text and return a JSON object:

{{
  "protocol_title": "",
  "protocol_number": "",
  "nct_number": "",
  "principal_investigator": "",
  "sponsor": "",
  "funded_by": "",
  "version_number": "",
  "protocol_date": "",
  "clinical_phase": "",
  "indication": "",
  "imp": "",
  "coordinating_investigator": "",
  "expert_committee": "",
  "sponsor_name_address": "",
  "trial_sites": "",
  "planned_period": "",
  "fpfv": "",
  "lplv": "",
  "num_patients": ""
}}

If a field is absent, use "". Do NOT guess.

TEXT:
---
{text}
---

Return ONLY the JSON."""

# ────────────────────────────────────────────────
# GROQ PROMPT 2 — Synopsis (lists: objectives, endpoints, criteria)
# ────────────────────────────────────────────────
SYN_SYSTEM = (
    "You are a clinical trial synopsis extractor. "
    "Return ONLY a single valid JSON object. No markdown, no fences, no explanation."
)

SYN_PROMPT = """\
Extract the following fields from the protocol text. Return them as a JSON object.
All list fields must be arrays of strings (one item per element, empty list [] if absent).

{{
  "primary_objectives": [],
  "secondary_objectives": [],
  "exploratory_objectives": [],
  "primary_endpoints": [],
  "secondary_endpoints": [],
  "exploratory_endpoints": [],
  "inclusion_criteria": [],
  "exclusion_criteria": [],
  "statistical_methods": ""
}}

TEXT:
---
{text}
---

Return ONLY the JSON."""

# ────────────────────────────────────────────────
# GROQ PROMPT 3 — Schedule of Activities table
# ────────────────────────────────────────────────
SOA_SYSTEM = (
    "You are a clinical trial Schedule of Activities extractor. "
    "Return ONLY a single valid JSON object. No markdown, no fences, no explanation."
)

SOA_PROMPT = """\
Extract the Schedule of Activities (SoA) table from the clinical trial tables below.

Return:
{{
  "headers": ["Procedure", "Visit1", "Visit2", ...],
  "rows": [
    ["Procedure name", "1", "0", "1", ...],
    ["Another procedure", "0", "1", "0", ...]
  ]
}}

RULES:
- headers[0] MUST be the literal string "Procedure"
- headers[1..n] = visit/timepoint names from the document (e.g. "Screening", "Day 1", "Week 4")
- rows[i][0] = procedure/assessment name
- rows[i][1..n] = "1" if performed at that visit (mark ✓ ✔ X x Y Yes • or any check symbol), else "0"
- Include ALL rows including sub-category rows
- If no SoA table found, return {{"headers": [], "rows": []}}

TABLE DATA:
---
{tables}
---

Return ONLY the JSON."""


# ════════════════════════════════════════════════
# DOCUMENT PARSER
# ════════════════════════════════════════════════
class DocumentParser:

    def parse(self, file_content: bytes, filename: str, upload_dir: str = "uploads") -> dict:
        ext = os.path.splitext(filename)[1].lower()
        if ext in ['.docx', '.doc']:
            return self._parse_docx(file_content, filename, upload_dir)
        elif ext == '.pdf':
            return self._parse_pdf(file_content, filename, upload_dir)
        else:
            raise ValueError(f"Unsupported file type '{ext}'. Upload a .docx or .pdf file.")

    # ──────────────────────────────────────────────
    # FILE READERS
    # ──────────────────────────────────────────────
    def _parse_docx(self, content: bytes, filename: str, upload_dir: str) -> dict:
        from docx import Document
        import zipfile

        doc = Document(io.BytesIO(content))
        paragraphs: List[Dict] = []
        tables_data: List[List[List[str]]] = []
        soa_image_url: Optional[str] = None

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            is_bold = any(r.bold for r in para.runs if r.bold is not None)
            paragraphs.append({
                'text': text,
                'style': para.style.name if para.style else 'Normal',
                'bold': is_bold,
                'font_size': None
            })

        for table in doc.tables:
            tbl = [[cell.text.strip() for cell in row.cells] for row in table.rows]
            if any(any(c for c in row) for row in tbl):
                tables_data.append(tbl)

        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                for name in sorted(z.namelist()):
                    if name.startswith('word/media/') and any(
                        name.lower().endswith(e) for e in ['.png', '.jpg', '.jpeg', '.bmp', '.gif']
                    ):
                        img_bytes = z.read(name)
                        ext_t = name.split('.')[-1].lower()
                        soa_image_url = self._save_image(img_bytes, ext_t, upload_dir)
                        break
        except Exception as e:
            logger.warning(f"DOCX image extraction: {e}")

        full_text = '\n'.join(p['text'] for p in paragraphs)
        return self._run(paragraphs, full_text, tables_data, soa_image_url)

    def _parse_pdf(self, content: bytes, filename: str, upload_dir: str) -> dict:
        import fitz

        doc = fitz.open(stream=content, filetype="pdf")
        paragraphs: List[Dict] = []
        tables_data: List[List[List[str]]] = []
        soa_image_url: Optional[str] = None

        for page in doc:
            for block in page.get_text("dict")["blocks"]:
                if block["type"] == 0:
                    for line in block["lines"]:
                        spans = line["spans"]
                        text = " ".join(s["text"] for s in spans).strip()
                        if not text:
                            continue
                        max_size = max((s["size"] for s in spans), default=12)
                        is_bold = any(s["flags"] & 16 for s in spans)
                        style = 'Heading 1' if (max_size > 13 or is_bold) else 'Normal'
                        paragraphs.append({
                            'text': text,
                            'style': style,
                            'bold': is_bold,
                            'font_size': max_size
                        })
                elif block["type"] == 1 and soa_image_url is None:
                    try:
                        xref = block.get("xref")
                        if xref:
                            img = doc.extract_image(xref)
                            soa_image_url = self._save_image(img["image"], img.get("ext", "png"), upload_dir)
                    except Exception:
                        pass

        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    for tbl in (page.extract_tables() or []):
                        cleaned = [[str(c or '').strip() for c in row]
                                   for row in tbl if any(c for c in row)]
                        if len(cleaned) >= 2:
                            tables_data.append(cleaned)
        except Exception as e:
            logger.warning(f"pdfplumber: {e}")

        full_text = '\n'.join(p['text'] for p in paragraphs)
        return self._run(paragraphs, full_text, tables_data, soa_image_url)

    # ──────────────────────────────────────────────
    # MAIN PIPELINE
    # ──────────────────────────────────────────────
    def _run(self, paragraphs, full_text, tables_data, soa_image_url) -> dict:
        # STEP 1: Extract all sections + subsections structurally (Python, no AI)
        sections = self._extract_sections_structural(paragraphs, full_text)

        if GROQ_API_KEY:
            try:
                result = self._groq_pipeline(paragraphs, full_text, tables_data,
                                              soa_image_url, sections)
                logger.info("Groq extraction succeeded")
                return result
            except Exception as e:
                logger.warning(f"Groq failed, using regex fallback: {e}")

        logger.info("Using regex fallback")
        return self._regex_all(paragraphs, full_text, tables_data, soa_image_url, sections)

    # ──────────────────────────────────────────────
    # STEP 1: STRUCTURAL SECTION + SUBSECTION EXTRACTION
    # Handles TOC skipping, any number of sections (up to 30), subsections
    # ──────────────────────────────────────────────
    def _extract_sections_structural(self, paragraphs: List[Dict], full_text: str) -> dict:
        """
        3-phase section extraction:
          Phase 1 – Find and skip the Table of Contents page
          Phase 2 – Scan for all headings, classify each as top-level / subsection
          Phase 3 – Build content under each heading, flush into sections dict

        Subsections use {title, content, customTable} matching ProtocolSections.jsx.
        SoA / Trial Procedures / Assessments headings are always captured as sections.
        """

        # ─── TOC detection patterns ───
        TOC_DOTS_RE  = re.compile(r'[.\-–]{3,}\s*\d+\s*$')      # "Introduction ......... 3"
        TOC_TITLE_KW = {'table of contents', 'contents', 'toc', 'table of content'}
        # Keywords that MUST always become a section regardless of location
        SOA_KW = {'schedule of activities', 'trial procedures', 'assessments and procedures',
                  'study procedures', 'schedule of events', 'soa', 'study activities',
                  'time and events schedule', 'table 1 time and events schedule'}

        # ─────────────────────────────────────────────
        # Phase 1: Identify the TOC region and skip it.
        # The TOC is the block of text between a "TABLE OF CONTENTS" heading and
        # the first heading that has substantial prose content after it.
        # ─────────────────────────────────────────────
        toc_region: set = set()   # set of paragraph indices that are part of the TOC
        toc_start = -1
        toc_end   = -1

        for i, p in enumerate(paragraphs):
            t_lower = p['text'].strip().lower()
            # Detect explicit TOC heading
            if t_lower in TOC_TITLE_KW or t_lower.startswith('table of content'):
                toc_start = i
                break

        if toc_start >= 0:
            # Walk forward from TOC heading:
            # The TOC ends at the first paragraph that looks like a real section heading
            # that is followed by ≥1 lines of prose (not just more headings / TOC entries)
            for i in range(toc_start + 1, len(paragraphs)):
                p = paragraphs[i]
                text = p['text'].strip()
                # Is it a numbered / keyword heading?
                is_num_head = bool(SECTION_NUMBER_RE.match(text) or SUBSECTION_RE.match(text))
                is_kw_head  = ('Heading' in p.get('style','') or p.get('bold', False) and len(text) < 150)

                # Is it a TOC-style line (dots + page number)?
                is_toc_entry = bool(TOC_DOTS_RE.search(text))
                if is_toc_entry:
                    toc_region.add(i)
                    continue

                if is_num_head or is_kw_head:
                    # Peek ahead: count real-prose lines in next 6 paragraphs
                    prose_count = 0
                    for j in range(i + 1, min(i + 7, len(paragraphs))):
                        nxt = paragraphs[j]['text'].strip()
                        if (not SECTION_NUMBER_RE.match(nxt)
                                and not SUBSECTION_RE.match(nxt)
                                and not TOC_DOTS_RE.search(nxt)
                                and len(nxt) > 40):
                            prose_count += 1
                    if prose_count >= 1:
                        toc_end = i
                        break
                    else:
                        toc_region.add(i)  # heading with no prose = TOC entry

        # All indices from toc_start to toc_end (exclusive) are TOC
        if toc_start >= 0 and toc_end > toc_start:
            for i in range(toc_start, toc_end):
                toc_region.add(i)

        # ─────────────────────────────────────────────
        # Phase 2 + 3: Parse real document content
        # ─────────────────────────────────────────────
        sections: Dict[str, Dict] = {}

        # If a TOC was found, create it as the very first special section
        if toc_region:
            toc_lines = []
            for i in sorted(list(toc_region)):
                t_text = paragraphs[i]['text'].strip()
                if t_text:
                    toc_lines.append(t_text)
            if toc_lines:
                sections['0'] = {
                    'title': 'Table of Contents',
                    'main': '<br/>\n'.join(toc_lines),
                    'notes': '',
                    'subsections': []
                }

        current_top_id: Optional[str] = None
        current_top_title: str = ''
        current_sub_title: str = ''
        current_sub_content: List[str] = []
        current_top_content: List[str] = []
        is_in_sub: bool = False
        # Track all encountered section IDs so we can auto-assign unknown headings
        next_auto_id: List[int] = [100]   # auto IDs start at 100 to avoid collision

        def _flush_sub():
            nonlocal current_sub_content, is_in_sub, current_sub_title
            if current_top_id and current_sub_title:
                body = '\n'.join(current_sub_content).strip()
                html_body = f"<h3>{current_sub_title}</h3>\n{body}" if body else f"<h3>{current_sub_title}</h3>"
                sections[current_top_id]['subsections'].append({
                    'title': current_sub_title,
                    'content': html_body,
                    'customTable': None
                })
            current_sub_content.clear()
            current_sub_title = ''
            is_in_sub = False

        def _flush_top():
            nonlocal current_top_content
            if current_top_id and current_top_content:
                body = '\n'.join(current_top_content).strip()
                existing = sections.get(current_top_id, {}).get('main', '')
                sections[current_top_id]['main'] = (existing + '\n' + body).strip()
            current_top_content.clear()

        def _new_section(sid: str, title: str):
            nonlocal current_top_id, current_top_title, is_in_sub
            _flush_sub()
            _flush_top()
            current_top_id    = sid
            current_top_title = title
            is_in_sub = False
            if sid not in sections:
                sections[sid] = {'title': title, 'main': '', 'notes': '', 'subsections': []}

        for i, p in enumerate(paragraphs):
            # Skip TOC region
            if i in toc_region:
                continue

            text  = p['text'].strip()
            style = p.get('style', 'Normal')
            bold  = p.get('bold', False)
            fsize = p.get('font_size') or 12

            if not text:
                continue

            # Skip standalone page numbers
            if re.match(r'^\d{1,3}$', text):
                continue

            # ─── Check for subsection heading (e.g. "1.1 Background") ───
            sub_m = SUBSECTION_RE.match(text)
            if sub_m:
                # Disallow long prose bullet points masquerading as subsections unless they're explicitly styled
                if len(text) < 60 or bold or 'Heading' in style or text.isupper():
                    num_str  = sub_m.group(1)       # "1.1"
                    sub_head = sub_m.group(2).strip()
                    top_num  = num_str.split('.')[0] # "1"

                    # Attach to correct parent (not just the currently active one)
                    if top_num in sections:
                        if current_top_id != top_num:
                            _flush_sub()
                            _flush_top()
                            current_top_id = top_num
                            is_in_sub = False
                        _flush_sub()
                        current_sub_title = sub_head
                        is_in_sub = True
                        continue
                    # If parent not yet seen, create it
                    elif top_num not in sections:
                        _new_section(top_num, f'Section {top_num}')
                        _flush_sub()
                        current_sub_title = sub_head
                        is_in_sub = True
                        continue

            # ─── Check for numbered top-level heading (e.g. "2. Introduction") ───
            num_m = SECTION_NUMBER_RE.match(text)
            matched_id    = None
            matched_title = text

            if num_m:
                num_val = int(num_m.group(1))
                if 1 <= num_val <= 30:
                    cand_title = num_m.group(2).strip()
                    # A true numbered section heading must be styled, bold, uppercase, or relatively short
                    if len(text) < 55 or bold or 'Heading' in style or text.isupper():
                        matched_id    = str(num_val)
                        matched_title = cand_title

            # ─── Check for keyword / style-based heading ───
            if not matched_id:
                is_style_head = (
                    'Heading' in style
                    or (bold and len(text) < 150 and fsize >= 11)
                    or (text.isupper() and 5 < len(text) < 150)
                )
                if is_style_head:
                    text_upper = text.upper()
                    # SoA keywords always get their own section
                    if any(kw in text_upper.lower() for kw in SOA_KW):
                        matched_id    = str(next_auto_id[0])
                        next_auto_id[0] += 1
                        matched_title = text
                    else:
                        for keyword, sid in SECTION_HEADING_MAP.items():
                            if keyword in text_upper:
                                matched_id    = sid
                                matched_title = text
                                break

            # ─── Open the new section ───
            if matched_id:
                _new_section(matched_id, matched_title)
                continue

            # ─── Regular content line ───
            if is_in_sub:
                current_sub_content.append(text)
            elif current_top_id:
                current_top_content.append(text)

        # Final flush
        _flush_sub()
        _flush_top()

        # Post-process: remove any section stubs (no content AND no subsections)
        # typically these are leftover TOC-like entries that slipped through
        to_remove = [
            sid for sid, sec in sections.items()
            if not sec.get('main', '').strip() and not sec.get('subsections')
        ]
        for sid in to_remove:
            del sections[sid]

        return sections



    # ──────────────────────────────────────────────
    # GROQ PIPELINE: 3 focused calls
    # ──────────────────────────────────────────────
    def _groq_pipeline(self, paragraphs, full_text, tables_data, soa_image_url, sections) -> dict:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        # ── Prepare text slices ──
        cover_text = self._smart_cover(paragraphs, full_text, budget=2500)
        synopsis_text = self._smart_synopsis_text(full_text, budget=4000)
        table_text = self._tables_to_pipe(tables_data, budget=5000)

        # ── Call 1: Metadata ──
        meta = self._groq_call(client, META_SYSTEM, META_PROMPT.format(text=cover_text),
                               max_tokens=1200, label="Metadata")

        # ── Call 2: Synopsis / criteria ──
        syn = self._groq_call(client, SYN_SYSTEM, SYN_PROMPT.format(text=synopsis_text),
                              max_tokens=2500, label="Synopsis")

        # ── Call 3: SoA ──
        soa = {"headers": [], "rows": []}
        if table_text.strip():
            soa = self._groq_call(client, SOA_SYSTEM, SOA_PROMPT.format(tables=table_text),
                                  max_tokens=3000, label="SoA")

        return self._assemble(meta, syn, soa, sections, soa_image_url, full_text)

    def _groq_call(self, client, system: str, user: str, max_tokens: int, label: str) -> dict:
        """Single Groq call with JSON mode. Returns parsed dict."""
        try:
            resp = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
                temperature=0.05,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content.strip()
            raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'```\s*$', '', raw, flags=re.MULTILINE)
            return json.loads(raw.strip())
        except Exception as e:
            logger.warning(f"Groq {label} call failed: {e}")
            return {}

    # ──────────────────────────────────────────────
    # SMART TEXT SLICES
    # ──────────────────────────────────────────────
    def _smart_cover(self, paragraphs, full_text, budget=2500) -> str:
        """First N chars — almost always contains title, number, PI, sponsor, date, version."""
        return full_text[:budget]

    def _smart_synopsis_text(self, full_text: str, budget=4000) -> str:
        """
        Slice text around key synopsis keywords so Groq sees only the relevant parts.
        This keeps token count low regardless of document size.
        """
        targets = [
            ('primary objective', 700),
            ('secondary objective', 600),
            ('primary endpoint', 700),
            ('secondary endpoint', 600),
            ('inclusion criteria', 900),
            ('exclusion criteria', 900),
            ('statistical method', 400),
            ('sample size', 300),
            ('number of patient', 300),
            ('exploratory', 400),
        ]
        parts = []
        used = 0
        text_lower = full_text.lower()

        for keyword, allot in targets:
            if used >= budget:
                break
            idx = text_lower.find(keyword)
            if idx == -1:
                continue
            snippet = full_text[max(0, idx - 100): idx + allot]
            tag = f"\n[{keyword.upper()}]\n{snippet}"
            parts.append(tag)
            used += len(tag)

        return '\n'.join(parts)[:budget] if parts else full_text[:budget]

    def _tables_to_pipe(self, tables_data: List, budget: int) -> str:
        """Format all extracted tables as pipe-separated text for Groq."""
        parts = []
        for i, tbl in enumerate(tables_data[:20]):
            rows_text = [" | ".join(str(c) for c in row) for row in tbl]
            parts.append(f"TABLE {i+1}:\n" + "\n".join(rows_text))
        return "\n\n".join(parts)[:budget]

    # ──────────────────────────────────────────────
    # ASSEMBLE FINAL RESULT
    # ──────────────────────────────────────────────
    def _assemble(self, meta, syn, soa, sections, soa_image_url, full_text) -> dict:
        result = self._empty_protocol()

        s   = lambda d, k: str(d.get(k) or '').strip()
        lst = lambda d, k: [str(v).strip() for v in (d.get(k) or []) if v and str(v).strip()]

        # ── Scalars from meta ──
        result['protocol_title']          = s(meta, 'protocol_title')
        result['protocol_number']         = s(meta, 'protocol_number')
        result['nct_number']              = s(meta, 'nct_number')
        result['principal_investigator']  = s(meta, 'principal_investigator')
        result['sponsor']                 = s(meta, 'sponsor')
        result['funded_by']               = s(meta, 'funded_by')
        result['version_number']          = s(meta, 'version_number') or 'v1.0'
        result['protocol_date']           = s(meta, 'protocol_date')

        # ── Approval details ──
        d = result['approval_data']['details']
        d['protocol_name']              = result['protocol_title']
        d['protocol_number']            = result['protocol_number']
        d['imp']                        = s(meta, 'imp')
        d['indication']                 = s(meta, 'indication')
        d['clinical_phase']             = s(meta, 'clinical_phase')
        d['investigators']              = result['principal_investigator']
        d['coordinating_investigator']  = s(meta, 'coordinating_investigator')
        d['expert_committee']           = s(meta, 'expert_committee')
        d['sponsor_name_address']       = s(meta, 'sponsor_name_address')

        # ── Synopsis overview ──
        ov = result['synopsis_data']['overview']
        ov['title']                     = result['protocol_title']
        ov['coordinating_investigator'] = s(meta, 'coordinating_investigator')
        ov['expert_committee']          = s(meta, 'expert_committee')
        ov['investigators']             = result['principal_investigator']
        ov['trial_sites']               = s(meta, 'trial_sites')
        ov['planned_period']            = s(meta, 'planned_period')
        ov['fpfv']                      = s(meta, 'fpfv')
        ov['lplv']                      = s(meta, 'lplv')
        ov['clinical_phase']            = s(meta, 'clinical_phase')

        # ── Objectives / Endpoints from synopsis call ──
        result['synopsis_data']['objectives']['primary']     = lst(syn, 'primary_objectives')
        result['synopsis_data']['objectives']['secondary']   = lst(syn, 'secondary_objectives')
        result['synopsis_data']['objectives']['exploratory'] = lst(syn, 'exploratory_objectives')
        result['synopsis_data']['endpoints']['primary']      = lst(syn, 'primary_endpoints')
        result['synopsis_data']['endpoints']['secondary']    = lst(syn, 'secondary_endpoints')
        result['synopsis_data']['endpoints']['exploratory']  = lst(syn, 'exploratory_endpoints')
        result['synopsis_data']['num_patients']              = s(meta, 'num_patients')
        result['synopsis_data']['statistical_methods']       = s(syn, 'statistical_methods')

        incl = lst(syn, 'inclusion_criteria')
        excl = lst(syn, 'exclusion_criteria')
        result['synopsis_data']['inclusion'] = {'text': '\n'.join(incl), 'points': incl}
        result['synopsis_data']['exclusion'] = {'text': '\n'.join(excl), 'points': excl}

        # ── Sections (structural, unlimited) ──
        result['sections'] = sections

        # ── SoA table ──
        CHECKS = {'1','x','✓','✔','y','yes','true','•','×','xi','checked','v'}
        g_hdrs = soa.get('headers', [])
        g_rows = soa.get('rows', [])

        if isinstance(g_hdrs, list) and g_hdrs and isinstance(g_rows, list) and g_rows:
            clean_hdrs = [str(h).strip() for h in g_hdrs if str(h).strip()]
            clean_rows = []
            for row in g_rows:
                if not isinstance(row, list) or not row:
                    continue
                proc = str(row[0]).strip()
                expected = max(0, len(clean_hdrs) - 1)
                cells = []
                for c in row[1:]:
                    cv = str(c).strip().lower()
                    cells.append('1' if cv in CHECKS else '0')
                while len(cells) < expected:
                    cells.append('0')
                clean_rows.append([proc] + cells[:expected])
            if clean_rows:
                result['soa_data']['table']['headers'] = clean_hdrs
                result['soa_data']['table']['rows']    = clean_rows
        else:
            # Regex SoA fallback
            result['soa_data'] = self._regex_soa(
                self._all_tables_as_data(full_text), soa_image_url
            )

        # Attach image if table empty
        if not result['soa_data']['table']['rows'] and soa_image_url:
            result['soa_data']['image'] = {
                'url': soa_image_url,
                'caption': 'Schedule of Activities (extracted from document)',
                'description': ''
            }

        return result

    # ──────────────────────────────────────────────
    # REGEX FALLBACK (full)
    # ──────────────────────────────────────────────
    def _regex_all(self, paragraphs, full_text, tables_data, soa_image_url, sections) -> dict:
        result = self._empty_protocol()

        phase = self._rx(full_text, [r'Phase\s*(I{1,3}[ab\/]?\d*)', r'Phase\s*([1-4][ab]?)'])
        result['protocol_title']          = self._title(paragraphs, full_text)
        result['protocol_number']         = self._rx(full_text, [r'Protocol\s+(?:No\.?|Number|ID|#)\s*[:\-]?\s*([A-Za-z0-9][\w\-\/]{2,30})'])
        result['nct_number']              = self._rx(full_text, [r'(NCT\d{6,12})'])
        result['principal_investigator']  = self._near(full_text, ['Principal Investigator', 'Lead Investigator'])
        result['sponsor']                 = self._near(full_text, ['Sponsor', 'Sponsor Name'])
        result['funded_by']               = self._near(full_text, ['Funded by', 'Funding Source'])
        result['version_number']          = self._rx(full_text, [r'[Vv]ersion\s*([\d\.]+)', r'[Vv]\.\s*([\d\.]+)']) or 'v1.0'
        result['protocol_date']           = self._rx(full_text, [r'(?:Protocol\s+)?Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})', r'(\d{4}-\d{2}-\d{2})'])

        result['approval_data']['details'].update({
            'protocol_name': result['protocol_title'],
            'imp': self._near(full_text, ['IMP', 'Investigational Medicinal Product', 'Study Drug']),
            'indication': self._near(full_text, ['Indication', 'Condition', 'Disease']),
            'clinical_phase': phase,
            'investigators': result['principal_investigator'],
            'coordinating_investigator': self._near(full_text, ['Coordinating Investigator']),
            'expert_committee': self._near(full_text, ['Ethics Committee', 'IRB', 'IEC']),
            'sponsor_name_address': result['sponsor'],
        })

        def bl(patterns):
            for p in patterns:
                m = re.search(p, full_text, re.IGNORECASE | re.DOTALL)
                if m:
                    raw = full_text[m.end(): m.end() + 2000]
                    stop = re.search(r'\n(?:[A-Z\d][A-Z\s]{4,}|\d+\.[\s])', raw)
                    if stop: raw = raw[:stop.start()]
                    lines = [re.sub(r'^[\s\u2022\u00b7\-\*\d\.]+', '', l).strip() for l in raw.split('\n')]
                    res = [l for l in lines if 5 < len(l) < 400][:25]
                    if res: return res
            return []

        incl = bl([r'Inclusion\s+Criteria\s*[:\n]'])
        excl = bl([r'Exclusion\s+Criteria\s*[:\n]'])
        result['synopsis_data'].update({
            'overview': {
                'title': result['protocol_title'],
                'coordinating_investigator': self._near(full_text, ['Coordinating Investigator']),
                'expert_committee': self._near(full_text, ['Ethics Committee', 'IRB']),
                'investigators': result['principal_investigator'],
                'trial_sites': self._near(full_text, ['Study Site', 'Clinical Site']),
                'planned_period': self._near(full_text, ['Study Duration', 'Planned Period']),
                'fpfv': self._rx(full_text, [r'FPFV[:\s]+([^\n]+)']),
                'lplv': self._rx(full_text, [r'LPLV[:\s]+([^\n]+)']),
                'clinical_phase': phase,
            },
            'objectives': {
                'primary': bl([r'Primary\s+Objective[s]?\s*[:\n]']),
                'secondary': bl([r'Secondary\s+Objective[s]?\s*[:\n]']),
                'exploratory': bl([r'Exploratory\s+Objective[s]?\s*[:\n]']),
            },
            'endpoints': {
                'primary': bl([r'Primary\s+(?:Efficacy\s+)?Endpoint[s]?\s*[:\n]']),
                'secondary': bl([r'Secondary\s+(?:Efficacy\s+)?Endpoint[s]?\s*[:\n]']),
                'exploratory': bl([r'Exploratory\s+Endpoint[s]?\s*[:\n]']),
            },
            'num_patients': self._rx(full_text, [r'(?:Sample\s+[Ss]ize|[Nn]umber\s+of\s+(?:[Ss]ubjects|[Pp]atients))[:\s]*(\d+)', r'N\s*=\s*(\d+)']),
            'inclusion': {'text': '\n'.join(incl), 'points': incl},
            'exclusion': {'text': '\n'.join(excl), 'points': excl},
            'statistical_methods': '',
        })

        result['sections'] = sections
        result['soa_data'] = self._regex_soa(tables_data, soa_image_url)
        return result

    def _regex_soa(self, tables_data, soa_image_url) -> dict:
        CHECKS = {'x','✓','✔','•','y','yes','1','true','*','×'}
        SOA_KW = {'visit','screening','baseline','procedure','assessment','week','day','enrollment'}
        best, best_score = None, 0
        for tbl in tables_data:
            if len(tbl) < 2: continue
            score = sum(1 for kw in SOA_KW if kw in ' '.join(str(c) for c in tbl[0]).lower())
            if score > best_score:
                best_score, best = score, tbl
        if best and best_score >= 1:
            rh = [str(h).strip() for h in best[0]]
            if rh and rh[0].lower() not in ['procedure', 'assessment', 'activity', 'parameter']:
                headers, offset = ['Procedure'] + rh, True
            else:
                headers, offset = rh, False
            rows = []
            for row in best[1:]:
                cells = [str(c).strip() for c in row]
                if not any(cells): continue
                proc = '' if offset else (cells[0] if cells else '')
                cks  = cells if offset else cells[1:]
                processed = [proc] + ['1' if c.lower() in CHECKS else '0' for c in cks]
                while len(processed) < len(headers): processed.append('0')
                rows.append(processed[:len(headers)])
            if rows:
                return {'table': {'headers': headers, 'rows': rows}, 'image': None}
        if soa_image_url:
            return {'table': {'headers': [], 'rows': []},
                    'image': {'url': soa_image_url, 'caption': 'Schedule of Activities (from document)', 'description': ''}}
        return {'table': {'headers': [], 'rows': []}, 'image': None}

    def _all_tables_as_data(self, full_text):
        """Placeholder — returns empty when called from assemble without real tables."""
        return []

    # ──────────────────────────────────────────────
    # SMALL HELPERS
    # ──────────────────────────────────────────────
    def _title(self, paragraphs, full_text) -> str:
        v = self._rx(full_text, [
            r'(?:Full\s+)?(?:Protocol\s+)?Title[:\s]+([^\n]{10,200})',
            r'TITLE[:\s]+([^\n]{10,200})',
        ])
        if v: return v
        for p in paragraphs[:15]:
            if ('Heading' in p.get('style', '') or p.get('bold')) and len(p['text']) > 20:
                return p['text']
        return ''

    def _rx(self, text: str, patterns: List[str]) -> str:
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
            if m: return m.group(1).strip()
        return ''

    def _near(self, text: str, headings: List[str]) -> str:
        for h in headings:
            m = re.search(rf'(?:{re.escape(h)})\s*[:\.\-\n]\s*([^\n]{{3,300}})', text, re.IGNORECASE)
            if m: return m.group(1).strip()
        return ''

    def _save_image(self, img_bytes: bytes, ext: str, upload_dir: str) -> Optional[str]:
        try:
            os.makedirs(upload_dir, exist_ok=True)
            fname = f"{uuid.uuid4()}.{ext.lstrip('.').lower() or 'png'}"
            with open(os.path.join(upload_dir, fname), 'wb') as f:
                f.write(img_bytes)
            return f"/uploads/{fname}"
        except Exception as e:
            logger.warning(f"Image save: {e}")
            return None

    def _empty_protocol(self) -> dict:
        return {
            'protocol_title': '', 'protocol_number': '', 'nct_number': '',
            'principal_investigator': '', 'sponsor': '', 'funded_by': '',
            'version_number': 'v1.0', 'protocol_date': '',
            'sections': {}, 'synopsis': {}, 'schema_data': {'images': []},
            'approval_data': {
                'details': {
                    'protocol_name': '', 'protocol_number': '', 'imp': '', 'indication': '',
                    'clinical_phase': '', 'investigators': '', 'coordinating_investigator': '',
                    'expert_committee': '', 'sponsor_name_address': '',
                    'gcp_statement': '', 'approval_statement': ''
                },
                'sponsor_reps': [], 'cro_reps': [],
                'investigator_agreement': {
                    'description': '', 'signature': None, 'name': '', 'title': '',
                    'facility': '', 'city': '', 'state': '', 'date': ''
                },
                'amendments': []
            },
            'synopsis_data': {
                'overview': {
                    'title': '', 'coordinating_investigator': '', 'expert_committee': '',
                    'investigators': '', 'trial_sites': '', 'planned_period': '',
                    'fpfv': '', 'lplv': '', 'clinical_phase': ''
                },
                'objectives':  {'primary': [], 'secondary': [], 'exploratory': []},
                'endpoints':   {'primary': [], 'secondary': [], 'exploratory': []},
                'flowcharts': [], 'num_patients': '',
                'inclusion':   {'text': '', 'points': []},
                'exclusion':   {'text': '', 'points': []},
                'team': {'investigator_desc': '', 'coordinator_desc': ''},
                'tables': [], 'statistical_methods': ''
            },
            'section3': {
                'description': '',
                'image': {'url': None, 'caption': '', 'description': ''},
                'table': {'headers': ['Type', 'Objectives', 'Endpoints'], 'rows': []}
            },
            'soa_data': {'table': {'headers': [], 'rows': []}, 'image': None},
            'objectives_endpoints': [], 'abbreviations': [],
            'amendment_history': [], 'appendices': []
        }


document_parser = DocumentParser()
