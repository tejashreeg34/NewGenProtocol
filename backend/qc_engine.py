import json
import os
import logging

logger = logging.getLogger(__name__)

class QCEngine:
    def __init__(self, rules_path="qc_rules.json"):
        self.rules_path = rules_path
        self.rules = self._load_rules()

    def _load_rules(self):
        try:
            # Get the directory of the current script
            base_dir = os.path.dirname(os.path.abspath(__file__))
            full_path = os.path.join(base_dir, self.rules_path)
            with open(full_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load QC rules: {str(e)}")
            return {}

    def run_qc(self, protocol_data, template_type="default"):
        report = []
        rules = self.rules.get(template_type, self.rules.get("default", {}))

        if not rules:
            return report

        # Check top-level fields
        for field, config in rules.items():
            if config.get("type") == "field":
                val = protocol_data.get(field)
                if not val or (isinstance(val, str) and val.strip() == ""):
                    report.append({
                        "section_name": "General Info",
                        "missing_item": f"Field '{field}' is missing",
                        "severity": config.get("severity", "Optional"),
                        "status": "Pending"
                    })

        # Check sections
        sections = protocol_data.get("sections", {})
        section_rules = rules.get("sections", {})

        for sec_id, rule in section_rules.items():
            section = sections.get(sec_id, {})
            sec_title = rule.get("title", f"Section {sec_id}")

            # Check main content
            if not section.get("main") or section.get("main").strip() == "":
                # Check if it has subsections instead
                if not section.get("subsections"):
                    report.append({
                        "section_name": sec_title,
                        "missing_item": "Main content is empty",
                        "severity": "Mandatory" if sec_id == "1" else "Optional",
                        "status": "Pending"
                    })

            # Check subsections
            sub_rules = rule.get("subsections", [])
            subsections = section.get("subsections", [])
            
            for sub_rule in sub_rules:
                sub_title = sub_rule.get("title")
                severity = sub_rule.get("severity", "Optional")
                
                # Find matching subsection
                match = next((s for s in subsections if s.get("title") == sub_title), None)
                if not match or not match.get("content") or match.get("content").strip() == "":
                    report.append({
                        "section_name": f"{sec_title}: {sub_title}",
                        "missing_item": "Content is empty",
                        "severity": severity,
                        "status": "Pending"
                    })
                
                # Check for bullet points if type is points
                if sub_rule.get("type") == "points":
                    if match and not match.get("points") and not match.get("content"):
                        report.append({
                            "section_name": f"{sec_title}: {sub_title}",
                            "missing_item": "No bullet points or content found",
                            "severity": severity,
                            "status": "Pending"
                        })

            # Check for missing images/figures
            if rule.get("images", {}).get("severity") == "Mandatory" or (sec_id == "1" and not section.get("images")):
                 if not section.get("images"):
                    report.append({
                        "section_name": sec_title,
                        "missing_item": "No figures/images found",
                        "severity": rule.get("images", {}).get("severity", "Optional"),
                        "status": "Pending"
                    })

        # Check synopsis_data
        synopsis_rules = rules.get("synopsis_data", {})
        syn_data = protocol_data.get("synopsis_data", {})
        if syn_data:
            for field, config in synopsis_rules.items():
                val = syn_data.get(field)
                if config.get("type") == "list":
                    if not val or len(val) == 0:
                        report.append({
                            "section_name": "Synopsis Data",
                            "missing_item": f"Missing items in '{field}' list",
                            "severity": config.get("severity", "Optional"),
                            "status": "Pending"
                        })

        return report

qc_engine = QCEngine()
