from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict
from typing import Dict, List, Optional, Any
import os
from datetime import datetime
import json
import uuid
import io
import logging
import re
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from document_generator import generate_complete_word_document, generate_interpreted_word_report
from pdf_generator import generate_pdf_document, generate_interpreted_pdf_report
from qc_engine import qc_engine
from database import init_db, execute_query
from storage_engine import storage_engine
from section_pdf_generator import section_pdf_generator
from document_parser import document_parser
from fastapi.responses import StreamingResponse
import io

app = FastAPI(title="Clinical Trial Protocol Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BaseProtocolModel(BaseModel):
    model_config = ConfigDict(extra='allow')

class SectionData(BaseProtocolModel):
    main: Optional[str] = ""
    title: Optional[str] = ""
    subsections: List[Any] = []
    notes: Optional[str] = ""
    images: Optional[List[Dict[str, Any]]] = []

class ApprovalDetails(BaseProtocolModel):
    protocol_name: Optional[str] = ""
    protocol_number: Optional[str] = ""
    imp: Optional[str] = ""
    indication: Optional[str] = ""
    clinical_phase: Optional[str] = ""
    investigators: Optional[str] = ""
    coordinating_investigator: Optional[str] = ""
    expert_committee: Optional[str] = ""
    sponsor_name_address: Optional[str] = ""
    gcp_statement: Optional[str] = ""
    approval_statement: Optional[str] = ""

class InvestigatorAgreement(BaseProtocolModel):
    description: Optional[str] = ""
    signature: Optional[str] = None
    name: Optional[str] = ""
    title: Optional[str] = ""
    facility: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    date: Optional[str] = ""

class Representative(BaseProtocolModel):
    name: Optional[str] = ""
    title: Optional[str] = ""
    organization: Optional[str] = ""
    date: Optional[str] = ""
    signature: Optional[str] = None

class ApprovalData(BaseProtocolModel):
    details: ApprovalDetails = ApprovalDetails()
    sponsor_reps: List[Representative] = []
    cro_reps: List[Representative] = []
    investigator_agreement: InvestigatorAgreement = InvestigatorAgreement()
    amendments: List[Dict[str, Any]] = []

class SynopsisOverview(BaseProtocolModel):
    title: Optional[str] = ""
    coordinating_investigator: Optional[str] = ""
    expert_committee: Optional[str] = ""
    investigators: Optional[str] = ""
    trial_sites: Optional[str] = ""
    planned_period: Optional[str] = ""
    fpfv: Optional[str] = ""
    lplv: Optional[str] = ""
    clinical_phase: Optional[str] = ""

class SynopsisItems(BaseProtocolModel):
    primary: List[Any] = []
    secondary: List[Any] = []
    exploratory: List[Any] = []

class SynopsisPoints(BaseProtocolModel):
    text: Optional[str] = ""
    points: List[Any] = []

class SynopsisTeam(BaseProtocolModel):
    investigator_desc: Optional[str] = ""
    coordinator_desc: Optional[str] = ""

class SynopsisData(BaseProtocolModel):
    overview: SynopsisOverview = SynopsisOverview()
    objectives: SynopsisItems = SynopsisItems()
    endpoints: SynopsisItems = SynopsisItems()
    flowcharts: List[Any] = []
    num_patients: Optional[str] = ""
    inclusion: SynopsisPoints = SynopsisPoints()
    exclusion: SynopsisPoints = SynopsisPoints()
    team: SynopsisTeam = SynopsisTeam()
    tables: List[Any] = []
    statistical_methods: Optional[str] = ""
    flowchart_title: Optional[str] = ""
    flowchart_description: Optional[str] = ""

class ProtocolData(BaseProtocolModel):
    id: Optional[str] = None
    protocol_title: str = "Clinical Trial Protocol"
    protocol_number: str = ""
    nct_number: str = ""
    principal_investigator: str = ""
    sponsor: str = ""
    funded_by: str = ""
    version_number: str = "v1.0"
    protocol_date: str = datetime.now().strftime("%Y-%m-%d")

    sections: Dict[str, SectionData] = {}

    synopsis: Dict[str, str] = {}
    synopsis_data: Optional[SynopsisData] = SynopsisData()
    approval_data: Optional[ApprovalData] = ApprovalData()
    schema_data: Dict[str, Any] = {"images": [], "image_url": None}
    section3: Dict[str, Any] = {
        "description": "",
        "image": {"url": None, "caption": "", "description": ""},
        "table": {"headers": ["Type", "Objectives", "Endpoints"], "rows": []}
    }
    soa_data: Dict[str, Any] = {
        "table": {
            "headers": [],
            "rows": {}
        }
    }
    objectives_endpoints: List[Dict[str, str]] = []
    abbreviations: List[Dict[str, str]] = []
    amendment_history: List[Dict[str, str]] = []
    appendices: List[Dict[str, Any]] = []

    summary_changes: Optional[str] = ""
    images: Optional[List[Dict[str, Any]]] = []

class LoginRequest(BaseModel):
    username: str
    password: str

class QCReportItem(BaseModel):
    section_name: str
    missing_item: str
    severity: str
    status: str = "Pending"

@app.post("/api/login")
async def login(data: LoginRequest):
    try:
        # For this demo/trial, we use direct password comparison. 
        # In production, we would use bcrypt/argon2 hashing.
        query = "SELECT user_id, username, full_name, email, status FROM users WHERE username = %s AND password = %s"
        users = execute_query(query, (data.username, data.password), fetch=True)
        
        if users:
            user = users[0]
            # Update last login
            execute_query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = %s", (user['user_id'],))
            return {
                "status": "success",
                "message": "Login successful",
                "user": user
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid username or password")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during login")

@app.on_event("startup")
async def startup_event():
    # Initialize database tables
    success = init_db()
    if success:
        logger.info("Database initialized successfully")
    else:
        logger.warning("Database initialization skipped or failed (check connection)")

protocols_store = {}

@app.get("/")
async def root():
    return {
        "message": "Clinical Trial Protocol Generator API",
        "version": "1.0.0",
        "endpoints": {
            "GET /api/template-structure": "Get template structure",
            "POST /api/save-protocol": "Save protocol data",
            "GET /api/protocol/{id}": "Get protocol by ID",
            "POST /api/generate-word": "Generate Word document",
            "POST /api/generate-pdf": "Generate PDF document",
            "POST /api/generate-section-pdf": "Generate PDF for specific section",
            "POST /api/upload-image": "Upload image",
            "POST /api/check-qc": "Run quality check on protocol",
            "GET /health": "Health check"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/template-structure")
async def get_template_structure():
    structure = {
        "sections": [
            {
                "id": 1,
                "title": "PROTOCOL SUMMARY",
                "subsections": [
                    "Synopsis",
                    "Schema",
                    "Schedule of Activities (SoA)"
                ]
            },
            {
                "id": 2,
                "title": "INTRODUCTION",
                "subsections": [
                    "Study Rationale",
                    "Background",
                    "Risk/Benefit Assessment",
                    "Known Potential Risks",
                    "Known Potential Benefits",
                    "Assessment of Potential Risks and Benefits"
                ]
            },
            {
                "id": 3,
                "title": "OBJECTIVES AND ENDPOINTS",
                "subsections": []
            },
            {
                "id": 4,
                "title": "STUDY DESIGN",
                "subsections": [
                    "Overall Design",
                    "Scientific Rationale for Study Design",
                    "Justification for Dose",
                    "End of Study Definition"
                ]
            },
            {
                "id": 5,
                "title": "STUDY POPULATION",
                "subsections": [
                    "Inclusion Criteria",
                    "Exclusion Criteria",
                    "Lifestyle Considerations",
                    "Screen Failures",
                    "Strategies for Recruitment and Retention"
                ]
            },
            {
                "id": 6,
                "title": "STUDY INTERVENTION",
                "subsections": [
                    "Study Intervention(s) Administration",
                    "Study Intervention Description",
                    "Dosing and Administration",
                    "Preparation/Handling/Storage/Accountability",
                    "Acquisition and accountability",
                    "Formulation, Appearance, Packaging, and Labeling",
                    "Product Storage and Stability",
                    "Preparation",
                    "Measures to Minimize Bias: Randomization and Blinding",
                    "Study Intervention Compliance",
                    "Concomitant Therapy",
                    "Rescue Medicine"
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
                    "Efficacy Assessments",
                    "Safety and Other Assessments",
                    "Adverse Events and Serious Adverse Events",
                    "Definition of Adverse Events (AE)",
                    "Definition of Serious Adverse Events (SAE)",
                    "Classification of an Adverse Event",
                    "Time Period and Frequency for Event Assessment and Follow-Up",
                    "Adverse Event Reporting",
                    "Serious Adverse Event Reporting",
                    "Reporting Events to Participants",
                    "Events of Special Interest",
                    "Reporting of Pregnancy",
                    "Unanticipated Problems",
                    "Definition of Unanticipated Problems (UP)",
                    "Unanticipated Problem Reporting",
                    "Reporting Unanticipated Problems to Participants"
                ]
            },
            {
                "id": 9,
                "title": "STATISTICAL CONSIDERATIONS",
                "subsections": [
                    "Statistical Hypotheses",
                    "Sample Size Determination",
                    "Populations for Analyses",
                    "Statistical Analyses",
                    "General Approach",
                    "Analysis of the Primary Efficacy Endpoint(s)",
                    "Analysis of the Secondary Endpoint(s)",
                    "Safety Analyses",
                    "Baseline Descriptive Statistics",
                    "Planned Interim Analyses",
                    "Sub-Group Analyses",
                    "Tabulation of Individual participant Data",
                    "Exploratory Analyses"
                ]
            },
            {
                "id": 10,
                "title": "SUPPORTING DOCUMENTATION AND OPERATIONAL CONSIDERATIONS",
                "subsections": [
                    "Regulatory, Ethical, and Study Oversight Considerations",
                    "Informed Consent Process",
                    "Study Discontinuation and Closure",
                    "Confidentiality and Privacy",
                    "Future Use of Stored Specimens and Data",
                    "Key Roles and Study Governance",
                    "Safety Oversight",
                    "Clinical Monitoring",
                    "Quality Assurance and Quality Control",
                    "Data Handling and Record Keeping",
                    "Protocol Deviations",
                    "Publication and Data Sharing Policy",
                    "Conflict of Interest Policy",
                    "Additional Considerations",
                    "Abbreviations",
                    "Protocol Amendment History"
                ]
            },
            {
                "id": 11,
                "title": "REFERENCES",
                "subsections": []
            }
        ]
    }
    return structure

@app.post("/api/save-protocol")
async def save_protocol(request: Request):
    try:
        body = await request.json()
        logger.info(f"Received save request for: {body.get('protocol_title')}")
        
        try:
            data = ProtocolData(**body)
        except Exception as ve:
            logger.error(f"Validation error: {str(ve)}")
            # Log the keys to see what extra/missing fields we have
            logger.error(f"Received keys: {list(body.keys())}")
            raise HTTPException(status_code=422, detail=f"Data validation failed: {str(ve)}")

        protocol_id = data.id if data.id else str(uuid.uuid4())
        
        protocols_store[protocol_id] = {
            "id": protocol_id,
            "created_at": protocols_store.get(protocol_id, {}).get("created_at", datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat(),
            "data": data.model_dump()
        }

        output_dir = "saved_protocols"
        os.makedirs(output_dir, exist_ok=True)
        filename = f"{protocol_id}.json"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w') as f:
            json.dump(protocols_store[protocol_id], f, indent=2)

        logger.info(f"Triggering DB save for {protocol_id}. Synopsis data present: {True if data.synopsis_data else False}")
        if data.synopsis_data:
            logger.info(f"Inclusion points count: {len(data.synopsis_data.inclusion.points)}")

        # Non-blocking database storage (Engine integration)
        try:
            logger.info(f"Triggering DB save for {protocol_id}")
            db_id = storage_engine.save_protocol_to_db(data.model_dump(), external_id=protocol_id)
            if not db_id:
                raise Exception("Storage engine failed to return a valid protocol_id")
        except Exception as db_err:
            logger.exception(f"CRITICAL: Failed to save to structured database: {str(db_err)}")
            # Surface this to the user so they know why PDF generation might fail later
            raise HTTPException(status_code=500, detail=f"Database storage failed: {str(db_err)}. Please ensure PostgreSQL is running.")
            # We don't raise here to keep it non-blocking as requested

        logger.info(f"Protocol saved successfully with ID: {protocol_id}, DB ID: {db_id}")
        return {
            "id": protocol_id,
            "protocol_id": db_id,
            "message": "Protocol saved successfully",
            "created_at": protocols_store[protocol_id]["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in save_protocol: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save protocol: {str(e)}")

@app.get("/api/protocol/{protocol_id}")
async def get_protocol(protocol_id: str):
    if protocol_id not in protocols_store:
        filepath = f"saved_protocols/{protocol_id}.json"
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                protocols_store[protocol_id] = json.load(f)
        else:
            raise HTTPException(status_code=404, detail="Protocol not found")

    return protocols_store[protocol_id]

@app.post("/api/generate-word")
async def generate_word(data: ProtocolData):
    try:
        logger.info(f"Generating Word document for version {data.version_number}")
        file_path = generate_complete_word_document(data.model_dump())
        logger.info(f"Word document generated: {file_path}")
        with open(file_path, 'rb') as f:
            file_content = f.read()
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename=protocol_{data.version_number}.docx",
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
        )
    except Exception as e:
        import traceback
        with open('debug_error.log', 'a') as f:
            f.write("\n=== GENERATE WORD ERROR ===\n")
            traceback.print_exc(file=f)
        logger.error(f"Failed to generate Word document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate Word document: {str(e)}")

@app.post("/api/generate-pdf")
async def generate_pdf(data: ProtocolData):
    try:
        logger.info(f"Generating PDF document for version {data.version_number}")
        file_path = generate_pdf_document(data.model_dump())
        logger.info(f"PDF document generated: {file_path}")
        with open(file_path, 'rb') as f:
            file_content = f.read()
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=protocol_{data.version_number}.pdf",
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        logger.error(f"Error in generate_pdf: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF document: {str(e)}")

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    try:
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")

        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)

        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)

        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        return {
            "filename": unique_filename,
            "original_name": file.filename,
            "url": f"/uploads/{unique_filename}",
            "content_type": file.content_type,
            "size": len(content),
            "uploaded_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@app.post("/api/parse-protocol-document")
async def parse_protocol_document(file: UploadFile = File(...)):
    """
    Accepts a .docx or .pdf protocol document, parses it using
    document_parser.py, and returns structured JSON matching the
    ProtocolContext shape so the frontend can auto-populate all fields.
    """
    try:
        allowed_extensions = ['.docx', '.doc', '.pdf']
        filename = file.filename or 'upload'
        ext = os.path.splitext(filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Please upload a .docx, .doc, or .pdf file."
            )

        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        logger.info(f"Parsing protocol document: {filename} ({len(content)} bytes)")

        upload_dir = "uploads"
        parsed_data = document_parser.parse(content, filename, upload_dir)

        # Count how many fields were extracted for reporting
        extracted_count = sum([
            1 if parsed_data.get('protocol_title') else 0,
            1 if parsed_data.get('protocol_number') else 0,
            1 if parsed_data.get('nct_number') else 0,
            1 if parsed_data.get('principal_investigator') else 0,
            1 if parsed_data.get('sponsor') else 0,
            len(parsed_data.get('synopsis_data', {}).get('inclusion', {}).get('points', [])),
            len(parsed_data.get('synopsis_data', {}).get('exclusion', {}).get('points', [])),
            len(parsed_data.get('synopsis_data', {}).get('endpoints', {}).get('primary', [])),
            len(parsed_data.get('sections', {})),
        ])

        soa_table = parsed_data.get('soa_data', {}).get('table', {})
        soa_raw_rows = soa_table.get('rows', [])
        soa_rows = len(soa_raw_rows) if isinstance(soa_raw_rows, (list, dict)) else 0
        soa_hdrs = len(soa_table.get('headers', []))
        has_soa_image = bool(parsed_data.get('soa_data', {}).get('image'))

        logger.info(f"Parsed '{filename}': {extracted_count} fields extracted")
        logger.info(f"  -> SoA: {soa_rows} rows x {soa_hdrs} visit columns, image={has_soa_image}")
        logger.info(f"  -> Sections: {len(parsed_data.get('sections', {}))} | Synopsis objectives: {len((parsed_data.get('synopsis_data') or {}).get('objectives', {}).get('primary', []))} primary")

        return {
            "status": "success",
            "filename": filename,
            "stats": {
                "fields_extracted": extracted_count,
                "sections_found": len(parsed_data.get('sections', {})),
                "soa_rows": soa_rows,
                "soa_image": has_soa_image,
            },
            "data": parsed_data
        }

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception(f"Error parsing protocol document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")

@app.post("/api/check-qc", response_model=List[QCReportItem])
async def check_qc(data: ProtocolData):
    try:
        report = qc_engine.run_qc(data.model_dump())
        return report
    except Exception as e:
        logger.error(f"Error in check_qc: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to run QC: {str(e)}")

@app.post("/api/generate-section-pdf")
async def generate_section_pdf(request: Request):
    try:
        body = await request.json()
        protocol_id = body.get("protocol_id")
        section_name = body.get("section_name")
        
        if not protocol_id or not section_name:
            raise HTTPException(status_code=400, detail="Missing protocol_id or section_name")

        logger.info(f"Requesting PDF for protocol: {protocol_id}, section: {section_name}")

        # 1. Fetch section from DB
        query = """
            SELECT s.id, s.section_name, s.raw_text 
            FROM protocol_sections s
            JOIN protocol_metadata m ON s.protocol_id = m.protocol_id
            WHERE m.external_id = %s::uuid AND TRIM(s.section_name) ILIKE TRIM(%s)
        """
        section = execute_query(query, (protocol_id, section_name), fetch=True)
        logger.info(f"DB search returned: {len(section) if section else 0} sections for search: '{section_name}' and protocol: {protocol_id}")
        
        if not section:
            # Diagnostic: What sections DO exist?
            all_sections_query = "SELECT s.section_name FROM protocol_sections s JOIN protocol_metadata m ON s.protocol_id = m.protocol_id WHERE m.external_id = %s::uuid"
            existing = execute_query(all_sections_query, (protocol_id,), fetch=True)
            sections_list = [e['section_name'] for e in existing] if existing else []
            logger.warning(f"Section not found. Available sections for this protocol ID: {sections_list}")
            raise HTTPException(status_code=404, detail=f"Section '{section_name}' not found. Available: {', '.join(sections_list)}")
            
        section = section[0]
        
        # 2. Fetch structured fields
        query = "SELECT field_name, field_value FROM structured_fields WHERE section_id = %s"
        fields = execute_query(query, (section['id'],), fetch=True)
        
        # 3. Generate PDF
        pdf_buffer = section_pdf_generator.generate_section_pdf(
            section['section_name'], 
            section['raw_text'], 
            fields or []
        )
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=section_{section_name.replace(' ', '_')}.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating section PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate section PDF: {str(e)}")

@app.get("/uploads/{filename}")
async def get_uploaded_image(filename: str):
    file_path = f"uploads/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")

    if filename.lower().endswith('.jpg') or filename.lower().endswith('.jpeg'):
        media_type = "image/jpeg"
    elif filename.lower().endswith('.png'):
        media_type = "image/png"
    elif filename.lower().endswith('.gif'):
        media_type = "image/gif"
    else:
        media_type = "application/octet-stream"

    return FileResponse(file_path, media_type=media_type)

@app.get("/api/test-data")
async def get_test_data():
    return {
        "protocol_title": "A Phase 2 Randomized Clinical Trial of Drug X for Treatment of Condition Y",
        "protocol_number": "PROTO-2023-001",
        "nct_number": "NCT12345678",
        "principal_investigator": "Dr. Jane Smith, MD",
        "sponsor": "University Medical Center",
        "funded_by": "National Institutes of Health",
        "version_number": "v2.1",
        "protocol_date": "2023-10-15",
        "summary_changes": "Updated inclusion criteria and added new safety assessments."
    }

@app.get("/api/dashboard/{protocol_id}")
async def get_dashboard_data(protocol_id: int):
    """
    Returns aggregated metrics for the Protocol Intelligence Dashboard.
    """
    try:
        # 1. Overview & Progress
        progress_query = "SELECT * FROM protocol_progress WHERE protocol_id = %s"
        progress_res = execute_query(progress_query, (protocol_id,), fetch=True)
        progress = progress_res[0] if progress_res else {
            "progress_percentage": 0, "qc_score": 0, "completed_sections_count": 0, 
            "total_sections": 11, "word_count": 0, "last_edited_section": "None"
        }

        # 2. Entity Distribution (Endpoints, Objectives, etc.)
        entity_query = """
            SELECT entity_category, COUNT(*) as count 
            FROM protocol_entities 
            WHERE protocol_id = %s 
            GROUP BY entity_category
        """
        entity_counts = execute_query(entity_query, (protocol_id,), fetch=True)
        counts = {item['entity_category']: item['count'] for item in entity_counts} if entity_counts else {}

        # 3. Demographic Splits (Gender)
        gender_query = """
            SELECT entity_value, COUNT(*) as count 
            FROM protocol_entities 
            WHERE protocol_id = %s AND entity_category = 'demographic' AND entity_key = 'Gender'
            GROUP BY entity_value
        """
        gender_res = execute_query(gender_query, (protocol_id,), fetch=True)
        gender_data = {item['entity_value']: item['count'] for item in gender_res} if gender_res else {}

        # 4. Age Groups
        # This requires some smart parsing or just returning raw age entities for frontend to group
        age_query = """
            SELECT entity_value 
            FROM protocol_entities 
            WHERE protocol_id = %s AND entity_category = 'demographic' AND entity_key = 'Age'
        """
        age_res = execute_query(age_query, (protocol_id,), fetch=True)
        # Simplify age grouping for the API
        age_groups = {"<18": 0, "18-65": 0, ">65": 0}
        if age_res:
            for item in age_res:
                val = item['entity_value'].lower()
                if '<' in val or 'below' in val: age_groups["<18"] += 1
                elif '>' in val or 'above' in val or 'over' in val: age_groups[">65"] += 1
                else: age_groups["18-65"] += 1

        # 5. Calculate Complexity Score
        # Formula: total_endpoints + total_inclusion + total_exclusion + total_safety_measures + total_study_arms
        endpoints = counts.get('primary_endpoint', 0) + counts.get('secondary_endpoint', 0) + counts.get('exploratory_endpoint', 0)
        inclusion = counts.get('inclusion_criteria', 0)
        exclusion = counts.get('exclusion_criteria', 0)
        safety = counts.get('safety_measure', 0)
        arms = counts.get('study_arm', 0)
        
        complexity_score = endpoints + inclusion + exclusion + safety + arms

        return {
            "overview": {
                "protocol_id": protocol_id,
                "complexity_score": complexity_score,
                "complexity_rank": "High" if complexity_score > 20 else ("Medium" if complexity_score > 10 else "Low")
            },
            "progressMetrics": progress,
            "entityDistribution": counts,
            "populationMetrics": {
                "gender": gender_data,
                "age_groups": age_groups,
                "inclusion": inclusion,
                "exclusion": exclusion
            },
            "safetyMetrics": {
                "total_measures": safety,
                "details": counts.get('safety_measure', 0) # Could be more granular if we had keys
            },
            "designIntelligence": {
                "study_arms": arms,
                "dosages": counts.get('dosage', 0),
                "timeline_events": counts.get('timeline', 0)
            }
        }
    except Exception as e:
        logger.error(f"Dashboard Data Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching dashboard metrics")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
@app.post("/api/generate-interpreted-report")
async def generate_interpreted_report(request: Request):
    try:
        body = await request.json()
        protocol_id = body.get("protocol_id")
        report_format = body.get("format", "word").lower()
        
        if not protocol_id:
            raise HTTPException(status_code=400, detail="protocol_id is required")

        if report_format == "word":
            doc = generate_interpreted_word_report(protocol_id)
            buffer = io.BytesIO()
            doc.save(buffer)
            buffer.seek(0)
            return StreamingResponse(
                buffer,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": f"attachment; filename=Protocol_{protocol_id}_Interpreted.docx"}
            )
        elif report_format == "pdf":
            buffer = generate_interpreted_pdf_report(protocol_id)
            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=Protocol_{protocol_id}_Interpreted.pdf"}
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use 'word' or 'pdf'")
            
    except Exception as e:
        logger.exception("Error generating interpreted report")


@app.get("/api/get-protocol-interpretation/{protocol_id}")
async def get_protocol_interpretation(protocol_id: int):
    try:
        query = """
            SELECT field_name, field_value, confidence_score
            FROM protocol_interpretation
            WHERE protocol_id = %s
            ORDER BY field_name
        """
        rows = execute_query(query, (protocol_id,), fetch=True)
        if rows is None:
            raise HTTPException(status_code=500, detail="Database error")
        
        return {
            "protocol_id": protocol_id,
            "fields": [
                {
                    "field_name": r["field_name"],
                    "field_value": r["field_value"],
                    "confidence_score": float(r["confidence_score"] or 1.0)
                }
                for r in rows
            ]
        }
    except Exception as e:
        logger.exception("Error fetching protocol interpretation")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/save-protocol-interpretation")
async def save_protocol_interpretation(request: Request):
    try:
        body = await request.json()
        protocol_id = body.get("protocol_id")
        fields = body.get("fields", [])

        if not protocol_id:
            raise HTTPException(status_code=400, detail="protocol_id is required")

        for field in fields:
            storage_engine.upsert_protocol_interpretation(
                protocol_id,
                field.get("field_name"),
                field.get("field_value", ""),
                float(field.get("confidence_score", 1.0))
            )

        return {"status": "ok", "updated": len(fields)}
    except Exception as e:
        logger.exception("Error saving protocol interpretation")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/re-extract-interpretation/{protocol_id}")
async def re_extract_interpretation(protocol_id: int):
    """
    Deletes all existing interpretation rows for this protocol,
    then re-fetches the saved protocol_data from DB and runs fresh extraction.
    """
    try:
        # 1. Fetch the saved protocol data from DB
        proto_row = execute_query(
            "SELECT protocol_data FROM protocol_master WHERE id = %s",
            (protocol_id,), fetch=True
        )
        if not proto_row:
            raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found in protocol_master")

        import json as json_mod
        protocol_data = proto_row[0].get('protocol_data') or {}
        if isinstance(protocol_data, str):
            protocol_data = json_mod.loads(protocol_data)

        # 2. Wipe old interpretation rows for this protocol
        execute_query(
            "DELETE FROM protocol_interpretation WHERE protocol_id = %s",
            (protocol_id,), fetch=False
        )

        # 3. Re-run extraction with fresh formatting
        storage_engine._extract_interpreted_fields(protocol_id, protocol_data)

        # 4. Return fresh data
        rows = execute_query(
            "SELECT field_name, field_value, confidence_score FROM protocol_interpretation WHERE protocol_id = %s ORDER BY field_name",
            (protocol_id,), fetch=True
        )
        return {
            "status": "ok",
            "protocol_id": protocol_id,
            "fields": [
                {"field_name": r["field_name"], "field_value": r["field_value"], "confidence_score": float(r["confidence_score"] or 1.0)}
                for r in (rows or [])
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error re-extracting interpretation")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/render-preview")
async def render_preview(request: Request):
    """
    Converts the full ProtocolData object into a richly styled HTML string
    for the live Document Preview tab. Self-contained, no file I/O.
    """
    try:
        body = await request.json()
        pd_data = body  # protocol data dict
        
        # If no real data has been extracted yet, show an empty state.
        # This prevents the preview from showing blank section headers when the user just opened the app.
        if not pd_data.get('protocol_title') and not pd_data.get('sections'):
            return JSONResponse(content={"html": "<div style='display:flex; justify-content:center; align-items:center; height:100%; color:#9ca3af; font-size:12pt; font-style:italic; font-family:Calibri;'>No document imported yet. Please import and generate a protocol first.</div>"})

        def e(text):
            if not text:
                return ""
            return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        def rhs(html_text):
            """Pass through already-formatted HTML from parser."""
            return str(html_text or '')

        parts = []

        # ── CSS ──────────────────────────────────────────────────────────────
        parts.append("""
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Calibri', 'Segoe UI', sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; margin: 0; padding: 0; }
          h1.sec { font-size: 14pt; font-weight: 700; color: #0d1f3c; border-bottom: 2.5px solid #22c55e; padding-bottom: 6px; margin-top: 36px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
          h2.sub { font-size: 12pt; font-weight: 700; color: #1a3a5c; margin-top: 22px; margin-bottom: 8px; }
          h3.subsub { font-size: 11pt; font-weight: 600; color: #2c5282; margin-top: 14px; margin-bottom: 6px; }
          p { margin: 6px 0 8px 0; text-align: justify; }
          ul { margin: 4px 0 8px 28px; padding: 0; }
          li { margin-bottom: 4px; }

          /* ── Title block ── */
          .title-block { text-align: center; margin-bottom: 36px; padding: 28px 32px; background: transparent; border: none; }
          .title-block h1 { font-size: 15pt; font-weight: 900; color: #0d1f3c; margin: 0 0 12px 0; line-height: 1.3; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; max-width: 600px; margin: 0 auto; text-align: left; font-size: 9.5pt; }
          .meta-item b { color: #166534; }

          /* ── Compliance callout ── */
          .compliance { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; font-size: 10pt; border-radius: 0 6px 6px 0; }

          /* ── Page break ── */
          .page-break { margin: 36px 0; border: none; border-top: 2px dashed #e5e7eb; }

          /* ── TOC table ── */
          .toc-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
          .toc-table tr:hover { background: #f9fafb; }
          .toc-num  { width: 60px; font-weight: 700; color: #0d1f3c; padding: 4px 8px 4px 0; vertical-align: top; white-space: nowrap; }
          .toc-title { padding: 4px 8px; color: #1a1a1a; vertical-align: top; }
          .toc-dots  { border-bottom: 1px dotted #9ca3af; flex: 1; min-width: 20px; }
          .toc-page  { width: 40px; text-align: right; color: #6b7280; font-weight: 600; padding: 4px 0 4px 8px; white-space: nowrap; vertical-align: top; }
          .toc-l0 .toc-title { font-weight: 700; color: #0d1f3c; }
          .toc-l1 .toc-num, .toc-l1 .toc-title { padding-left: 20px; color: #374151; font-size: 9.5pt; }
          .toc-l2 .toc-num, .toc-l2 .toc-title { padding-left: 40px; color: #6b7280; font-size: 9pt; }

          /* ── SoA table (clinical format) ── */
          .soa-container { overflow-x: auto; margin: 12px 0; border: 1px solid #cbd5e1; border-radius: 6px; }
          .soa-table { border-collapse: collapse; font-size: 8pt; min-width: 100%; }
          .soa-table thead tr { background: #0d1f3c; }
          .soa-table thead th { color: white; padding: 7px 6px; text-align: center; font-weight: 700; border: 1px solid #1e3a5f; white-space: nowrap; font-size: 7.5pt; }
          .soa-table thead th.proc-hdr { text-align: left; min-width: 180px; font-size: 8pt; background: #0a172e; }
          .soa-table tbody tr:nth-child(even) { background: #f8fafc; }
          .soa-table tbody tr:hover { background: #f0fdf4; }
          .soa-table td { border: 1px solid #e2e8f0; padding: 5px 6px; text-align: center; vertical-align: middle; }
          .soa-table td.proc-cell { text-align: left; font-weight: 600; color: #1e293b; background: #f8fafc; min-width: 180px; padding-left: 10px; }
          .soa-table td.proc-cell.category { background: #e8f4fd; font-weight: 700; color: #0d1f3c; font-size: 8.5pt; }
          .chk { color: #16a34a; font-size: 12pt; font-weight: 900; line-height: 1; }

          /* ── Content tables (Objectives / Abbreviations) ── */
          .content-table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
          .content-table th { background: #1e3a5f; color: white; padding: 8px 10px; text-align: left; font-weight: 700; }
          .content-table td { border: 1px solid #d1d5db; padding: 6px 10px; vertical-align: top; }
          .content-table tr:nth-child(even) td { background: #f9fafb; }
        </style>
        """)

        # ── TITLE PAGE ───────────────────────────────────────────────────────
        parts.append(f"""
        <div class="title-block">
          <h1>{e(pd_data.get('protocol_title') or 'Clinical Trial Protocol')}</h1>
          <div class="meta-grid">
            <div class="meta-item"><b>Protocol No:</b> {e(pd_data.get('protocol_number',''))}</div>
            <div class="meta-item"><b>NCT No:</b> {e(pd_data.get('nct_number',''))}</div>
            <div class="meta-item"><b>Principal Investigator:</b> {e(pd_data.get('principal_investigator',''))}</div>
            <div class="meta-item"><b>Sponsor:</b> {e(pd_data.get('sponsor',''))}</div>
            <div class="meta-item"><b>Funded By:</b> {e(pd_data.get('funded_by',''))}</div>
            <div class="meta-item"><b>Version:</b> {e(pd_data.get('version_number',''))} &nbsp;|&nbsp; <b>Date:</b> {e(pd_data.get('protocol_date',''))}</div>
          </div>
        </div>
        """)

        # ── TABLE OF CONTENTS ─────────────────────────────────────────────────
        sections = pd_data.get('sections') or {}
        sec0 = sections.get('0') or {}
        toc_tree = sec0.get('toc_tree') or []

        parts.append('<hr class="page-break" />')
        parts.append('<h1 class="sec">Table of Contents</h1>')

        if toc_tree:
            # Render LLM-parsed TOC tree as a proper dot-leader table
            parts.append('<table class="toc-table">')

            def render_toc_node(node, depth=0):
                num   = e(node.get('number') or '')
                title = e(node.get('title') or '')
                page  = node.get('page')
                level_cls = f'toc-l{min(depth, 2)}'
                pad_left = depth * 20
                parts.append(f'<tr class="{level_cls}">'
                              f'<td class="toc-num" style="padding-left:{pad_left}px">{num}</td>'
                              f'<td class="toc-title">{title}</td>'
                              f'<td class="toc-page">{page if page else ""}</td>'
                              f'</tr>')
                for child in (node.get('children') or []):
                    render_toc_node(child, depth + 1)

            for node in toc_tree:
                render_toc_node(node, 0)
            parts.append('</table>')

        elif sec0.get('main'):
            # Fallback: render the raw TOC text as a table, splitting on <br/>
            raw_lines = re.sub(r'<br\s*/?>', '\n', sec0['main']).split('\n')
            parts.append('<table class="toc-table">')
            for line in raw_lines:
                clean = re.sub(r'<[^>]+>', '', line).strip()
                if not clean:
                    continue
                # Detect "1.2 Background ........ 8" style
                dot_m = re.match(r'^(\d[\d.]*)\s+(.+?)\s*[.\-–]{2,}\s*(\d+)\s*$', clean)
                num_only = re.match(r'^(\d[\d.]*)$', clean)
                if dot_m:
                    num, title, page = e(dot_m.group(1)), e(dot_m.group(2)), dot_m.group(3)
                    depth = len(dot_m.group(1).split('.')) - 1
                    pad = depth * 20
                    level_cls = f'toc-l{min(depth, 2)}'
                    parts.append(f'<tr class="{level_cls}"><td class="toc-num" style="padding-left:{pad}px">{num}</td><td class="toc-title">{title}</td><td class="toc-page">{page}</td></tr>')
                elif not num_only:
                    # Plain title line (section heading in TOC)
                    depth = 0
                    nm = re.match(r'^(\d[\d.]*)\s+(.+)$', clean)
                    if nm:
                        depth = len(nm.group(1).split('.')) - 1
                        num = e(nm.group(1))
                        title = e(nm.group(2))
                    else:
                        num = ''
                        title = e(clean)
                    pad = depth * 20
                    level_cls = f'toc-l{min(depth, 2)}'
                    parts.append(f'<tr class="{level_cls}"><td class="toc-num" style="padding-left:{pad}px">{num}</td><td class="toc-title">{title}</td><td class="toc-page"></td></tr>')
            parts.append('</table>')

        # ── STATEMENT OF COMPLIANCE ──────────────────────────────────────────
        parts.append('<hr class="page-break" />')
        parts.append('<h1 class="sec">Statement of Compliance</h1>')
        parts.append("""<div class="compliance">
          The trial will be carried out in accordance with International Conference on Harmonisation
          Good Clinical Practice (ICH GCP) and applicable US Code of Federal Regulations (CFR)
          including 45 CFR Part 46, 21 CFR Part 50, 21 CFR Part 56, 21 CFR Part 312, and/or
          21 CFR Part 812. Approval of both the protocol and the consent form must be obtained
          before any participant is enrolled.
        </div>""")

        # ── SECTION 1: PROTOCOL SUMMARY ─────────────────────────────────────
        parts.append('<hr class="page-break" />')
        parts.append('<h1 class="sec">1 Protocol Summary</h1>')

        s_data = pd_data.get('synopsis_data') or {}
        ov = s_data.get('overview') or {}

        parts.append('<h2 class="sub">1.1 Synopsis</h2>')
        synop_fields = [
            ('Title', rhs(ov.get('title',''))),
            ('Coordinating Investigator', e(ov.get('coordinating_investigator',''))),
            ('Clinical Phase', e(ov.get('clinical_phase',''))),
            ('Trial Sites', e(ov.get('trial_sites',''))),
            ('Planned Duration', e(ov.get('planned_period',''))),
            ('Number of Patients', e(s_data.get('num_patients',''))),
        ]
        parts.append('<table class="content-table" style="font-size:10pt"><tbody>')
        for label, val in synop_fields:
            if val:
                parts.append(f'<tr><td style="width:200px;font-weight:700;background:#f0fdf4">{label}</td><td>{val}</td></tr>')
        parts.append('</tbody></table>')

        # Objectives
        obj = s_data.get('objectives') or {}
        if obj.get('primary') or obj.get('secondary') or obj.get('exploratory'):
            parts.append('<h3 class="subsub">Objectives</h3>')
            for label, key in [('Primary', 'primary'), ('Secondary', 'secondary'), ('Exploratory', 'exploratory')]:
                items = obj.get(key) or []
                if items:
                    parts.append(f'<p><b>{label}:</b></p><ul>')
                    for it in items:
                        parts.append(f'<li>{rhs(it)}</li>')
                    parts.append('</ul>')

        # Endpoints
        end = s_data.get('endpoints') or {}
        if end.get('primary') or end.get('secondary'):
            parts.append('<h3 class="subsub">Endpoints</h3>')
            for label, key in [('Primary', 'primary'), ('Secondary', 'secondary'), ('Exploratory', 'exploratory')]:
                items = end.get(key) or []
                if items:
                    parts.append(f'<p><b>{label}:</b></p><ul>')
                    for it in items:
                        parts.append(f'<li>{rhs(it)}</li>')
                    parts.append('</ul>')

        # Inclusion / Exclusion
        incl = (s_data.get('inclusion') or {}).get('points') or []
        excl = (s_data.get('exclusion') or {}).get('points') or []
        if incl:
            parts.append('<h3 class="subsub">Inclusion Criteria</h3><ul>')
            for pt in incl:
                parts.append(f'<li>{rhs(pt)}</li>')
            parts.append('</ul>')
        if excl:
            parts.append('<h3 class="subsub">Exclusion Criteria</h3><ul>')
            for pt in excl:
                parts.append(f'<li>{rhs(pt)}</li>')
            parts.append('</ul>')

        # ── 1.3 Schedule of Activities (SoA) ──────────────────────────────
        soa = pd_data.get('soa_data') or {}
        soa_tbl = soa.get('table') or {}
        soa_hdrs = soa_tbl.get('headers') or []
        soa_rows = soa_tbl.get('rows') or []

        # Determine if col 0 of headers is already "Procedure" (list rows) or separate
        if soa_hdrs and soa_rows:
            parts.append('<h2 class="sub">1.3 Schedule of Activities (SoA)</h2>')
            parts.append('<div class="soa-container"><table class="soa-table"><thead><tr>')

            if isinstance(soa_rows, dict):
                # Dict format: headers = visit columns, rows keys = procedures
                parts.append('<th class="proc-hdr">Procedure / Assessment</th>')
                for h in soa_hdrs:
                    parts.append(f'<th>{e(h)}</th>')
                parts.append('</tr></thead><tbody>')
                for proc, checks in soa_rows.items():
                    parts.append(f'<tr><td class="proc-cell">{e(proc)}</td>')
                    for c in checks:
                        cv = str(c).strip().lower()
                        mark = '<span class="chk">✓</span>' if cv in ('1', 'true', 'yes', 'y', 'x', '✓', '✔') else ''
                        parts.append(f'<td>{mark}</td>')
                    parts.append('</tr>')

            elif isinstance(soa_rows, list):
                # List format: headers[0] is "Procedure", rest are visits
                first_hdr = (soa_hdrs[0] if soa_hdrs else '').lower()
                if first_hdr in ('procedure', 'procedures', 'assessment', 'assessments', 'parameter'):
                    # Header row 0 = label column
                    parts.append(f'<th class="proc-hdr">{e(soa_hdrs[0])}</th>')
                    for h in soa_hdrs[1:]:
                        parts.append(f'<th>{e(h)}</th>')
                    parts.append('</tr></thead><tbody>')
                    for row in soa_rows:
                        if not row:
                            continue
                        proc = row[0]
                        # Detect category rows (empty or all-zero checks = category header)
                        rest = row[1:]
                        is_cat = all(str(c).strip().lower() in ('0', '', 'false') for c in rest)
                        cell_cls = 'proc-cell category' if is_cat else 'proc-cell'
                        parts.append(f'<tr><td class="{cell_cls}">{e(proc)}</td>')
                        for c in rest:
                            cv = str(c).strip().lower()
                            mark = '<span class="check">✓</span>' if cv in ('1', 'true', 'yes', 'y', 'x', '✓', '✔') else ''
                            parts.append(f'<td>{mark}</td>')
                        parts.append('</tr>')
                else:
                    # Headers don't include the procedure column — prepend it
                    parts.append('<th class="proc-hdr">Procedure / Assessment</th>')
                    for h in soa_hdrs:
                        parts.append(f'<th>{e(h)}</th>')
                    parts.append('</tr></thead><tbody>')
                    for row in soa_rows:
                        if not row:
                            continue
                        proc = row[0] if row else ''
                        parts.append(f'<tr><td class="proc-cell">{e(proc)}</td>')
                        for c in row[1:]:
                            cv = str(c).strip().lower()
                            mark = '<span class="check">✓</span>' if cv in ('1', 'true', 'yes', 'y', 'x', '✓', '✔') else ''
                            parts.append(f'<td>{mark}</td>')
                        parts.append('</tr>')

            parts.append('</tbody></table></div>')

        # ── ALL SECTIONS (from parsed document) ──────────────────────────────
        SECTION_TITLES = {
            "2": "Introduction", "3": "Objectives and Endpoints",
            "4": "Study Design", "5": "Study Population",
            "6": "Study Intervention", "7": "Study Intervention Discontinuation",
            "8": "Study Assessments and Procedures", "9": "Statistical Considerations",
            "10": "Supporting Documentation", "11": "References"
        }

        for sec_key in sorted(sections.keys(), key=lambda x: int(x) if x.lstrip('-').isdigit() else 999):
            if sec_key == '0':
                continue  # TOC already rendered
            sec = sections[sec_key] or {}
            sec_title = sec.get('title') or SECTION_TITLES.get(sec_key, f'Section {sec_key}')
            parts.append('<hr class="page-break" />')
            parts.append(f'<h1 class="sec">{e(sec_key)} {e(sec_title)}</h1>')

            if sec.get('main'):
                parts.append(f'<div>{rhs(sec["main"])}</div>')

            subs = sec.get('subsections') or []
            if isinstance(subs, list):
                for i, sub in enumerate(subs):
                    if isinstance(sub, dict):
                        title = sub.get('title') or sub.get('number') or ''
                        content = sub.get('content') or ''
                        depth = sub.get('depth', 1)
                        num = sub.get('number', '')
                        heading_num = f"{num}" if num else f"{sec_key}.{i+1}"
                        if depth <= 1:
                            parts.append(f'<h2 class="sub">{e(heading_num)} {e(title)}</h2>')
                        else:
                            parts.append(f'<h3 class="subsub">{e(heading_num)} {e(title)}</h3>')
                        if content:
                            parts.append(f'<div>{rhs(content)}</div>')
                    elif isinstance(sub, str) and sub.strip():
                        parts.append(f'<h2 class="sub">{sec_key}.{i+1} {e(sub)}</h2>')
            
            elif isinstance(subs, dict):
                for idx, content in sorted(subs.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 999):
                    if content:
                        parts.append(f'<h2 class="sub">{sec_key}.{int(idx)+1 if idx.isdigit() else idx} Subsection</h2>')
                        parts.append(f'<div>{rhs(str(content))}</div>')

        # ── ABBREVIATIONS ────────────────────────────────────────────────────
        abbrs = pd_data.get('abbreviations') or []
        if abbrs:
            parts.append('<hr class="page-break" />')
            parts.append('<h2 class="sub">Abbreviations</h2>')
            parts.append('<table class="content-table"><thead><tr><th style="width:160px">Abbreviation</th><th>Full Form</th></tr></thead><tbody>')
            for ab in abbrs:
                parts.append(f'<tr><td><b>{e(ab.get("Abbreviation",""))}</b></td><td>{e(ab.get("Full Form",""))}</td></tr>')
            parts.append('</tbody></table>')

        # ── AMENDMENT HISTORY ────────────────────────────────────────────────
        amends = pd_data.get('amendment_history') or []
        if amends:
            parts.append('<h2 class="sub">Protocol Amendment History</h2>')
            parts.append('<table class="content-table"><thead><tr><th>Version</th><th>Date</th><th>Description</th><th>Rationale</th></tr></thead><tbody>')
            for am in amends:
                parts.append(f'<tr><td>{e(am.get("Version",""))}</td><td>{e(am.get("Date",""))}</td><td>{e(am.get("Description",""))}</td><td>{e(am.get("Rationale",""))}</td></tr>')
            parts.append('</tbody></table>')



        return JSONResponse(content={"html": "\n".join(parts)})


    except Exception as ex:
        import traceback
        with open('debug_error.log', 'a') as f:
            f.write("\n=== RENDER PREVIEW ERROR ===\n")
            traceback.print_exc(file=f)
        logger.exception("Error in render_preview")
        raise HTTPException(status_code=500, detail=f"Preview render failed: {str(ex)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
