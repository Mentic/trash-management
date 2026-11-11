"""Generate the demo seed dataset for the ADI Eco Buzau 2009 registry + waste demo.

Deterministic (fixed RNG seed). Output goes to the folder given as argv[1].
Real: UAT names, urban/rural, 2021 census population, sorting station name.
Fictive: everything else (SIRUTA demo codes, quantities, tickets, documents, people).
"""
import csv
import json
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(20261111)

ANCHOR = date(2026, 11, 10)  # last seeded day; loader shifts all dates so ANCHOR = reset day - 1

# ---------------------------------------------------------------- reference data
IDX = {"urban": 0.233, "rural": 0.105}  # t/inhabitant/year (OUG 196/2005, PNGD indices)
UATS = [
    # siruta_demo, name, type, mediu, pop 2021, eligible share (fictive), quantity factor (fictive)
    ("900001", "Râmnicu Sărat", "municipiu", "urban", 29774, 0.19, 1.04),
    ("900002", "Nehoiu", "oraș", "urban", 9464, 0.13, 0.95),
    ("900003", "Pogoanele", "oraș", "urban", 6384, 0.15, 1.02),
    ("900004", "Berca", "comună", "rural", 7741, 0.11, 1.08),
    ("900005", "Vadu Pașii", "comună", "rural", 9726, 0.17, 0.97),
    ("900006", "Cislău", "comună", "rural", 4218, 0.10, 1.06),
    ("900007", "Breaza", "comună", "rural", 2474, 0.14, 0.93),
]
VILLAGES = {
    "Berca": ["Rătești", "Pâclele", "Joseni", "Valea Nucului"],
    "Cislău": ["Bărăști", "Scărișoara", "Gura Bâscei"],
    "Nehoiu": ["Mlăjet", "Păltineni", "Lunca Priporului"],
    "Vadu Pașii": ["Vadu Pașii"],
    "Breaza": ["Breaza"],
    "Pogoanele": ["Pogoanele"],
    "Râmnicu Sărat": ["Râmnicu Sărat"],
}
OPERATOR = {"cui": "99999901", "nume": "Operator Colectare Demo SRL (fictiv)"}
INSTAL = {
    "depozitare": "Depozit conform (fictiv)",
    "sortare": "Stația de sortare Vadu Pașii (RER Sud)",
    "compostare": "Platformă de compostare (fictiv)",
}
LER = {"reziduale": "20 03 01", "hârtie-carton": "20 01 01", "plastic-metal": "15 01 06",
       "sticlă": "20 01 02", "biodeșeuri": "20 01 08"}
TRIP = {"reziduale": (5.0, 9.0), "hârtie-carton": (0.8, 2.6), "plastic-metal": (0.6, 2.2),
        "sticlă": (1.0, 3.0), "biodeșeuri": (1.5, 4.5)}
SEASON = [0.92, 0.88, 0.97, 1.0, 1.04, 1.07, 1.1, 1.1, 1.04, 1.0, 0.95, 0.93]
LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august",
        "septembrie", "octombrie", "noiembrie", "decembrie"]


def uat_label(u):
    pref = {"municipiu": "Municipiul", "oraș": "Orașul", "comună": "Comuna"}[u[2]]
    return f"{pref} {u[1]}"


def primaria(u):
    pref = {"municipiu": "Primăria Municipiului", "oraș": "Primăria Orașului", "comună": "Primăria Comunei"}[u[2]]
    return f"{pref} {u[1]}"


def fmt_t(x):
    return f"{x:.3f}".replace(".", ",")


# ---------------------------------------------------------------- users, nomenclator, params
utilizatori = [
    {"id": "u1", "utilizator": "ana.registrator", "nume": "Ana (fictiv)", "rol": "registrator",
     "parola_demo": "Registru!2026", "twofa_inrolat": False},
    {"id": "u2", "utilizator": "mihai.responsabil", "nume": "Mihai (fictiv)", "rol": "responsabil",
     "parola_demo": "Deseuri!2026", "twofa_inrolat": False},
    {"id": "u3", "utilizator": "elena.director", "nume": "Elena (fictiv)", "rol": "director",
     "parola_demo": "Aprobare!2026", "twofa_inrolat": False},
]
nomenclator = [
    {"indicativ": "I-1", "denumire": "Corespondență cu UAT-urile membre", "termen_pastrare": "10 ani"},
    {"indicativ": "I-2", "denumire": "Corespondență cu operatorii și instituțiile", "termen_pastrare": "10 ani"},
    {"indicativ": "II-1", "denumire": "Rapoarte lunare ale operatorilor", "termen_pastrare": "10 ani"},
    {"indicativ": "III-1", "denumire": "Petiții și solicitări de informații de interes public", "termen_pastrare": "5 ani"},
    {"indicativ": "IV-1", "denumire": "Documente interne și hotărâri AGA", "termen_pastrare": "Permanent"},
]
parametri = {
    "procent_anexa6": {"2025": 45, "2026": 45},
    "tinte_reciclare": {"2025": 55, "2030": 60, "2035": 65},
    "indici_generare_t_loc_an": IDX,
    "contributie_afm_lei_t": 50,
    "toleranta_diferenta_t": 0.020,
    "termene_zile": {"petitie": 30, "petitie_prelungire_max": 15, "informatii_publice": 10, "altele": 30,
                     "redirectionare": 5, "avertizare_inainte": 5},
    "an_inchis_deseuri": {"2025": "aprobat"},
    "ancora_date": ANCHOR.isoformat(),
}
uat_json = []
for u in UATS:
    q_contr = round(u[4] * IDX[u[3]], 3)
    uat_json.append({"siruta_demo": u[0], "denumire": uat_label(u), "tip": u[2], "mediu": u[3],
                     "populatie_rpl2021": u[4], "serviciu_salubrizare_organizat": True,
                     "cantitate_contractata_t_an": q_contr})

# ---------------------------------------------------------------- waste rows (2025 approved, 2026 Jan-Sep validated)
ticket_seq = {2025: 0, 2026: 0}
VEH = {u[0]: f"DEMO-{i + 1:02d}" for i, u in enumerate(UATS)}


def month_rows(u, year, month, stare, factor_override=None):
    rows = []
    annual = u[4] * IDX[u[3]] * (factor_override or u[6])
    monthly = annual / 12 * SEASON[month - 1]
    e = u[5]
    shares = {"reziduale": 1 - e, "hârtie-carton": e * 0.85 * 0.4, "plastic-metal": e * 0.85 * 0.4,
              "sticlă": e * 0.85 * 0.2, "biodeșeuri": e * 0.15}
    dest = {"reziduale": "depozitare", "biodeșeuri": "compostare"}
    days_in_month = (date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)).day
    for fr, sh in shares.items():
        remaining = monthly * sh
        while remaining > 0.001:
            lo, hi = TRIP[fr]
            q = round(rng.uniform(lo, hi), 3)
            if remaining - q < lo * 0.5:
                q = remaining
            q = min(q, remaining)
            remaining -= q
            ticket_seq[year] += 1
            d = date(year, month, rng.randint(1, days_in_month))
            dt = datetime(d.year, d.month, d.day, rng.randint(6, 17), rng.choice([0, 10, 20, 30, 40, 50]))
            dtp = dest.get(fr, "sortare")
            rows.append({
                "perioada": f"{year}-{month:02d}", "data_cantaririi": dt.strftime("%Y-%m-%d %H:%M"),
                "nr_tichet": f"T-{year}-{ticket_seq[year]:06d}", "nr_auto": VEH[u[0]],
                "operator_cui": OPERATOR["cui"], "uat_siruta": u[0], "ruta_comuna": "Nu", "uat_ruta": "",
                "cod_ler": LER[fr], "fractie": fr, "destinatie_tip": dtp,
                "instalatie_destinatie": INSTAL[dtp], "cantitate_raportata_t": round(q, 3),
                "cantitate_tichet_t": round(q, 3), "document_justificativ": f"AV-{year}-{ticket_seq[year]:06d}",
                "stare": stare,
            })
    rows.sort(key=lambda r: r["data_cantaririi"])
    return rows


seed_rows = []
for year, months, stare in [(2025, range(1, 13), "aprobat"), (2026, range(1, 10), "validat")]:
    for m in months:
        for u in UATS:
            for r in month_rows(u, year, m, stare):
                r["import_ref"] = f"raport operator {LUNI[m - 1]} {year}"
                seed_rows.append(r)

CSV_COLS = ["perioada", "data_cantaririi", "nr_tichet", "nr_auto", "operator_cui", "uat_siruta", "ruta_comuna",
            "uat_ruta", "cod_ler", "fractie", "destinatie_tip", "instalatie_destinatie", "cantitate_raportata_t",
            "cantitate_tichet_t", "document_justificativ"]


def write_csv(path, rows, extra=()):
    cols = CSV_COLS + list(extra)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(cols)
        for r in rows:
            out = []
            for c in cols:
                v = r.get(c, "")
                if c in ("cantitate_raportata_t", "cantitate_tichet_t") and isinstance(v, float):
                    v = fmt_t(v)
                out.append(v)
            w.writerow(out)


write_csv(OUT / "seed_deseuri_2025_2026-09.csv", seed_rows, extra=("stare", "import_ref"))

# ---------------------------------------------------------------- October 2026 import files
oct_rows = {u[0]: month_rows(u, 2026, 10, None) for u in UATS}
others = [r for u in UATS if u[1] not in ("Berca", "Cislău") for r in oct_rows[u[0]]]
write_csv(OUT / "import_2026-10_restul_uat_curat.csv", others)

scen = oct_rows["900004"][:22] + oct_rows["900006"][:14]
scen.sort(key=lambda r: r["data_cantaririi"])
# V1: invalid LER format
scen[3]["cod_ler"] = "200301"
# V3: 0.050 t difference report vs ticket
scen[7]["cantitate_tichet_t"] = round(scen[7]["cantitate_raportata_t"] - 0.050, 3)
# V4: shared route without evidence, origin empty
scen[12]["uat_siruta"] = ""
scen[12]["ruta_comuna"] = "Da"
scen[12]["uat_ruta"] = "900004|900006"
# V2: exact duplicate of row 18 appended at the end
dup = dict(scen[18])
scen.append(dup)
write_csv(OUT / "import_2026-10_scenariu_erori.csv", scen)
scen_expect = {
    "fisier": "import_2026-10_scenariu_erori.csv",
    "randuri_total": len(scen),
    "respinse_V1": [scen[3]["nr_tichet"]],
    "duplicat_V2": [dup["nr_tichet"]],
    "diferenta_V3": [scen[7]["nr_tichet"]],
    "neatribuit_V4": [scen[12]["nr_tichet"]],
    "importate_fara_semnalari": len(scen) - 4,
}

v56 = [dict(r) for r in oct_rows["900002"][:2]]
for r in v56:  # fresh ticket numbers so they are not duplicates of the clean file
    ticket_seq[2026] += 1
    r["nr_tichet"] = f"T-2026-{ticket_seq[2026]:06d}"
v5 = dict(oct_rows["900003"][0])
ticket_seq[2026] += 1
v5["nr_tichet"] = f"T-2026-{ticket_seq[2026]:06d}"
v5["uat_siruta"] = "900099"
v6 = dict(oct_rows["900004"][0])
v6["perioada"] = "2025-12"
v6["data_cantaririi"] = "2025-12-18 09:20"
v6["nr_tichet"] = "T-2025-999001"
write_csv(OUT / "import_2026-10_test_V5_V6.csv", v56 + [v5, v6])
v56_expect = {"fisier": "import_2026-10_test_V5_V6.csv", "randuri_total": 4,
              "uat_necunoscut_V5": [v5["nr_tichet"]], "respinse_V6": [v6["nr_tichet"]],
              "importate_fara_semnalari": 2}

# ---------------------------------------------------------------- registry documents
PERS = [("Ion Popescu", "Berca", "Rătești"), ("Maria Ionescu", "Cislău", "Bărăști"),
        ("Gheorghe Dumitrescu", "Nehoiu", "Mlăjet"), ("Elisabeta Stan", "Vadu Pașii", "Vadu Pașii"),
        ("Vasile Marin", "Berca", "Pâclele"), ("Florin Radu", "Pogoanele", "Pogoanele"),
        ("Mihaela Dobre", "Breaza", "Breaza"), ("Cristian Tudor", "Râmnicu Sărat", "Râmnicu Sărat"),
        ("Adriana Neagu", "Cislău", "Scărișoara"), ("Doru Pavel", "Nehoiu", "Păltineni")]
UAT_SUBJ = ["Transmitere HCL privind aprobarea taxei speciale de salubrizare",
            "Solicitare situație cantități colectate – semestrul I",
            "Sesizare privind frecvența de colectare în satele aparținătoare",
            "Propunere de suplimentare a punctelor de colectare separată",
            "Transmitere date privind numărul de gospodării",
            "Solicitare clarificări privind factura operatorului",
            "Comunicare persoană de contact pentru serviciul de salubrizare"]
PET_SUBJ = ["Sesizare: deșeurile nu au fost ridicate în satul {sat}",
            "Solicitare pubelă suplimentară pentru reciclabile",
            "Sesizare privind un depozit necontrolat lângă {sat}",
            "Reclamație privind programul de colectare în {sat}"]
INFO_SUBJ = ["Solicitare informații privind contractul de sortare",
             "Solicitare informații privind cantitățile reciclate în 2025"]
INST = [("Agenția pentru Protecția Mediului Buzău", "Solicitare date pentru raportarea anuală privind gestionarea deșeurilor 2025", "I-2"),
        ("Administrația Fondului pentru Mediu", "Informare privind declararea contribuțiilor anuale", "I-2"),
        ("Consiliul Județean Buzău", "Convocare ședință de lucru privind SMID", "I-2")]
INTERNE = ["Notă internă – planificarea inventarului de arhivă", "Referat de necesitate – echipamente IT",
           "Proces-verbal ședință AGA – extras", "Notă internă – verificarea rapoartelor operatorului pe trimestrul III",
           "Decizie director – desemnare persoană responsabilă cu arhiva"]
MOTIVE_RETUR = ["Completați temeiul legal", "Atașați situația cantităților", "Reformulați concluzia"]


def business_days(start, end):
    d = start
    while d <= end:
        if d.weekday() < 5:
            yield d
        d += timedelta(days=1)


days = list(business_days(date(2026, 1, 5), ANCHOR))
events = []  # (date, kind, payload)

# operator monthly reports Jan-Sep: registered on ~5th business day of next month
for m in range(1, 10):
    d = [x for x in days if x.month == m + 1][4]
    events.append((d, "raport", {"luna": m}))

pool = []
for _ in range(6):
    pool.append(("petitie", None))
for _ in range(3):
    pool.append(("info", None))
for _ in range(10):
    pool.append(("uat", None))
for _ in range(3):
    pool.append(("inst", None))
for _ in range(5):
    pool.append(("intern", None))

# spread incoming items; responses are separate outgoing events later
incoming = []
while len(incoming) < 48:
    kind = rng.choice(["petitie", "petitie", "info", "uat", "uat", "uat", "uat", "inst", "intern"])
    incoming.append(kind)
inc_days = sorted(rng.sample(days[:-1], len(incoming)))
for d, kind in zip(inc_days, incoming):
    events.append((d, kind, {}))
# denser recent activity so the demo shows open work
for d in sorted(rng.sample(days[-30:-1], 10)):
    events.append((d, rng.choice(["petitie", "uat", "uat", "inst", "info"]), {}))
# two items deliberately left overdue
events.append((days[-26], "petitie", {"overdue": True}))
events.append((days[-20], "info", {"overdue": True}))
# today's-ish items near anchor, kept open on purpose
events.append((ANCHOR, "uat", {"open": True}))
events.append((ANCHOR, "petitie", {"open": True}))
events.sort(key=lambda e: e[0])

docs = []
nr = 0
def new_doc(d, **kw):
    global nr
    nr += 1
    doc = {"nr": nr, "an": 2026, "numar": f"{nr}/2026", "data_inregistrare": d.isoformat(), **kw}
    docs.append(doc)
    return doc

def hist(doc, d, user, actiune, detalii=""):
    doc.setdefault("istoric", []).append({"data": d.isoformat(), "utilizator": user, "actiune": actiune, "detalii": detalii})

pending_out = []  # (date, intrare doc)
overdue_kept = 0
for d, kind, p in events:
    # flush outgoing responses due before this date, in order
    pending_out.sort(key=lambda x: x[0])
    while pending_out and pending_out[0][0] <= d:
        od, intr = pending_out.pop(0)
        out = new_doc(od, sens="iesire", tip_cerere="raspuns", corespondent=intr["corespondent"],
                      adresa_corespondent=intr.get("adresa_corespondent", ""), nr_extern="",
                      obiect=f"Răspuns la {intr['numar']} – {intr['obiect']}", canal=intr["canal"],
                      responsabil="mihai.responsabil", legat_de=intr["numar"], dosar=intr["dosar"],
                      anexe=[{"nume": f"raspuns_{intr['nr']}.pdf", "dimensiune_kb": rng.randint(80, 400)}])
        intr["legat_de"] = out["numar"]
        closed = (ANCHOR - od).days > 10
        out["stare"] = "clasat" if closed else "expediat"
        intr["stare"] = "clasat" if closed else "expediat"
        hist(intr, od, "ana.registrator", "iesire_inregistrata", out["numar"])
        hist(out, od, "ana.registrator", "confirmat", "număr atribuit")
        hist(out, od, "ana.registrator", "expediat", f"canal: {intr['canal']}; dovadă: confirmare-{out['nr']:04d} (simulată)")
        if closed:
            cd = od + timedelta(days=3)
            hist(intr, cd, "ana.registrator", "clasat", intr["dosar"])
            hist(out, cd, "ana.registrator", "clasat", intr["dosar"])
    age = (ANCHOR - d).days
    if kind == "raport":
        m = p["luna"]
        doc = new_doc(d, sens="intrare", tip_cerere="raport_operator", corespondent=OPERATOR["nume"],
                      nr_extern=f"RL-{m:02d}/2026", obiect=f"Raport lunar de activitate – {LUNI[m - 1]} 2026",
                      canal="e-mail", dosar="II-1", stare="clasat", termen=None,
                      anexe=[{"nume": f"raport_{2026}-{m:02d}.csv", "dimensiune_kb": rng.randint(40, 120)}])
        hist(doc, d, "ana.registrator", "confirmat", "număr atribuit")
        hist(doc, d, "ana.registrator", "clasat_fara_raspuns", "II-1")
        continue
    if kind == "intern":
        doc = new_doc(d, sens="intern", tip_cerere="intern", corespondent="ADI Eco Buzău 2009 (intern)",
                      nr_extern="", obiect=rng.choice(INTERNE), canal="predare directă", dosar="IV-1",
                      stare="clasat" if age > 7 else "inregistrat", termen=None, anexe=[])
        hist(doc, d, "ana.registrator", "confirmat", "număr atribuit")
        if doc["stare"] == "clasat":
            hist(doc, d + timedelta(days=2), "ana.registrator", "clasat", "IV-1")
        continue
    if kind == "petitie":
        name, uat, sat = rng.choice(PERS)
        subj = rng.choice(PET_SUBJ).format(sat=sat)
        doc = new_doc(d, sens="intrare", tip_cerere="petitie", corespondent=f"{name} (fictiv)",
                      adresa_corespondent=f"sat {sat}, {uat}, jud. Buzău", nr_extern="", obiect=subj,
                      canal=rng.choice(["e-mail", "poștă", "depunere la sediu"]), dosar="III-1",
                      termen=(d + timedelta(days=30)).isoformat())
    elif kind == "info":
        name, uat, sat = rng.choice(PERS)
        doc = new_doc(d, sens="intrare", tip_cerere="informatii_publice", corespondent=f"{name} (fictiv)",
                      adresa_corespondent=f"{uat}, jud. Buzău", nr_extern="", obiect=rng.choice(INFO_SUBJ),
                      canal="e-mail", dosar="III-1", termen=(d + timedelta(days=10)).isoformat())
    elif kind == "uat":
        u = rng.choice(UATS)
        doc = new_doc(d, sens="intrare", tip_cerere="adresa_institutie", corespondent=primaria(u),
                      nr_extern=f"{rng.randint(800, 9800)}/{d.strftime('%d.%m.2026')}", obiect=rng.choice(UAT_SUBJ),
                      canal=rng.choice(["e-mail", "poștă"]), dosar="I-1", termen=(d + timedelta(days=30)).isoformat())
    else:  # inst
        inst, subj, dos = rng.choice(INST)
        doc = new_doc(d, sens="intrare", tip_cerere="adresa_institutie", corespondent=inst,
                      nr_extern=f"{rng.randint(1000, 25000)}/{d.strftime('%d.%m.2026')}", obiect=subj,
                      canal="e-mail", dosar=dos, termen=(d + timedelta(days=30)).isoformat())
    doc["anexe"] = [{"nume": f"scanare_{doc['nr']}.pdf", "dimensiune_kb": rng.randint(120, 900)}]
    hist(doc, d, "ana.registrator", "confirmat", "număr atribuit")
    hist(doc, d, "ana.registrator", "repartizat", "mihai.responsabil")
    doc["responsabil"] = "mihai.responsabil"
    term = date.fromisoformat(doc["termen"])
    if p.get("open"):
        doc["stare"] = "repartizat"
        continue
    want_overdue = p.get("overdue", False)
    if age > 50 or (term < ANCHOR + timedelta(days=3) and not want_overdue):
        # completed: drafted, maybe returned once, approved, then outgoing response
        dd = d + timedelta(days=rng.randint(3, 8))
        hist(doc, dd, "mihai.responsabil", "trimis_la_aprobare")
        if rng.random() < 0.25:
            hist(doc, dd + timedelta(days=1), "elena.director", "returnat", rng.choice(MOTIVE_RETUR))
            dd += timedelta(days=2)
            hist(doc, dd, "mihai.responsabil", "trimis_la_aprobare")
        ad = dd + timedelta(days=1)
        hist(doc, ad, "elena.director", "aprobat")
        od = min(ad + timedelta(days=1), term)
        if od.weekday() >= 5:
            od += timedelta(days=7 - od.weekday())
        doc["stare"] = "aprobat"
        pending_out.append((od, doc))
    else:
        if want_overdue:
            doc["stare"] = "in_redactare"  # intentionally overdue to show the highlight
            overdue_kept += 1
        else:
            doc["stare"] = rng.choice(["inregistrat", "repartizat", "in_redactare", "in_redactare", "in_aprobare", "aprobat"])
            if doc["stare"] == "inregistrat":
                doc["istoric"] = doc["istoric"][:1]
                doc.pop("responsabil", None)
            if doc["stare"] in ("in_aprobare", "aprobat"):
                hist(doc, d + timedelta(days=2), "mihai.responsabil", "trimis_la_aprobare")
            if doc["stare"] == "aprobat":
                hist(doc, d + timedelta(days=3), "elena.director", "aprobat")

# flush remaining responses dated up to anchor
pending_out.sort(key=lambda x: x[0])
for od, intr in pending_out:
    if od > ANCHOR:
        intr["stare"] = "aprobat"
        continue
    out = new_doc(od, sens="iesire", tip_cerere="raspuns", corespondent=intr["corespondent"],
                  adresa_corespondent=intr.get("adresa_corespondent", ""), nr_extern="",
                  obiect=f"Răspuns la {intr['numar']} – {intr['obiect']}", canal=intr["canal"],
                  responsabil="mihai.responsabil", legat_de=intr["numar"], dosar=intr["dosar"], stare="expediat",
                  anexe=[{"nume": f"raspuns_{intr['nr']}.pdf", "dimensiune_kb": rng.randint(80, 400)}])
    intr["legat_de"] = out["numar"]
    intr["stare"] = "expediat"
    hist(out, od, "ana.registrator", "confirmat", "număr atribuit")
    hist(out, od, "ana.registrator", "expediat", f"canal: {intr['canal']}; dovadă simulată")

# two cancelled registrations (dedicated documents)
for cd in [days[40], days[150]]:
    doc = new_doc(cd, sens="intrare", tip_cerere="adresa_institutie", corespondent=primaria(UATS[1]),
                  nr_extern="", obiect="Înregistrare anulată", canal="e-mail", dosar=None, stare="anulat",
                  termen=None, anexe=[])
    hist(doc, cd, "ana.registrator", "confirmat", "număr atribuit")
    hist(doc, cd, "ana.registrator", "anulat", "Document înregistrat de două ori (duplicat)")

# top up with internal notes so the seed ends exactly at 120/2026
while len(docs) < 120:
    doc = new_doc(ANCHOR, sens="intern", tip_cerere="intern", corespondent="ADI Eco Buzău 2009 (intern)",
                  nr_extern="", obiect=rng.choice(INTERNE), canal="predare directă", dosar="IV-1",
                  stare="inregistrat", termen=None, anexe=[])
    hist(doc, ANCHOR, "ana.registrator", "confirmat", "număr atribuit")
assert len(docs) == 120, len(docs)

# documents must be numbered chronologically: renumber by (date, original nr)
docs.sort(key=lambda x: (x["data_inregistrare"], x["nr"]))
remap = {}
for i, doc in enumerate(docs, start=1):
    remap[doc["numar"]] = f"{i}/2026"
for i, doc in enumerate(docs, start=1):
    doc["nr"] = i
    doc["numar"] = f"{i}/2026"
for doc in docs:
    if doc.get("legat_de"):
        doc["legat_de"] = remap[doc["legat_de"]]
    if doc["sens"] == "iesire":
        old = doc["obiect"].split(" – ", 1)
        ref = old[0].replace("Răspuns la ", "")
        doc["obiect"] = f"Răspuns la {remap.get(ref, ref)} – {old[1]}"
    for h in doc.get("istoric", []):
        if h["actiune"] == "iesire_inregistrata":
            h["detalii"] = remap[h["detalii"]]

# ---------------------------------------------------------------- write JSON
def dump(name, obj):
    with open(OUT / name, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

dump("uat.json", uat_json)
dump("utilizatori.json", utilizatori)
dump("nomenclator.json", nomenclator)
dump("parametri.json", parametri)
dump("documente_2026.json", docs)
dump("rezultate_asteptate_import.json", [scen_expect, v56_expect])

# ---------------------------------------------------------------- summary for README / BRD
from collections import Counter, defaultdict
summary = {
    "documente": len(docs),
    "ultimul_numar": docs[-1]["numar"],
    "pe_sens": Counter(d["sens"] for d in docs),
    "pe_stare": Counter(d["stare"] for d in docs),
    "intarziate_la_ancora": [d["numar"] for d in docs if d.get("termen") and d["stare"] not in ("clasat", "expediat", "anulat")
                             and date.fromisoformat(d["termen"]) < ANCHOR],
    "randuri_seed_deseuri": len(seed_rows),
    "randuri_import_curat": len(others),
    "randuri_import_scenariu": len(scen),
}
tot = defaultdict(lambda: defaultdict(float))
for r in seed_rows:
    if r["perioada"].startswith("2025"):
        tot[r["uat_siruta"]]["mun"] += r["cantitate_raportata_t"]
        if r["destinatie_tip"] in ("sortare", "compostare"):
            tot[r["uat_siruta"]]["val"] += r["cantitate_raportata_t"]
afm = []
for u in UATS:
    t = tot[u[0]]
    qob = 0.45 * t["mun"]
    c = max(0, qob - t["val"]) * 50
    afm.append({"uat": uat_label(u), "Q_mun_2025_t": round(t["mun"], 1), "Q_val_2025_t": round(t["val"], 1),
                "Q_ob_t": round(qob, 1), "contributie_estimata_lei": round(c)})
summary["afm_2025"] = afm
summary = json.loads(json.dumps(summary, default=dict, ensure_ascii=False))
dump("_rezumat.json", summary)
print(json.dumps(summary, ensure_ascii=False, indent=1))
