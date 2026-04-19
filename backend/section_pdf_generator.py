from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import io

class SectionPDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()

    def generate_section_pdf(self, section_name, raw_text, structured_fields):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []

        # Title
        title_style = self.styles['Title']
        story.append(Paragraph(section_name, title_style))
        story.append(Spacer(1, 12))

        # Structured Fields Table (if any)
        if structured_fields:
            story.append(Paragraph("Structured Summary", self.styles['Heading2']))
            story.append(Spacer(1, 6))
            
            data = [["Field", "Value"]]
            for field in structured_fields:
                data.append([field['field_name'], field['field_value']])
            
            t = Table(data, colWidths=[150, 350])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(t)
            story.append(Spacer(1, 24))

        # Raw Text Content
        story.append(Paragraph("Detailed Content", self.styles['Heading2']))
        story.append(Spacer(1, 6))
        
        # Split raw text by newlines and add paragraphs
        lines = raw_text.split('\n')
        content_style = self.styles['BodyText']
        for line in lines:
            if line.strip():
                story.append(Paragraph(line.strip(), content_style))
            else:
                story.append(Spacer(1, 6))

        doc.build(story)
        buffer.seek(0)
        return buffer

section_pdf_generator = SectionPDFGenerator()
