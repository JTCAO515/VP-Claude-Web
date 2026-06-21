"""VisePanda — Visa Kit API handlers."""

from api.common import (
    DATA_DIR, _json, _json_error, _load_json,
)
from datetime import datetime


# ════════════════════════════════════════════════════════════
# VISA POLICIES API
# ════════════════════════════════════════════════════════════

def handle_visa_info(environ, start_response):
    """GET /api/visa/info?nationality=us — return visa requirements for a nationality."""
    from urllib.parse import parse_qs

    qs = environ.get("QUERY_STRING", "")
    params = parse_qs(qs)
    nat = (params.get("nationality", [""])[0] or "").strip().lower()

    if not nat:
        return _json(start_response, {"error": "Provide ?nationality= code"}, "400 Bad Request")

    policies = _load_json(DATA_DIR / "visa_policies.json") or {}

    # Direct match
    if nat in policies:
        return _json(start_response, {"visa": policies[nat], "found": True})

    # Partial match — search by country name or code
    for key, val in policies.items():
        code = val.get("country_code", "").lower()
        name = val.get("country", "").lower()
        nationality = val.get("nationality", "").lower()
        if nat in code or nat in name or nat in nationality:
            return _json(start_response, {"visa": val, "found": True})

    return _json(start_response, {
        "visa": None,
        "found": False,
        "message": "Visa info not available for this nationality. Please contact the nearest Chinese embassy or consulate for guidance.",
    })


def handle_visa_generate(environ, start_response):
    """POST /api/visa/generate — generate a visa itinerary document."""
    from api.auth import _get_user_from_token, _extract_token, ensure_init as auth_init
    from api.common import _read_post

    data = _read_post(environ)
    nationality = (data.get("nationality", "") or "").strip().lower()
    trip_title = (data.get("title", "") or "").strip()
    trip_city = (data.get("city", "") or "").strip()
    trip_days = (data.get("days", "") or "").strip()
    trip_content = (data.get("content", "") or "").strip()

    if not nationality:
        return _json_error(start_response, "Nationality is required")

    # Look up visa policy
    policies = _load_json(DATA_DIR / "visa_policies.json") or {}
    policy = None
    for key, val in policies.items():
        code = val.get("country_code", "").lower()
        name = val.get("country", "").lower()
        if nationality in key or nationality in code or nationality in name:
            policy = val
            break

    # Build itinerary document
    lines = []
    lines.append("=" * 50)
    lines.append("CHINA VISA APPLICATION — ITINERARY DOCUMENT")
    lines.append("=" * 50)
    lines.append("")

    if policy:
        lines.append(f"Nationality: {policy['nationality']}")
        lines.append(f"Visa Type: {policy['visa_type']}")
        lines.append(f"Visa Required: {'Yes' if policy['visa_required'] else 'No (visa-free)'}")
        lines.append(f"Processing Time: {policy['processing_time']}")
        lines.append(f"Fee: {policy['fee']}")
        lines.append("")
        lines.append("-" * 40)
        lines.append("REQUIRED DOCUMENTS:")
        for doc in policy["documents_required"]:
            lines.append(f"  • {doc}")
        lines.append("")
        lines.append(f"NOTES: {policy['special_notes']}")
        lines.append("-" * 40)
    else:
        lines.append("Visa policy not found for this nationality.")
        lines.append("Please contact the nearest Chinese embassy for guidance.")
        lines.append("")

    lines.append("")
    lines.append("=" * 50)
    lines.append("TRAVEL ITINERARY")
    lines.append("=" * 50)
    lines.append("")

    if trip_title:
        lines.append(f"Trip: {trip_title}")
    if trip_city:
        lines.append(f"Destination: {trip_city}")
    if trip_days:
        lines.append(f"Duration: {trip_days} days")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("")

    if trip_content:
        # Strip markdown for clean output
        clean = trip_content
        clean = clean.replace("**", "").replace("###", "").replace("---", "")
        lines.append(clean)
        lines.append("")

    lines.append("-" * 40)
    lines.append("This document is auto-generated for visa application purposes.")
    lines.append("Please verify all information before submission.")
    lines.append("=" * 50)

    return _json(start_response, {
        "document": "\n".join(lines),
        "policy": policy,
    })


def handle_visa_countries(start_response):
    """GET /api/visa/countries — list all supported countries."""
    policies = _load_json(DATA_DIR / "visa_policies.json") or {}
    countries = []
    for key, val in policies.items():
        countries.append({
            "code": key,
            "country": val.get("country", key),
            "nationality": val.get("nationality", ""),
            "visa_required": val.get("visa_required", True),
        })
    return _json(start_response, {"countries": countries})
