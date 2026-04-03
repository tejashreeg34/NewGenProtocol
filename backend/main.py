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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from document_generator import generate_complete_word_document, generate_interpreted_word_report
from pdf_generator import generate_pdf_document, generate_interpreted_pdf_report
from qc_engine import qc_engine
from database import init_db, execute_query
from storage_engine import storage_engine
from section_pdf_generator import section_pdf_generator
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

class QCReportItem(BaseProtocolModel):
    section_name: str
    missing_item: str
    severity: str
    status: str = "Pending"

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
        file_path = generate_complete_word_document(data.dict())

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
        raise HTTPException(status_code=500, detail=f"Failed to generate Word document: {str(e)}")

@app.post("/api/generate-pdf")
async def generate_pdf(data: ProtocolData):
    try:
        file_path = generate_pdf_document(data.dict())
        
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
        logger.error(f"Error in generate_pdf: {str(e)}")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
