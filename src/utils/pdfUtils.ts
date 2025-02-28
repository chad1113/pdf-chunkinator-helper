
import { Chunk } from "@/components/ChunkList";

/**
 * Mock implementation of PDF parsing
 * In a real app, this would call a backend API to process the PDF
 */
export const splitPdfIntoChunks = async (file: File): Promise<Chunk[]> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // For demo purposes, we'll create some mock chunks based on the file size
  const numChunks = Math.max(1, Math.floor(file.size / 100000));
  const chunks: Chunk[] = [];
  
  // Create sample text content that looks more like real PDF content
  const createSampleContent = (chunkNum: number, fileName: string) => {
    const fileNameWithoutExt = fileName.replace('.pdf', '');
    
    // Sample realistic content for different document parts
    const chapterHeadings = [
      "INTRODUCTION",
      "GENERAL PROVISIONS",
      "PROCEDURES AND GUIDELINES",
      "IMPLEMENTATION DETAILS",
      "TECHNICAL SPECIFICATIONS",
      "APPENDICES AND REFERENCES"
    ];
    
    const heading = chapterHeadings[chunkNum % chapterHeadings.length];
    const sectionNum = Math.floor(chunkNum / chapterHeadings.length) + 1;
    
    return `DOCUMENT: ${fileNameWithoutExt}
SECTION ${sectionNum}: ${heading}

${heading === "INTRODUCTION" ? `
This document provides detailed procedures and guidelines for the implementation
of standard operating procedures as outlined in the regulatory framework.

Key aspects covered in this section:
- Scope and applicability
- Regulatory background
- Definitions and terminology
- Implementation timeline
` : ""}

${heading === "GENERAL PROVISIONS" ? `
1. GENERAL PROVISIONS
   1.1 Scope of Application
       These regulations apply to all entities operating under jurisdiction
       of the relevant authorities as specified in section 3.2.
   
   1.2 Legal Framework
       The provisions herein are pursuant to Article 24(2) of Regulation
       No. 2023/14, as amended.
       
   1.3 Compliance Requirements
       All regulated entities must ensure compliance with these procedures
       no later than the implementation date specified in Section 5.
` : ""}

${heading === "PROCEDURES AND GUIDELINES" ? `
2. STANDARD OPERATING PROCEDURES
   2.1 Documentation Requirements
       Each entity shall maintain comprehensive documentation of all
       processes relevant to regulatory compliance.
       
   2.2 Reporting Obligations
       Monthly reports must be submitted by the 15th day of the following
       month, containing the information specified in Appendix A.
       
   2.3 Quality Control Measures
       Implementation of the QC protocols defined in Section 4 is mandatory
       for all regulated processes.
` : ""}

${heading.includes("IMPLEMENTATION") ? `
3. IMPLEMENTATION GUIDELINES
   3.1 Phase 1: Preliminary Assessment
       Conduct organizational readiness evaluation using the templates
       provided in Appendix B.
       
   3.2 Phase 2: System Configuration
       Technical systems must be configured according to the specifications
       outlined in Section 5.2.
       
   3.3 Phase 3: Staff Training
       All relevant personnel must complete the training modules
       described in the Training Manual (separate document).
` : ""}

${heading.includes("TECHNICAL") ? `
4. TECHNICAL REQUIREMENTS
   4.1 System Architecture
       The implementation must follow the reference architecture
       illustrated in Figure 1 of Appendix C.
       
   4.2 Data Standards
       All data exchange must conform to the standard format
       described in Technical Specification TS-2023-42.
       
   4.3 Security Requirements
       Security controls must meet or exceed the requirements
       specified in the Security Framework Document.
` : ""}

${heading.includes("APPENDICES") ? `
5. APPENDICES
   Appendix A: Reporting Templates
   Appendix B: Assessment Checklists
   Appendix C: Technical Diagrams
   Appendix D: Reference Standards
   
   For inquiries regarding this document, please contact:
   regulatory-compliance@example.org
` : ""}

NOTE: This is simulated content for demonstration purposes only. In a real implementation, 
this would contain the actual text extracted from the PDF.
`;
  };
  
  for (let i = 1; i <= numChunks; i++) {
    chunks.push({
      id: i,
      filename: `${file.name.replace('.pdf', '')}_chunk_${i}.txt`,
      tokens: Math.floor(50000 + Math.random() * 40000), // Random token count between 50k-90k
      content: createSampleContent(i, file.name)
    });
  }
  
  console.log(`Created ${chunks.length} chunks from ${file.name}`);
  return chunks;
};
