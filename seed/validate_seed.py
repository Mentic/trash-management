"""Independent check of the seed against the BRD rules (V1-V6, numbering, links)."""
import csv
import json
import re
import sys
from datetime import date
from pathlib import Path

D = Path(sys.argv[1])
ok = True


def check(cond, msg):
    global ok
    print(("OK   " if cond else "FAIL ") + msg)
    ok &= bool(cond)


uats = {u["siruta_demo"] for u in json.load(open(D / "uat.json", encoding="utf-8"))}
params = json.load(open(D / "parametri.json", encoding="utf-8"))
closed_years = {int(y) for y, s in params["an_inchis_deseuri"].items() if s == "aprobat"}
FR = {"reziduale", "hârtie-carton", "plastic-metal", "sticlă", "biodeșeuri", "voluminoase", "altele"}
DT = {"sortare", "TMB", "compostare", "reciclare", "altă valorificare", "depozitare"}
REQ = ["perioada", "data_cantaririi", "nr_tichet", "nr_auto", "operator_cui", "ruta_comuna", "cod_ler",
       "fractie", "destinatie_tip", "instalatie_destinatie", "cantitate_raportata_t"]


def read(path):
    raw = open(path, "rb").read()
    check(raw.startswith(b"\xef\xbb\xbf"), f"{path.name}: UTF-8 BOM present")
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def num(v):
    return float(v.replace(",", ".")) if v else None


seed = read(D / "seed_deseuri_2025_2026-09.csv")
existing = {(r["operator_cui"], r["nr_tichet"], r["data_cantaririi"]) for r in seed}


def evaluate(rows):
    res = {"V1": [], "V2": [], "V3": [], "V4": [], "V5": [], "V6": [], "ok": []}
    seen = set(existing)
    for r in rows:
        t = r["nr_tichet"]
        bad = any(not r.get(c) for c in REQ)
        bad |= not re.fullmatch(r"\d{4}-\d{2}", r["perioada"] or "")
        bad |= not re.fullmatch(r"\d{2} \d{2} \d{2}", r["cod_ler"] or "")
        bad |= r["fractie"] not in FR or r["destinatie_tip"] not in DT or r["ruta_comuna"] not in ("Da", "Nu")
        try:
            q = num(r["cantitate_raportata_t"])
            bad |= q is None or q <= 0
        except ValueError:
            bad = True
        if bad:
            res["V1"].append(t); continue
        if int(r["perioada"][:4]) in closed_years:
            res["V6"].append(t); continue
        key = (r["operator_cui"], t, r["data_cantaririi"])
        if key in seen:
            res["V2"].append(t); continue
        seen.add(key)
        flagged = False
        qt = num(r["cantitate_tichet_t"])
        if qt is not None and abs(q - qt) > params["toleranta_diferenta_t"] + 1e-9:
            res["V3"].append(t); flagged = True
        if not r["uat_siruta"] or (r["ruta_comuna"] == "Da"):
            res["V4"].append(t); flagged = True
        elif r["uat_siruta"] not in uats:
            res["V5"].append(t); flagged = True
        if not flagged:
            res["ok"].append(t)
    return res


exp = {e["fisier"]: e for e in json.load(open(D / "rezultate_asteptate_import.json", encoding="utf-8"))}

r = evaluate(read(D / "import_2026-10_restul_uat_curat.csv"))
check(all(len(r[k]) == 0 for k in ["V1", "V2", "V3", "V4", "V5", "V6"]) and len(r["ok"]) > 0,
      f"clean file: {len(r['ok'])} rows, no flags")

e = exp["import_2026-10_scenariu_erori.csv"]
r = evaluate(read(D / e["fisier"]))
check(r["V1"] == e["respinse_V1"], f"scenario V1 = {r['V1']}")
check(r["V2"] == e["duplicat_V2"], f"scenario V2 = {r['V2']}")
check(r["V3"] == e["diferenta_V3"], f"scenario V3 = {r['V3']}")
check(r["V4"] == e["neatribuit_V4"], f"scenario V4 = {r['V4']}")
check(len(r["ok"]) == e["importate_fara_semnalari"], f"scenario clean rows = {len(r['ok'])}")

e = exp["import_2026-10_test_V5_V6.csv"]
r = evaluate(read(D / e["fisier"]))
check(r["V5"] == e["uat_necunoscut_V5"] and r["V6"] == e["respinse_V6"] and len(r["ok"]) == 2,
      f"V5={r['V5']} V6={r['V6']} ok={len(r['ok'])}")

# seed rows themselves must be clean
r = evaluate.__wrapped__(seed) if hasattr(evaluate, "__wrapped__") else None
dups = len(seed) - len(existing)
check(dups == 0, f"seed waste rows unique tickets ({len(seed)} rows)")
check(all(x["uat_siruta"] in uats for x in seed), "seed rows reference known UATs")

# documents
docs = json.load(open(D / "documente_2026.json", encoding="utf-8"))
check([d["nr"] for d in docs] == list(range(1, 121)), "document numbers 1..120 continuous")
check(all(docs[i]["data_inregistrare"] <= docs[i + 1]["data_inregistrare"] for i in range(len(docs) - 1)),
      "numbers follow registration dates")
by = {d["numar"]: d for d in docs}
links_ok = all(by[d["legat_de"]]["legat_de"] == d["numar"] for d in docs if d.get("legat_de"))
check(links_ok, "incoming/outgoing links are symmetric")
check(all(d["data_inregistrare"] >= by[d["legat_de"]]["data_inregistrare"] for d in docs
          if d["sens"] == "iesire"), "each reply is registered on/after its incoming document")
check(all(d.get("dosar") for d in docs if d["stare"] == "clasat"), "every filed document has a dossier")
anchor = date.fromisoformat(params["ancora_date"])
over = [d["numar"] for d in docs if d.get("termen") and d["stare"] not in ("clasat", "expediat", "anulat")
        and date.fromisoformat(d["termen"]) < anchor]
check(len(over) == 2, f"exactly two overdue items: {over}")
check(sum(d["stare"] == "anulat" for d in docs) == 2, "two cancelled registrations")
check(not any("CNP" in json.dumps(d, ensure_ascii=False) for d in docs), "no CNP field anywhere (R05)")
print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
