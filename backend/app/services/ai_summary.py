from typing import List, Dict

def generate_behavioral_summary(candidate_name: str, logs: List[Dict]) -> str:
    """
    Generates a professional behavioral summary based on proctoring logs.
    """
    if not logs:
        return f"Candidate {candidate_name} demonstrated exceptional integrity. No violations or suspicious behaviors were detected throughout the entire session. High confidence in session validity."

    violation_counts = {}
    for log in logs:
        v_type = log.get("type", "UNKNOWN").replace("_", " ").title()
        violation_counts[v_type] = violation_counts.get(v_type, 0) + 1

    total = len(logs)
    
    # Analysis logic
    if "Phone Detected" in violation_counts or "Multiple Faces" in violation_counts:
        status = "HIGH RISK"
        summary = f"Audit reveals significant security concerns for candidate {candidate_name}. "
    elif total > 10:
        status = "MEDIUM RISK"
        summary = f"Candidate {candidate_name} exhibited frequent behavioral deviations. "
    else:
        status = "LOW RISK"
        summary = f"Candidate {candidate_name} mostly followed protocols with minor isolated incidents. "

    details = []
    for v_type, count in violation_counts.items():
        details.append(f"{v_type} ({count} incidents)")

    summary += f"The system flagged {total} total violation(s), specifically: {', '.join(details)}. "
    
    if "Phone Detected" in violation_counts:
        summary += "The presence of a mobile device suggests unauthorized external assistance. "
    if "Looking Away" in violation_counts and violation_counts["Looking Away"] > 5:
        summary += "Persistent gaze deviation indicates potential use of secondary reference materials. "
    
    summary += f"Final Decision: {status}."
    
    return summary
