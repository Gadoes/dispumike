/**
 * Seed the ICSID SQLite database with real landmark cases for demo purposes.
 * Usage: npx tsx scripts/seed-icsid-demo.ts
 */

import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const dbDir = process.env.MCP_DB_DIR ?? path.join(process.cwd(), "data", "mcp");
const dbPath = path.join(dbDir, "icsid.db");

fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS icsid_cases (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  case_name TEXT NOT NULL,
  case_number TEXT,
  proceeding_type TEXT,
  year TEXT,
  excerpt TEXT,
  indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS icsid_fts USING fts5(
  case_name, case_number, proceeding_type, excerpt,
  content=icsid_cases, content_rowid=rowid
);
`);

const cases = [
  {
    id: "icsid-ARB-97-7",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/97/7",
    case_name: "Compania de Aguas del Aconquija S.A. and Vivendi Universal S.A. v. Argentine Republic",
    case_number: "ARB/97/7",
    proceeding_type: "Award",
    year: "2007",
    excerpt: "Landmark ICSID case involving a water concession contract in Tucuman Province, Argentina. The tribunal found Argentina liable for violations of the France-Argentina BIT, specifically the fair and equitable treatment standard, and awarded damages to the claimants for the province's interference with the concession agreement.",
  },
  {
    id: "icsid-ARB-01-3",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/01/3",
    case_name: "CMS Gas Transmission Company v. Argentine Republic",
    case_number: "ARB/01/3",
    proceeding_type: "Award",
    year: "2005",
    excerpt: "An important case arising from Argentina's economic crisis. The tribunal awarded damages for Argentina's suspension of a tariff adjustment formula for gas transportation. Addressed the necessity defense under customary international law and the US-Argentina BIT.",
  },
  {
    id: "icsid-ARB-03-19",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/19",
    case_name: "Sempra Energy International v. Argentine Republic",
    case_number: "ARB/03/19",
    proceeding_type: "Award",
    year: "2007",
    excerpt: "ICSID arbitration concerning Argentina's emergency measures during the 2001-2002 economic crisis, specifically the pesification of gas tariffs. The tribunal rejected Argentina's necessity defense and found breaches of the US-Argentina BIT fair and equitable treatment standard.",
  },
  {
    id: "icsid-ARB-AF-00-2",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB(AF)/00/2",
    case_name: "Tecnicas Medioambientales Tecmed, S.A. v. United Mexican States",
    case_number: "ARB(AF)/00/2",
    proceeding_type: "Award",
    year: "2003",
    excerpt: "Seminal ICSID Additional Facility case establishing the proportionality test for indirect expropriation. Mexico denied renewal of a hazardous waste landfill permit. The tribunal articulated a widely-cited standard for fair and equitable treatment under the Spain-Mexico BIT.",
  },
  {
    id: "icsid-ARB-07-5",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/07/5",
    case_name: "Abaclat and Others v. Argentine Republic",
    case_number: "ARB/07/5",
    proceeding_type: "Decision on Jurisdiction",
    year: "2011",
    excerpt: "Groundbreaking decision accepting jurisdiction over a mass claim by approximately 60,000 Italian bondholders against Argentina following its sovereign debt restructuring. First ICSID case to address mass claims and the application of the ICSID Convention to sovereign bonds.",
  },
  {
    id: "icsid-ARB-84-1",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/84/1",
    case_name: "Southern Pacific Properties (Middle East) Limited v. Arab Republic of Egypt",
    case_number: "ARB/84/1",
    proceeding_type: "Award",
    year: "1992",
    excerpt: "Landmark case involving the cancellation of a tourism development project near the Pyramids of Giza. The tribunal found Egypt liable for expropriation when it cancelled the project to protect antiquities. Important precedent on the intersection of investment protection and cultural heritage preservation.",
  },
  {
    id: "icsid-ARB-96-1",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/96/1",
    case_name: "Fedax N.V. v. Republic of Venezuela",
    case_number: "ARB/96/1",
    proceeding_type: "Decision on Jurisdiction",
    year: "1997",
    excerpt: "Important jurisdictional decision establishing that promissory notes constitute a qualifying investment under the ICSID Convention. The tribunal held that investment need not involve a transfer of assets into the host state's territory.",
  },
  {
    id: "icsid-ARB-03-24",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/24",
    case_name: "Saipem S.p.A. v. People's Republic of Bangladesh",
    case_number: "ARB/03/24",
    proceeding_type: "Award",
    year: "2009",
    excerpt: "ICSID case addressing the relationship between domestic court proceedings and international arbitration. The tribunal found Bangladesh liable for expropriation through judicial interference with an ICC arbitration. Important precedent on judicial expropriation of arbitral rights.",
  },
  {
    id: "icsid-ARB-10-7",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/10/7",
    case_name: "Philip Morris Brands Sarl, Philip Morris Products S.A. and Abal Hermanos S.A. v. Oriental Republic of Uruguay",
    case_number: "ARB/10/7",
    proceeding_type: "Award",
    year: "2016",
    excerpt: "Major case on public health regulation and investment protection. Uruguay's tobacco control measures (80% health warnings on cigarette packs) were challenged as expropriation. The tribunal upheld Uruguay's sovereign right to regulate public health, dismissing all claims.",
  },
  {
    id: "icsid-ARB-12-12",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/12/12",
    case_name: "Vattenfall AB and others v. Federal Republic of Germany",
    case_number: "ARB/12/12",
    proceeding_type: "Award",
    year: "2018",
    excerpt: "High-profile ICSID case brought by Swedish energy company Vattenfall against Germany over the country's decision to phase out nuclear energy following the Fukushima disaster. Raised fundamental questions about state's right to regulate energy policy.",
  },
  {
    id: "icsid-ARB-00-4",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/00/4",
    case_name: "Tokios Tokeles v. Ukraine",
    case_number: "ARB/00/4",
    proceeding_type: "Decision on Jurisdiction",
    year: "2004",
    excerpt: "Controversial jurisdictional decision on the nationality of juridical persons. The tribunal accepted jurisdiction despite the claimant being a Lithuanian entity substantially owned and controlled by Ukrainian nationals. Key precedent on corporate nationality and treaty shopping.",
  },
  {
    id: "icsid-ARB-AF-99-2",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB(AF)/99/2",
    case_name: "Marvin Roy Feldman Karpa v. United Mexican States",
    case_number: "ARB(AF)/99/2",
    proceeding_type: "Award",
    year: "2002",
    excerpt: "NAFTA/ICSID Additional Facility case concerning Mexico's denial of tax rebates on cigarette exports. Important precedent on regulatory expropriation and national treatment. The tribunal distinguished between legitimate regulation and compensable expropriation under NAFTA Chapter 11.",
  },
  {
    id: "icsid-ARB-05-22",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/05/22",
    case_name: "Biwater Gauff (Tanzania) Ltd. v. United Republic of Tanzania",
    case_number: "ARB/05/22",
    proceeding_type: "Award",
    year: "2008",
    excerpt: "ICSID case involving a water privatization project in Dar es Salaam. The tribunal found breaches of fair and equitable treatment and expropriation under the UK-Tanzania BIT but awarded no damages, finding that the investment had failed regardless of Tanzania's actions.",
  },
  {
    id: "icsid-ARB-98-2",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/98/2",
    case_name: "Emilio Agustin Maffezini v. Kingdom of Spain",
    case_number: "ARB/98/2",
    proceeding_type: "Decision on Jurisdiction",
    year: "2000",
    excerpt: "Leading case on the most-favored-nation (MFN) clause in investment treaties. The tribunal held that the MFN clause in the Argentina-Spain BIT could be used to import more favorable dispute resolution provisions from a third-party treaty. Widely cited and debated precedent.",
  },
  {
    id: "icsid-ARB-02-1",
    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/02/1",
    case_name: "Plama Consortium Limited v. Republic of Bulgaria",
    case_number: "ARB/02/1",
    proceeding_type: "Decision on Jurisdiction",
    year: "2005",
    excerpt: "Influential decision rejecting the use of MFN clauses to import dispute resolution provisions from third-party BITs. The tribunal distinguished the Maffezini approach and held that the Energy Charter Treaty's MFN clause did not extend to dispute settlement. Counter-precedent to Maffezini.",
  },
];

const insert = db.prepare(`
  INSERT OR REPLACE INTO icsid_cases (id, url, case_name, case_number, proceeding_type, year, excerpt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertFts = db.prepare(`
  INSERT INTO icsid_fts(rowid, case_name, case_number, proceeding_type, excerpt)
  SELECT rowid, case_name, case_number, proceeding_type, excerpt FROM icsid_cases WHERE id = ?
`);

db.exec("DELETE FROM icsid_fts");

const tx = db.transaction(() => {
  for (const c of cases) {
    insert.run(c.id, c.url, c.case_name, c.case_number, c.proceeding_type, c.year, c.excerpt);
    insertFts.run(c.id);
  }
});
tx();

console.log(`Seeded ${cases.length} ICSID cases into ${dbPath}`);
db.close();
