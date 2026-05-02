import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


MONTHS = {
    "JANVIER": 1,
    "FÉVRIER": 2,
    "FEVRIER": 2,
    "MARS": 3,
    "AVRIL": 4,
    "MAI": 5,
    "JUIN": 6,
    "JUILLET": 7,
    "AOÛT": 8,
    "AOUT": 8,
    "SEPTEMBRE": 9,
    "OCTOBRE": 10,
    "NOVEMBRE": 11,
    "DÉCEMBRE": 12,
    "DECEMBRE": 12,
}

PHASE_MARKERS = {
    "N": "Pleine Lune",
    "T": "Dernier Quartier",
    "Z": "Nouvelle Lune",
    "F": "Premier Quartier",
}


def normalize_time(value):
    return value.replace(" ", "")


def parse_day_line(line):
    match = re.match(r"^[LMMJVSD]\s+(\d{1,2})\s+(.*)$", line)
    if not match:
        return None

    day = int(match.group(1))
    time_matches = list(re.finditer(r"\d{2}\s:\s\d{2}", line))
    times = [normalize_time(item.group(0)) for item in time_matches]
    if len(times) < 2:
      return None

    sun_rise = times[0]
    sun_set = times[1]
    moon_rise = None
    moon_set = None

    if len(times) >= 4:
        moon_rise = times[2]
        moon_set = times[3]
    elif len(times) == 3:
        # A blank moon column is preserved by pypdf as a wide gap.
        # If the line ends with spaces, the missing value is the moon set.
        if line.rstrip() != line:
            moon_rise = times[2]
        else:
            moon_set = times[2]

    return {
        "day": day,
        "sunrise": sun_rise,
        "sunset": sun_set,
        "moonrise": moon_rise,
        "moonset": moon_set,
    }


def parse_phase_line(line):
    match = re.match(r"^([NTZF])\s+(.+?)\s+le\s+(\d{1,2})$", line)
    if not match:
        return None

    marker, label, day = match.groups()
    return {
        "day": int(day),
        "phase": PHASE_MARKERS.get(marker, label),
    }


def main(pdf_path, output_path):
    reader = PdfReader(pdf_path)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    current_month = None
    days = {}
    phases = []

    for raw_line in text.splitlines():
        line = raw_line.strip("\n")
        header = line.strip().upper()
        if header in MONTHS:
            current_month = MONTHS[header]
            continue

        if not current_month:
            continue

        day_data = parse_day_line(line)
        if day_data:
            day = day_data.pop("day")
            key = f"2026-{current_month:02d}-{day:02d}"
            days[key] = day_data
            continue

        phase_data = parse_phase_line(line.strip())
        if phase_data:
            day = phase_data["day"]
            key = f"2026-{current_month:02d}-{day:02d}"
            phase = phase_data["phase"]
            days.setdefault(key, {})["moonPhase"] = phase
            phases.append({"date": key, "phase": phase})

    output = {
        "source": "heure-lever-coucher-soleil-lune-le-havre-2026.pdf",
        "location": "Le Havre",
        "year": 2026,
        "days": dict(sorted(days.items())),
        "phases": phases,
    }
    Path(output_path).write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract_astronomy.py input.pdf output.json")
    main(sys.argv[1], sys.argv[2])
