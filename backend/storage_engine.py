import logging
from database import execute_query
import json
from qc_engine import qc_engine

logger = logging.getLogger(__name__)

class StorageEngine:
    def __init__(self):
        pass

    def _generate_pgt_id(self):
        # Fetch next value from sequence
        res = execute_query("SELECT nextval('pgt_id_seq') as seq_val", fetch=True)
        if res and len(res) > 0:
            return f"PGT{res[0]['seq_val']:03d}"
        return "PGT000"

    def save_protocol_to_db(self, protocol_data, external_id=None):
        """
        Maps the JSON protocol data directly to the new flattened DB tables.
        """
        # Determine PGT ID
        # If frontend gives us an ID that looks like "PGTxxx", use it. Otherwise, generate one.
        pgt_id = external_id
        if not pgt_id or not pgt_id.startswith("PGT"):
            # Let's see if Nextgen_title already has a record for this external UUID if it's a UUID
            if external_id:
                pass # Currently, we don't store the UUID, we replace it with PGT.
            pgt_id = self._generate_pgt_id()
            logger.info(f"Generated new PGT ID: {pgt_id}")
        else:
            logger.info(f"Using existing PGT ID: {pgt_id}")

        # Delete existing data for this PGT ID to perform a clean upsert
        execute_query("DELETE FROM Nextgen_title WHERE pgt_id = %s", (pgt_id,))
        # All other tables have ON DELETE CASCADE so they are cleaned up automatically!
        
        # 1. Nextgen_title
        title = protocol_data.get('protocol_title', '')
        protocol_identifier = protocol_data.get('protocol_number', '')  # Protocol Number as identifier
        nct_number = protocol_data.get('nct_number', '')
        lead_medical_officer = protocol_data.get('principal_investigator', '')
        sponsoring_entity = protocol_data.get('sponsor', '')
        funding_agency = protocol_data.get('funded_by', '')
        document_version = protocol_data.get('version_number', '')
        authorization_date = protocol_data.get('protocol_date', '')

        execute_query("""
            INSERT INTO Nextgen_title (
                pgt_id, protocol_title, protocol_identifier, nct_number,
                lead_medical_officer, sponsoring_entity, funding_agency,
                document_version, authorization_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            pgt_id, title, protocol_identifier, nct_number,
            lead_medical_officer, sponsoring_entity, funding_agency,
            document_version, authorization_date
        ))

        # Helper shortcuts
        approval_data = protocol_data.get('approval_data', {})
        approval_details = approval_data.get('details', {})
        synopsis_data = protocol_data.get('synopsis_data', {})
        synopsis_overview = synopsis_data.get('overview', {})

        # 2. Protocol_Approval_Agreement
        execute_query("""
            INSERT INTO Protocol_Approval_Agreement (
                pgt_id, protocol_name, protocol_number, indication,
                clinical_phase, coordinating_investigator, expert_committee, sponsor_name_address
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            pgt_id,
            approval_details.get('protocol_name', ''),
            approval_details.get('protocol_number', ''),
            approval_details.get('indication', ''),
            approval_details.get('clinical_phase', ''),
            approval_details.get('coordinating_investigator', ''),
            approval_details.get('expert_committee', ''),
            approval_details.get('sponsor_name_address', '')
        ))

        # 3. Sponsor_Representation
        for rep in approval_data.get('sponsor_reps', []):
            role = rep.get('organization', 'Sponsor Representative') if getattr(rep, "get", None) else "Sponsor Representative"
            name = rep.get('name', '') if getattr(rep, "get", None) else ""
            title = rep.get('title', '') if getattr(rep, "get", None) else ""
            date_val = rep.get('date', '') if getattr(rep, "get", None) else ""
            if name or title:
                execute_query("""
                    INSERT INTO Sponsor_Representation (pgt_id, description_role, name, title, date)
                    VALUES (%s, %s, %s, %s, %s)
                """, (pgt_id, role, name, title, date_val))

        # 4. CRO_Representative
        for rep in approval_data.get('cro_reps', []):
            role = rep.get('organization', 'CRO Representative') if getattr(rep, "get", None) else "CRO Representative"
            name = rep.get('name', '') if getattr(rep, "get", None) else ""
            title = rep.get('title', '') if getattr(rep, "get", None) else ""
            date_val = rep.get('date', '') if getattr(rep, "get", None) else ""
            if name or title:
                execute_query("""
                    INSERT INTO CRO_Representative (pgt_id, description_role, name, title, date)
                    VALUES (%s, %s, %s, %s, %s)
                """, (pgt_id, role, name, title, date_val))

        # 5. Investigator_Agreement
        inv = approval_data.get('investigator_agreement', {})
        if getattr(inv, "get", None) and (inv.get('name') or inv.get('title')):
            execute_query("""
                INSERT INTO Investigator_Agreement (
                    pgt_id, investigator_name, investigator_title,
                    facility_location, city, state, date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                pgt_id,
                inv.get('name', ''),
                inv.get('title', ''),
                inv.get('facility', ''),
                inv.get('city', ''),
                inv.get('state', ''),
                inv.get('date', '')
            ))

        # 6. Patient_Synopsis
        execute_query("""
            INSERT INTO Patient_Synopsis (
                pgt_id, title_of_trial, coordinating_investigator, expert_committee,
                investigators, trial_sites, planned_trial_period, fpfv, lplv, clinical_phase
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            pgt_id,
            synopsis_overview.get('title', ''),
            synopsis_overview.get('coordinating_investigator', ''),
            synopsis_overview.get('expert_committee', ''),
            synopsis_overview.get('investigators', ''),
            synopsis_overview.get('trial_sites', ''),
            synopsis_overview.get('planned_period', ''),
            synopsis_overview.get('fpfv', ''),
            synopsis_overview.get('lplv', ''),
            synopsis_overview.get('clinical_phase', '')
        ))

        # 7. Trial_Objectives
        obj = synopsis_data.get('objectives', {})
        def join_list(l):
            if isinstance(l, list):
                return "\n".join([str(i) for i in l if i])
            return str(l)
            
        execute_query("""
            INSERT INTO Trial_Objectives (
                pgt_id, primary_objectives, secondary_objectives, exploratory_objectives
            ) VALUES (%s, %s, %s, %s)
        """, (
            pgt_id,
            join_list(obj.get('primary', [])),
            join_list(obj.get('secondary', [])),
            join_list(obj.get('exploratory', []))
        ))

        # 8. Number_of_Patients
        execute_query("""
            INSERT INTO Number_of_Patients (pgt_id, number_of_patients)
            VALUES (%s, %s)
        """, (pgt_id, str(synopsis_data.get('num_patients', ''))))

        # 9. Criteria
        incl = synopsis_data.get('inclusion', {})
        excl = synopsis_data.get('exclusion', {})
        
        def format_criteria(crit):
            if not crit: return ''
            text = crit.get('text', '')
            points = join_list(crit.get('points', []))
            if points:
                return f"{text}\n{points}".strip()
            return text.strip()

        execute_query("""
            INSERT INTO Criteria (pgt_id, inclusion_criteria, exclusion_criteria)
            VALUES (%s, %s, %s)
        """, (
            pgt_id,
            format_criteria(incl),
            format_criteria(excl)
        ))

        # 10. Quality_Report
        # Run QC automatically on save!
        qc_issues = qc_engine.run_qc(protocol_data)
        for issue in qc_issues:
            # issue is usually a dict but could be an object if qc_engine changed
            missing_field = issue.get('missing_item', issue.get('title', 'Unknown'))
            description = issue.get('description', '')
            tab = issue.get('section_name', issue.get('tab', ''))
            
            execute_query("""
                INSERT INTO Quality_Report (pgt_id, missing_field, description, tab)
                VALUES (%s, %s, %s, %s)
            """, (pgt_id, missing_field, description, tab))

        # 11. Interpretation
        endpoints = synopsis_data.get('endpoints', {})
        
        # abbreviations (if they exist from interpretation custom extraction)
        abbrev_table = protocol_data.get("sections", {}).get("10", {}).get("subsections", [])
        abbrev_text = ""
        if len(abbrev_table) > 14:
            c_table = abbrev_table[14].get("customTable")
            if c_table and getattr(c_table, "get", None):
                rows = c_table.get("rows", [])
                if rows:
                    abbrev_text = "\n".join([f"{r[0]}: {r[1]}" for r in rows if len(r) > 1 and r[0]])

        execute_query("""
            INSERT INTO Interpretation (
                pgt_id, protocol_title, protocol_number, protocol_name,
                phase, number_of_patients, study_endpoints_primary,
                study_endpoints_secondary, inclusion_criteria, exclusion_criteria, abbreviations
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            pgt_id,
            title,
            protocol_identifier,
            approval_details.get('protocol_name', title),
            approval_details.get('clinical_phase', synopsis_overview.get('clinical_phase', '')),
            str(synopsis_data.get('num_patients', '')),
            join_list(endpoints.get('primary', [])),
            join_list(endpoints.get('secondary', [])),
            format_criteria(incl),
            format_criteria(excl),
            abbrev_text
        ))

        return pgt_id

storage_engine = StorageEngine()
